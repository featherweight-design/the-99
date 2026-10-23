import { describe, expect, it } from "vitest";
import { byWhere, groupCardCombos, onePerPartner, orderModalPartners, summariseByState, summariseCardCombos } from "./modal-block";
import type { CardCombo, CardComboOther } from "./near-combos";
import type { ModalComboPartner } from "./near-miss";

const p = (over: Partial<ModalComboPartner> = {}): ModalComboPartner => ({
  oracleId: "p-1",
  name: "Partner",
  state: "owned",
  popularity: 100,
  ...over,
});

describe("orderModalPartners", () => {
  // THE CAP MUST NEVER HIDE A PARTNER ALREADY ON THE TABLE in favour of one you would have to
  // buy — the one truncation that would actually mislead a reader.
  it("bands by state before it looks at popularity", () => {
    const out = orderModalPartners([
      p({ oracleId: "a", state: "notOwned", popularity: 9999 }),
      p({ oracleId: "b", state: "owned", popularity: 1 }),
      p({ oracleId: "c", state: "inDeck", popularity: 0 }),
    ]);
    expect(out.map((x) => x.oracleId)).toEqual(["c", "b", "a"]);
  });

  it("orders by popularity inside a band", () => {
    const out = orderModalPartners([
      p({ oracleId: "low", state: "owned", popularity: 1 }),
      p({ oracleId: "high", state: "owned", popularity: 900 }),
    ]);
    expect(out.map((x) => x.oracleId)).toEqual(["high", "low"]);
  });

  // STABLE ACROSS RELOADS. Two partners tied on state and popularity must not swap between
  // two reads of a collection that did not move.
  it("breaks a full tie deterministically, both ways round", () => {
    const a = p({ oracleId: "aaa", popularity: 5 });
    const b = p({ oracleId: "bbb", popularity: 5 });
    expect(orderModalPartners([a, b]).map((x) => x.oracleId)).toEqual(["aaa", "bbb"]);
    expect(orderModalPartners([b, a]).map((x) => x.oracleId)).toEqual(["aaa", "bbb"]);
  });

  it("sorts a null popularity below a known one", () => {
    const out = orderModalPartners([
      p({ oracleId: "unknown", popularity: null }),
      p({ oracleId: "known", popularity: 1 }),
    ]);
    expect(out.map((x) => x.oracleId)).toEqual(["known", "unknown"]);
  });
});

describe("summariseByState", () => {
  // THE ORDER IS THE ROW'S: in deck, then owned, then unowned. `in this deck` leads because
  // it is the only part that is ever urgent — it is what decides whether to open the block.
  it("counts in the row's own order", () => {
    const out = summariseByState([
      p({ oracleId: "a", state: "notOwned" }),
      p({ oracleId: "b", state: "inDeck" }),
      p({ oracleId: "c", state: "owned" }),
      p({ oracleId: "d", state: "notOwned" }),
    ]);
    expect(out).toEqual([
      { state: "inDeck", count: 1 },
      { state: "owned", count: 1 },
      { state: "notOwned", count: 2 },
    ]);
  });

  // A STATE WITH A COUNT OF ZERO IS NOT DRAWN: `4 you don't` alone, or
  // `1 in this deck · 4 you don't` — never `0 you own`. A zero is a state the reader does not
  // have, and printing it spends a third of the line saying so.
  it("omits every state it has none of", () => {
    expect(summariseByState([p({ state: "notOwned" })])).toEqual([
      { state: "notOwned", count: 1 },
    ]);
    expect(summariseByState([])).toEqual([]);
  });
});

// Combos one piece away UI-3: the block's lines from `loadCardCombos`.
const other = (name: string, where: CardComboOther["where"]): CardComboOther => ({
  oracleId: `id-${name}`,
  name,
  state: where.kind === "inDeck" ? "inDeck" : where.kind === "buy" ? "notOwned" : where.kind,
  mustBeCommander: false,
  decks: where.kind === "elsewhere" ? where.decks : [],
  where,
  imageUri: null,
  isCommander: false,
});
const line = (variantId: string, o: CardComboOther): CardCombo => ({
  variantId, others: [o], produces: [], steps: null, manaNeeded: null, manaValueNeeded: null, notablePrerequisites: null, usesCommander: false,
});
const buy = (cents: number | null) => ({ kind: "buy" as const, cents, soldOut: false, qualifier: null });
// The board's fixture, in an order that is none of the drawn ones.
const fixture = [
  line("pandemonium", other("Pandemonium", buy(310))),
  line("raptor", other("Marauding Raptor", { kind: "inDeck" })),
  line("unpriced", other("Unpriced", buy(null))),
  line("surge", other("Warstorm Surge", { kind: "elsewhere", decks: [{ id: "d2", name: "HD - Tovolar", committed: true }] })),
  line("terror", other("Terror of the Peaks", buy(3420))),
  line("forerunner", other("Forerunner of the Empire", { kind: "inDeck" })),
  line("tread", other("Where Ancients Tread", { kind: "spare" })),
];
const ids = (list: readonly CardCombo[]) => list.map((c) => c.variantId);

describe("groupCardCombos", () => {
  it("in scope: in-deck partners are Whole in this deck, in the read's order", () => {
    const g = groupCardCombos(fixture, true);
    if (!g.split) throw new Error("not split");
    expect(ids(g.whole)).toEqual(["raptor", "forerunner"]);
  });

  it("in scope: spare, elsewhere and to-buy partners are One piece away, by where, cheapest first, unpriced last", () => {
    const g = groupCardCombos(fixture, true);
    if (!g.split) throw new Error("not split");
    expect(ids(g.oneAway)).toEqual(["tread", "surge", "pandemonium", "terror", "unpriced"]);
  });

  it("deck-less, or the card not in the deck: one flat list, an in-deck partner first", () => {
    const g = groupCardCombos(fixture, false);
    expect(g.split).toBe(false);
    if (g.split) return;
    expect(ids(g.flat)).toEqual(["raptor", "forerunner", "tread", "surge", "pandemonium", "terror", "unpriced"]);
  });

  it("one line per partner, the first-ranked variant kept", () => {
    const twice = [line("first", other("Same", { kind: "spare" })), line("second", other("Same", { kind: "spare" })), line("third", other("Else", { kind: "spare" }))];
    expect(ids(onePerPartner(twice))).toEqual(["first", "third"]);
    const g = groupCardCombos(twice, false);
    if (g.split) throw new Error("split");
    expect(ids(g.flat)).toEqual(["first", "third"]);
  });

  it("byWhere is stable inside a bucket", () => {
    expect(ids(byWhere([line("b", other("B", { kind: "spare" })), line("a", other("A", { kind: "spare" }))]))).toEqual(["b", "a"]);
  });
});

describe("summariseCardCombos", () => {
  it("counts the same deduped lines in the shipped order: in this deck, you own, you don't", () => {
    const withDupe = [...fixture, line("raptor-2", other("Marauding Raptor", { kind: "inDeck" }))];
    expect(summariseCardCombos(withDupe)).toEqual([
      { state: "inDeck", count: 2 },
      { state: "owned", count: 2 },
      { state: "notOwned", count: 3 },
    ]);
  });

  it("omits a zero", () => {
    expect(summariseCardCombos([line("t", other("T", { kind: "spare" }))])).toEqual([{ state: "owned", count: 1 }]);
  });
});
