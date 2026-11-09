import { describe, expect, it } from "vitest";

import type { DemoCardData, DemoCardDetail } from "../../../lib/demo/project-cards";
import { cardStepsFor, detailFor } from "./demo-detail";

const detail = (oracleId: string, extra: Record<string, unknown> = {}) => ({ oracleId, name: oracleId, ...extra }) as unknown as DemoCardDetail;
const combos = (id: string) => [{ id }] as unknown as NonNullable<DemoCardDetail["cardCombos"]>;
const cardsWith = (over: Partial<DemoCardData["deckCombos"]> = {}): DemoCardData => ({
  cardDetails: { o1: detail("o1", { cardCombos: combos("unscoped") }), o2: detail("o2") },
  deckCombos: { played: {}, over: {}, under: {}, ...over },
});

describe("detailFor", () => {
  it("returns the card's details as they are for a press with no deck, and for a deck that holds no override of it", () => {
    const data = cardsWith({ under: { o2: combos("under") } });
    expect(detailFor(data, "o1", null)).toBe(data.cardDetails.o1);
    expect(detailFor(data, "o1", "under")).toBe(data.cardDetails.o1);
    expect(detailFor(data, "o2", "played")).toBe(data.cardDetails.o2);
  });

  it("lays the deck's own combos over the card for a press from that deck, and only for that deck", () => {
    const data = cardsWith({ played: { o1: combos("played") } });
    expect(detailFor(data, "o1", "played")?.cardCombos).toEqual(combos("played"));
    expect(detailFor(data, "o1", "over")?.cardCombos).toEqual(combos("unscoped"));
    expect(detailFor(data, "o1", null)?.cardCombos).toEqual(combos("unscoped"));
  });

  it("removes the combos block where the deck's read finds none (a null override)", () => {
    const data = cardsWith({ over: { o1: null } });
    expect(detailFor(data, "o1", "over")).not.toHaveProperty("cardCombos");
    expect(detailFor(data, "o1", null)).toHaveProperty("cardCombos");
  });

  it("returns nothing for a card the data holds no details for", () => {
    expect(detailFor(cardsWith(), "o9", null)).toBeUndefined();
    expect(detailFor(cardsWith(), "o9", "played")).toBeUndefined();
  });
});

describe("cardStepsFor", () => {
  it("names the chunk of the step on screen: the binder for steps 1 to 3, the played deck's for 4 to 6", () => {
    expect([0, 1, 2].map((i) => cardStepsFor(i, "played"))).toEqual([["binder"], ["binder"], ["binder"]]);
    expect([3, 4, 5].map((i) => cardStepsFor(i, "played"))).toEqual([["played"], ["played"], ["played"]]);
  });

  it("loads both the over and the under chunk for step 7, whichever tab is open", () => {
    expect(cardStepsFor(6, null)).toEqual(["over", "under"]);
  });

  it("takes step 8's Shopping deck beside the binder for Which deck, and the binder alone with no shopping deck", () => {
    expect(cardStepsFor(7, "played")).toEqual(["binder", "played"]);
    expect(cardStepsFor(7, "under")).toEqual(["binder", "under"]);
    expect(cardStepsFor(7, null)).toEqual(["binder"]);
  });

  it("needs nothing for an index past the eight", () => {
    expect(cardStepsFor(8, "played")).toEqual([]);
  });
});
