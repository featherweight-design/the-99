import { describe, expect, it } from "vitest";
import { emphasize, liveSentence, longSentence, wentSentence } from "./copy-line";
import { addedCopyCopy as copy } from "../copy/added-copy";
import type { WentRow } from "./arrivals";
import type { ContestedCard } from "./summary-read";

const names = { a: "HD - Brago", b: "HD - Eldrazi", k: "HD - Kratos", g: "HD - Gishath", t: "HD -Thorin" };
const went = (kind: WentRow["kind"], decks: WentRow["decks"]): WentRow => ({ kind, decks, copies: 1, ownedBefore: 16 });
const deck = (deckId: string, copies = 1, picked = false) => ({ deckId, copies, picked });

describe("wentSentence", () => {
  it("names the one deck that holds the copy (L1)", () => {
    expect(wentSentence(went("held", [deck("a")]), names)).toBe(copy.row.goesTo("HD - Brago"));
  });

  it("says a pick made earlier was a pick (L3)", () => {
    expect(wentSentence(went("held", [deck("t", 1, true)]), names)).toBe(copy.row.goesToEarlier("HD -Thorin"));
  });

  it("says `one each` only when every deck took one (L2, audit 8)", () => {
    expect(wentSentence(went("held", [deck("a"), deck("b")]), names))
      .toBe(copy.row.goesToMany(["HD - Brago", "HD - Eldrazi"]));
    expect(wentSentence(went("held", [deck("a", 2), deck("b")]), names))
      .toBe(copy.row.goesToManyUneven(["HD - Brago", "HD - Eldrazi"]));
  });

  it("names a lone brew with `is free for`, and counts several (L5, L6)", () => {
    expect(wentSentence(went("soft", [deck("t", 0)]), names)).toBe(copy.row.freeForBrew("HD -Thorin"));
    expect(wentSentence(went("soft", [deck("k", 0), deck("g", 0), deck("t", 0)]), names))
      .toBe(copy.row.freeForBrews(3));
  });

  it("says nothing for a copy nobody took, or a deck whose name is gone (L9)", () => {
    expect(wentSentence(went("none", []), names)).toBeNull();
    expect(wentSentence(went("held", [deck("gone")]), names)).toBeNull();
  });
});

describe("liveSentence", () => {
  type Claimant = ContestedCard["claimants"][number];
  const committed = (deckId: string, deckName: string, allocated: number, granted = 0): Claimant =>
    ({ deckId, deckName, quantity: 1, commanderCopies: 0, granted, since: 1, versionNumber: 1, allocated });
  const brew = (deckId: string, deckName: string, allocated: number, granted = 0): Claimant =>
    ({ ...committed(deckId, deckName, allocated, granted), since: null, versionNumber: null, brew: true });
  const card = (owned: number, arrived: number, claimants: Claimant[]): ContestedCard =>
    ({ oracleId: "o", cardName: "Sol Ring", arrived, ownedBefore: owned - arrived, fromImport: true, owned, claimants });

  it("names the deck the player gave the copy to (L4)", () => {
    expect(liveSentence(card(1, 1, [committed("a", "HD - Brago", 0), brew("t", "HD -Thorin", 1, 1)])))
      .toBe(copy.row.goesToPicked("HD -Thorin"));
  });

  it("after a pick is cleared, names the junior-most holder seniority gave the new copy", () => {
    expect(liveSentence(card(2, 1, [committed("s", "HD - Senior", 1), committed("a", "HD - Brago", 1), brew("t", "HD -Thorin", 0)])))
      .toBe(copy.row.goesTo("HD - Brago"));
  });

  it("names every holder of the new copies, in queue order", () => {
    expect(liveSentence(card(3, 2, [committed("s", "HD - Senior", 1), committed("a", "HD - Brago", 1), committed("b", "HD - Eldrazi", 1)])))
      .toBe(copy.row.goesToMany(["HD - Brago", "HD - Eldrazi"]));
  });

  it("calls a spare the brews read `is free for`", () => {
    expect(liveSentence(card(2, 1, [committed("s", "HD - Senior", 1), brew("t", "HD -Thorin", 1)])))
      .toBe(copy.row.freeForBrew("HD -Thorin"));
    expect(liveSentence(card(2, 1, [committed("s", "HD - Senior", 1), brew("k", "HD - Kratos", 1), brew("t", "HD -Thorin", 1)])))
      .toBe(copy.row.freeForBrews(2));
  });

  it("names every destination when a pick took one new copy and seniority placed another", () => {
    expect(liveSentence(card(3, 2, [committed("s", "HD - Senior", 1), committed("a", "HD - Brago", 1), brew("t", "HD -Thorin", 1, 1)])))
      .toBe(copy.row.goesToMany(["HD - Brago", "HD -Thorin"]));
  });

  it("counts a picked committed deck's queue share beside its grant, never a false `one each`", () => {
    // Three new copies; senior A asks for two with a one-copy grant, B asks for one. Live: A=2, B=1.
    const a = { ...committed("a", "HD - Brago", 2, 1), quantity: 2 };
    expect(liveSentence(card(3, 3, [a, committed("b", "HD - Eldrazi", 1)])))
      .toBe(copy.row.goesToManyUneven(["HD - Brago", "HD - Eldrazi"]));
  });

  it("names only the copies still owned when another tab removed some since the import", () => {
    // Two arrived over one held before; one has since been removed, so one new copy is left.
    const c = { ...card(2, 2, [committed("s", "HD - Senior", 1), committed("a", "HD - Brago", 1)]), ownedBefore: 1 };
    expect(liveSentence(c)).toBe(copy.row.goesTo("HD - Brago"));
  });

  it("has nothing to say when no deck holds or reads the new copy", () => {
    expect(liveSentence(card(2, 1, [committed("s", "HD - Senior", 1)]))).toBeNull();
  });
});

