import { describe, expect, it } from "vitest";
import { choosePrinting, removeLine, setFinish, setQuantity } from "./add-lines";
import type { CardHolding, PrintingChoice } from "./catalog-read";
import {
  diffParts, diffRows, holdingKey, lineNote, linesFromHoldings, openNewLine, summarizeEdit,
} from "./edit-lines";

const OID = "11111111-1111-4111-8111-111111111111";
const card = { oracleId: OID, name: "Sol Ring", imageUri: null };
const p = (setCode: string, collectorNumber: string, over: Partial<PrintingChoice> = {}): PrintingChoice => ({
  scryfallId: `${setCode}-${collectorNumber}`, setCode, setName: setCode.toUpperCase(), collectorNumber, releasedAt: null,
  imageUri: null, flavorName: null, finishes: ["nonfoil", "foil"], owned: {}, ...over,
});
const CHOICES = [p("c21", "263"), p("sld", "1512"), p("cmm", "410"), p("cmr", "472")];
const h = (setCode: string, collectorNumber: string, quantity: number, over: Partial<CardHolding> = {}): CardHolding => ({
  setCode, collectorNumber, finish: "nonfoil", quantity, condition: null, ...over,
});
const HELD = [h("c21", "263", 3), h("sld", "1512", 1, { finish: "foil", condition: "NM" }), h("cmm", "410", 1)];
const start = () => linesFromHoldings(card, CHOICES, HELD);

describe("linesFromHoldings", () => {
  it("draws one line per holding in the catalog's order, each remembering where it began", () => {
    const lines = start();
    expect(lines.map((l) => l.printing?.setCode)).toEqual(["c21", "sld", "cmm"]);
    expect(lines[1]).toMatchObject({ finish: "foil", quantity: 1, condition: "NM", origin: { key: holdingKey(OID, HELD[1]), label: "SLD · #1512" } });
  });

  it("draws a holding the catalog does not list as a printing that cannot change finish", () => {
    const bare = linesFromHoldings(card, CHOICES, [h("", "", 2)]);
    expect(bare[0].printing).toMatchObject({ scryfallId: "", setCode: "", finishes: ["nonfoil"] });
  });
});

describe("diffRows", () => {
  it("sends nothing for lines the edit left alone", () => {
    expect(diffRows(OID, HELD, start())).toEqual([]);
  });

  it("names a lowered holding by its key with the count the sheet showed", () => {
    const lines = start();
    expect(diffRows(OID, HELD, setQuantity(lines, lines[0].id, 2))).toEqual([
      { oracleId: OID, setCode: "c21", collectorNumber: "263", finish: "nonfoil", quantity: 2, expected: 3 },
    ]);
  });

  it("takes a holding whose line was removed to zero", () => {
    const lines = start();
    expect(diffRows(OID, HELD, removeLine(lines, lines[2].id))).toEqual([
      { oracleId: OID, setCode: "cmm", collectorNumber: "410", finish: "nonfoil", quantity: 0, expected: 1 },
    ]);
  });

  it("writes a printing fixed by re-picking as the old holding to zero and the new one up, carrying the condition", () => {
    const lines = start();
    const foil = lines[1];
    const rows = diffRows(OID, HELD, choosePrinting(lines, foil.id, CHOICES[3]).lines);
    expect(rows).toEqual(
      expect.arrayContaining([
        { oracleId: OID, setCode: "sld", collectorNumber: "1512", finish: "foil", quantity: 0, expected: 1 },
        // The new row is created, so it carries the line's condition; its finish follows the default.
        { oracleId: OID, setCode: "cmr", collectorNumber: "472", finish: "nonfoil", quantity: 1, expected: 0, condition: "NM" },
      ]),
    );
    expect(rows).toHaveLength(2);
  });

  it("folds a re-pick that lands on a held holding into one row", () => {
    const lines = start();
    const merged = choosePrinting(lines, lines[2].id, CHOICES[0]); // CMM -> C21 nonfoil (held x3)
    expect(merged.merged?.quantity).toBe(4);
    expect(diffRows(OID, HELD, merged.lines)).toEqual([
      { oracleId: OID, setCode: "c21", collectorNumber: "263", finish: "nonfoil", quantity: 4, expected: 3 },
      { oracleId: OID, setCode: "cmm", collectorNumber: "410", finish: "nonfoil", quantity: 0, expected: 1 },
    ]);
  });

  it("creates a holding the player added, expecting zero", () => {
    const lines = openNewLine(start(), "n1", card, CHOICES, HELD);
    const done = choosePrinting(lines, "n1", CHOICES[3]).lines;
    expect(diffRows(OID, HELD, done)).toEqual([
      { oracleId: OID, setCode: "cmr", collectorNumber: "472", finish: "nonfoil", quantity: 1, expected: 0, condition: null },
    ]);
  });

  it("stages every holding at zero when removing", () => {
    const rows = diffRows(OID, HELD, start(), true);
    expect(rows.map((r) => [r.setCode, r.quantity, r.expected])).toEqual([["c21", 0, 3], ["sld", 0, 1], ["cmm", 0, 1]]);
  });

  it("changes a foil holding's finish as the old key to zero and the new key up", () => {
    const lines = start();
    const rows = diffRows(OID, HELD, setFinish(lines, lines[1].id, "nonfoil").lines);
    expect(rows.map((r) => [r.setCode, r.finish, r.quantity, r.expected])).toEqual([
      ["sld", "foil", 0, 1],
      ["sld", "nonfoil", 1, 0],
    ]);
  });
});

