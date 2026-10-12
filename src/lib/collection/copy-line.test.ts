import { describe, expect, it } from "vitest";
import { pickedSentence, wentSentence } from "./copy-line";
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

describe("pickedSentence", () => {
  const card = (granted: number): ContestedCard => ({
    oracleId: "o", cardName: "Sol Ring", arrived: 1, ownedBefore: 16, fromImport: true, owned: 17,
    claimants: [
      { deckId: "a", deckName: "HD - Brago", quantity: 1, commanderCopies: 0, granted: 0, since: 1, versionNumber: 1, allocated: 1 },
      { deckId: "t", deckName: "HD -Thorin", quantity: 1, commanderCopies: 0, granted, since: null, versionNumber: null, brew: true, allocated: granted },
    ],
  });

  it("names the deck the player gave the copy to (L4)", () => {
    expect(pickedSentence(card(1))).toBe(copy.row.goesToPicked("HD -Thorin"));
  });

  it("has nothing to say when no deck holds a pick", () => {
    expect(pickedSentence(card(0))).toBeNull();
  });
});