describe("longSentence (Add Cards)", () => {
  it("states the count when one deck takes more than one copy, never `which needs one`", () => {
    const s = longSentence({ kind: "held", decks: [{ name: "HD - Brago", copies: 2, picked: false }] }, "Sol Ring");
    expect(s).toBe(copy.line.goesToManyUneven("Sol Ring", 2, ["HD - Brago"]));
    expect(s).toBe("2 copies of Sol Ring go to HD - Brago");
  });

  it("names the card, and counts the copies across several decks", () => {
    expect(longSentence({ kind: "held", decks: [{ name: "HD - Brago", copies: 1, picked: false }] }, "Sol Ring"))
      .toBe(copy.line.goesTo("Sol Ring", "HD - Brago"));
    expect(longSentence({ kind: "held", decks: [{ name: "A", copies: 1, picked: false }, { name: "B", copies: 1, picked: false }] }, "Sol Ring"))
      .toBe(copy.line.goesToMany("Sol Ring", 2, ["A", "B"]));
    expect(longSentence({ kind: "held", decks: [{ name: "A", copies: 2, picked: false }, { name: "B", copies: 1, picked: false }] }, "Sol Ring"))
      .toBe(copy.line.goesToManyUneven("Sol Ring", 3, ["A", "B"]));
    expect(longSentence({ kind: "held", decks: [{ name: "HD -Thorin", copies: 1, picked: true }] }, "Sol Ring"))
      .toBe(copy.line.goesToEarlier("Sol Ring", "HD -Thorin"));
    expect(longSentence({ kind: "picked", deck: "HD -Thorin" }, "Sol Ring")).toBe(copy.line.goesToPicked("Sol Ring", "HD -Thorin"));
    expect(longSentence({ kind: "soft", brews: ["HD -Thorin"] }, "Sol Ring")).toBe(copy.line.freeForBrew("Sol Ring", "HD -Thorin"));
    expect(longSentence({ kind: "soft", brews: ["A", "B", "C"] }, "Sol Ring")).toBe(copy.line.freeForBrews("Sol Ring", 3));
  });
});

describe("emphasize", () => {
  it("cuts the sentence at the card and each deck, in order", () => {
    expect(emphasize(copy.line.goesToMany("Sol Ring", 2, ["HD - Brago", "HD - Eldrazi"]), "Sol Ring", ["HD - Brago", "HD - Eldrazi"])).toEqual([
      { text: "2 copies of " }, { text: "Sol Ring", em: "card" }, { text: " go to " },
      { text: "HD - Brago", em: "deck" }, { text: " and " }, { text: "HD - Eldrazi", em: "deck" }, { text: ", one each" },
    ]);
  });

  it("takes the longer name at a tie, so a deck named inside another stays whole", () => {
    expect(emphasize("Sol Ring goes to HD - Brago Two", "Sol Ring", ["HD - Brago", "HD - Brago Two"]))
      .toEqual([{ text: "Sol Ring", em: "card" }, { text: " goes to " }, { text: "HD - Brago Two", em: "deck" }]);
  });
});
