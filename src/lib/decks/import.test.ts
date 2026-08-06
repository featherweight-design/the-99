import { describe, expect, it } from "vitest";
import type { CollectionRow } from "../manabox/parse";
import { buildDeckImport, type ImportCatalogCard } from "./import";

const ROW: CollectionRow = {
  name: "", setCode: "", collectorNumber: "", quantity: 1,
  scryfallId: null, finish: "nonfoil", condition: null, line: 1,
};

const card = (over: Partial<ImportCatalogCard> & { name: string }): ImportCatalogCard => ({
  oracleId: `oracle-${over.name.toLowerCase().replace(/[^a-z]+/g, "-")}`,
  scryfallId: `scry-${over.name.toLowerCase().replace(/[^a-z]+/g, "-")}`,
  typeLine: "Artifact",
  oracleText: null,
  ...over,
});

const SOL_RING = card({ name: "Sol Ring" });
const FOREST = card({ name: "Forest", typeLine: "Basic Land — Forest" });
const ATRAXA = card({ name: "Atraxa, Praetors' Voice", typeLine: "Legendary Creature — Phyrexian Angel Horror" });
const TYMNA = card({ name: "Tymna the Weaver", typeLine: "Legendary Creature — Human Cleric" });
const DELVER = card({
  name: "Delver of Secrets // Insectile Aberration",
  typeLine: "Creature — Human Insect",
});

const CATALOG = [SOL_RING, FOREST, ATRAXA, TYMNA, DELVER];

const build = (text: string, catalog: ImportCatalogCard[] = CATALOG) =>
  buildDeckImport({ text, catalog });

describe("buildDeckImport — line shapes", () => {
  it("reads '1x Sol Ring' and '1 Sol Ring' identically", () => {
    expect(build("1x Sol Ring").cards).toEqual([{ oracleId: SOL_RING.oracleId, quantity: 1 }]);
    expect(build("1 Sol Ring").cards).toEqual([{ oracleId: SOL_RING.oracleId, quantity: 1 }]);
  });

  it("ignores a trailing set code and collector number", () => {
    expect(build("1 Sol Ring (LTC) 284").cards).toEqual([
      { oracleId: SOL_RING.oracleId, quantity: 1 },
    ]);
  });

  it("ignores Moxfield's trailing annotations such as *F*", () => {
    expect(build("1 Sol Ring (C21) 263 *F*").cards).toEqual([
      { oracleId: SOL_RING.oracleId, quantity: 1 },
    ]);
  });

  it("matches a double-faced card written by its front face only", () => {
    expect(build("1 Delver of Secrets").cards).toEqual([
      { oracleId: DELVER.oracleId, quantity: 1 },
    ]);
  });

  it("merges two lines of the same card into one deck_cards row", () => {
    // deck_cards is keyed (deck_id, oracle_id); two rows would raise 23505.
    const result = build("5 Forest (M21) 274\n4 Forest (ZNR) 280");
    expect(result.cards).toEqual([{ oracleId: FOREST.oracleId, quantity: 9 }]);
  });

  it("returns nothing at all for an empty source", () => {
    const result = build("   \n\n");
    expect(result.cards).toEqual([]);
    expect(result.unresolved).toEqual([]);
    expect(result.notes).toEqual([]);
  });
});

describe("buildDeckImport — locked decision: sideboard and maybeboard are not imported", () => {
  it("drops every line after a SIDEBOARD marker and notes the count", () => {
    const result = build("1 Sol Ring\n\nSIDEBOARD:\n1 Forest\n1 Tymna the Weaver");
    expect(result.cards).toEqual([{ oracleId: SOL_RING.oracleId, quantity: 1 }]);
    expect(result.notes).toEqual([{ kind: "sectionSkipped", section: "sideboard", lineCount: 2 }]);
  });

  it("drops a maybeboard section under its own note", () => {
    const result = build("1 Sol Ring\nMaybeboard\n1 Forest");
    expect(result.cards).toEqual([{ oracleId: SOL_RING.oracleId, quantity: 1 }]);
    expect(result.notes).toEqual([{ kind: "sectionSkipped", section: "maybeboard", lineCount: 1 }]);
  });

  it("resumes importing when a Deck marker follows a sideboard section", () => {
    const result = build("SIDEBOARD:\n1 Tymna the Weaver\n\nDeck\n1 Sol Ring");
    expect(result.cards).toEqual([{ oracleId: SOL_RING.oracleId, quantity: 1 }]);
  });

  it("does not treat a card whose name starts with a marker word as a section header", () => {
    const sideboardish = card({ name: "Sideboard Shenanigans" });
    const result = build("1 Sideboard Shenanigans", [...CATALOG, sideboardish]);
    expect(result.cards).toEqual([{ oracleId: sideboardish.oracleId, quantity: 1 }]);
    expect(result.notes).toEqual([]);
  });
});

