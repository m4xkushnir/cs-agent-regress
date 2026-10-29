import type { Trajectory, Turn } from "../src/schema.js";

const ORDER = {
  order_id: "#W100",
  user_id: "ana_1",
  status: "delivered",
  items: [{ item_id: "111", product_id: "P1", name: "Lamp" }],
  payment_history: [{ payment_method_id: "credit_card_9" }],
};
const PRODUCT = { product_id: "P1", variants: { "111": {}, "222": {} } };

type Step = ["user", string] | ["say", string] | ["call", string, Record<string, unknown>, unknown, boolean?];

/** Build a trajectory from a compact script: user lines, agent lines, and tool calls with their results. */
export function traj(steps: Step[], over: Partial<Trajectory> = {}): Trajectory {
  const turns: Turn[] = [];
  let n = 0;
  for (const s of steps) {
    if (s[0] === "user") turns.push({ idx: turns.length, role: "user", text: s[1] });
    else if (s[0] === "say") turns.push({ idx: turns.length, role: "assistant", text: s[1], toolCalls: [] });
    else {
      const id = `c${n++}`;
      turns.push({ idx: turns.length, role: "assistant", text: null, toolCalls: [{ id, name: s[1], args: s[2] }] });
      turns.push({ idx: turns.length, role: "tool", callId: id, content: typeof s[3] === "string" ? s[3] : JSON.stringify(s[3]), isError: s[4] ?? false });
    }
  }
  return {
    id: "run/001/t0", runId: "run", taskId: "1", trial: 0, agentModel: "m", prompt: "agent_v1",
    reward: 1, terminationReason: "user_stop", dbMatch: true, nlAssertions: [], expectedActions: [],
    costUsd: null, turns, ...over,
  };
}

export const auth: Step[] = [
  ["user", "Hi, I'm Ana, zip 10001. I want to exchange a lamp."],
  ["call", "find_user_id_by_name_zip", { first_name: "Ana", last_name: "B", zip: "10001" }, "ana_1"],
];
export const lookOrder: Step = ["call", "get_order_details", { order_id: "#W100" }, ORDER];
export const lookProduct: Step = ["call", "get_product_details", { product_id: "P1" }, PRODUCT];
export const exchangeArgs = { order_id: "#W100", item_ids: ["111"], new_item_ids: ["222"], payment_method_id: "credit_card_9" };

/** A clean exchange: authenticated, order and product read, details listed, explicit yes. */
export function goodExchange(): Step[] {
  return [
    ...auth,
    lookOrder,
    lookProduct,
    ["say", "I can exchange item 111 in order #W100 for 222, charged to credit_card_9. Shall I proceed?"],
    ["user", "Yes, please go ahead."],
    ["call", "exchange_delivered_order_items", exchangeArgs, { ...ORDER, status: "exchange requested" }],
    ["say", "Done."],
  ];
}
