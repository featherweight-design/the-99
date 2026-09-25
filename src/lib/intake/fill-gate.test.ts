import { describe, expect, it } from "vitest";

import type { FillCandidate } from "../decks/fill";
import { allGates, bracketGate, budgetGate, type ComboEdge, type GateFacts } from "./fill-gate";

const card = (oracleId: string, owned = false): FillCandidate => ({
  oracleId, name: oracleId, typeLine: "Artifact", oracleText: null, keywords: [], manaCost: "{2}",
  owned, layout: "normal", ownedQuantity: owned ? 1 : 0, inclusionPct: 50,
});

describe("budgetGate: a running cap", () => {
  const prices: Record<string, number | null> = { a: 300, b: 300, c: 500, never: null };
  const gate = () => budgetGate({ remainingCents: 700, buys: (c) => !c.owned, priceOf: (id) => prices[id] ?? null });

  it("takes buys in order while they fit, and refuses the one that would break the cap", () => {
    const g = gate();
    expect(g.admits(card("a"))).toBe(true); g.place(card("a"));
    expect(g.admits(card("c"))).toBe(false);
    expect(g.admits(card("b"))).toBe(true); g.place(card("b"));
    expect(g.admits(card("b"))).toBe(false);
  });

  it("never charges for what the player owns", () => {
    const g = gate();
    g.place(card("c", true));
    expect(g.admits(card("c"))).toBe(true);
  });

  it("leaves out a card never stocked, which it cannot price", () => {
    expect(gate().admits(card("never"))).toBe(false);
    expect(gate().admits(card("never", true))).toBe(true);
  });
});

const facts = (over: Partial<GateFacts> & { flags?: Record<string, Partial<{ gameChanger: boolean; massLandDenial: boolean; extraTurn: boolean }>>; combos?: Record<string, ComboEdge[]> } = {}): GateFacts => ({
  flagsOf: (id) => ({ gameChanger: false, massLandDenial: false, extraTurn: false, ...over.flags?.[id] }),
  combosOf: (id) => over.combos?.[id] ?? [],
  searches: over.searches ?? (() => false),
  reaches: over.reaches ?? (() => false),
});
const edge = (variantId: string, partner: string, extra: Partial<ComboEdge> = {}): ComboEdge =>
  ({ variantId, partner, loop: false, partnerMustBeCommander: false, ...extra });

