import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { CollectionRow } from "../manabox/parse";
import {
  buildDeckImport, resolveDeckListInput, type DeckImport, type ImportCatalogCard,
} from "./import";
import { buildDecklistText } from "./export-helpers";

/** Drops the source line. These cases are about which card a line *shape*
 *  resolves to; the line number each row carries is asserted in update.test.ts,
 *  which is where it means something. */
const shape = (cards: DeckImport["cards"]) =>
  cards.map(({ oracleId, quantity }) => ({ oracleId, quantity }));

const ROW: CollectionRow = {
  name: "", setCode: "", collectorNumber: "", quantity: 1,
  scryfallId: null, finish: "nonfoil", condition: null, line: 1,
};

const card = (over: Partial<ImportCatalogCard> & { name: string }): ImportCatalogCard => ({
  oracleId: `oracle-${over.name.toLowerCase().replace(/[^a-z]+/g, "-")}`,
  scryfallId: `scry-${over.name.toLowerCase().replace(/[^a-z]+/g, "-")}`,
  typeLine: "Artifact",
  oracleText: null,
  commanderLegal: true,
  colorIdentity: [],
  imageUri: null,
  layout: "normal",
  manaCost: null,
  ...over,
});

const SOL_RING = card({ name: "Sol Ring" });
const FOREST = card({ name: "Forest", typeLine: "Basic Land — Forest" });
const ATRAXA = card({
  name: "Atraxa, Praetors' Voice",
  typeLine: "Legendary Creature — Phyrexian Angel Horror",
  colorIdentity: ["W", "U", "B", "G"],
  imageUri: "https://cards.example/atraxa.jpg",
});
const TYMNA = card({
  name: "Tymna the Weaver",
  typeLine: "Legendary Creature — Human Cleric",
  colorIdentity: ["W", "B"],
});
const DELVER = card({
  name: "Delver of Secrets // Insectile Aberration",
  typeLine: "Creature — Human Insect",
});

// The motivating deck's pair, and a third legend to overflow a declaration with.
const ATREUS = card({
  name: "Atreus, God of War",
  typeLine: "Legendary Creature — God",
  colorIdentity: ["R", "W"],
  oracleText: "Partner—Father & son (You can have two commanders if both have Partner—Father & son.)",
});
const KRATOS = card({
  name: "Kratos, God of War",
  typeLine: "Legendary Creature — God",
  colorIdentity: ["U", "R"],
  oracleText: "Partner—Father & son (You can have two commanders if both have Partner—Father & son.)",
});
const ISHAI = card({
  name: "Ishai, Ojutai Dragonspeaker",
  typeLine: "Legendary Creature — Bird Monk",
  colorIdentity: ["W", "U"],
  oracleText: "Flying\nPartner (You can have two commanders if both have partner.)",
});

const CATALOG = [SOL_RING, FOREST, ATRAXA, TYMNA, DELVER, ATREUS, KRATOS, ISHAI];

const build = (text: string, catalog: ImportCatalogCard[] = CATALOG) =>
  buildDeckImport({ text, catalog });

describe("buildDeckImport — line shapes", () => {
  it("reads '1x Sol Ring' and '1 Sol Ring' identically", () => {
    expect(shape(build("1x Sol Ring").cards)).toEqual([{ oracleId: SOL_RING.oracleId, quantity: 1 }]);
    expect(shape(build("1 Sol Ring").cards)).toEqual([{ oracleId: SOL_RING.oracleId, quantity: 1 }]);
  });

  it("ignores a trailing set code and collector number", () => {
    expect(shape(build("1 Sol Ring (LTC) 284").cards)).toEqual([
      { oracleId: SOL_RING.oracleId, quantity: 1 },
    ]);
  });

  it("ignores Moxfield's trailing annotations such as *F*", () => {
    expect(shape(build("1 Sol Ring (C21) 263 *F*").cards)).toEqual([
      { oracleId: SOL_RING.oracleId, quantity: 1 },
    ]);
  });

  it("matches a double-faced card written by its front face only", () => {
    expect(shape(build("1 Delver of Secrets").cards)).toEqual([
      { oracleId: DELVER.oracleId, quantity: 1 },
    ]);
  });

  it("merges two lines of the same card into one deck_cards row", () => {
    // deck_cards is keyed (deck_id, oracle_id); two rows would raise 23505.
    const result = build("5 Forest (M21) 274\n4 Forest (ZNR) 280");
    expect(shape(result.cards)).toEqual([{ oracleId: FOREST.oracleId, quantity: 9 }]);
  });

  it("returns nothing at all for an empty source", () => {
    const result = build("   \n\n");
    expect(shape(result.cards)).toEqual([]);
    expect(result.unresolved).toEqual([]);
    expect(result.notes).toEqual([]);
  });
});

