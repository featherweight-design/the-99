import { describe, expect, it } from "vitest";

import { formReach, formReachCaption, type FormCard, type FormReachData } from "./form-reach";

const card = (id: string, over: Partial<FormCard> = {}): FormCard => ({
  id, name: id.toUpperCase(), identity: ["U"], gameChanger: false, massLandDenial: false, extraTurn: false,
  free: true, combos: [], searches: false, reaches: [], ...over,
});
const data = (cards: FormCard[]): FormReachData => ({ cards });
const caption = (d: FormReachData, extra: Partial<Parameters<typeof formReachCaption>[0]> = {}) =>
  formReachCaption({ bracket: 3, colors: ["U"], match: "exactly", data: d, ...extra });
const edge = (partner: string) => ({ variantId: "v", partner, loop: false, partnerMustBeCommander: false });

describe("formReach: the form's estimate across the colors picked, from the collection alone", () => {
  it("reaches 3 with a free Game Changer in these colors", () => {
    expect(formReach({ match: "exactly", target: 3, colors: ["U"], data: data([card("rift", { gameChanger: true })]) }))
      .toEqual({ target: 3, kind: "collection", raisers: ["rift"] });
  });

  it("under Any, reads every owned card: a commander with these colors may carry more (blue, a blue-black commander)", () => {
    const d = data([card("tutor", { gameChanger: true, identity: ["B"] })]);
    expect(formReach({ match: "contains", target: 3, colors: ["U"], data: d }).kind).toBe("collection");
    expect(formReach({ match: "exactly", target: 3, colors: ["U"], data: d }).kind).toBe("short");
    expect(caption(d, { match: "contains" })?.text).toBe("3 · Upgraded. Your cards would reach it.");
  });

  it("leaves out a card outside the colors picked, and reads all five with none picked", () => {
    const d = data([card("opp", { gameChanger: true, identity: ["W", "B"] })]);
    expect(formReach({ match: "exactly", target: 3, colors: ["U"], data: d }).kind).toBe("short");
    expect(formReach({ match: "exactly", target: 3, colors: [], data: d }).kind).toBe("collection");
  });

  it("reaches 3 with a combo whose both halves are owned, and not with one half outside the colors", () => {
    const pair = [card("a", { combos: [edge("b")] }), card("b", { combos: [edge("a")], identity: ["R"] })];
    expect(formReach({ match: "exactly", target: 3, colors: ["U", "R"], data: data(pair) }).kind).toBe("collection");
    expect(formReach({ match: "exactly", target: 3, colors: ["U"], data: data(pair) }).kind).toBe("short");
  });

  it("never counts a claimed copy: the collection half takes free copies only", () => {
    expect(formReach({ match: "exactly", target: 3, colors: ["U"], data: data([card("rift", { gameChanger: true, free: false })]) }))
      .toMatchObject({ kind: "short", collectionPermits: [1, 2], buy: null });
  });
});

describe("formReachCaption: board A's caption, from 3 up", () => {
  it("draws nothing below 3, so today's caption stands", () => {
    expect(caption(data([]), { bracket: 2 })).toBeNull();
  });

  it("says the cards would reach it, as an estimate", () => {
    expect(caption(data([card("rift", { gameChanger: true })]))).toEqual({ text: "3 · Upgraded. Your cards in these colors would reach it.", short: false });
  });

  it("short: states the reach and names no buy, since no result row could offer the same one (Hugh's ruling (a))", () => {
    expect(caption(data([]))).toEqual({
      text: "3 · Upgraded. From your cards in these colors, a deck would be bracket 1-2. What reaching 3 takes depends on the commander: the new deck shows it once you pick one.",
      short: true,
    });
    // At 5 over one free Game Changer: the deck would be 3, and the buy is still the commander's to say.
    expect(caption(data([card("rift", { gameChanger: true })]), { bracket: 5 })?.text)
      .toBe("5 · cEDH. From your cards in these colors, a deck would be bracket 3. What reaching 5 takes depends on the commander: the new deck shows it once you pick one.");
  });
});