describe("bracketGate", () => {
  it("is absent at 4 and 5, which state no limits", () => {
    expect(bracketGate({ bracket: 4, commanderIds: ["cmd"], fixedIds: ["cmd"], facts: facts() })).toBeNull();
  });

  it("refuses any Game Changer at 2, and a fourth at 3", () => {
    const f = facts({ flags: { g1: { gameChanger: true }, g2: { gameChanger: true }, g3: { gameChanger: true }, g4: { gameChanger: true } } });
    expect(bracketGate({ bracket: 2, commanderIds: ["cmd"], fixedIds: ["cmd"], facts: f })!.admits(card("g1"))).toBe(false);
    const g = bracketGate({ bracket: 3, commanderIds: ["cmd"], fixedIds: ["cmd"], facts: f })!;
    for (const id of ["g1", "g2", "g3"]) { expect(g.admits(card(id))).toBe(true); g.place(card(id)); }
    expect(g.admits(card("g4"))).toBe(false);
  });

  it("counts the build-around card and the commander against the limits", () => {
    const f = facts({ flags: { cmd: { gameChanger: true }, g1: { gameChanger: true }, g2: { gameChanger: true }, g3: { gameChanger: true } } });
    const g = bracketGate({ bracket: 3, commanderIds: ["cmd"], fixedIds: ["cmd", "g1"], facts: f })!;
    expect(g.admits(card("g2"))).toBe(true); g.place(card("g2"));
    expect(g.admits(card("g3"))).toBe(false);
  });

  it("at 1 and 2 refuses the second half of a combo, never the first", () => {
    const f = facts({ combos: { a: [edge("v", "b")], b: [edge("v", "a")] } });
    const g = bracketGate({ bracket: 2, commanderIds: ["cmd"], fixedIds: ["cmd"], facts: f })!;
    expect(g.admits(card("a"))).toBe(true); g.place(card("a"));
    expect(g.admits(card("b"))).toBe(false);
  });

  it("counts a combo with the commander, and ignores one whose partner must command but does not", () => {
    const f = facts({ combos: { a: [edge("v", "cmd")], b: [edge("w", "x", { partnerMustBeCommander: true })] } });
    const g = bracketGate({ bracket: 2, commanderIds: ["cmd"], fixedIds: ["cmd", "x"], facts: f })!;
    expect(g.admits(card("a"))).toBe(false);
    expect(g.admits(card("b"))).toBe(true);
  });

  it("fills around a fixed pair already above the answer, and raises it no further", () => {
    // The commander and the build-around card are a two-card combo: the fixed cards alone permit
    // no lower than 3. Held to 2, every card would be refused and the fill would come back short.
    const f = facts({
      combos: { a: [edge("v", "cmd")], cmd: [edge("v", "a")] },
      flags: { g1: { gameChanger: true }, g2: { gameChanger: true }, g3: { gameChanger: true }, g4: { gameChanger: true } },
    });
    const g = bracketGate({ bracket: 2, commanderIds: ["cmd"], fixedIds: ["cmd", "a"], facts: f })!;
    expect(g.admits(card("forest"))).toBe(true);
    for (const id of ["g1", "g2", "g3"]) { expect(g.admits(card(id))).toBe(true); g.place(card(id)); }
    // A fourth Game Changer would move the deck past 3, so it is still refused.
    expect(g.admits(card("g4"))).toBe(false);
  });

  it("at 3 places a combo, but refuses a turn loop", () => {
    const f = facts({ combos: { b: [edge("v", "a")], d: [edge("w", "c", { loop: true })] } });
    const g = bracketGate({ bracket: 3, commanderIds: ["cmd"], fixedIds: ["cmd", "a", "c"], facts: f })!;
    expect(g.admits(card("b"))).toBe(true);
    expect(g.admits(card("d"))).toBe(false);
  });

  it("at 3 refuses the tutor that would let the deck assemble a combo, and a narrower one passes", () => {
    const f = facts({
      combos: { b: [edge("v", "a")] },
      searches: (id) => id.startsWith("tutor"),
      // `tutor-any` finds both halves; `tutor-a` finds only one, which leaves the other to chance.
      reaches: (s, p) => s === "tutor-any" || (s === "tutor-a" && p === "a"),
    });
    const g = bracketGate({ bracket: 3, commanderIds: ["cmd"], fixedIds: ["cmd", "a"], facts: f })!;
    g.place(card("b"));
    expect(g.admits(card("tutor-any"))).toBe(false);
    expect(g.admits(card("tutor-a"))).toBe(true);
  });

  it("at 3 refuses the piece that completes a combo the placed tutors already reach", () => {
    const f = facts({ combos: { b: [edge("v", "a")] }, searches: (id) => id === "tutor", reaches: () => true });
    const g = bracketGate({ bracket: 3, commanderIds: ["cmd"], fixedIds: ["cmd", "a"], facts: f })!;
    g.place(card("tutor"));
    expect(g.admits(card("b"))).toBe(false);
  });
});

describe("allGates", () => {
  it("admits only what every gate admits, and tells each one", () => {
    const told: string[] = [];
    const g = allGates([
      { admits: () => true, place: (c) => told.push(`a:${c.oracleId}`) },
      null,
      { admits: (c) => c.oracleId !== "no", place: (c) => told.push(`b:${c.oracleId}`) },
    ])!;
    expect(g.admits(card("no"))).toBe(false);
    g.place(card("yes"));
    expect(told).toEqual(["a:yes", "b:yes"]);
    expect(allGates([null])).toBeUndefined();
  });
});
