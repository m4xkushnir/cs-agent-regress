import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import type { Finding, Trajectory } from "./schema.js";
import { sha256, stableStringify } from "./util.js";

export const JUDGE_PROMPT_VERSION = "judge-v1";

export const Category = z.enum(["prompt", "knowledge_base", "config", "model", "integration", "benchmark_artifact"]);
export const SubPattern = z.enum([
  "policy_misapplied",
  "wrong_tool_argument",
  "premature_action_without_confirmation",
  "hallucinated_detail",
  "lost_context",
  "missed_action",
  "unwarranted_action",
  "auth_skipped",
  "user_simulator_error",
  "task_ambiguity",
  "other",
]);

export const Verdict = z.object({
  category: Category,
  subPattern: SubPattern,
  failingTurnIdx: z.number().int(),
  evidenceQuote: z.string(),
  rootCause: z.string(),
  suggestedCheck: z.string(),
});
export type Verdict = z.infer<typeof Verdict>;

export interface JudgeRecord {
  key: string;
  model: string;
  promptVersion: string;
  verdict: Verdict | null;
  refusal: boolean;
  /** True when evidenceQuote occurs verbatim in the trajectory text. */
  quoteVerified: boolean;
}

export class CacheMiss extends Error {}

const SYSTEM = `You review failed conversations between a retail customer-service AI agent and a simulated customer.
The agent follows a written policy and calls tools against an order database. The conversation failed the
benchmark's outcome check (the final database state or required statements did not match the task).

Classify the single most important cause of failure:
- category: where the fix belongs.
  prompt = the agent's instructions; knowledge_base = the policy text or reference data is missing or
  ambiguous; config = tool schemas, step limits or other runtime settings; model = the model ignored clear
  instructions and a stronger model would likely not; integration = a tool or backend returned something
  wrong or unexpected; benchmark_artifact = the simulated customer misbehaved or the task's expected outcome
  is debatable.
- subPattern: the closest behaviour label.
- failingTurnIdx: the bracketed index of the turn where things went wrong.
- evidenceQuote: copy a short span of that turn exactly, character for character.
- rootCause: one or two sentences, specific to this conversation.
- suggestedCheck: an automated check that would have caught this before customers saw it.

Deterministic rule findings and the expected database writes are given as hints. They can be wrong.`;

export function renderTrajectory(t: Trajectory): string {
  return t.turns.map((turn) => {
    if (turn.role === "user") return `[${turn.idx}] customer: ${turn.text}`;
    if (turn.role === "tool") return `[${turn.idx}] tool result${turn.isError ? " (error)" : ""}: ${turn.content.slice(0, 4000)}`;
    const calls = turn.toolCalls.map((c) => `call ${c.name} ${stableStringify(c.args)}`).join("; ");
    return `[${turn.idx}] agent: ${[turn.text, calls].filter(Boolean).join(" | ")}`;
  }).join("\n");
}

export function judgeKey(model: string, t: Trajectory, findings: Finding[]): string {
  return sha256(stableStringify([model, JUDGE_PROMPT_VERSION, t.turns, t.expectedActions, findings]));
}

export class Judge {
  private client: Anthropic | null = null;

  constructor(private cacheDir: string, private model: string, private offline: boolean) {
    mkdirSync(cacheDir, { recursive: true });
  }

  async verdict(t: Trajectory, findings: Finding[]): Promise<JudgeRecord> {
    const key = judgeKey(this.model, t, findings);
    const path = join(this.cacheDir, `${key}.json`);
    if (existsSync(path)) return JSON.parse(readFileSync(path, "utf8")) as JudgeRecord;
    if (this.offline) throw new CacheMiss(`judge cache miss for ${t.id} (${key})`);

    this.client ??= new Anthropic();
    const text = renderTrajectory(t);
    const user = [
      `Conversation:\n${text}`,
      `Expected database writes:\n${stableStringify(t.expectedActions.filter((a) => !a.name.startsWith("get_") && !a.name.startsWith("find_")))}`,
      `Rule findings:\n${findings.map((f) => `- [${f.turnIdx ?? "-"}] ${f.check}: ${f.message}`).join("\n") || "(none)"}`,
    ].join("\n\n");
    const response = await this.client.messages.parse({
      model: this.model,
      max_tokens: 16000,
      system: SYSTEM,
      messages: [{ role: "user", content: user }],
      output_config: { effort: "medium", format: zodOutputFormat(Verdict) },
    });
    const refusal = response.stop_reason === "refusal";
    const verdict = refusal ? null : response.parsed_output ?? null;
    const record: JudgeRecord = {
      key,
      model: this.model,
      promptVersion: JUDGE_PROMPT_VERSION,
        verdict,
      refusal,
      quoteVerified: verdict !== null && verdict.evidenceQuote.length > 0 && text.includes(verdict.evidenceQuote),
    };
    writeFileSync(path, `${stableStringify(record)}\n`);
    return record;
  }
}
