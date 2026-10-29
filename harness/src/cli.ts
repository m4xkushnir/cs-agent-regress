#!/usr/bin/env node
import { Command } from "commander";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";
import { parse as parseYaml, stringify as toYaml } from "yaml";
import { diffExpectedWrites } from "./checks/expected.js";
import { runChecks } from "./checks/rules.js";
import { compareRuns, renderCompareMarkdown } from "./compare.js";
import { ingestResultsFile, ingestRun } from "./ingest.js";
import { CacheMiss, Judge, type JudgeRecord } from "./judge.js";
import { analyzeRun, isPass, renderRunMarkdown, type RunReport } from "./report.js";
import { Run, ScenarioSpec } from "./schema.js";
import { renderSummary } from "./summary.js";
import { stableStringify } from "./util.js";

export const EXIT = { ok: 0, regression: 1, badInput: 2, cacheMiss: 3 } as const;

function writeJson(path: string, v: unknown) {
  writeFileSync(path, `${JSON.stringify(JSON.parse(stableStringify(v)), null, 2)}\n`);
}

function readText(path: string): string {
  const buf = readFileSync(path);
  return (path.endsWith(".gz") ? gunzipSync(buf) : buf).toString("utf8");
}

function loadRun(path: string): Run {
  return Run.parse(JSON.parse(readText(path)));
}

/** Runs are large; a .gz output path is written compressed (gzip output is deterministic for equal input). */
function writeRun(path: string, run: Run) {
  const text = `${stableStringify(run)}\n`;
  writeFileSync(path, path.endsWith(".gz") ? gzipSync(text, { level: 9 }) : text);
}

function loadScenarios(dir?: string): Map<string, ScenarioSpec> {
  const out = new Map<string, ScenarioSpec>();
  if (!dir) return out;
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".yaml")).sort()) {
    const spec = ScenarioSpec.parse(parseYaml(readFileSync(join(dir, f), "utf8")));
    out.set(spec.taskId, spec);
  }
  return out;
}

function ledgerCost(path: string | undefined, runId: string): number | null {
  if (!path || !existsSync(path)) return null;
  let usd = 0;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    if (!line.trim()) continue;
    const e = JSON.parse(line) as { run?: string; usd: number };
    if (e.run === runId) usd += e.usd;
  }
  return Math.round(usd * 10000) / 10000;
}

async function judgeFailures(run: Run, cacheDir: string, model: string, offline: boolean) {
  const judge = new Judge(cacheDir, model, offline);
  const verdicts = new Map<string, JudgeRecord>();
  for (const t of run.trajectories.filter((t) => !isPass(t))) {
    const findings = [...runChecks(t), ...diffExpectedWrites(t)];
    verdicts.set(t.id, await judge.verdict(t, findings));
  }
  return verdicts;
}

const program = new Command()
  .name("regress")
  .description("Deterministic regression checks for customer-service agent trajectories")
  .exitOverride();

program.command("ingest")
  .description("Normalize a runner output directory into run.json")
  .argument("<runDir>")
  .requiredOption("--run-id <id>")
  .requiredOption("--out <file>")
  .action((runDir: string, o: { runId: string; out: string }) => {
    const run = ingestRun(runDir, o.runId);
    writeRun(o.out, run);
    console.error(`${run.trajectories.length} trajectories -> ${o.out}`);
  });

program.command("ingest-results")
  .description("Normalize one tau2 results file that contains every trial")
  .argument("<file>")
  .requiredOption("--run-id <id>")
  .requiredOption("--agent-model <model>")
  .requiredOption("--out <file>")
  .action((file: string, o: { runId: string; agentModel: string; out: string }) => {
    const run = ingestResultsFile(file, o.runId, o.agentModel);
    writeRun(o.out, run);
    console.error(`${run.trajectories.length} trajectories -> ${o.out}`);
  });

