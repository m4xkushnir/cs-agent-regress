import { describe, expect, it } from "vitest";
import { runChecks } from "../src/checks/rules.js";
import { triage } from "../src/triage.js";
import { auth, exchangeArgs, goodExchange, lookOrder, traj } from "./helpers.js";

const expected = [{ name: "exchange_delivered_order_items", args: exchangeArgs }];

describe("triage", () => {
  it("spots a simulated customer who confirms and hangs up in one message", () => {
    const steps = goodExchange().slice(0, -3);
    steps.push(["user", "Yes, please proceed. ###STOP###"]);
    expect(triage(traj(steps, { reward: 0, expectedActions: expected }))).toBe("sim-stop-on-confirm");
  });

  it("separates a wrong replacement item from a wrong payment method", () => {
    const variant = traj(goodExchange(), { reward: 0, expectedActions: [{ name: expected[0]!.name, args: { ...exchangeArgs, new_item_ids: ["333"] } }] });
    const payment = traj(goodExchange(), { reward: 0, expectedActions: [{ name: expected[0]!.name, args: { ...exchangeArgs, payment_method_id: "gift_card_1" } }] });
    expect(triage(variant)).toBe("wrong-variant");
    expect(triage(payment)).toBe("wrong-payment-method");
  });

  it("labels a transfer that left a write undone", () => {
    const steps = [...auth, lookOrder, ["user", "Get me a human. ###TRANSFER###"]] as ReturnType<typeof goodExchange>;
    expect(triage(traj(steps, { reward: 0, expectedActions: expected }))).toBe("ended-in-transfer");
  });

  it("labels a correct database with a missed statement as communication-only", () => {
    const t = traj(goodExchange(), { reward: 0, expectedActions: expected, nlAssertions: [{ text: "x", met: false }] });
    expect(triage(t)).toBe("communication-only");
  });
});

describe("customer-format", () => {
  it("flags a JSON object sent to the customer and leaves prose alone", () => {
    const steps = goodExchange();
    steps.push(["say", '{ "message": "Your exchange is done." }']);
    expect(runChecks(traj(steps)).map((f) => f.check)).toEqual(["customer-format"]);
    expect(runChecks(traj(goodExchange()))).toEqual([]);
  });
});