describe("buildDeckImport — locked decision: sideboard and maybeboard are not imported", () => {
  it("drops every line after a SIDEBOARD marker and notes the count", () => {
    const result = build("1 Sol Ring\n\nSIDEBOARD:\n1 Forest\n1 Tymna the Weaver");
    expect(shape(result.cards)).toEqual([{ oracleId: SOL_RING.oracleId, quantity: 1 }]);
    expect(result.notes).toEqual([{ kind: "sectionSkipped", section: "sideboard", lineCount: 2 }]);
  });

  it("drops a maybeboard section under its own note", () => {
    const result = build("1 Sol Ring\nMaybeboard\n1 Forest");
    expect(shape(result.cards)).toEqual([{ oracleId: SOL_RING.oracleId, quantity: 1 }]);
    expect(result.notes).toEqual([{ kind: "sectionSkipped", section: "maybeboard", lineCount: 1 }]);
  });

  it("resumes importing when a Deck marker follows a sideboard section", () => {
    const result = build("SIDEBOARD:\n1 Tymna the Weaver\n\nDeck\n1 Sol Ring");
    expect(shape(result.cards)).toEqual([{ oracleId: SOL_RING.oracleId, quantity: 1 }]);
  });

  it("reads a header that carries its own count, as real exports write them", () => {
    // "Sideboard (14)" undetected is the expensive miss: fourteen skipped lines
    // become fourteen cards in the deck.
    const result = build("Deck (99)\n1 Sol Ring\n\nSideboard (2):\n1 Forest\n1 Tymna the Weaver");
    expect(shape(result.cards)).toEqual([{ oracleId: SOL_RING.oracleId, quantity: 1 }]);
    expect(result.notes).toEqual([{ kind: "sectionSkipped", section: "sideboard", lineCount: 2 }]);
  });

  it("reads a Commander header that carries its own count", () => {
    const result = build("Commander (1)\n1 Atraxa, Praetors' Voice\n\nDeck (1)\n1 Sol Ring");
    expect(result.declaredCommander?.oracleId).toBe(ATRAXA.oracleId);
    expect(shape(result.cards)).toEqual([{ oracleId: SOL_RING.oracleId, quantity: 1 }]);
  });

  it("reads a trailing (Commander) tag as the declaration", () => {
    // The shape ManaBox writes: the flag rides after the printing identity, in
    // round brackets rather than Moxfield's asterisks. Undetected it is not a
    // dropped flag but a broken name — the tag stays glued to the card, and the
    // deck's own commander arrives as a line we cannot name.
    const result = build("1 Atraxa, Praetors' Voice (2X2) 145 (Commander)\n1 Sol Ring (LTC) 284");
    expect(result.declaredCommander?.oracleId).toBe(ATRAXA.oracleId);
    expect(shape(result.cards)).toEqual([{ oracleId: SOL_RING.oracleId, quantity: 1 }]);
    expect(result.unresolved).toEqual([]);
  });

  // The loop is what promises both spellings in either order, so both orders
  // are tested. A regression in either branch leaves one marker glued to the
  // name, which is the whole failure this fix exists to stop.
  it.each([
    ["1 Atraxa, Praetors' Voice (2X2) 145 *CMDR* (Commander)"],
    ["1 Atraxa, Praetors' Voice (2X2) 145 (Commander) *CMDR*"],
  ])("reads both commander markers on one line: %s", (line) => {
    const result = build(`${line}\n1 Sol Ring (LTC) 284`);
    expect(result.declaredCommander?.oracleId).toBe(ATRAXA.oracleId);
    expect(shape(result.cards)).toEqual([{ oracleId: SOL_RING.oracleId, quantity: 1 }]);
    expect(result.unresolved).toEqual([]);
  });

  it("reads a trailing (Partner) tag as the declaration", () => {
    // A partner IS the deck's second commander, so the line declares one.
    // Exporters write it on the second of a pair — undetected, the tag stays
    // glued to the name and the deck's own commander arrives as a line we
    // cannot name, which is exactly what `(Commander)` above exists to stop.
    const result = build("1 Atraxa, Praetors' Voice (2X2) 145 (Partner)\n1 Sol Ring (LTC) 284");
    expect(result.declaredCommander?.oracleId).toBe(ATRAXA.oracleId);
    expect(shape(result.cards)).toEqual([{ oracleId: SOL_RING.oracleId, quantity: 1 }]);
    expect(result.unresolved).toEqual([]);
  });

  it("reads (Partner) in either case, as the other tag is read", () => {
    const result = build("1 Atraxa, Praetors' Voice (2X2) 145 (PARTNER)\n1 Sol Ring (LTC) 284");
    expect(result.declaredCommander?.oracleId).toBe(ATRAXA.oracleId);
    expect(result.unresolved).toEqual([]);
  });

  // The pair, which is what the tag is FOR: a primary declaration and a
  // `(Partner)` second. Asserting only `declaredCommander` on a lone tagged
  // line would pass a regression that stripped the tag and then imported that
  // card into the 99 — the partner would be a body card and the deck would
  // lead with one commander.
  it("reads a (Partner) line as the second commander beside a declared first", () => {
    const partner = card({ name: "Tana, the Bloodsower", typeLine: "Legendary Creature — Human" });
    const result = build(
      "1 Atraxa, Praetors' Voice (2X2) 145 (Commander)\n"
        + "1 Tana, the Bloodsower (C16) 30 (Partner)\n"
        + "1 Sol Ring (LTC) 284",
      [ATRAXA, partner, SOL_RING],
    );
    expect(result.declaredCommander?.oracleId).toBe(ATRAXA.oracleId);
    expect(result.declaredPartner?.oracleId).toBe(partner.oracleId);
    // Neither leads the deck AND fills a slot in it.
    expect(shape(result.cards)).toEqual([{ oracleId: SOL_RING.oracleId, quantity: 1 }]);
    expect(result.unresolved).toEqual([]);
  });

  // A card whose NAME ends in a parenthetical keeps it. `Erase (Not the Urza's
  // Legacy One)` is a real card and the shape that would break if the tag were
  // read as "any trailing bracket" rather than these two words — the name would
  // lose its tail and resolve against nothing.
  it("leaves a trailing parenthetical that is part of the name", () => {
    const erase = card({ name: "Erase (Not the Urza's Legacy One)" });
    const result = build("1 Erase (Not the Urza's Legacy One)", [erase, SOL_RING]);
    expect(result.declaredCommander).toBeNull();
    expect(shape(result.cards)).toEqual([{ oracleId: erase.oracleId, quantity: 1 }]);
    expect(result.unresolved).toEqual([]);
  });

  // And the word alone, mid-name, is not the tag either.
  it("leaves the word alone when it is not a trailing bracket", () => {
    const partnered = card({ name: "Partner in Crime" });
    const result = build("1 Partner in Crime", [partnered, SOL_RING]);
    expect(result.declaredCommander).toBeNull();
    expect(shape(result.cards)).toEqual([{ oracleId: partnered.oracleId, quantity: 1 }]);
  });

  it("leaves a bracketed (CMDR) to the set-code path", () => {
    // The abbreviation fits the set-code shape, so reading it as a declaration
    // would take a printing identity away from a line that meant one.
    const result = build("1 Sol Ring (CMDR)");
    expect(result.declaredCommander).toBeNull();
    expect(shape(result.cards)).toEqual([{ oracleId: SOL_RING.oracleId, quantity: 1 }]);
  });

  it("does not treat a card whose name starts with a marker word as a section header", () => {
    const sideboardish = card({ name: "Sideboard Shenanigans" });
    const result = build("1 Sideboard Shenanigans", [...CATALOG, sideboardish]);
    expect(shape(result.cards)).toEqual([{ oracleId: sideboardish.oracleId, quantity: 1 }]);
    expect(result.notes).toEqual([]);
  });
});