program.command("check")
  .description("Run rule checks (and optionally the cached judge) on one run")
  .argument("<runJson>")
  .requiredOption("--out-dir <dir>")
  .option("--scenarios <dir>")
  .option("--ledger <file>")
  .option("--judge", "classify failed trajectories with the LLM judge")
  .option("--judge-model <model>", "judge model", "claude-sonnet-5-5")
  .option("--judge-cache <dir>", "judge verdict cache", "judge-cache")
  .option("--offline", "never call the API; a cache miss exits 3")
  .action(async (runJson: string, o: Record<string, string | boolean | undefined>) => {
    const run = loadRun(runJson);
    const scenarios = loadScenarios(o.scenarios as string | undefined);
    const verdicts = o.judge
      ? await judgeFailures(run, o.judgeCache as string, o.judgeModel as string, Boolean(o.offline))
      : undefined;
    const report = analyzeRun(run, { scenarios, verdicts, costUsd: ledgerCost(o.ledger as string | undefined, run.runId) });
    mkdirSync(o.outDir as string, { recursive: true });
    writeJson(join(o.outDir as string, "report.json"), report);
    writeFileSync(join(o.outDir as string, "report.md"), renderRunMarkdown(report));
    const gated = report.taskResults.filter((t) => t.gateViolations.length > 0);
    for (const t of gated) console.error(`gate violation: task ${t.taskId}: ${t.gateViolations.join(", ")}`);
    process.exitCode = gated.length > 0 ? EXIT.regression : EXIT.ok;
  });

program.command("compare")
  .description("Compare a candidate run report against a baseline report")
  .argument("<baselineReport>")
  .argument("<candidateReport>")
  .requiredOption("--out-dir <dir>")
  .option("--gate <check...>", "checks that must have zero findings in the candidate", [])
  .action((b: string, c: string, o: { outDir: string; gate: string[] }) => {
    const base = JSON.parse(readFileSync(b, "utf8")) as RunReport;
    const cand = JSON.parse(readFileSync(c, "utf8")) as RunReport;
    const r = compareRuns(base, cand, o.gate);
    mkdirSync(o.outDir, { recursive: true });
    writeJson(join(o.outDir, "compare.json"), r);
    writeFileSync(join(o.outDir, "compare.md"), renderCompareMarkdown(r));
    console.error(renderCompareMarkdown(r));
    process.exitCode = r.ok ? EXIT.ok : EXIT.regression;
  });

program.command("summary")
  .description("Compare several run reports side by side")
  .argument("<reports...>")
  .requiredOption("--out <file>")
  .action((files: string[], o: { out: string }) => {
    const reports = files.map((f) => JSON.parse(readFileSync(f, "utf8")) as RunReport);
    writeFileSync(o.out, renderSummary(reports));
  });

program.command("scenarios")
  .description("Write a starter scenario spec per task from a tau2 tasks.json")
  .requiredOption("--tasks <file>")
  .requiredOption("--ids <ids...>")
  .requiredOption("--out-dir <dir>")
  .action((o: { tasks: string; ids: string[]; outDir: string }) => {
    const tasks = JSON.parse(readFileSync(o.tasks, "utf8")) as { id: string; user_scenario: { instructions: { reason_for_call: string } } }[];
    mkdirSync(o.outDir, { recursive: true });
    for (const id of o.ids) {
      const t = tasks.find((x) => String(x.id) === id);
      if (!t) throw new Error(`task ${id} not in ${o.tasks}`);
      const path = join(o.outDir, `retail-${id.padStart(3, "0")}.yaml`);
      if (existsSync(path)) continue;
      const spec: ScenarioSpec = { taskId: id, summary: t.user_scenario.instructions.reason_for_call.slice(0, 200), gate: [], skip: [] };
      writeFileSync(path, toYaml(spec));
    }
  });

program.parseAsync().catch((e: unknown) => {
  if (e instanceof CacheMiss) {
    console.error(e.message);
    process.exitCode = EXIT.cacheMiss;
  } else if (e && typeof e === "object" && "exitCode" in e && "code" in e && String((e as { code: string }).code).startsWith("commander.")) {
    const code = (e as { exitCode: number }).exitCode;
    process.exitCode = code === 0 ? EXIT.ok : EXIT.badInput;
  } else {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = EXIT.badInput;
  }
});
