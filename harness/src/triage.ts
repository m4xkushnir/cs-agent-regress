import { diffExpectedWrites } from "./checks/expected.js";
import type { Finding, Trajectory } from "./schema.js";

/**
 * Deterministic failure buckets for a failed trajectory. Each bucket names the Siena-style
 * category it usually belongs to; the bucket is a starting point for a human read, and the
 * category is a hypothesis, not a verdict.
 */
export const BUCKETS = {
  "sim-stop-on-confirm": {
    category: "benchmark_artifact",
    meaning: "The simulated customer confirmed and ended the chat in the same message, so the agent never got a turn to act.",
  },
  "ended-in-transfer": {
    category: "mixed",
    meaning: "The conversation ended in a transfer to a human before every expected write happened.",
  },
  "wrong-variant": {
    category: "model",
    meaning: "The right write on the right order, but a different replacement item than expected.",
  },
  "wrong-cancel-reason": {
    category: "benchmark_artifact",
    meaning: "Cancellation with the other allowed reason. Often the task never told the customer which reason to give.",
  },
  "wrong-payment-method": {
    category: "model",
    meaning: "The right write, but refunded or charged to a different payment method than expected.",
  },
  "wrong-other-argument": {
    category: "model",
    meaning: "The right write with some other argument (items, address) different from expected.",
  },
  "unwarranted-write": {
    category: "model",
    meaning: "The agent made a write the task did not call for, and every expected write happened.",
  },
  "missing-write": {
    category: "mixed",
    meaning: "An expected write never happened, for a reason not covered by a more specific bucket.",
  },
  "communication-only": {
    category: "prompt",
    meaning: "The database ended correct, but a required statement to the customer was missing.",
  },
  "unexplained": {
    category: "mixed",
    meaning: "Failed with no write diff and no failed assertion the harness can see.",
  },
} as const;
export type Bucket = keyof typeof BUCKETS;

const AFFIRM = /\b(yes|yeah|yep|confirm|proceed|go ahead|please do)\b/i;

export function triage(t: Trajectory, diff: Finding[] = diffExpectedWrites(t)): Bucket {
  const users = t.turns.filter((x) => x.role === "user");
  const lastUser = users.at(-1);
  const agentAfter = lastUser ? t.turns.some((x) => x.idx > lastUser.idx && x.role === "assistant") : false;
  const missing = diff.some((f) => f.message.startsWith("missing"));
  const wrong = diff.filter((f) => f.message.startsWith("wrong"));

  if (missing && lastUser && lastUser.text.includes("###STOP###") && AFFIRM.test(lastUser.text) && !agentAfter) {
    return "sim-stop-on-confirm";
  }
  if (missing && lastUser?.text.includes("###TRANSFER###")) return "ended-in-transfer";
  if (wrong.length > 0) {
    const keys = new Set(wrong.flatMap((f) => [...f.message.matchAll(/(\w+): expected/g)].map((m) => m[1])));
    if (keys.has("new_item_ids")) return "wrong-variant";
    if (keys.has("reason")) return "wrong-cancel-reason";
    if (keys.has("payment_method_id")) return "wrong-payment-method";
    return "wrong-other-argument";
  }
  if (missing) return "missing-write";
  if (diff.some((f) => f.message.startsWith("unexpected"))) return "unwarranted-write";
  if (t.dbMatch && t.nlAssertions.some((a) => !a.met)) return "communication-only";
  return "unexplained";
}
