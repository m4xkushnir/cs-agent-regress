import { diffExpectedWrites } from "./checks/expected.js";
import { checks, runChecks } from "./checks/rules.js";
import type { JudgeRecord } from "./judge.js";
import { BUCKETS, triage, type Bucket } from "./triage.js";
import type { Finding, Run, ScenarioSpec, Trajectory } from "./schema.js";
import { byString, pct } from "./util.js";

export interface TrajectoryResult {
  id: string;
  taskId: string;
  trial: number;
  passed: boolean;
  terminationReason: string;
  findings: Finding[];
  expectedDiff: Finding[];
  bucket: Bucket | null;
  judge: JudgeRecord | null;
}

export type TaskStatus = "pass" | "fail" | "flaky";

export interface TaskResult {
  taskId: string;
  status: TaskStatus;
  trials: boolean[];
  /** Check id -> number of trials with at least one finding from it. */
  checkHits: Record<string, number>;
  gateViolations: string[];
}

export interface RunReport {
  runId: string;
  agentModel: string;
  prompt: string;
  trajectories: number;
  tasks: number;
  trialsPerTask: number;
  passRate: number;
  passAllTrials: number;
  costUsd: number | null;
  findingsByCheck: Record<string, { inPassed: number; inFailed: number }>;
  /** Failed trajectories per deterministic triage bucket. */
  buckets: Record<string, number>;
  verdicts: { byCategory: Record<string, number>; bySubPattern: Record<string, number>; unverifiedQuotes: number } | null;
  taskResults: TaskResult[];
  trajectoryResults: TrajectoryResult[];
}

export function isPass(t: Trajectory): boolean {
  return t.reward >= 1 - 1e-9;
}

export function statusOf(trials: boolean[]): TaskStatus {
  if (trials.every(Boolean)) return "pass";
  if (trials.every((x) => !x)) return "fail";
  return "flaky";
}

export function analyzeRun(
  run: Run,
  opts: { scenarios?: Map<string, ScenarioSpec>; verdicts?: Map<string, JudgeRecord>; costUsd?: number | null } = {},
): RunReport {
  const results: TrajectoryResult[] = run.trajectories.map((t) => {
    const skip = new Set((opts.scenarios?.get(t.taskId)?.skip ?? []).map((s) => s.check));
    const only = new Set(checks.map((c) => c.id).filter((id) => !skip.has(id)));
    const expectedDiff = diffExpectedWrites(t);
    return {
      id: t.id,
      taskId: t.taskId,
      trial: t.trial,
      passed: isPass(t),
      terminationReason: t.terminationReason,
      findings: runChecks(t, only),
      expectedDiff,
      bucket: isPass(t) ? null : triage(t, expectedDiff),
      judge: opts.verdicts?.get(t.id) ?? null,
    };
  });

  const byTask = new Map<string, TrajectoryResult[]>();
  for (const r of results) byTask.set(r.taskId, [...(byTask.get(r.taskId) ?? []), r]);
  const taskResults: TaskResult[] = [...byTask.entries()].map(([taskId, rs]) => {
    rs.sort((a, b) => a.trial - b.trial);
    const checkHits: Record<string, number> = {};
    for (const r of rs) {
      for (const id of new Set(r.findings.map((f) => f.check))) checkHits[id] = (checkHits[id] ?? 0) + 1;
    }
    const gate = opts.scenarios?.get(taskId)?.gate ?? [];
    return {
      taskId,
      status: statusOf(rs.map((r) => r.passed)),
      trials: rs.map((r) => r.passed),
      checkHits: sortRecord(checkHits),
      gateViolations: gate.filter((g) => (checkHits[g] ?? 0) > 0).sort(),
    };
  }).sort((a, b) => Number(a.taskId) - Number(b.taskId) || (a.taskId < b.taskId ? -1 : 1));

  const findingsByCheck: RunReport["findingsByCheck"] = {};
  for (const c of [...checks.map((c) => c.id), "expected-writes"]) findingsByCheck[c] = { inPassed: 0, inFailed: 0 };
  for (const r of results) {
    for (const id of new Set([...r.findings, ...r.expectedDiff].map((f) => f.check))) {
      const slot = findingsByCheck[id]!;
      if (r.passed) slot.inPassed++;
      else slot.inFailed++;
    }
  }

  const buckets: Record<string, number> = {};
  for (const r of results) if (r.bucket) buckets[r.bucket] = (buckets[r.bucket] ?? 0) + 1;

  let verdicts: RunReport["verdicts"] = null;
  if (opts.verdicts) {
    const byCategory: Record<string, number> = {};
    const bySubPattern: Record<string, number> = {};
    let unverifiedQuotes = 0;
    for (const r of results) {
      const v = r.judge?.verdict;
      if (!v) continue;
      byCategory[v.category] = (byCategory[v.category] ?? 0) + 1;
      bySubPattern[v.subPattern] = (bySubPattern[v.subPattern] ?? 0) + 1;
      if (!r.judge!.quoteVerified) unverifiedQuotes++;
    }
    verdicts = { byCategory: sortRecord(byCategory), bySubPattern: sortRecord(bySubPattern), unverifiedQuotes };
  }

  const trialsPerTask = Math.max(0, ...taskResults.map((t) => t.trials.length));
  return {
    runId: run.runId,
    agentModel: run.agentModel,
    prompt: run.prompt,
    trajectories: results.length,
    tasks: taskResults.length,
    trialsPerTask,
    passRate: round(results.filter((r) => r.passed).length / Math.max(results.length, 1)),
    passAllTrials: round(taskResults.filter((t) => t.status === "pass").length / Math.max(taskResults.length, 1)),
    costUsd: opts.costUsd ?? null,
    findingsByCheck,
    buckets: sortRecord(buckets),
    verdicts,
    taskResults,
    trajectoryResults: results.sort(byString((r) => r.id)),
  };
}

