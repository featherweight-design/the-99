import { describe, expect, it } from "vitest";
import { matchRows } from "./match";
import type { CollectionRow } from "../manabox/parse";

const catalog = [
  { oracleId: "o-1", scryfallId: "s-1", name: "Sol Ring" },
  { oracleId: "o-2", scryfallId: "s-2", name: "Fable of the Mirror-Breaker // Reflection of Kiki-Jiki" },
];
const row = (name: string, scryfallId: string | null = null, line = 2): CollectionRow =>
  ({ name, setCode: "x", collectorNumber: "1", quantity: 1, scryfallId, finish: "nonfoil", condition: null, line });

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
  it("matches a split card written with a single slash", () => {
    const { matched } = matchRows(
      [row("Fable of the Mirror-Breaker / Reflection of Kiki-Jiki")],
      catalog,
    );
    expect(matched[0].oracleId).toBe("o-2");
  });
  it("matches a split card written with no spaces around the slash", () => {
    const { matched } = matchRows(
      [row("Fable of the Mirror-Breaker/Reflection of Kiki-Jiki")],
      catalog,
    );
    expect(matched[0].oracleId).toBe("o-2");
  });
  it("matches a split card whose catalog name is itself single-slashed", () => {
    // Defensive: the catalog is Scryfall's and always double-slashes, but the index
    // key and the incoming name must normalise identically or the symmetry breaks.
    const { matched } = matchRows([row("Fire // Ice")], [
      { oracleId: "o-3", scryfallId: "s-3", name: "Fire / Ice" },
    ]);
    expect(matched[0].oracleId).toBe("o-3");
  });
  it("reports unmatched rows with their original line number", () => {
    const { matched, unmatched } = matchRows([row("Not A Card", null, 7)], catalog);
    expect(matched).toHaveLength(0);
    expect(unmatched[0].line).toBe(7);
  });

  it("resolves printing-level ids the oracle catalog does not carry (§3.6)", () => {
    // "p-99" is a real printing of o-1 but is not the arbitrary printing the oracle catalog
    // happens to hold, so before printings existed this row could only match by name.
    const { matched } = matchRows([row("Renamed By The User", "p-99")], catalog, {
      printings: [{ scryfallId: "p-99", oracleId: "o-1" }],
    });
    expect(matched[0].oracleId).toBe("o-1");
  });

  it("classifies a known token id as skipped-by-design, not unmatched (§9.1)", () => {
    const { matched, skipped, unmatched } = matchRows([row("Treasure", "t-1")], catalog, {
      skippedScryfallIds: ["t-1"],
    });
    expect(matched).toHaveLength(0);
    expect(unmatched).toHaveLength(0);
    expect(skipped.map((r) => r.name)).toEqual(["Treasure"]);
  });

  it("prefers the skipped ledger over a same-named real card", () => {
    // A token named "Sol Ring" must not import as the artifact.
    const { matched, skipped } = matchRows([row("Sol Ring", "t-2")], catalog, {
      skippedScryfallIds: ["t-2"],
    });
    expect(matched).toHaveLength(0);
    expect(skipped).toHaveLength(1);
  });

  it("keeps genuinely unknown ids unmatched even when a skipped ledger is present", () => {
    const { skipped, unmatched } = matchRows([row("Who Knows", "z-9")], catalog, {
      skippedScryfallIds: ["t-1"],
      printings: [{ scryfallId: "p-99", oracleId: "o-1" }],
    });
    expect(skipped).toHaveLength(0);
    expect(unmatched).toHaveLength(1);
  });
});
