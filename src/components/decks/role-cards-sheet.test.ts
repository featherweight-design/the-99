import { describe, expect, it } from "vitest";
import type { DeckDetailCard } from "../../lib/decks/grouping";
import type { JobRowsByCard } from "../../lib/decks/job-tally";
import { roleCardsOf } from "./role-cards-sheet";

const card = (oracleId: string, name: string, role: string, quantity = 1) =>
  ({ oracleId, name, printedName: null, role, quantity }) as unknown as DeckDetailCard;

const BY_CARD: JobRowsByCard = { zap: ["removal"], rift: ["removal", "wipes"], bow: ["removal"] };
const cards = [card("zap", "Zap", "removal"), card("rift", "Cyclonic Rift", "wipes"), card("bow", "Bow", "removal", 2)];

describe("roleCardsOf", () => {
  it("lists a role's members A to Z and counts their copies", () => {
    const open = roleCardsOf("removal", cards, [], BY_CARD);
    expect(open.members.map((c) => c.name)).toEqual(["Bow", "Cyclonic Rift", "Zap"]);
    expect(open.count).toBe(4);
  });

  it("lists a card that fills two roles in both", () => {
    expect(roleCardsOf("wipes", cards, [], BY_CARD).members.map((c) => c.name)).toEqual(["Cyclonic Rift"]);
  });

  it("holds a removed card's slot as spent only while the card is out of the list", () => {
    const removed = card("zap", "Zap", "removal");
    const without = cards.filter((c) => c.oracleId !== "zap");
    expect(roleCardsOf("removal", without, [removed], BY_CARD)).toMatchObject({ spent: [removed], count: 3 });
    expect(roleCardsOf("removal", cards, [removed], BY_CARD).spent).toEqual([]);
  });

  it("is empty for a role with no cards, which is what closes the sheet", () => {
    const open = roleCardsOf("ramp", cards, [], BY_CARD);
    expect(open.members).toEqual([]);
    expect(open.spent).toEqual([]);
  });
});
