import { describe, expect, it } from "vitest";
import { matchRows } from "./match";

const catalog = [
  { oracleId: "o-1", scryfallId: "s-1", name: "Sol Ring" },
  { oracleId: "o-2", scryfallId: "s-2", name: "Fable of the Mirror-Breaker // Reflection of Kiki-Jiki" },
];
const row = (name: string, scryfallId: string | null = null, line = 2) =>
  ({ name, setCode: "X", quantity: 1, scryfallId, foil: false, condition: null, line });

describe("matchRows", () => {
  it("uses scryfall id when it matches the seeded printing (opportunistic fast path)", () => {
    const { matched } = matchRows([row("Wrong Name", "s-1")], catalog);
    expect(matched[0].oracleId).toBe("o-1");
  });
  it("falls back to case-insensitive exact name", () => {
    const { matched } = matchRows([row("sol ring")], catalog);
    expect(matched[0].oracleId).toBe("o-1");
  });
  it("matches a front-face name against a double-faced catalog name", () => {
    const { matched } = matchRows([row("Fable of the Mirror-Breaker")], catalog);
    expect(matched[0].oracleId).toBe("o-2");
  });
  it("reports unmatched rows with their original line number", () => {
    const { matched, unmatched } = matchRows([row("Not A Card", null, 7)], catalog);
    expect(matched).toHaveLength(0);
    expect(unmatched[0].line).toBe(7);
  });
});