describe("buildDeckImport — locked decision: quantity > 1 on a non-basic imports at 1", () => {
  it("clamps a non-basic to quantity 1 and raises a note", () => {
    const result = build("3 Sol Ring");
    expect(shape(result.cards)).toEqual([{ oracleId: SOL_RING.oracleId, quantity: 1 }]);
    expect(result.notes).toEqual([
      { kind: "quantityClamped", name: "Sol Ring", requested: 3, sourceLine: 1 },
    ]);
  });

  it("leaves a basic land's quantity alone", () => {
    const result = build("10 Forest");
    expect(shape(result.cards)).toEqual([{ oracleId: FOREST.oracleId, quantity: 10 }]);
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
    expect(shape(result.cards)).toEqual([{ oracleId: SOL_RING.oracleId, quantity: 1 }]);
    expect(result.notes).toEqual([]);
  });

  it("reads a Commander section header as the declaration too", () => {
    const result = build("Commander\n1 Atraxa, Praetors' Voice\n\nDeck\n1 Sol Ring");
    expect(result.declaredCommander?.oracleId).toBe(ATRAXA.oracleId);
    expect(shape(result.cards)).toEqual([{ oracleId: SOL_RING.oracleId, quantity: 1 }]);
  });

  it("reads a Partner pair's second commander as the partner, not as a 99 card", () => {
    // Neither commander is a deck_cards row. Importing the partner into the 99
    // would change the deck's colour identity and its legality without saying so.
    const result = build("1 Tymna the Weaver *CMDR*\n1 Atraxa, Praetors' Voice *CMDR*\n1 Sol Ring");
    expect(result.declaredCommander?.oracleId).toBe(TYMNA.oracleId);
    expect(result.declaredPartner?.oracleId).toBe(ATRAXA.oracleId);
    expect(shape(result.cards)).toEqual([{ oracleId: SOL_RING.oracleId, quantity: 1 }]);
    expect(result.notes).toEqual([]);
    expect(result.legendaryCandidates).toEqual([]);
  });

  it("reads two declared commanders as a pair", () => {
    const result = build("Commander\n1 Atreus, God of War\n1 Kratos, God of War\n\nDeck\n1 Sol Ring");
    expect(result.declaredCommander?.name).toBe("Atreus, God of War");
    expect(result.declaredPartner?.name).toBe("Kratos, God of War");
    expect(result.declaredPartner?.sourceLine).toBe(3);
  });

  it("keeps neither commander in the card rows", () => {
    const result = build("Commander\n1 Atreus, God of War\n1 Kratos, God of War\n\nDeck\n1 Sol Ring");
    expect(result.cards.map((c) => c.oracleId)).toEqual([SOL_RING.oracleId]);
  });

  // Two is the format's whole allowance, so a third is a fact about the paste
  // rather than about the deck — dropped, and said out loud.
  it("takes a third declared commander as a note and drops it", () => {
    const result = build(
      "Commander\n1 Atreus, God of War\n1 Kratos, God of War\n1 Ishai, Ojutai Dragonspeaker\n\nDeck\n1 Sol Ring",
    );
    expect(result.declaredPartner?.name).toBe("Kratos, God of War");
    expect(result.notes).toContainEqual({
      kind: "thirdCommanderDeclared",
      name: "Ishai, Ojutai Dragonspeaker",
      sourceLine: 4,
    });
    expect(result.cards.map((c) => c.oracleId)).toEqual([SOL_RING.oracleId]);
  });

  it("says so when a declared commander's count is clamped", () => {
    const result = build("Commander\n2 Atreus, God of War\n3 Kratos, God of War\n\nDeck\n1 Sol Ring");
    expect(result.declaredCommander?.name).toBe("Atreus, God of War");
    expect(result.declaredPartner?.name).toBe("Kratos, God of War");
    expect(result.notes).toEqual([
      { kind: "quantityClamped", name: "Atreus, God of War", requested: 2, sourceLine: 2 },
      { kind: "quantityClamped", name: "Kratos, God of War", requested: 3, sourceLine: 3 },
    ]);
  });

  it("leaves a single declared commander alone", () => {
    const result = build("Commander\n1 Atreus, God of War\n\nDeck\n1 Sol Ring");
    expect(result.declaredCommander?.name).toBe("Atreus, God of War");
    expect(result.declaredPartner).toBeNull();
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
      "cards", "declaredCommander", "declaredPartner", "legendaryCandidates", "lineCount",
      "notes", "unresolved",
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
    expect(shape(result.cards)).toEqual([{ oracleId: SOL_RING.oracleId, quantity: 1 }]);
    expect(result.unresolved).toEqual([]);
  });

  it("accepts pre-parsed rows so file and URL modes share one pipeline", () => {
    const result = buildDeckImport({
      rows: [{ ...ROW, name: "Sol Ring", quantity: 4, line: 7 }],
      catalog: CATALOG,
    });
    expect(shape(result.cards)).toEqual([{ oracleId: SOL_RING.oracleId, quantity: 1 }]);
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
      {
        oracleId: ATRAXA.oracleId,
        name: ATRAXA.name,
        sourceLine: 2,
        colorIdentity: ["W", "U", "B", "G"],
        imageUri: "https://cards.example/atraxa.jpg",
        oracleText: ATRAXA.oracleText,
      },
      {
        oracleId: TYMNA.oracleId,
        name: TYMNA.name,
        sourceLine: 3,
        colorIdentity: ["W", "B"],
        imageUri: null,
        oracleText: TYMNA.oracleText,
      },
    ]);
  });

  it("carries the identity and art the picker's row renders, not just the id", () => {
    // The picker reuses create-picker's row verbatim: pips, an identity label and
    // card art. Without these on the candidate the row would need a second lookup.
    const [atraxa] = build("1 Atraxa, Praetors' Voice").legendaryCandidates;
    expect(atraxa.colorIdentity).toEqual(["W", "U", "B", "G"]);
    expect(atraxa.imageUri).toBe("https://cards.example/atraxa.jpg");
  });

  it("leaves imageUri null rather than inventing one when the card has no art", () => {
    expect(build("1 Tymna the Weaver").legendaryCandidates[0].imageUri).toBeNull();
  });

  it("excludes the declared commander, which needs no picking", () => {
    const result = build("1 Atraxa, Praetors' Voice *CMDR*\n1 Tymna the Weaver");
    expect(result.legendaryCandidates.map((c) => c.name)).toEqual([TYMNA.name]);
  });

  it("omits a banned legendary, which the server action would reject by throwing", () => {
    const banned = card({
      name: "Golos, Tireless Pilgrim",
      typeLine: "Legendary Creature — Scarecrow",
      commanderLegal: false,
    });
    const result = build("1 Golos, Tireless Pilgrim\n1 Tymna the Weaver", [...CATALOG, banned]);
    expect(result.legendaryCandidates.map((c) => c.name)).toEqual([TYMNA.name]);
    expect(shape(result.cards)).toContainEqual({ oracleId: banned.oracleId, quantity: 1 });
  });

  it("is empty when no legendary creature was imported", () => {
    expect(build("1 Sol Ring\n1 Forest").legendaryCandidates).toEqual([]);
  });
});

