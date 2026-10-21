import { describe, expect, it } from "vitest";

import { formReach, formReachCaption, type FormCard, type FormReachData } from "./form-reach";

const card = (id: string, over: Partial<FormCard> = {}): FormCard => ({
  id, name: id.toUpperCase(), identity: ["U"], gameChanger: false, massLandDenial: false, extraTurn: false,
  free: true, combos: [], searches: false, reaches: [], ...over,
});
const data = (cards: FormCard[], buyable: FormReachData["buyable"] = []): FormReachData => ({ cards, buyable });
const caption = (d: FormReachData, extra: Partial<Parameters<typeof formReachCaption>[0]> = {}) =>
  formReachCaption({ bracket: 3, colors: ["U"], match: "exactly", data: d, budgetDollars: null, ownedOnly: false, ...extra });

describe("formReach: the form's estimate across the colors picked", () => {
  it("reaches 3 with a free Game Changer in these colors", () => {
    expect(formReach({ match: "exactly", target: 3, colors: ["U"], data: data([card("rift", { gameChanger: true })]), budgetCents: null }))
      .toEqual({ target: 3, kind: "collection", raisers: ["rift"] });
  });

  it("under Any, reads every owned card: a commander with these colors may carry more (blue, a blue-black commander)", () => {
    const d = data([card("tutor", { gameChanger: true, identity: ["B"] })]);
    expect(formReach({ match: "contains", target: 3, colors: ["U"], data: d, budgetCents: null }).kind).toBe("collection");
    expect(formReach({ match: "exactly", target: 3, colors: ["U"], data: d, budgetCents: null }).kind).toBe("short");
    // Under Any the caption names no colors, since the cards that reach it may lie outside them.
    expect(caption(d, { match: "contains" })?.text).toBe("3 · Upgraded. Your cards would reach it.");
  });

  it("leaves out a card outside the colors picked, and reads all five with none picked", () => {
    const d = data([card("opp", { gameChanger: true, identity: ["W", "B"] })]);
    expect(formReach({ match: "exactly", target: 3, colors: ["U"], data: d, budgetCents: null }).kind).toBe("short");
    expect(formReach({ match: "exactly", target: 3, colors: [], data: d, budgetCents: null }).kind).toBe("collection");
  });

  it("reaches 3 with a combo whose both halves are owned, and not with one half outside the colors", () => {
    const edge = (partner: string) => ({ variantId: "v", partner, loop: false, partnerMustBeCommander: false });
    const pair = [card("a", { combos: [edge("b")] }), card("b", { combos: [edge("a")], identity: ["R"] })];
    expect(formReach({ match: "exactly", target: 3, colors: ["U", "R"], data: data(pair), budgetCents: null }).kind).toBe("collection");
    expect(formReach({ match: "exactly", target: 3, colors: ["U"], data: data(pair), budgetCents: null }).kind).toBe("short");
  });

  it("buys the cheapest stocked Game Changer in these colors, and a claimed owned copy is bought too", () => {
    const d = data([card("rift", { gameChanger: true, free: false })], [
      { id: "rift", name: "Cyclonic Rift", identity: ["U"], priceCents: 4_000 },
      { id: "study", name: "Rhystic Study", identity: ["U"], priceCents: 3_200 },
      { id: "tutor", name: "Demonic Tutor", identity: ["B"], priceCents: 1_000 },
    ]);
    expect(formReach({ match: "exactly", target: 3, colors: ["U"], data: d, budgetCents: null }))
      .toMatchObject({ kind: "short", collectionPermits: [1, 2], buy: { raisers: ["study"], buyCents: 3_200 } });
    // The claimed copy is the cheapest stocked one: it is bought, not skipped for being owned.
    const claimedCheapest = data([card("rift", { gameChanger: true, free: false })], [
      { id: "rift", name: "Cyclonic Rift", identity: ["U"], priceCents: 2_000 },
      { id: "study", name: "Rhystic Study", identity: ["U"], priceCents: 3_200 },
      { id: "tutor", name: "Demonic Tutor", identity: ["B"], priceCents: 1_000 },
    ]);
    expect(formReach({ match: "exactly", target: 3, colors: ["U"], data: claimedCheapest, budgetCents: null }))
      .toMatchObject({ kind: "short", buy: { raisers: ["rift"], buyCents: 2_000 } });
  });
});

describe("formReachCaption: board A's caption, from 3 up", () => {
  const study = { id: "study", name: "Rhystic Study", identity: ["U"], priceCents: 3_200 };

  it("draws nothing below 3, so today's caption stands", () => {
    expect(caption(data([]), { bracket: 2 })).toBeNull();
  });

  it("says the cards would reach it, as an estimate", () => {
    expect(caption(data([card("rift", { gameChanger: true })]))).toEqual({ text: "3 · Upgraded. Your cards in these colors would reach it.", short: false });
  });

  it("names the one card to buy and its price, and promises the choice on the new deck", () => {
    expect(caption(data([], [study]))?.text).toBe(
      "3 · Upgraded. From your cards in these colors, a deck would be bracket 1-2. Hitting 3 means buying Rhystic Study, about $32. You choose which on the new deck, after you pick a commander.",
    );
  });

  it("says it is over the budget when it is, and from outside the collection under own-only", () => {
    expect(caption(data([], [study]), { budgetDollars: 20 })?.text).toContain("buying about $32 of cards, over your $20 budget");
    expect(caption(data([], [study]), { ownedOnly: true })?.text).toContain("Rhystic Study, about $32, from outside your collection");
  });

  it("counts the Game Changers to buy at 5, leaving out the free one the player owns", () => {
    const gcs = ["g1", "g2", "g3"].map((id, i) => ({ id, name: id, identity: ["U"], priceCents: 1_000 * (i + 1) }));
    const text = caption(data([card("rift", { gameChanger: true })], gcs), { bracket: 5 })?.text;
    expect(text).toContain("a deck would be bracket 3. Hitting 5 means buying three more Game Changers, about $60.");
  });

  it("says when nothing stocked reaches it", () => {
    expect(caption(data([]))).toEqual({
      text: "3 · Upgraded. From your cards in these colors, a deck would be bracket 1-2, and no Game Changer to buy gets one to 3 here. The new deck checks again once you pick a commander.",
      short: true,
    });
  });
});
