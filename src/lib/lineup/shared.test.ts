import { describe, expect, it } from "vitest";
import { sharedView } from "./shared";
import type { LineupShared } from "./types";

const card = (name: string, owned: number, decks: [string, number, number][]): LineupShared => ({ oracleId: name, name, owned, decks: decks.map(([id, wants, held]) => ({ id, wants, held })) });
const SOL = card("Sol Ring", 2, [["a", 1, 1], ["b", 1, 0], ["c", 1, 1]]);
const SIGNET = card("Arcane Signet", 5, [["a", 1, 1], ["b", 1, 1]]);
const ORCHARD = card("Exotic Orchard", 0, [["a", 1, 0], ["c", 1, 0]]);
const ALL = new Set(["a", "b", "c"]);

describe("sharedView", () => {
  it("orders by how many decks play the card, with the held decks first and the short ones counted", () => {
    const v = sharedView([SIGNET, SOL, ORCHARD], ALL, "most");
    expect(v.rows.map((r) => r.name)).toEqual(["Sol Ring", "Arcane Signet", "Exotic Orchard"]);
    expect(v.rows[0]).toMatchObject({ wants: 3, owned: 2, short: 1, decks: [{ id: "a", held: true }, { id: "c", held: true }, { id: "b", held: false, short: 1 }] });
    expect([v.twoPlus, v.fivePlus, v.wantedMore]).toEqual([3, 0, 2]);
  });

  it("fills a deck holding some of several copies, and still counts the copies it lacks", () => {
    const rats = card("Relentless Rats", 3, [["a", 4, 1], ["b", 2, 2]]);
    expect(sharedView([rats], ALL, "most").rows[0]).toMatchObject({ short: 3, decks: [{ id: "a", held: true, short: 3 }, { id: "b", held: true, short: 0 }] });
  });

  it("lists only the cards wanted more than owned under that chip, the widest gap first", () => {
    expect(sharedView([SIGNET, SOL, ORCHARD], ALL, "wanted").rows.map((r) => r.name)).toEqual(["Exotic Orchard", "Sol Ring"]);
  });

  it("counts only the decks in scope, and drops a card two of them no longer share", () => {
    const v = sharedView([SIGNET, SOL, ORCHARD], new Set(["a", "b"]), "most");
    expect(v.rows.map((r) => r.name)).toEqual(["Arcane Signet", "Sol Ring"]);
    // Owned never narrows: Sol Ring is still 2 owned, now against 2 wanted.
    expect(v.rows[1]).toMatchObject({ owned: 2, wants: 2 });
    expect(v.wantedMore).toBe(0);
  });
});
