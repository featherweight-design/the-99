import { describe, expect, it } from "vitest";
import { CARD_W, STEPS, cutoutFor, placeCard } from "./tour-steps";

const FRAME = { w: 1280, h: 800 };
const card = { w: CARD_W, h: 260 };

describe("the tour's stops", () => {
  it("runs six steps in the drawn order, Buying lighting Decks", () => {
    expect(STEPS.map((s) => s.key)).toEqual(["collection", "commanders", "decks", "buying", "look", "whatsNew"]);
    expect(STEPS.map((s) => s.target)).toEqual(["tour:step-one", "tour:commanders", "tour:decks", "tour:decks", "tour:account", "tour:banner"]);
    expect(STEPS.filter((s) => s.picture).map((s) => s.picture)).toEqual(["tour-commanders", "tour-decks", "tour-shopping"]);
  });
});

describe("cutoutFor", () => {
  it("gives a slot 5px of room and a 14 corner, the account button 4px and a round one, a card 8 and 20", () => {
    expect(cutoutFor({ x: 12, y: 163, w: 38, h: 38 }, "slot")).toEqual({ x: 7, y: 158, w: 48, h: 48, r: 14 });
    expect(cutoutFor({ x: 13, y: 750, w: 36, h: 36 }, "account")).toEqual({ x: 9, y: 746, w: 44, h: 44, r: 22 });
    // The header's 38px square, inside the button's 3px pad: 4px of room and a 15 corner at 390.
    expect(cutoutFor({ x: 326, y: 20, w: 44, h: 44 }, "account", true)).toEqual({ x: 325, y: 19, w: 46, h: 46, r: 15 });
    expect(cutoutFor({ x: 90, y: 186, w: 1162, h: 304 }, "card").r).toBe(20);
    expect(cutoutFor({ x: 90, y: 120, w: 1162, h: 46 }, "banner")).toMatchObject({ x: 82, w: 1178, r: 16 });
  });
});

describe("placeCard, against the boards' step geometry", () => {
  it("puts step 1's card under the lit card, at its end", () => {
    expect(placeCard("below-end", { x: 90, y: 186, w: 1162, h: 304 }, card, { w: 1280, h: 900 })).toEqual({ x: 912, y: 504 });
  });

  it("puts it above the lit card when the frame has no room below, never over it", () => {
    const p = placeCard("below-end", { x: 90, y: 400, w: 1162, h: 304 }, card, FRAME);
    expect(p.y + card.h).toBeLessThanOrEqual(400 - 14);
  });

  it("puts a slot's card beside the rail, its head level with the slot", () => {
    expect(placeCard("beside", { x: 12, y: 163, w: 38, h: 38 }, card, FRAME)).toEqual({ x: 74, y: 131 });
    expect(placeCard("beside", { x: 12, y: 247, w: 38, h: 38 }, card, FRAME)).toEqual({ x: 74, y: 215 });
  });

  it("stands the account step's card on the frame's foot, 14 above it", () => {
    const p = placeCard("beside-foot", { x: 13, y: 750, w: 36, h: 36 }, card, FRAME);
    expect(p).toEqual({ x: 73, y: FRAME.h - card.h - 14 });
  });

  it("puts step 6's card under the banner, at its start", () => {
    expect(placeCard("below-start", { x: 90, y: 120, w: 1162, h: 46 }, card, FRAME)).toEqual({ x: 90, y: 184 });
  });

  it("centres the card when Home draws no line to light (R3 gap 6)", () => {
    expect(placeCard("below-start", null, card, FRAME)).toEqual({ x: (1280 - CARD_W) / 2, y: (800 - 260) / 2 });
  });

  it("keeps the card 14px inside the frame", () => {
    const p = placeCard("beside", { x: 1200, y: 2, w: 38, h: 38 }, card, FRAME);
    expect(p.x).toBe(1280 - CARD_W - 14);
    expect(p.y).toBe(14);
  });
});
