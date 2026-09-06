import { describe, it, expect } from "vitest";
import { receiptCountsByCommander } from "./in-use";
import type { PoolCard } from "../recs/score";
import type { Availability } from "../decks/availability";

const card = (oracleId: string, colorIdentity: string[] = []): PoolCard => ({
  oracleId,
  name: oracleId,
  typeLine: "Instant",
  oracleText: null,
  keywords: [],
  colorIdentity,
  imageUri: null,
  manaCost: null,
});

const avail = (over: Partial<Availability> = {}): Availability => ({
  owned: 1,
  hard: 0,
  soft: 0,
  free: 1,
  claims: [],
  ...over,
});

const hard = avail({ hard: 1, free: 0 });
const over = avail({ hard: 3, free: -2 });
const soft = avail({ soft: 1 });

const korvold = [{ oracleId: "korvold", colorIdentity: [] }];

describe("receiptCountsByCommander", () => {
  it("counts the fitting cards a finished deck has sleeved", () => {
    const m = receiptCountsByCommander(korvold, [card("a"), card("b")], new Map([["a", hard]]));
    expect(m.get("korvold")).toEqual({ inUse: 1, wantedByBrew: 0 });
  });

  // Both severities of "physically gone" count as in use. `over` is the same
  // fact with more decks wanting the card than the player owns copies.
  it("counts an over-committed card as in use too", () => {
    const m = receiptCountsByCommander(korvold, [card("a")], new Map([["a", over]]));
    expect(m.get("korvold")).toEqual({ inUse: 1, wantedByBrew: 0 });
  });

  // The same asymmetry the free pool draws: a brew is a list, not a stack of
  // sleeves, so a soft claim leaves the card usable — and gets its own clause.
  it("counts a card an unfinished brew wants separately", () => {
    const m = receiptCountsByCommander(korvold, [card("a")], new Map([["a", soft]]));
    expect(m.get("korvold")).toEqual({ inUse: 0, wantedByBrew: 1 });
  });

  // The two counts are disjoint, which is what lets the caller pick one clause
  // by severity without any card being described twice.
  it("puts each card in exactly one bucket", () => {
    const m = receiptCountsByCommander(
      korvold,
      [card("a"), card("b"), card("c"), card("d")],
      new Map([
        ["a", hard],
        ["b", over],
        ["c", soft],
      ]),
    );
    expect(m.get("korvold")).toEqual({ inUse: 2, wantedByBrew: 1 });
  });

  // The counts must describe the SAME pool as `colorPoolSize`, or the receipt's
  // two clauses contradict each other: "12 of 8 already in use".
  it("ignores a committed card outside the commander's colour identity", () => {
    const m = receiptCountsByCommander(
      [{ oracleId: "mono-white", colorIdentity: ["W"] }],
      [card("blue-card", ["U"]), card("white-card", ["W"])],
      new Map([
        ["blue-card", hard],
        ["white-card", hard],
      ]),
    );
    expect(m.get("mono-white")).toEqual({ inUse: 1, wantedByBrew: 0 });
  });

  // A commander sleeved into one of your own finished decks is still a
  // commander you could unsleeve, and it is never in its own 99.
  it("never counts the commander against itself", () => {
    const m = receiptCountsByCommander(korvold, [card("korvold")], new Map([["korvold", hard]]));
    expect(m.get("korvold")).toEqual({ inUse: 0, wantedByBrew: 0 });
  });

  // Basics have no availability row by design, and a card with no row has no
  // claim on it. Absent must read as free, never as unknown-so-committed.
  it("treats a card with no availability row as free", () => {
    const m = receiptCountsByCommander(korvold, [card("forest")], new Map());
    expect(m.get("korvold")).toEqual({ inUse: 0, wantedByBrew: 0 });
  });

  it("returns an entry for every commander it was given", () => {
    const m = receiptCountsByCommander(
      [
        { oracleId: "korvold", colorIdentity: [] },
        { oracleId: "atraxa", colorIdentity: [] },
      ],
      [],
      new Map(),
    );
    expect([...m.keys()].sort()).toEqual(["atraxa", "korvold"]);
  });
});
