import { describe, expect, it } from "vitest";
import { suggestCuts, type CutRow } from "./partner-add-cuts";

const row = (id: string, over: Partial<CutRow> = {}): CutRow => ({
  oracleId: id, name: id, imageUri: null, typeLine: "Creature", cmc: 2, quantity: 1, ...over,
});
const base = { commanders: new Set<string>(), locked: new Set<string>(), landCeiling: 36, supported: new Set<string>() };

describe("suggestCuts", () => {
  it("names the most-run basic only while lands exceed the ceiling", () => {
    const body = [
      row("forest", { typeLine: "Basic Land — Forest", quantity: 20 }),
      row("island", { typeLine: "Basic Land — Island", quantity: 18 }),
    ];
    expect(suggestCuts({ ...base, body, landCeiling: 36 }).map((s) => s.oracleId)).toEqual(["forest"]);
    expect(suggestCuts({ ...base, body, landCeiling: 38 })).toEqual([]);
  });

  it("suggests the two costliest cards the pair's decks do not run", () => {
    const body = [row("a", { cmc: 3 }), row("b", { cmc: 6 }), row("c", { cmc: 5 }), row("d", { cmc: 7 })];
    const out = suggestCuts({ ...base, body, supported: new Set(["d"]) });
    expect(out.map((s) => s.oracleId)).toEqual(["b", "c"]);
  });

  it("never suggests a locked card, a commander half or a land", () => {
    const body = [row("a", { cmc: 9 }), row("b", { cmc: 8 }), row("c", { cmc: 1 }), row("shock", { typeLine: "Land", cmc: 0 })];
    const out = suggestCuts({ ...base, body, locked: new Set(["a"]), commanders: new Set(["b"]) });
    expect(out.map((s) => s.oracleId)).toEqual(["c"]);
  });

  it("skips a locked basic and falls to the next", () => {
    const body = [
      row("forest", { typeLine: "Basic Land — Forest", quantity: 40 }),
      row("island", { typeLine: "Basic Land — Island", quantity: 2 }),
    ];
    const out = suggestCuts({ ...base, body, locked: new Set(["forest"]) });
    expect(out.map((s) => [s.oracleId, s.kind])).toEqual([["island", "land"]]);
  });
});
