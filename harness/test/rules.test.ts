import { describe, expect, it } from "vitest";
import { diffExpectedWrites } from "../src/checks/expected.js";
import { isAffirmative, runChecks } from "../src/checks/rules.js";
import { auth, exchangeArgs, goodExchange, lookOrder, lookProduct, traj } from "./helpers.js";

const ids = (t: ReturnType<typeof traj>) => runChecks(t).map((f) => f.check).sort();

describe("rule checks", () => {
  it("passes a clean exchange", () => {
    expect(runChecks(traj(goodExchange()))).toEqual([]);
  });

  it("flags a lookup before authentication", () => {
    expect(ids(traj([lookOrder, ...goodExchange()]))).toContain("auth-first");
  });

  it("flags a write without an explicit yes", () => {
    const steps = goodExchange();
    steps[steps.length - 3] = ["user", "Hmm, what would the price difference be?"];
    expect(ids(traj(steps))).toContain("confirm-before-write");
  });

  it("treats a yes that is then retracted as not confirming", () => {
    const steps = goodExchange();
    steps[steps.length - 3] = ["user", "Yes. Actually, wait, hold on a second."];
    expect(ids(traj(steps))).toContain("confirm-before-write");
  });

  it("reads 'no longer needed' as a reason, not a retraction", () => {
    expect(isAffirmative("Yes to all. No longer needed.")).toBe(true);
  });

  it("reads a yes after an initial no as confirming", () => {
    expect(isAffirmative("No. That's ridiculous. Fine, do the returns. YES.")).toBe(true);
  });

  it("accepts a yes given before a follow-up question", () => {
    const steps = goodExchange();
    steps.splice(steps.length - 2, 0, ["say", "One more thing: what is the reason?"], ["user", "Ordered by mistake."]);
    expect(runChecks(traj(steps))).toEqual([]);
  });

  it("flags a confirmed message that never named the order", () => {
    const steps = goodExchange();
    steps[steps.length - 4] = ["say", "Shall I go ahead with the exchange?"];
    expect(ids(traj(steps))).toEqual(["details-before-confirm"]);
  });

  it("flags a write on an order that was never read", () => {
    const steps = goodExchange().filter((s) => s !== lookOrder);
    expect(ids(traj(steps))).toContain("status-before-write");
  });

  it("flags acting on an order in the wrong status", () => {
    const pending = ["call", "get_order_details", { order_id: "#W100" },
      { order_id: "#W100", user_id: "ana_1", status: "pending", items: [], payment_history: [] }] as const;
    const steps = goodExchange().map((s) => (s === lookOrder ? [...pending] : s)) as ReturnType<typeof goodExchange>;
    const f = runChecks(traj(steps)).find((x) => x.check === "status-before-write");
    expect(f?.severity).toBe("critical");
  });

  it("flags an invented replacement item id", () => {
    const steps = goodExchange();
    steps[steps.length - 2] = ["call", "exchange_delivered_order_items", { ...exchangeArgs, new_item_ids: ["999"] }, {}];
    expect(ids(traj(steps))).toEqual(["grounded-ids", "same-product"]);
  });

  it("flags a second exchange call on the same order", () => {
    const steps = goodExchange();
    steps.push(["user", "Yes, also the other one."], ["call", "exchange_delivered_order_items", exchangeArgs, {}]);
    expect(ids(traj(steps))).toContain("once-per-order");
  });

  it("flags a refund to a method that is neither original nor a gift card", () => {
    const steps = [...auth, lookOrder,
      ["say", "I'll return item 111 from #W100 to paypal_3. Proceed?"],
      ["user", "yes"],
      ["call", "return_delivered_order_items", { order_id: "#W100", item_ids: ["111"], payment_method_id: "paypal_3" }, {}],
    ] as ReturnType<typeof goodExchange>;
    expect(ids(traj(steps))).toEqual(["grounded-ids", "refund-destination"]);
  });

  it("allows a refund to a gift card", () => {
    const steps = [...auth, lookOrder,
      ["user", "Refund to gift_card_5 please"],
      ["say", "Return item 111 from #W100 to gift_card_5. Proceed?"],
      ["user", "yes"],
      ["call", "return_delivered_order_items", { order_id: "#W100", item_ids: ["111"], payment_method_id: "gift_card_5" }, {}],
    ] as ReturnType<typeof goodExchange>;
    expect(runChecks(traj(steps))).toEqual([]);
  });

  it("flags a replacement that is not a variant of the product", () => {
    const steps = goodExchange().map((s) => (s === lookProduct
      ? ["call", "get_product_details", { product_id: "P1" }, { product_id: "P1", variants: { "111": {} } }]
      : s)) as ReturnType<typeof goodExchange>;
    steps.splice(steps.length - 3, 0, ["user", "I saw item 222 on the site"]);
    steps.splice(steps.length - 3, 0, ["say", "Exchange 111 in #W100 for 222, ok?"]);
    expect(ids(traj(steps))).toContain("same-product");
  });

  it("flags an exchange of an item for itself", () => {
    const steps = goodExchange();
    steps[steps.length - 2] = ["call", "exchange_delivered_order_items", { ...exchangeArgs, new_item_ids: ["111"] }, {}];
    expect(ids(traj(steps))).toEqual(["different-option"]);
  });

  it("flags an invalid cancellation reason", () => {
    const steps = [...auth,
      ["call", "get_order_details", { order_id: "#W100" }, { order_id: "#W100", user_id: "ana_1", status: "pending" }],
      ["say", "Cancel #W100 because it's too expensive?"],
      ["user", "yes"],
      ["call", "cancel_pending_order", { order_id: "#W100", reason: "too expensive" }, {}],
    ] as ReturnType<typeof goodExchange>;
    expect(ids(traj(steps))).toEqual(["cancel-reason"]);
  });

  it("flags a transfer without the hold message", () => {
    const steps = [...auth, ["call", "transfer_to_human_agents", { summary: "x" }, "ok"], ["say", "Bye"]] as ReturnType<typeof goodExchange>;
    expect(ids(traj(steps))).toEqual(["transfer-protocol"]);
  });

  it("flags a write for another user", () => {
    const steps = goodExchange().map((s) => (s === lookOrder
      ? ["call", "get_order_details", { order_id: "#W100" }, { order_id: "#W100", user_id: "bob_2", status: "delivered", items: [], payment_history: [] }]
      : s)) as ReturnType<typeof goodExchange>;
    expect(ids(traj(steps))).toContain("same-user");
  });
});

describe("expected-writes diff", () => {
  it("reports a wrong argument by key", () => {
    const t = traj(goodExchange(), {
      expectedActions: [{ name: "exchange_delivered_order_items", args: { ...exchangeArgs, payment_method_id: "gift_card_5" } }],
    });
    const [f] = diffExpectedWrites(t);
    expect(f?.message).toBe('wrong argument in exchange_delivered_order_items: payment_method_id: expected "gift_card_5", got "credit_card_9"');
  });

  it("reports missing and unexpected writes", () => {
    const t = traj(goodExchange(), { expectedActions: [{ name: "cancel_pending_order", args: { order_id: "#W7" } }] });
    expect(diffExpectedWrites(t).map((f) => f.message.split(" ").slice(0, 2).join(" "))).toEqual(["missing write", "unexpected write"]);
  });

  it("ignores failed write attempts", () => {
    const steps = goodExchange();
    steps[steps.length - 2] = ["call", "exchange_delivered_order_items", exchangeArgs, "Error: bad", true];
    const t = traj(steps, { expectedActions: [] });
    expect(diffExpectedWrites(t)).toEqual([]);
    expect(runChecks(t).map((f) => f.check)).toEqual(["write-error"]);
  });
});