describe("lineCount", () => {
  it("counts real card lines only, so section headers cannot inflate state 9's total", () => {
    // parsePasteList turns any non-blank line into a row, so the raw parse counts
    // "SIDEBOARD:" as a card. Reporting that count would overstate the problem to
    // the player, and a header-only list would read as state 9 instead of state 10.
    expect(build("1 Sol Ring\nSIDEBOARD:\n1 Llanowar Elves\n").lineCount).toBe(1);
  });

  it("excludes tokens and emblems, which are neither imported nor shown as unresolved", () => {
    // matchRows drops skipped printings entirely, so counting them would tell the
    // player about lines that appear nowhere in the result. Only reachable on the
    // rows path — a pasted line carries no scryfallId to match a skipped printing by.
    // A skipped printing is absent from the oracle catalog by definition — were it
    // present, its own scryfall_id would match it before the skip check is reached.
    const tokenId = "22222222-2222-2222-2222-222222222222";
    const result = buildDeckImport({
      rows: [
        { ...ROW, name: "Sol Ring", scryfallId: SOL_RING.scryfallId, line: 1 },
        { ...ROW, name: "Treasure Token", scryfallId: tokenId, line: 2 },
      ],
      catalog: [SOL_RING],
      indexes: { skippedScryfallIds: [tokenId] },
    });
    expect(result.lineCount).toBe(1);
  });

  it("is zero when the list holds nothing but section headers", () => {
    expect(build("SIDEBOARD:\nMAYBEBOARD:\n").lineCount).toBe(0);
  });
});

