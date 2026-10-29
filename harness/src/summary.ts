import type { RunReport } from "./report.js";
import { BUCKETS, type Bucket } from "./triage.js";
import { pct } from "./util.js";

/** One markdown table comparing several runs side by side. */
export function renderSummary(reports: RunReport[]): string {
  const head = `| | ${reports.map((r) => `\`${r.agentModel}\``).join(" | ")} |`;
  const sep = `|---|${reports.map(() => "---").join("|")}|`;
  const row = (label: string, f: (r: RunReport) => string) => `| ${label} | ${reports.map(f).join(" | ")} |`;
  const failed = (r: RunReport) => r.trajectoryResults.filter((t) => !t.passed).length;
  const buckets = [...new Set(reports.flatMap((r) => Object.keys(r.buckets)))]
    .sort((a, b) => reports.reduce((n, r) => n + (r.buckets[b] ?? 0) - (r.buckets[a] ?? 0), 0) || (a < b ? -1 : 1));
  const checks = Object.keys(reports[0]?.findingsByCheck ?? {}).filter((c) => c !== "expected-writes" &&
    reports.some((r) => (r.findingsByCheck[c]?.inFailed ?? 0) + (r.findingsByCheck[c]?.inPassed ?? 0) > 0));

  const lines = [
    head, sep,
    row("Trajectories passing", (r) => `${r.trajectories - failed(r)} / ${r.trajectories} (${pct(r.trajectories - failed(r), r.trajectories)})`),
    row("Tasks passing every trial", (r) => `${r.taskResults.filter((t) => t.status === "pass").length} / ${r.tasks}`),
    row("Failed trajectories", (r) => String(failed(r))),
    "",
    "Failed trajectories by triage bucket (share of that model's failures):",
    "",
    `| Bucket | Category | ${reports.map((r) => `\`${r.agentModel}\``).join(" | ")} |`,
    `|---|---|${reports.map(() => "---").join("|")}|`,
    ...buckets.map((b) => `| \`${b}\` | ${BUCKETS[b as Bucket].category} | ${reports.map((r) => `${r.buckets[b] ?? 0} (${pct(r.buckets[b] ?? 0, failed(r))})`).join(" | ")} |`),
    "",
    "Trajectories with at least one rule finding (all outcomes):",
    "",
    `| Check | ${reports.map((r) => `\`${r.agentModel}\``).join(" | ")} |`,
    `|---|${reports.map(() => "---").join("|")}|`,
    ...checks.map((c) => `| \`${c}\` | ${reports.map((r) => String((r.findingsByCheck[c]?.inFailed ?? 0) + (r.findingsByCheck[c]?.inPassed ?? 0))).join(" | ")} |`),
  ];
  return `${lines.join("\n")}\n`;
}
