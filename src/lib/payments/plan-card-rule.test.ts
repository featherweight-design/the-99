import { describe, expect, it } from "vitest";
import { chipFor } from "./chip-rule";
import { expiringPhrase } from "../model/credit-line";
import { cardPresses, planCardFacts, reachedChange, type PlanCardState } from "./plan-card-rule";

const NOW = new Date("2026-11-14T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;
const at = (ms: number) => new Date(NOW.getTime() + ms);
const sub = (status: string, cancel: boolean, end: Date | null) => ({ status, cancelAtPeriodEnd: cancel, currentPeriodEnd: end });

describe("planCardFacts", () => {
  it("K1: no subscription is the offer", () => {
    expect(planCardFacts(null, {}, NOW)).toEqual({ state: "offer", endsAt: null, days: null });
  });

  it.each(["canceled", "incomplete_expired"])("K6: an ended subscription (%s) is the offer again", (status) => {
    expect(planCardFacts(sub(status, false, at(-DAY)), {}, NOW).state).toBe("offer");
    // Even one whose period end is still ahead: a resubscribe is a new subscription.
    expect(planCardFacts(sub(status, true, at(10 * DAY)), { planExpiresAt: at(10 * DAY) }, NOW).state).toBe("offer");
  });

  it.each(["active", "trialing"])("K2: %s and renewing is active, with the renewal date", (status) => {
    expect(planCardFacts(sub(status, false, at(20 * DAY)), {}, NOW)).toEqual({ state: "active", endsAt: at(20 * DAY), days: null });
  });

  it.each(["past_due", "unpaid"])("K5: %s is past due, even when it is cancelling", (status) => {
    expect(planCardFacts(sub(status, false, at(2 * DAY)), {}, NOW).state).toBe("pastDue");
    expect(planCardFacts(sub(status, true, at(2 * DAY)), {}, NOW).state).toBe("pastDue");
  });

  it("K3: cancelled with the month still running is cancelled, with lots of days left", () => {
    expect(planCardFacts(sub("active", true, at(20 * DAY)), { planExpiresAt: at(20 * DAY) }, NOW)).toEqual({ state: "cancelled", endsAt: at(20 * DAY), days: 20 });
  });

  it("K4: the boundary is exactly three days, the credit line's own (inclusive)", () => {
    expect(planCardFacts(sub("active", true, at(3 * DAY)), {}, NOW).state).toBe("ending");
    expect(planCardFacts(sub("active", true, at(3 * DAY + 1)), {}, NOW).state).toBe("cancelled");
  });

  it("K4: counts whole days up, and says 0 once the end has passed but the webhook has not ended the plan", () => {
    expect(planCardFacts(sub("active", true, at(2 * DAY - 1000)), {}, NOW).days).toBe(2);
    expect(planCardFacts(sub("active", true, at(1000)), {}, NOW).days).toBe(1);
    expect(planCardFacts(sub("active", true, at(-1000)), {}, NOW)).toMatchObject({ state: "ending", days: 0 });
  });

  it("reads the end from the lots' own expiry before the period end, and from the period end without one", () => {
    expect(planCardFacts(sub("active", true, at(30 * DAY)), { planExpiresAt: at(2 * DAY) }, NOW).state).toBe("ending");
    expect(planCardFacts(sub("active", true, at(2 * DAY)), {}, NOW).state).toBe("ending");
    expect(planCardFacts(sub("active", true, null), {}, NOW)).toEqual({ state: "cancelled", endsAt: null, days: null });
  });

  it("an incomplete first payment is not an offer (Checkout would refuse it as already)", () => {
    expect(planCardFacts(sub("incomplete", false, null), {}, NOW).state).toBe("active");
  });

  // L7 and the menu chip's expiring state read the allowance, not this rule: the same cancelled plan has to light both.
  it("L7 and the chip's expiring state show for a plan this rule calls ending, and not for one it calls cancelled", () => {
    const allowance = (end: Date) => ({ used: 1, limit: 5, nextAt: null, reopensAt: null, plan: 74, planExpiring: 74, planExpiresAt: end });
    const ending = planCardFacts(sub("active", true, at(2 * DAY)), { planExpiresAt: at(2 * DAY) }, NOW);
    expect(ending.state).toBe("ending");
    expect(expiringPhrase(allowance(at(2 * DAY)), NOW)).toBe("74 plan credits expire Nov 16");
    expect(chipFor({ allowance: allowance(at(2 * DAY)), switchOn: true, everBought: true }, NOW)).toMatchObject({ kind: "expiring", line: "74 plan credits expire Nov 16" });
    const later = planCardFacts(sub("active", true, at(20 * DAY)), { planExpiresAt: at(20 * DAY) }, NOW);
    expect(later.state).toBe("cancelled");
    expect(expiringPhrase(allowance(at(20 * DAY)), NOW)).toBeNull();
    expect(chipFor({ allowance: allowance(at(20 * DAY)), switchOn: true, everBought: true }, NOW)?.kind).toBe("credits");
  });
});

describe("reachedChange", () => {
  it("a cancel is reached by any cancelled state or an ended plan, never by active or past due", () => {
    const reached = (["offer", "active", "cancelled", "ending", "pastDue"] as PlanCardState[]).filter((s) => reachedChange("cancel", s));
    expect(reached).toEqual(["offer", "cancelled", "ending"]);
  });
  it("a keep is reached by active alone", () => {
    const reached = (["offer", "active", "cancelled", "ending", "pastDue"] as PlanCardState[]).filter((s) => reachedChange("keep", s));
    expect(reached).toEqual(["active"]);
  });
});

describe("cardPresses", () => {
  const all: PlanCardState[] = ["offer", "active", "cancelled", "ending", "pastDue"];
  it("draws each state's presses", () => {
    expect(Object.fromEntries(all.map((s) => [s, cardPresses(s, false)]))).toEqual({
      offer: { subscribe: true, keep: false, cancel: false, updateCard: false },
      active: { subscribe: false, keep: false, cancel: true, updateCard: true },
      cancelled: { subscribe: false, keep: true, cancel: false, updateCard: false },
      ending: { subscribe: false, keep: true, cancel: false, updateCard: false },
      pastDue: { subscribe: false, keep: false, cancel: true, updateCard: true },
    });
  });
  it("reduced takes away Subscribe and Keep my plan and nothing else (O2, O3)", () => {
    for (const s of all) {
      const full = cardPresses(s, false);
      expect(cardPresses(s, true)).toEqual({ ...full, subscribe: false, keep: false });
    }
  });
});
