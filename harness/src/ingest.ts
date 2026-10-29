import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Run, Trajectory, type Turn } from "./schema.js";
import { byString } from "./util.js";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Raw = any;

/**
 * Read one runner output directory: config.json plus trial-<n>.json files written
 * by tau2 (monolithic JSON, or dir format with a simulations/ folder beside it).
 */
export function ingestRun(runDir: string, runId: string): Run {
  const config = JSON.parse(readFileSync(join(runDir, "config.json"), "utf8"));
  const trials = readdirSync(runDir)
    .map((f) => /^trial-(\d+)\.json$/.exec(f))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => ({ file: join(runDir, m[0]), trial: Number(m[1]) }))
    .sort((a, b) => a.trial - b.trial);

  const trajectories: Trajectory[] = [];
  for (const { file, trial } of trials) {
    const results: Raw = JSON.parse(readFileSync(file, "utf8"));
    const tasks = new Map<string, Raw>((results.tasks ?? []).map((t: Raw) => [String(t.id), t]));
    for (const sim of loadSimulations(file, results)) {
      trajectories.push(toTrajectory(sim, tasks.get(String(sim.task_id)), {
        runId, trial, agentModel: config.agent_model, prompt: config.prompt,
      }));
    }
  }
  trajectories.sort(byString((t) => t.id));
  return Run.parse({ runId, agentModel: config.agent_model, prompt: config.prompt, trajectories });
}

/** Read a single tau2 results file that holds every trial (the format of published leaderboard runs). */
export function ingestResultsFile(file: string, runId: string, agentModel: string, prompt = "tau2-default"): Run {
  const results: Raw = JSON.parse(readFileSync(file, "utf8"));
  const tasks = new Map<string, Raw>((results.tasks ?? []).map((t: Raw) => [String(t.id), t]));
  const trajectories = loadSimulations(file, results)
    .map((sim) => toTrajectory(sim, tasks.get(String(sim.task_id)), { runId, trial: Number(sim.trial ?? 0), agentModel, prompt }))
    .sort(byString((t) => t.id));
  return Run.parse({ runId, agentModel, prompt, trajectories });
}

function loadSimulations(file: string, results: Raw): Raw[] {
  if (Array.isArray(results.simulations) && results.simulations.length > 0) return results.simulations;
  const dir = join(file, "..", "simulations");
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith(".json")).sort()
    .map((f) => JSON.parse(readFileSync(join(dir, f), "utf8")));
}

export function toTrajectory(
  sim: Raw,
  task: Raw,
  meta: { runId: string; trial: number; agentModel: string; prompt: string },
): Trajectory {
  const turns: Turn[] = [];
  for (const m of sim.messages ?? []) {
    const idx = turns.length;
    if (m.role === "user") {
      turns.push({ idx, role: "user", text: m.content ?? "" });
    } else if (m.role === "assistant") {
      turns.push({
        idx,
        role: "assistant",
        text: m.content ?? null,
        toolCalls: (m.tool_calls ?? []).map((c: Raw) => ({ id: String(c.id), name: c.name, args: c.arguments ?? {} })),
      });
    } else if (m.role === "tool") {
      turns.push({ idx, role: "tool", callId: String(m.id), content: m.content ?? "", isError: Boolean(m.error) });
    }
  }
  const ri = sim.reward_info ?? {};
  const actions = task?.evaluation_criteria?.actions ?? [];
  const cost = typeof sim.agent_cost === "number" ? sim.agent_cost : null;
  return Trajectory.parse({
    id: `${meta.runId}/${String(sim.task_id).padStart(3, "0")}/t${meta.trial}`,
    runId: meta.runId,
    taskId: String(sim.task_id),
    trial: meta.trial,
    agentModel: meta.agentModel,
    prompt: meta.prompt,
    reward: typeof ri.reward === "number" ? ri.reward : 0,
    terminationReason: String(sim.termination_reason ?? "unknown"),
    dbMatch: ri.db_check ? Boolean(ri.db_check.db_match) : null,
    nlAssertions: (ri.nl_assertions ?? []).map((a: Raw) => ({ text: a.nl_assertion, met: Boolean(a.met) })),
    expectedActions: actions.map((a: Raw) => ({ name: a.name, args: a.arguments ?? {} })),
    costUsd: cost,
    turns,
  });
}
