import { mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { compareRuns } from "../src/compare.js";
import { CacheMiss, Judge, judgeKey } from "../src/judge.js";
import { analyzeRun, renderRunMarkdown, statusOf } from "../src/report.js";
import type { Run, Trajectory } from "../src/schema.js";
import { stableStringify } from "../src/util.js";
import { goodExchange, traj } from "./helpers.js";

function run(runId: string, outcomes: Record<string, boolean[]>, mutate?: (t: Trajectory) => Trajectory): Run {
  const trajectories: Trajectory[] = [];
  for (const [taskId, trials] of Object.entries(outcomes)) {
    trials.forEach((pass, trial) => {
      const t = traj(goodExchange(), { id: `${runId}/${taskId}/t${trial}`, runId, taskId, trial, reward: pass ? 1 : 0 });
      trajectories.push(mutate ? mutate(t) : t);
    });
  }
  return { runId, agentModel: "m", prompt: "p", trajectories };
}

describe("report", () => {
  it("is byte-identical regardless of input order", () => {
    const a = run("r", { "1": [true, false], "2": [true, true] });
    const b = { ...a, trajectories: [...a.trajectories].reverse() };
    expect(stableStringify(analyzeRun(a))).toBe(stableStringify(analyzeRun(b)));
    expect(renderRunMarkdown(analyzeRun(a))).toBe(renderRunMarkdown(analyzeRun(b)));
  });

  it("classifies task status across trials", () => {
    expect(statusOf([true, true])).toBe("pass");
    expect(statusOf([false, false])).toBe("fail");
    expect(statusOf([true, false])).toBe("flaky");
  });

  it("enforces scenario gates", () => {
    const r = run("r", { "1": [true] }, (t) => ({ ...t, turns: t.turns.filter((x) => !(x.role === "user" && x.text.startsWith("Yes"))) }));
    const report = analyzeRun(r, { scenarios: new Map([["1", { taskId: "1", summary: "", gate: ["confirm-before-write"], skip: [] }]]) });
    expect(report.taskResults[0]?.gateViolations).toEqual(["confirm-before-write"]);
  });

  it("honours scenario skips", () => {
    const r = run("r", { "1": [true] }, (t) => ({ ...t, turns: t.turns.filter((x) => !(x.role === "user" && x.text.startsWith("Yes"))) }));
    const report = analyzeRun(r, { scenarios: new Map([["1", { taskId: "1", summary: "", gate: [], skip: [{ check: "confirm-before-write", reason: "t" }] }]]) });
    expect(Object.keys(report.taskResults[0]?.checkHits ?? {})).not.toContain("confirm-before-write");
  });
});

describe("compare", () => {
  const base = analyzeRun(run("base", { "1": [true, true], "2": [false, false], "3": [true, false] }));

  it("fails on a task that went from pass to fail", () => {
    const cand = analyzeRun(run("cand", { "1": [false, false], "2": [true, true], "3": [true, true] }));
    const r = compareRuns(base, cand, []);
    expect(r.ok).toBe(false);
    expect(r.tasks.map((t) => `${t.taskId}:${t.kind}`)).toEqual(["1:regression", "2:fixed", "3:fixed"]);
  });

  it("does not fail on a single flaky flip", () => {
    const cand = analyzeRun(run("cand", { "1": [true, false], "2": [false, false], "3": [false, true] }));
    const r = compareRuns(base, cand, []);
    expect(r.ok).toBe(true);
    expect(r.tasks.find((t) => t.taskId === "1")?.kind).toBe("flaky-change");
  });

  it("fails when a gated check fires anywhere", () => {
    const cand = analyzeRun(run("cand", { "1": [true, true], "2": [false, false], "3": [true, false] },
      (t) => (t.taskId === "2" && t.trial === 0 ? { ...t, turns: t.turns.filter((x) => !(x.role === "user" && x.text.startsWith("Yes"))) } : t)));
    const r = compareRuns(base, cand, ["confirm-before-write"]);
    expect(r.ok).toBe(false);
    expect(r.gateViolations).toEqual([{ taskId: "2", check: "confirm-before-write", trials: 1 }]);
  });
});

describe("judge cache", () => {
  it("exits with CacheMiss offline and never touches the network", async () => {
    const dir = mkdtempSync(join(tmpdir(), "judge-"));
    const judge = new Judge(dir, "claude-sonnet-5-5", true);
    await expect(judge.verdict(traj(goodExchange()), [])).rejects.toBeInstanceOf(CacheMiss);
    expect(readdirSync(dir)).toEqual([]);
  });

  it("keys on model, prompt version, trajectory and findings", () => {
    const t = traj(goodExchange());
    const k = judgeKey("a", t, []);
    expect(judgeKey("a", t, [])).toBe(k);
    expect(judgeKey("b", t, [])).not.toBe(k);
    expect(judgeKey("a", t, [{ check: "x", severity: "minor", turnIdx: 1, message: "m" }])).not.toBe(k);
  });
});