// #364. The feature exists because one real deck could not be represented: a
// `Partner—Father & son` pair, 88 lines totalling 100 cards, which the app used
// to import as one commander and 98 of 99 — a card short, a commander missing,
// and half the list unaddable because identity was measured against the primary
// alone. The fixture is a reconstruction of that list's shape (the original
// paste is not recorded in the issue): the totals, the two-commander header and
// the Jeskai union are what the test turns on, not the individual card choices.
describe("buildDeckImport — the motivating deck", () => {
  it("parses the motivating deck as a pair with a body of 98", () => {
    // Read off the repo root rather than import.meta.url: this file runs under
    // the jsdom environment, where import.meta.url is an http URL.
    const text = readFileSync("src/lib/decks/__fixtures__/father-and-son.txt", "utf8");

    // Every name the list mentions becomes a catalog row. The two commanders are
    // widened with the oracle text and identity the pair actually turns on.
    const names = [...new Set(
      text.split("\n").map((l) => l.match(/^\d+\s+(.+)$/)?.[1]?.trim()).filter((n): n is string => !!n),
    )];
    const catalog = names.map((name) => {
      if (name.startsWith("Atreus")) return ATREUS;
      if (name.startsWith("Kratos")) return KRATOS;
      // The basics carry their real type line, because that is what lets a line
      // hold more than one copy of them.
      if (["Mountain", "Island", "Plains"].includes(name)) {
        return card({ name, typeLine: `Basic Land — ${name}` });
      }
      return card({ name });
    });

    const result = buildDeckImport({ text, catalog });

    expect(result.declaredCommander?.name).toMatch(/^Atreus/);
    expect(result.declaredPartner?.name).toMatch(/^Kratos/);
    expect(result.cards.reduce((n, c) => n + c.quantity, 0)).toBe(98);
    expect(result.unresolved).toEqual([]);

    // The bug this feature exists to fix: identity is the union, so every card in
    // a Jeskai pair deck is addable.
    const identity = new Set([...ATREUS.colorIdentity, ...KRATOS.colorIdentity]);
    expect([...identity].sort()).toEqual(["R", "U", "W"]);

    // And it round-trips through the exporter.
    const back = buildDeckImport({
      text: buildDecklistText({
        commanderName: result.declaredCommander!.name,
        partnerName: result.declaredPartner!.name,
        cards: result.cards.map((c) => ({
          quantity: c.quantity,
          name: catalog.find((k) => k.oracleId === c.oracleId)!.name,
        })),
      }),
      catalog,
    });
    expect(back.declaredPartner?.name).toBe(result.declaredPartner!.name);
    expect(back.cards.reduce((n, c) => n + c.quantity, 0)).toBe(98);
  });
});

