import type { ToolCall, Trajectory, Turn } from "../schema.js";

export const WRITE_TOOLS = new Set([
  "cancel_pending_order",
  "exchange_delivered_order_items",
  "modify_pending_order_address",
  "modify_pending_order_items",
  "modify_pending_order_payment",
  "modify_user_address",
  "return_delivered_order_items",
]);

export const AUTH_TOOLS = new Set(["find_user_id_by_email", "find_user_id_by_name_zip"]);

/** Tools that need no authenticated user: arithmetic and handing off. */
export const NEUTRAL_TOOLS = new Set(["calculate", "transfer_to_human_agents", "list_all_product_types"]);

export interface CallWithResult {
  call: ToolCall;
  turnIdx: number;
  result: { content: string; isError: boolean; json: unknown } | null;
}

/** Precomputed views over a trajectory that several checks share. */
export class Ctx {
  readonly calls: CallWithResult[];

  constructor(readonly t: Trajectory) {
    const results = new Map<string, Extract<Turn, { role: "tool" }>>();
    for (const turn of t.turns) if (turn.role === "tool") results.set(turn.callId, turn);
    this.calls = [];
    for (const turn of t.turns) {
      if (turn.role !== "assistant") continue;
      for (const call of turn.toolCalls) {
        const r = results.get(call.id);
        this.calls.push({
          call,
          turnIdx: turn.idx,
          result: r ? { content: r.content, isError: r.isError, json: parseJson(r.content) } : null,
        });
      }
    }
  }

  writes(): CallWithResult[] {
    return this.calls.filter((c) => WRITE_TOOLS.has(c.call.name));
  }

  /** Turn index of the first successful authentication, or null. */
  authTurn(): number | null {
    const hit = this.calls.find((c) => AUTH_TOOLS.has(c.call.name) && c.result && !c.result.isError);
    return hit ? hit.turnIdx : null;
  }

  authenticatedUserId(): string | null {
    const hit = this.calls.find((c) => AUTH_TOOLS.has(c.call.name) && c.result && !c.result.isError);
    if (!hit?.result) return null;
    const v = hit.result.json;
    return typeof v === "string" ? v : hit.result.content.trim().replace(/^"|"$/g, "");
  }

  /**
   * Turn indexes, in order, of agent messages before a write that name the order or one of
   * the items it acts on (by id or product name). Narration between consecutive writes made
   * after the same user message is skipped, since it does not ask for anything.
   */
  detailMessages(w: CallWithResult): number[] {
    const order = w.call.args.order_id === undefined ? null : String(w.call.args.order_id).replace(/^#/, "").toLowerCase();
    const ids = ["item_ids", "new_item_ids"].flatMap((k) => (w.call.args[k] as unknown[] | undefined) ?? []).map(String);
    const names = new Set<string>();
    const seen = order ? this.observedOrder(String(w.call.args.order_id), w.turnIdx) : null;
    for (const it of (seen && Array.isArray(seen.items) ? seen.items : []).filter(isObj)) {
      if (ids.includes(String(it.item_id)) && typeof it.name === "string") names.add(it.name.toLowerCase());
    }
    const lastUser = [...this.t.turns].reverse().find((t) => t.role === "user" && t.idx < w.turnIdx);
    const writeSinceUser = lastUser !== undefined &&
      this.writes().some((x) => x.turnIdx > lastUser.idx && x.turnIdx < w.turnIdx);
    const limit = writeSinceUser ? lastUser.idx : w.turnIdx;
    const out: number[] = [];
    for (const turn of this.t.turns) {
      if (turn.idx >= limit || turn.role !== "assistant" || !turn.text) continue;
      const text = turn.text.toLowerCase();
      if ((order && text.includes(order)) || ids.some((id) => text.includes(id)) ||
        [...names].some((n) => text.includes(n)) ||
        (w.call.name === "modify_user_address" && text.includes("address"))) out.push(turn.idx);
    }
    return out;
  }

  userMessagesBetween(from: number, to: number): Extract<Turn, { role: "user" }>[] {
    return this.t.turns.filter((t): t is Extract<Turn, { role: "user" }> => t.role === "user" && t.idx > from && t.idx < to);
  }

  /** Order status as last seen in a get_order_details result before turn idx. */
  observedOrder(orderId: string, idx: number): Record<string, unknown> | null {
    let seen: Record<string, unknown> | null = null;
    for (const c of this.calls) {
      if (c.turnIdx >= idx) break;
      if (c.call.name !== "get_order_details" || c.call.args.order_id !== orderId) continue;
      if (c.result && !c.result.isError && isObj(c.result.json)) seen = c.result.json;
    }
    return seen;
  }

  /** Every string that appeared in a tool result or a user message before turn idx. */
  seenStrings(idx: number): string {
    const parts: string[] = [];
    for (const turn of this.t.turns) {
      if (turn.idx >= idx) break;
      if (turn.role === "tool") parts.push(turn.content);
      if (turn.role === "user") parts.push(turn.text);
    }
    return parts.join("\n");
  }
}

export function parseJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

export function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
