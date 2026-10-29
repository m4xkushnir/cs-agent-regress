import type { Finding, Severity, Trajectory } from "../schema.js";
import { AUTH_TOOLS, Ctx, NEUTRAL_TOOLS, WRITE_TOOLS, isObj } from "./context.js";

export interface Check {
  id: string;
  description: string;
  run(ctx: Ctx): Finding[];
}

const AFFIRMATIVE =
  /\b(yes|yeah|yep|yup|confirm(ed)?|correct|proceed|go ahead|please do|sounds good|that'?s right|do it|do the|do all|fine)\b/i;
/**
 * A retraction in the final sentence cancels an earlier yes. Phrases like "no longer needed"
 * or "no other changes" are not retractions.
 */
const RETRACT = /\b(wait(?=[,.!—–-])|hold on|not yet|don'?t (do|proceed|go ahead|change)|do not (do|proceed|change)|cancel that|never ?mind)\b/i;

export function isAffirmative(text: string): boolean {
  const sentences = text.split(/(?<=[.!?])\s+|\n+/).map((x) => x.trim()).filter(Boolean);
  return sentences.some((x) => AFFIRMATIVE.test(x)) && !RETRACT.test(sentences.at(-1) ?? "");
}

const NEEDS_PENDING = new Set([
  "cancel_pending_order",
  "modify_pending_order_address",
  "modify_pending_order_items",
  "modify_pending_order_payment",
]);
const NEEDS_DELIVERED = new Set(["return_delivered_order_items", "exchange_delivered_order_items"]);
const ONCE_PER_ORDER = new Set(["exchange_delivered_order_items", "modify_pending_order_items"]);
const CANCEL_REASONS = new Set(["no longer needed", "ordered by mistake"]);
const ID_ARGS = ["order_id", "item_ids", "new_item_ids", "payment_method_id", "user_id"];

function f(check: string, severity: Severity, turnIdx: number | null, message: string): Finding {
  return { check, severity, turnIdx, message };
}

function bareOrder(id: unknown): string {
  return String(id ?? "").replace(/^#/, "");
}

export const checks: Check[] = [
  {
    id: "auth-first",
    description: "No lookup or write happens before the user is authenticated by email or name + zip.",
    run(ctx) {
      const auth = ctx.authTurn();
      const out: Finding[] = [];
      for (const c of ctx.calls) {
        if (AUTH_TOOLS.has(c.call.name) || NEUTRAL_TOOLS.has(c.call.name)) continue;
        if (auth === null || c.turnIdx < auth) {
          out.push(f("auth-first", WRITE_TOOLS.has(c.call.name) ? "critical" : "major", c.turnIdx,
            `${c.call.name} called before the user was authenticated`));
        }
      }
      return out;
    },
  },
  {
    id: "confirm-before-write",
    description: "After the agent listed the action's details, the user said yes before the write.",
    run(ctx) {
      const out: Finding[] = [];
      for (const w of ctx.writes()) {
        const details = ctx.detailMessages(w);
        if (details.length === 0) continue; // details-before-confirm reports this case
        // Look back two detail messages: an agent often asks one clarifying question
        // (a cancellation reason, say) after the user has already said yes.
        const detail = details.at(-2) ?? details.at(-1)!;
        const replies = ctx.userMessagesBetween(detail, w.turnIdx);
        if (!replies.some((u) => isAffirmative(u.text))) {
          const last = replies.at(-1);
          const said = last ? JSON.stringify(last.text.slice(0, 120)) : "nothing";
          out.push(f("confirm-before-write", "critical", w.turnIdx,
            `${w.call.name} without explicit confirmation after the details at turn ${detail}; the user said ${said}`));
        }
      }
      return out;
    },
  },
  {
    id: "details-before-confirm",
    description: "Before a write, some agent message named the order or the items the write acts on.",
    run(ctx) {
      return ctx.writes()
        .filter((w) => ctx.detailMessages(w).length === 0)
        .map((w) => f("details-before-confirm", "major", w.turnIdx,
          `${w.call.name}: no earlier agent message names the order or items it acts on`));
    },
  },
  {
    id: "status-before-write",
    description: "The order's status was read and allows the action before any order write.",
    run(ctx) {
      const out: Finding[] = [];
      for (const w of ctx.writes()) {
        const need = NEEDS_PENDING.has(w.call.name) ? "pending" : NEEDS_DELIVERED.has(w.call.name) ? "delivered" : null;
        if (!need) continue;
        const order = ctx.observedOrder(String(w.call.args.order_id), w.turnIdx);
        if (!order) {
          out.push(f("status-before-write", "major", w.turnIdx,
            `${w.call.name} on ${String(w.call.args.order_id)} without reading the order first`));
        } else if (order.status !== need) {
          out.push(f("status-before-write", "critical", w.turnIdx,
            `${w.call.name} on an order whose status is ${JSON.stringify(order.status)}, policy needs ${need}`));
        }
      }
      return out;
    },
  },
  {
    id: "once-per-order",
    description: "Exchange and item-modification tools are called at most once per order.",
    run(ctx) {
      const out: Finding[] = [];
      const seen = new Map<string, number>();
      for (const w of ctx.writes()) {
        if (!ONCE_PER_ORDER.has(w.call.name)) continue;
        const key = `${w.call.name}:${bareOrder(w.call.args.order_id)}`;
        const n = (seen.get(key) ?? 0) + 1;
        seen.set(key, n);
        if (n > 1) {
          out.push(f("once-per-order", "major", w.turnIdx,
            `${w.call.name} called ${n} times on ${String(w.call.args.order_id)}; items must be collected into one call`));
        }
      }
      return out;
    },
  },
  {
    id: "grounded-ids",
    description: "Every ID in a write argument appeared earlier in a tool result or a user message.",
    run(ctx) {
      const out: Finding[] = [];
      for (const w of ctx.writes()) {
        const seen = ctx.seenStrings(w.turnIdx);
        for (const key of ID_ARGS) {
          const v = w.call.args[key];
          const ids = Array.isArray(v) ? v : v === undefined ? [] : [v];
          for (const id of ids) {
            const s = String(id);
            if (!seen.includes(s) && !seen.includes(bareOrder(s))) {
              out.push(f("grounded-ids", "critical", w.turnIdx,
                `${w.call.name}.${key} uses ${s}, which never appeared in a tool result or user message`));
            }
          }
        }
      }
      return out;
    },
  },
  {
    id: "same-user",
    description: "Writes only touch the authenticated user's account and orders.",
    run(ctx) {
      const me = ctx.authenticatedUserId();
      if (!me) return [];
      const out: Finding[] = [];
      for (const w of ctx.writes()) {
        let owner: unknown = w.call.args.user_id;
        if (owner === undefined && w.call.args.order_id !== undefined) {
          owner = ctx.observedOrder(String(w.call.args.order_id), w.turnIdx)?.user_id;
        }
        if (owner !== undefined && owner !== me) {
          out.push(f("same-user", "critical", w.turnIdx,
            `${w.call.name} acts for ${String(owner)} but the authenticated user is ${me}`));
        }
      }
      return out;
    },
  },
  {
    id: "refund-destination",
    description: "Return refunds go to the order's original payment method or an existing gift card.",
    run(ctx) {
      const out: Finding[] = [];
      for (const w of ctx.writes()) {
        if (w.call.name !== "return_delivered_order_items") continue;
        const pm = String(w.call.args.payment_method_id ?? "");
        if (pm.startsWith("gift_card_")) continue;
        const order = ctx.observedOrder(String(w.call.args.order_id), w.turnIdx);
        const history = order && Array.isArray(order.payment_history) ? order.payment_history : [];
        const first = history.find(isObj);
        const original = first ? String(first.payment_method_id ?? "") : null;
        if (original !== null && pm !== original) {
          out.push(f("refund-destination", "major", w.turnIdx,
            `attempted refund to ${pm}; policy allows the original method ${original} or a gift card`));
        }
      }
      return out;
    },
  },
  {
    id: "same-product",
    description: "Exchanged or modified items stay within the same product, verified against fetched product details.",
    run(ctx) {
      const out: Finding[] = [];
      for (const w of ctx.writes()) {
        if (!ONCE_PER_ORDER.has(w.call.name)) continue;
        const order = ctx.observedOrder(String(w.call.args.order_id), w.turnIdx);
        const items = order && Array.isArray(order.items) ? order.items.filter(isObj) : [];
        const oldIds = (w.call.args.item_ids as unknown[] | undefined) ?? [];
        const newIds = (w.call.args.new_item_ids as unknown[] | undefined) ?? [];
        oldIds.forEach((oldId, i) => {
          const product = items.find((it) => String(it.item_id) === String(oldId))?.product_id;
          const newId = String(newIds[i] ?? "");
          if (product === undefined) return;
          const details = ctx.calls.find((c) => c.turnIdx < w.turnIdx && c.call.name === "get_product_details" &&
            String(c.call.args.product_id) === String(product) && c.result && !c.result.isError);
          if (newId === String(oldId)) return;
          if (!details) {
            out.push(f("same-product", "minor", w.turnIdx,
              `replacement ${newId} for ${String(oldId)} chosen without fetching product ${String(product)}`));
          } else if (!details.result!.content.includes(newId)) {
            out.push(f("same-product", "critical", w.turnIdx,
              `replacement ${newId} is not a variant of product ${String(product)}`));
          }
        });
      }
      return out;
    },
  },
  {
    id: "different-option",
    description: "An exchanged or modified item becomes a different option, never the identical item.",
    run(ctx) {
      const out: Finding[] = [];
      for (const w of ctx.writes()) {
        if (!ONCE_PER_ORDER.has(w.call.name)) continue;
        const oldIds = ((w.call.args.item_ids as unknown[] | undefined) ?? []).map(String);
        const newIds = ((w.call.args.new_item_ids as unknown[] | undefined) ?? []).map(String);
        oldIds.forEach((oldId, i) => {
          if (newIds[i] === oldId) {
            out.push(f("different-option", "major", w.turnIdx,
              `${w.call.name} swaps item ${oldId} for itself; policy requires a different option`));
          }
        });
      }
      return out;
    },
  },
  {
    id: "cancel-reason",
    description: "Cancellation reason is one of the two the policy allows.",
    run(ctx) {
      return ctx.writes()
        .filter((w) => w.call.name === "cancel_pending_order" && !CANCEL_REASONS.has(String(w.call.args.reason)))
        .map((w) => f("cancel-reason", "major", w.turnIdx, `cancel reason ${JSON.stringify(w.call.args.reason)}`));
    },
  },
  {
    id: "transfer-protocol",
    description: "A transfer to a human is followed by the exact hold message.",
    run(ctx) {
      const out: Finding[] = [];
      for (const c of ctx.calls) {
        if (c.call.name !== "transfer_to_human_agents") continue;
        const next = ctx.t.turns.find((t) => t.idx > c.turnIdx && t.role === "assistant" && t.text);
        const text = next && next.role === "assistant" ? next.text ?? "" : "";
        if (!text.includes("YOU ARE BEING TRANSFERRED TO A HUMAN AGENT")) {
          out.push(f("transfer-protocol", "minor", c.turnIdx, "transfer without the required hold message"));
        }
      }
      return out;
    },
  },
  {
    id: "customer-format",
    description: "Messages to the customer are prose, not a raw JSON object.",
    run(ctx) {
      const out: Finding[] = [];
      for (const turn of ctx.t.turns) {
        if (turn.role !== "assistant" || !turn.text) continue;
        const s = turn.text.trim();
        if (s.startsWith("{") && s.endsWith("}") && /^\{\s*"(message|type|content|response)"/.test(s)) {
          out.push(f("customer-format", "major", turn.idx, `customer-facing reply is a JSON object: ${s.slice(0, 60)}`));
        }
      }
      return out;
    },
  },
  {
    id: "write-error",
    description: "No write tool call returns an error.",
    run(ctx) {
      return ctx.writes()
        .filter((w) => w.result?.isError)
        .map((w) => f("write-error", "minor", w.turnIdx,
          `${w.call.name} failed: ${w.result!.content.slice(0, 160)}`));
    },
  },
];

export function runChecks(t: Trajectory, only?: Set<string>): Finding[] {
  const ctx = new Ctx(t);
  return checks.filter((c) => !only || only.has(c.id)).flatMap((c) => c.run(ctx));
}
