import { describe, expect, it } from "vitest";

import type { DemoCardData, DemoCardDetail } from "../../../lib/demo/project-cards";
import { detailFor } from "./demo-detail";

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
