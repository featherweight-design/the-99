import { describe, expect, it } from "vitest";
import type { PrintingChoice } from "./catalog-read";
import {
  canSave, choosePrinting, defaultFinish, openLine, ownedNote, removeLine, setFinish, setQuantity, summarize,
  toPayload, MAX_LINE_QUANTITY, type AddLineState,
} from "./add-lines";

const OID = "11111111-1111-4111-8111-111111111111";
const choice = (over: Partial<PrintingChoice> = {}): PrintingChoice => ({
  scryfallId: "s1", setCode: "c21", setName: "Commander 2021", collectorNumber: "263", releasedAt: null,
  imageUri: null, flavorName: null, finishes: ["nonfoil", "foil"], owned: {}, ...over,
});
const base = (choices: PrintingChoice[], id = "a") => ({ id, oracleId: OID, name: "Sol Ring", imageUri: null, choices });

describe("add lines", () => {
  it("defaults to nonfoil only when the printing has it, else its only finish", () => {
    expect(defaultFinish(choice())).toBe("nonfoil");
    expect(defaultFinish(choice({ finishes: ["foil"] }))).toBe("foil");
    expect(defaultFinish(choice({ finishes: ["etched"] }))).toBe("etched");
  });

  it("opens a line with no printing, which cannot be saved", () => {
    const lines = openLine([], base([choice()]));
    expect(lines[0].printing).toBeNull();
    expect(canSave(lines)).toBe(false);
    expect(toPayload(lines)).toEqual([]);
    expect(summarize(lines)).toEqual({ lines: 0, copies: 0 });
  });

  it("chooses a printing at ×1 in the default finish and sends no scryfall id", () => {
    const c = choice({ finishes: ["foil"] });
    const { lines, merged } = choosePrinting(openLine([], base([c])), "a", c);
    expect(merged).toBeNull();
    expect(lines[0]).toMatchObject({ finish: "foil", quantity: 1 });
    expect(canSave(lines)).toBe(true);
    expect(toPayload(lines)).toEqual([{ oracleId: OID, setCode: "c21", collectorNumber: "263", finish: "foil", quantity: 1 }]);
  });

  it("combines an exact duplicate into the existing line, which moves to the top", () => {
    const c = choice();
    let lines = choosePrinting(openLine([], base([c], "a")), "a", c).lines;
    lines = setQuantity(lines, "a", 2);
    const other = choice({ setCode: "sld", collectorNumber: "1512" });
    lines = choosePrinting(openLine(lines, base([c, other], "b")), "b", other).lines;
    expect(lines.map((l) => l.id)).toEqual(["b", "a"]);
    const r = choosePrinting(openLine(lines, base([c, other], "c")), "c", c);
    expect(r.merged?.id).toBe("a");
    expect(r.lines.map((l) => [l.id, l.quantity])).toEqual([["a", 3], ["b", 1]]);
  });

  it("never merges a different printing or a different finish", () => {
    const c = choice();
    const other = choice({ setCode: "sld", collectorNumber: "1512" });
    let lines = setFinish(choosePrinting(openLine([], base([c, other], "a")), "a", c).lines, "a", "foil").lines;
    lines = choosePrinting(openLine(lines, base([c, other], "b")), "b", c).lines; // nonfoil beside a foil one
    expect(lines).toHaveLength(2);
    lines = choosePrinting(openLine(lines, base([c, other], "d")), "d", other).lines; // another printing
    expect(lines).toHaveLength(3);
  });

  it("folds when a finish change lands on a holding that is already listed", () => {
    const c = choice();
    let lines = choosePrinting(openLine([], base([c], "a")), "a", c).lines;
    lines = setFinish(lines, "a", "foil").lines;
    lines = choosePrinting(openLine(lines, base([c], "b")), "b", c).lines;
    const r = setFinish(lines, "b", "foil");
    expect(r.merged?.id).toBe("a");
    expect(r.lines).toHaveLength(1);
    expect(r.lines[0].quantity).toBe(2);
  });

  it("refuses a finish the printing does not have", () => {
    const c = choice({ finishes: ["nonfoil"] });
    const lines = choosePrinting(openLine([], base([c])), "a", c).lines;
    expect(setFinish(lines, "a", "foil").lines[0].finish).toBe("nonfoil");
  });

  it("holds the count between 1 and the server's bound", () => {
    const c = choice();
    const lines = choosePrinting(openLine([], base([c])), "a", c).lines;
    expect(setQuantity(lines, "a", 0)[0].quantity).toBe(1);
    expect(setQuantity(lines, "a", 10 ** 6)[0].quantity).toBe(MAX_LINE_QUANTITY);
  });

  it("notes what the player holds: the holding, other printings, or nothing", () => {
    const held = choice({ owned: { nonfoil: 5 } });
    const elsewhere = choice({ setCode: "sld", collectorNumber: "9" });
    const line = (p: PrintingChoice, choices: PrintingChoice[]): AddLineState =>
      ({ ...base(choices), printing: p, finish: "nonfoil", quantity: 2 });
    expect(ownedNote(line(held, [held]))).toEqual({ kind: "holding", have: 5, after: 7 });
    expect(ownedNote(line(elsewhere, [held, elsewhere]))).toEqual({ kind: "elsewhere", have: 5 });
    expect(ownedNote(line(elsewhere, [elsewhere]))).toEqual({ kind: "new" });
    expect(ownedNote({ ...line(held, [held]), printing: null })).toBeNull();
  });

  it("removes a line, and an empty list cannot be saved", () => {
    const c = choice();
    const lines = choosePrinting(openLine([], base([c])), "a", c).lines;
    expect(canSave(removeLine(lines, "a"))).toBe(false);
  });
});