describe("buildDeckImport — locked decision: quantity > 1 on a non-basic imports at 1", () => {
  it("clamps a non-basic to quantity 1 and raises a note", () => {
    const result = build("3 Sol Ring");
    expect(result.cards).toEqual([{ oracleId: SOL_RING.oracleId, quantity: 1 }]);
    expect(result.notes).toEqual([
      { kind: "quantityClamped", name: "Sol Ring", requested: 3, sourceLine: 1 },
    ]);
  });

  it("leaves a basic land's quantity alone", () => {
    const result = build("10 Forest");
    expect(result.cards).toEqual([{ oracleId: FOREST.oracleId, quantity: 10 }]);
    expect(result.notes).toEqual([]);
  });
});

describe("buildDeckImport — locked decision: a commander also in the 99 is deduped silently", () => {
  it("drops the duplicate line and raises no note", () => {
    const result = build("1 Atraxa, Praetors' Voice *CMDR*\n1 Sol Ring\n1 Atraxa, Praetors' Voice");
    expect(result.declaredCommander).toEqual({
      oracleId: ATRAXA.oracleId,
      name: ATRAXA.name,
      sourceLine: 1,
    });
    expect(result.cards).toEqual([{ oracleId: SOL_RING.oracleId, quantity: 1 }]);
    expect(result.notes).toEqual([]);
  });

  it("reads a Commander section header as the declaration too", () => {
    const result = build("Commander\n1 Atraxa, Praetors' Voice\n\nDeck\n1 Sol Ring");
    expect(result.declaredCommander?.oracleId).toBe(ATRAXA.oracleId);
    expect(result.cards).toEqual([{ oracleId: SOL_RING.oracleId, quantity: 1 }]);
  });

  it("declares nothing when the source annotates no commander", () => {
    expect(build("1 Sol Ring").declaredCommander).toBeNull();
  });
});

describe("buildDeckImport — locked decision: re-importing the same list creates a second deck", () => {
  it("is deterministic and carries no identity, so nothing can dedupe on it", () => {
    // There is explicitly no dedupe: buildDeckImport returns the same payload every
    // time and holds no hash, timestamp or source key an importer could match on.
    const text = "1 Atraxa, Praetors' Voice *CMDR*\n1 Sol Ring\n1 Nonesuch";
    const first = build(text);
    const second = build(text);
    expect(second).toEqual(first);
    expect(Object.keys(first).sort()).toEqual([
      "cards", "declaredCommander", "legendaryCandidates", "notes", "unresolved",
    ]);
  });
});

describe("buildDeckImport — match outcomes", () => {
  it("turns an unmatched line into an unresolved row carrying its source line", () => {
    const result = build("1 Sol Ring\n2 Nonesuch Card");
    expect(result.unresolved).toEqual([
      { rawName: "Nonesuch Card", quantity: 2, sourceLine: 2 },
    ]);
  });

  it("keeps both occurrences of the same unmatched name apart by source line", () => {
    const result = build("1 Nonesuch Card\n1 Nonesuch Card");
    expect(result.unresolved.map((r) => r.sourceLine)).toEqual([1, 2]);
  });

  it("makes a skipped token neither a card nor an unresolved row", () => {
    // Only the row-source entry mode can carry a Scryfall ID; a pasted list has none.
    const tokenId = "11111111-1111-1111-1111-111111111111";
    const result = buildDeckImport({
      rows: [
        { ...ROW, name: "Sol Ring", line: 1 },
        { ...ROW, name: "Angel", scryfallId: tokenId, line: 2 },
      ],
      catalog: CATALOG,
      indexes: { skippedScryfallIds: [tokenId] },
    });
    expect(result.cards).toEqual([{ oracleId: SOL_RING.oracleId, quantity: 1 }]);
    expect(result.unresolved).toEqual([]);
  });

  it("accepts pre-parsed rows so file and URL modes share one pipeline", () => {
    const result = buildDeckImport({
      rows: [{ ...ROW, name: "Sol Ring", quantity: 4, line: 7 }],
      catalog: CATALOG,
    });
    expect(result.cards).toEqual([{ oracleId: SOL_RING.oracleId, quantity: 1 }]);
    expect(result.notes).toEqual([
      { kind: "quantityClamped", name: "Sol Ring", requested: 4, sourceLine: 7 },
    ]);
  });

  it("reports a parse error as a note rather than dropping the line silently", () => {
    const result = build("1 Sol Ring\n0 Broken Line");
    expect(result.notes).toEqual([
      { kind: "parseError", sourceLine: 2, reason: 'invalid quantity "0"' },
    ]);
  });
});

describe("buildDeckImport — legendary candidates", () => {
  it("lists every legendary creature in the list with its source line", () => {
    const result = build("1 Sol Ring\n1 Atraxa, Praetors' Voice\n1 Tymna the Weaver");
    expect(result.legendaryCandidates).toEqual([
      { oracleId: ATRAXA.oracleId, name: ATRAXA.name, sourceLine: 2 },
      { oracleId: TYMNA.oracleId, name: TYMNA.name, sourceLine: 3 },
    ]);
  });

  it("excludes the declared commander, which needs no picking", () => {
    const result = build("1 Atraxa, Praetors' Voice *CMDR*\n1 Tymna the Weaver");
    expect(result.legendaryCandidates.map((c) => c.name)).toEqual([TYMNA.name]);
  });

  it("is empty when no legendary creature was imported", () => {
    expect(build("1 Sol Ring\n1 Forest").legendaryCandidates).toEqual([]);
  });
});