// A pasted list's section header ("Lands") resolved by exact name to Scryfall's Jumpstart
// theme front of that name, and the deck gained a card called Lands. It is not a card, so the
// line is left for the player to resolve like any other name the catalog does not hold.
describe("buildDeckImport — a line naming cardboard that is not a card", () => {
  const LANDS_FRONT = card({ name: "Lands", layout: "front_card", typeLine: "Card", commanderLegal: false });
  const EXPERIENCE = card({ name: "Experience", typeLine: "Card", commanderLegal: false });

  it("reads a 'Lands' header line as unresolved, not as a card", () => {
    const result = build("1 Sol Ring\nLands\n1 Forest", [...CATALOG, LANDS_FRONT, EXPERIENCE]);
    expect(shape(result.cards).map((c) => c.oracleId)).not.toContain(LANDS_FRONT.oracleId);
    expect(result.unresolved.map((u) => u.rawName)).toEqual(["Lands"]);
  });

  it("reads a type-line-only 'Card' object as unresolved too", () => {
    const result = build("1 Experience", [...CATALOG, EXPERIENCE]);
    expect(result.cards).toEqual([]);
    expect(result.unresolved.map((u) => u.rawName)).toEqual(["Experience"]);
  });
});

// import-actions.ts and update-actions.ts both resolve a paste or a file
// through this before deciding which DeckImportInput branch to build.
describe("resolveDeckListInput", () => {
  const fixturesDir = join(dirname(fileURLToPath(import.meta.url)), "..", "manabox", "__fixtures__");
  const moxfield = readFileSync(join(fixturesDir, "moxfield.csv"), "utf8");
  const sample = readFileSync(join(fixturesDir, "sample.csv"), "utf8"); // carries one bad-quantity row

  it("leaves a plain decklist as text, byte for byte", () => {
    const text = "1 Sol Ring\n1 Atraxa, Praetors' Voice";
    expect(resolveDeckListInput(text)).toEqual({ kind: "text", text });
  });

  it("leaves a Commander-section paste as text — it has no header row", () => {
    const text = "Commander\n1 Atraxa, Praetors' Voice\n\nDeck\n1 Sol Ring";
    expect(resolveDeckListInput(text)).toEqual({ kind: "text", text });
  });

  it("parses a clean CSV export into rows", () => {
    const resolved = resolveDeckListInput(moxfield);
    expect(resolved.kind).toBe("rows");
    if (resolved.kind === "rows") {
      expect(resolved.rows).toHaveLength(3);
      expect(resolved.rows[0]).toMatchObject({ name: "Sol Ring", quantity: 2 });
    }
  });

  it("rejects a CSV-shaped file with a bad row rather than importing the rows that did parse", () => {
    // sample.csv has three clean rows and one bad quantity on line 5.
    expect(resolveDeckListInput(sample)).toEqual({
      kind: "rejected",
      detail: 'Row 5: invalid quantity "abc"',
    });
  });

  it("names every bad row and a count of the rest, not just the first", () => {
    const text = "Name,Quantity\nSol Ring,0\nForest,abc\n";
    expect(resolveDeckListInput(text)).toEqual({
      kind: "rejected",
      detail: 'Row 2: invalid quantity "0" (and 1 more row)',
    });
  });

  it("rejects a header carrying Name but not Quantity, naming the missing column", () => {
    // The gap the pre-open pass caught: this header is CSV-shaped (comma-split,
    // a recognized Name column) but was previously read as plain text and gave
    // a generic "none matched" instead of this specific message.
    expect(resolveDeckListInput("Name,Amount\nSol Ring,1\n")).toEqual({
      kind: "rejected",
      detail: "Header missing Quantity column",
    });
  });

  it("rejects a header carrying Quantity but not Name, naming the missing column", () => {
    expect(resolveDeckListInput("Foo,Quantity\nSol Ring,1\n")).toEqual({
      kind: "rejected",
      detail: "Header missing Name column",
    });
  });

  it("is text, not CSV, when neither required column nor a comma is present", () => {
    // A single-cell header ("Quantity" alone) has no comma — the shape every
    // plain decklist line has — and a multi-column header naming neither
    // column is not CSV at all; both are read as a decklist instead.
    expect(resolveDeckListInput("Quantity\n1\n")).toEqual({ kind: "text", text: "Quantity\n1\n" });
    expect(resolveDeckListInput("Set,Foil\nc21,foil\n")).toEqual({
      kind: "text",
      text: "Set,Foil\nc21,foil\n",
    });
  });

  it("feeds clean CSV rows straight into buildDeckImport's existing rows branch", () => {
    const resolved = resolveDeckListInput(moxfield);
    if (resolved.kind !== "rows") throw new Error("expected rows");
    const result = buildDeckImport({ rows: resolved.rows, catalog: [...CATALOG, SOL_RING] });
    expect(shape(result.cards)).toEqual([{ oracleId: SOL_RING.oracleId, quantity: 1 }]);
  });
});
