import { describe, expect, it, vi } from "vitest";

vi.mock("../../../db", () => ({ db: {} }));
vi.mock("../../decks/versions", () => ({ commitVersion: vi.fn() }));

const { upgradedDeck } = await import("./apply");

const box = { commanderOracleId: "rootha", partnerOracleId: null, cards: [{ oracleId: "muddle", quantity: 1 }, { oracleId: "a", quantity: 1 }, { oracleId: "b", quantity: 1 }, { oracleId: "island", quantity: 9 }] };
const sorted = (cards: { oracleId: string; quantity: number }[]) => [...cards].sort((x, y) => x.oracleId.localeCompare(y.oracleId));

describe("upgradedDeck", () => {
  it("applies each pair: the cut goes, the add comes, the count holds", () => {
    const out = upgradedDeck(box, { lead: null, pairs: [{ cutId: "a", addId: "x" }, { cutId: "b", addId: "y" }] });
    expect(out.commanderOracleId).toBe("rootha");
    expect(sorted(out.cards)).toEqual(sorted([{ oracleId: "muddle", quantity: 1 }, { oracleId: "x", quantity: 1 }, { oracleId: "y", quantity: 1 }, { oracleId: "island", quantity: 9 }]));
    expect(out.cards.reduce((n, c) => n + c.quantity, 0)).toBe(box.cards.reduce((n, c) => n + c.quantity, 0));
  });
  it("leading with the alternate seats it and puts the box's commander among the 99, where a pair may cut it", () => {
    const led = upgradedDeck(box, { lead: "muddle", pairs: [] });
    expect(led.commanderOracleId).toBe("muddle");
    expect(led.cards.find((c) => c.oracleId === "rootha")?.quantity).toBe(1);
    expect(led.cards.some((c) => c.oracleId === "muddle")).toBe(false);
    const cut = upgradedDeck(box, { lead: "muddle", pairs: [{ cutId: "rootha", addId: "x" }] });
    expect(cut.cards.some((c) => c.oracleId === "rootha")).toBe(false);
    expect(cut.cards.reduce((n, c) => n + c.quantity, 0)).toBe(box.cards.reduce((n, c) => n + c.quantity, 0));
  });
  it("a partnered box keeps both commanders and never seats a lead", () => {
    const pair = { ...box, partnerOracleId: "yasmin" };
    const out = upgradedDeck(pair, { lead: null, pairs: [{ cutId: "a", addId: "x" }] });
    expect([out.commanderOracleId, out.partnerOracleId]).toEqual(["rootha", "yasmin"]);
  });
});