function round(x: number): number {
  return Math.round(x * 10000) / 10000;
}

function sortRecord<T>(r: Record<string, T>): Record<string, T> {
  return Object.fromEntries(Object.keys(r).sort().map((k) => [k, r[k]!]));
}

export function renderRunMarkdown(r: RunReport): string {
  const passed = r.trajectoryResults.filter((t) => t.passed).length;
  const lines = [
    `# Run ${r.runId}`,
    "",
    `Agent model \`${r.agentModel}\`, prompt \`${r.prompt}\`, ${r.tasks} tasks × ${r.trialsPerTask} trials.`,
    "",
    "| Metric | Value |",
    "|---|---|",
    `| Trajectories passing | ${passed} / ${r.trajectories} (${pct(passed, r.trajectories)}) |`,
    `| Tasks passing every trial | ${r.taskResults.filter((t) => t.status === "pass").length} / ${r.tasks} |`,
    `| Flaky tasks | ${r.taskResults.filter((t) => t.status === "flaky").length} |`,
    `| API cost of this run | ${r.costUsd === null ? "not recorded" : `$${r.costUsd.toFixed(2)}`} |`,
    "",
    "## Rule findings",
    "",
    "Trajectories with at least one finding, split by outcome. Findings on passing trajectories are",
    "policy problems the benchmark's outcome check does not see.",
    "",
    "| Check | In failed | In passed |",
    "|---|---|---|",
    ...Object.entries(r.findingsByCheck).filter(([, v]) => v.inFailed + v.inPassed > 0)
      .map(([k, v]) => `| \`${k}\` | ${v.inFailed} | ${v.inPassed} |`),
    "",
  ];
  const failed = r.trajectories - passed;
  lines.push("## Failure triage (deterministic)", "", "| Bucket | Failed trajectories | Share | Usual category |", "|---|---|---|---|");
  for (const [k, v] of Object.entries(r.buckets).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))) {
    lines.push(`| \`${k}\` | ${v} | ${pct(v, failed)} | ${BUCKETS[k as Bucket].category} |`);
  }
  lines.push("");
  if (r.verdicts) {
    lines.push("## Failure classification (LLM judge, cached)", "", "| Category | Failed trajectories |", "|---|---|");
    for (const [k, v] of Object.entries(r.verdicts.byCategory)) lines.push(`| ${k} | ${v} |`);
    lines.push("", "| Sub-pattern | Failed trajectories |", "|---|---|");
    for (const [k, v] of Object.entries(r.verdicts.bySubPattern)) lines.push(`| ${k} | ${v} |`);
    lines.push("", `Evidence quotes not found verbatim in the trajectory: ${r.verdicts.unverifiedQuotes}.`, "");
  }
  lines.push("## Tasks", "", "| Task | Trials | Status | Checks with findings | Gate |", "|---|---|---|---|---|");
  for (const t of r.taskResults) {
    const hits = Object.entries(t.checkHits).map(([k, v]) => `${k}×${v}`).join(", ") || "-";
    lines.push(`| ${t.taskId} | ${t.trials.map((p) => (p ? "✓" : "✗")).join(" ")} | ${t.status} | ${hits} | ${t.gateViolations.join(", ") || "ok"} |`);
  }
  return `${lines.join("\n")}\n`;
}
