import { describe, expect, it } from "vitest";
import { identityName, matchupRows, singleGameCaption, SQUARES_MAX } from "./matchup-rows";
import { named } from "../person-name/mint";
import type { Matchups } from "./matchups";
import type { GameSummary } from "./games";

const summary = (wins: number, losses: number, draws = 0): GameSummary =>
  ({ count: wins + losses + draws, record: { wins, losses, draws }, axes: [], fix: [], keep: [], mixed: [] }) as unknown as GameSummary;
const cell = (key: string, s: GameSummary, beatMe = 0) => ({ key, summary: s, beatMe });
const yuriko = { oracleId: "y", name: "Yuriko, the Tiger’s Shadow", imageUri: "y.jpg" };
const tymna = { oracleId: "t", name: "Tymna the Weaver", imageUri: null };
const thrasios = { oracleId: "h", name: "Thrasios, Triton Hero", imageUri: null };
const base: Matchups = { games: 0, recorded: 0, commanders: [], identities: [], friends: [] };

describe("squares and counts", () => {
  it("one game is one square, wins first, then draws, then losses", () => {
    const rows = matchupRows({ ...base, commanders: [
      { ...cell("y", summary(0, 1)), commander: yuriko, partner: null },
      { ...cell("t", summary(2, 2, 1)), commander: tymna, partner: null },
    ] }, "commanders");
    expect(rows[0].squares).toEqual(["L"]);
    expect(rows[1].squares).toEqual(["W", "W", "D", "L", "L"]);
    expect(rows[1].aria).toBe("2 won, 1 drawn, 2 lost");
  });
  it("past ten games the squares give way to counts, never a percentage", () => {
    const [row] = matchupRows({ ...base, commanders: [{ ...cell("y", summary(7, 5)), commander: yuriko, partner: null }] }, "commanders");
    expect(SQUARES_MAX).toBe(10);
    expect(row.squares).toBeNull();
    expect(row.counts).toBe("7 W · 5 L");
    expect(JSON.stringify(row)).not.toMatch(/%/);
    const [ten] = matchupRows({ ...base, commanders: [{ ...cell("y", summary(5, 5)), commander: yuriko, partner: null }] }, "commanders");
    expect(ten.squares).toHaveLength(10);
  });
  it("adds draws to the counts only when there are some", () => {
    const [row] = matchupRows({ ...base, commanders: [{ ...cell("y", summary(6, 4, 2)), commander: yuriko, partner: null }] }, "commanders");
    expect(row.counts).toBe("6 W · 4 L · 2 D");
  });
});

describe("rows by split", () => {
  it("names a commander whole, a pair by both short names, and draws its art or a blank", () => {
    const rows = matchupRows({ ...base, commanders: [
      { ...cell("y", summary(1, 0), 0), commander: yuriko, partner: null },
      { ...cell("h+t", summary(0, 1), 1), commander: tymna, partner: thrasios },
    ] }, "commanders");
    expect(rows[0]).toMatchObject({ name: yuriko.name, thumb: { kind: "art", imageUri: "y.jpg" }, beat: 0 });
    expect(rows[1]).toMatchObject({ name: "Tymna the Weaver + Thrasios", thumb: { kind: "blank" }, beat: 1 });
  });
  it("names an identity as colorLabel does, and the ones it does not name from the copy", () => {
    expect(identityName(["U", "R"])).toEqual({ name: "Izzet", sub: null });
    expect(identityName(["W", "U", "R"])).toEqual({ name: "Jeskai", sub: null });
    expect(identityName(["U"])).toEqual({ name: "Blue", sub: null });
    expect(identityName([])).toEqual({ name: "Colorless", sub: null });
    expect(identityName(["W", "U", "B", "R", "G"])).toEqual({ name: "Five colors", sub: null });
    expect(identityName(["W", "U", "B", "R"])).toEqual({ name: "Four colors", sub: "no green" });
  });
  it("draws a friend by the commander they played, else their initials", () => {
    const rows = matchupRows({ ...base, friends: [
      { ...cell("f1", summary(1, 0)), name: named("Dave"), commander: yuriko },
      { ...cell("f2", summary(0, 1)), name: named("Jo Park"), commander: null },
    ] }, "friends");
    expect(rows[0].thumb).toEqual({ kind: "art", imageUri: "y.jpg" });
    expect(rows[1].thumb).toEqual({ kind: "initials", name: named("Jo Park") });
  });
});

describe("the single-game caption", () => {
  const g = (...n: number[]) => n.map((games) => ({ games }));
  it("says every row is one game, or most are, and is silent otherwise", () => {
    expect(singleGameCaption(g(1, 1, 1))).toBe("allOne");
    expect(singleGameCaption(g(1, 1, 2))).toBe("mostlyOne");
    expect(singleGameCaption(g(1, 2, 3))).toBeNull();
    expect(singleGameCaption(g(1, 2))).toBeNull();
    expect(singleGameCaption([])).toBeNull();
  });
});
