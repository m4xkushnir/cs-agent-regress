import type { RunReport, TaskStatus } from "./report.js";

export interface TaskDelta {
  taskId: string;
  baseline: TaskStatus;
  candidate: TaskStatus;
  kind: "regression" | "fixed" | "unchanged" | "flaky-change";
}

export interface CompareReport {
  baseline: string;
  candidate: string;
  baselinePassRate: number;
  candidatePassRate: number;
  tasks: TaskDelta[];
  /** A check that was clean on every baseline trial of a task and fires on every candidate trial. */
  checkRegressions: { taskId: string; check: string }[];
  /** Gated checks with findings anywhere in the candidate. */
  gateViolations: { taskId: string; check: string; trials: number }[];
  gateCounts: Record<string, { baseline: number; candidate: number }>;
  ok: boolean;
}

/**
 * A task regresses only when it passed every baseline trial and failed every candidate
 * trial. Mixed results are reported as flaky changes and do not fail the build, because
 * with two trials a single flip is as likely to be sampling noise as a real change.
 */
export function compareRuns(base: RunReport, cand: RunReport, gates: string[]): CompareReport {
  const baseTasks = new Map(base.taskResults.map((t) => [t.taskId, t]));
  const tasks: TaskDelta[] = [];
  const checkRegressions: CompareReport["checkRegressions"] = [];
  const gateViolations: CompareReport["gateViolations"] = [];

  for (const c of cand.taskResults) {
    const b = baseTasks.get(c.taskId);
    if (!b) continue;
    let kind: TaskDelta["kind"] = "unchanged";
    if (b.status === "pass" && c.status === "fail") kind = "regression";
    else if (b.status !== "pass" && c.status === "pass") kind = "fixed";
    else if (b.status !== c.status) kind = "flaky-change";
    tasks.push({ taskId: c.taskId, baseline: b.status, candidate: c.status, kind });

    for (const [check, hits] of Object.entries(c.checkHits)) {
      if ((b.checkHits[check] ?? 0) === 0 && hits === c.trials.length) checkRegressions.push({ taskId: c.taskId, check });
    }
    for (const g of [...new Set([...gates, ...c.gateViolations])].sort()) {
      const hits = c.checkHits[g] ?? 0;
      if (hits > 0) gateViolations.push({ taskId: c.taskId, check: g, trials: hits });
    }
  }

  const gateCounts: CompareReport["gateCounts"] = {};
  const count = (r: RunReport, g: string) => r.taskResults.reduce((n, t) => n + (t.checkHits[g] ?? 0), 0);
  for (const g of [...gates].sort()) gateCounts[g] = { baseline: count(base, g), candidate: count(cand, g) };

  return {
    baseline: base.runId,
    candidate: cand.runId,
    baselinePassRate: base.passRate,
    candidatePassRate: cand.passRate,
    tasks,
    checkRegressions,
    gateViolations,
    gateCounts,
    ok: !tasks.some((t) => t.kind === "regression") && checkRegressions.length === 0 && gateViolations.length === 0,
  };
}

export function renderCompareMarkdown(r: CompareReport): string {
  const n = (k: TaskDelta["kind"]) => r.tasks.filter((t) => t.kind === k);
  const lines = [
    `# ${r.candidate} vs ${r.baseline}`,
    "",
    `Result: **${r.ok ? "PASS" : "FAIL"}**`,
    "",
    "| | Baseline | Candidate |",
    "|---|---|---|",
    `| Trajectory pass rate | ${(r.baselinePassRate * 100).toFixed(1)}% | ${(r.candidatePassRate * 100).toFixed(1)}% |`,
    ...Object.entries(r.gateCounts).map(([g, c]) => `| \`${g}\` trials with findings | ${c.baseline} | ${c.candidate} |`),
    "",
    `Fixed tasks: ${n("fixed").map((t) => t.taskId).join(", ") || "none"}`,
    `Regressed tasks: ${n("regression").map((t) => t.taskId).join(", ") || "none"}`,
    `Flaky changes: ${n("flaky-change").map((t) => `${t.taskId} (${t.baseline}→${t.candidate})`).join(", ") || "none"}`,
    `Check regressions: ${r.checkRegressions.map((c) => `${c.taskId}:${c.check}`).join(", ") || "none"}`,
    `Gate violations: ${r.gateViolations.map((g) => `${g.taskId}:${g.check}×${g.trials}`).join(", ") || "none"}`,
  ];
  return `${lines.join("\n")}\n`;
}
