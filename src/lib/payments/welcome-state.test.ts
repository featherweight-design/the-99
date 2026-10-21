import { describe, expect, it } from "vitest";
import { EXPIRY_WARNING_MS } from "../model/credit-line";
import { welcomeState, type WelcomeLot, type WelcomeStateInput } from "./welcome-state";

// Fixtures as the handoff draws them: 15 credits, expiring Nov 20.
const EXPIRES = new Date("2026-11-20T12:00:00Z");
const NOW = new Date("2026-10-25T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;
const lot = (over: Partial<WelcomeLot> = {}): WelcomeLot => ({ units: 15, left: 15, expiresAt: EXPIRES, expired: false, ...over });
const state = (over: Partial<WelcomeStateInput> = {}) =>
  welcomeState({ lot: lot(), now: NOW, dismissedAt: null, everBought: false, payments: true, ...over });

describe("welcomeState (STATES-welcome-credits.md)", () => {
  it("held: not expired, every credit left", () => {
    expect(state()).toEqual({ kind: "held", lot: "held", units: 15, left: 15, expiresAt: EXPIRES, teaser: true });
  });

  it("partly: some spent, some left", () => {
    expect(state({ lot: lot({ left: 9 }) })).toMatchObject({ kind: "partly", left: 9 });
    expect(state({ lot: lot({ left: 14 }) }).kind).toBe("partly");
    expect(state({ lot: lot({ left: 1 }) }).kind).toBe("partly");
  });

  it("usedUp: nothing left and not expired, never none (the read that tells them apart is the point)", () => {
    expect(state({ lot: lot({ left: 0 }) })).toMatchObject({ kind: "usedUp", left: 0 });
  });

  it("expiring: a credit left within three days, held or partly, and not a moment before", () => {
    const at = (ms: number) => new Date(EXPIRES.getTime() - ms);
    expect(state({ now: at(EXPIRY_WARNING_MS) }).kind).toBe("expiring");
    expect(state({ now: at(DAY), lot: lot({ left: 9 }) }).kind).toBe("expiring");
    expect(state({ now: at(EXPIRY_WARNING_MS + 1) }).kind).toBe("held");
  });

  it("a used-up lot near its date is used up, not expiring: there is nothing to warn about", () => {
    expect(state({ now: new Date(EXPIRES.getTime() - DAY), lot: lot({ left: 0 }) }).kind).toBe("usedUp");
  });

  it("none: no lot, or the lot expired (by the read's flag or by the date), whatever is left", () => {
    expect(state({ lot: null })).toEqual({ kind: "none" });
    expect(state({ lot: lot({ expired: true, left: 0 }) })).toEqual({ kind: "none" });
    expect(state({ now: EXPIRES })).toEqual({ kind: "none" });
    expect(state({ now: new Date(EXPIRES.getTime() + DAY), lot: lot({ left: 0 }) })).toEqual({ kind: "none" });
  });

  it("dismissed: the strip is gone, and the lot's own state rides along for the cell and the sheet", () => {
    const dismissedAt = new Date("2026-10-22T00:00:00Z");
    expect(state({ dismissedAt })).toMatchObject({ kind: "dismissed", lot: "held", left: 15 });
    expect(state({ dismissedAt, lot: lot({ left: 9 }), now: new Date(EXPIRES.getTime() - DAY) })).toMatchObject({ kind: "dismissed", lot: "expiring" });
    // Expired outranks dismissed: nothing anywhere.
    expect(state({ dismissedAt, now: EXPIRES })).toEqual({ kind: "none" });
  });

  it("the teaser: payments on and nothing bought; absent with payments off or once anything is bought", () => {
    expect(state().kind === "none" ? null : state()).toMatchObject({ teaser: true });
    expect(state({ payments: false })).toMatchObject({ teaser: false });
    expect(state({ everBought: true })).toMatchObject({ teaser: false });
    expect(state({ lot: lot({ left: 0 }), everBought: true })).toMatchObject({ kind: "usedUp", teaser: false });
  });
});
