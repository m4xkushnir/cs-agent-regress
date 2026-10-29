import type { Finding, Trajectory } from "../schema.js";
import { Ctx, WRITE_TOOLS } from "./context.js";
import { stableStringify } from "../util.js";

/**
 * Diff the agent's successful writes against the task's reference writes.
 *
 * The reference is one valid path, not the only one, so these findings explain a
 * failed DB check rather than define failure on their own. The DB check stays the
 * outcome of record.
 */
export function diffExpectedWrites(t: Trajectory): Finding[] {
  const ctx = new Ctx(t);
  const done = ctx.writes().filter((w) => w.result && !w.result.isError);
  const expected = t.expectedActions.filter((a) => WRITE_TOOLS.has(a.name));
  const used = new Set<number>();
  const out: Finding[] = [];

  for (const exp of expected) {
    const exact = done.findIndex((w, i) => !used.has(i) && w.call.name === exp.name &&
      stableStringify(w.call.args) === stableStringify(exp.args));
    if (exact >= 0) {
      used.add(exact);
      continue;
    }
    const sameTool = done.findIndex((w, i) => !used.has(i) && w.call.name === exp.name &&
      w.call.args.order_id === exp.args.order_id);
    if (sameTool >= 0) {
      used.add(sameTool);
      const w = done[sameTool]!;
      const diffs = Object.keys({ ...exp.args, ...w.call.args })
        .filter((k) => stableStringify(exp.args[k]) !== stableStringify(w.call.args[k]))
        .sort()
        .map((k) => `${k}: expected ${stableStringify(exp.args[k])}, got ${stableStringify(w.call.args[k])}`);
      out.push({ check: "expected-writes", severity: "major", turnIdx: w.turnIdx,
        message: `wrong argument in ${exp.name}: ${diffs.join("; ")}` });
    } else {
      out.push({ check: "expected-writes", severity: "major", turnIdx: null,
        message: `missing write ${exp.name} ${stableStringify(exp.args)}` });
    }
  }
  done.forEach((w, i) => {
    if (!used.has(i)) {
      out.push({ check: "expected-writes", severity: "major", turnIdx: w.turnIdx,
        message: `unexpected write ${w.call.name} ${stableStringify(w.call.args)}` });
    }
  });
  return out;
}