describe("openNewLine", () => {
  it("leaves the printings the player already holds out of the required step", () => {
    const [fresh] = openNewLine([], "n1", card, CHOICES, HELD);
    expect(fresh.printing).toBeNull();
    expect(fresh.choices.map((c) => c.setCode)).toEqual(["cmr"]);
  });
});

describe("summarizeEdit and diffParts", () => {
  it("counts copies up and down across holdings", () => {
    const lines = setQuantity(removeLine(start(), start()[2].id), start()[0].id, 4);
    const s = summarizeEdit(OID, HELD, setQuantity(removeLine(start(), "held:" + holdingKey(OID, HELD[2])), "held:" + holdingKey(OID, HELD[0]), 4));
    expect(lines.length).toBe(2);
    expect(s).toMatchObject({ up: 1, down: 1, changed: true, removes: false, lowers: true, total: 5 });
    expect(diffParts(s)).toEqual({ up: 1, down: 1 });
  });

  it("says a re-pick that moves copies and changes no count is a printing changed, which lowers nothing overall", () => {
    const lines = start();
    const s = summarizeEdit(OID, HELD, choosePrinting(lines, lines[1].id, CHOICES[3]).lines);
    expect(s.moved).toBe(1);
    expect(diffParts(s)).toEqual({ moved: 1 });
  });

  it("is unchanged at rest, and a removal when nothing is left", () => {
    expect(summarizeEdit(OID, HELD, start())).toMatchObject({ changed: false, removes: false });
    expect(diffParts(summarizeEdit(OID, HELD, start()))).toBeNull();
    const gone = summarizeEdit(OID, HELD, [], false);
    expect(gone).toMatchObject({ changed: true, removes: true, held: 5 });
    expect(summarizeEdit(OID, HELD, start(), true)).toMatchObject({ removes: true, down: 5 });
  });
});

describe("lineNote", () => {
  it("notes the change against the holding a line names, or where a fixed printing was", () => {
    const lines = start();
    expect(lineNote(OID, HELD, lines[0])).toBeNull();
    expect(lineNote(OID, HELD, setQuantity(lines, lines[0].id, 5)[0])).toEqual({ kind: "delta", delta: 2 });
    const moved = choosePrinting(lines, lines[1].id, CHOICES[3]).lines.find((l) => l.printing?.setCode === "cmr")!;
    expect(lineNote(OID, HELD, moved)).toEqual({ kind: "moved", from: "SLD · #1512", copies: 1 });
  });
});

describe("a finish change alone", () => {
  it("is not a printing changed, and its note names the finish it was", () => {
    const lines = start();
    const foiled = setFinish(lines, lines[0].id, "foil").lines.find((l) => l.finish === "foil" && l.printing?.setCode === "c21")!;
    const s = summarizeEdit(OID, HELD, setFinish(lines, lines[0].id, "foil").lines);
    expect(s.moved).toBe(0);
    expect(diffParts(s)).toEqual({ up: 3, down: 3 });
    expect(lineNote(OID, HELD, foiled)).toEqual({ kind: "moved", from: "C21 · #263 · nonfoil", copies: 3 });
  });
});
