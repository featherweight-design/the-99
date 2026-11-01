import { describe, expect, it } from "vitest";
import {
  cleanGamesFilter, GAMES_FILTER_PARAMS, gamesFilterFromParams, gamesFilterKey, gamesFilterToParams, isEmptyGamesFilter, playedAgainstOf,
  sheetFilterCount, withGamesFilter,
} from "./history-filter";

const read = (q: string) => { const p = new URLSearchParams(q); return (k: string) => p.get(k); };

describe("the filters on the address", () => {
  it("reads the four fields and nothing else; `commander` is the builder redirect's, so the commander rides as `against`", () => {
    expect(GAMES_FILTER_PARAMS).toEqual(["deck", "result", "friend", "against"]);
    expect(gamesFilterFromParams(read("view=games&deck=d&result=win&friend=f&commander=x"))).toEqual({ deckId: "d", result: "win", friend: "f" });
    expect(gamesFilterFromParams(read("against=c&commander=x"))).toEqual({ commander: "c" });
  });

  it("keeps a value as written (the read matches nothing for a stale one) and drops an empty one", () => {
    expect(gamesFilterFromParams(read("result=bogus&deck="))).toEqual({ result: "bogus" });
    expect(gamesFilterFromParams((k) => (k === "deck" ? ["a", "b"] : undefined))).toEqual({ deckId: "a" });
  });

  it("folds ids to lower case, so a capitalised address keys, chips and picks like the lower-case one", () => {
    const up = "6F1C2A3B-4D5E-4F60-8A7B-9C0D1E2F3A4B";
    expect(gamesFilterFromParams(read(`deck=${up}&friend=${up}&against=${up}&result=WIN`))).toEqual({ deckId: up.toLowerCase(), friend: up.toLowerCase(), result: "WIN" });
    expect(gamesFilterKey(gamesFilterFromParams(read(`friend=${up}`)))).toBe(gamesFilterKey({ friend: up.toLowerCase() }));
    expect(cleanGamesFilter({ deckId: up })).toEqual({ deckId: up.toLowerCase() });
  });

  it("keeps one Played against: a friend wins over a commander, in the address and across the wire", () => {
    expect(gamesFilterFromParams(read("friend=f&against=c"))).toEqual({ friend: "f" });
    expect(gamesFilterFromParams(read("against=c"))).toEqual({ commander: "c" });
    expect(cleanGamesFilter({ friend: "F", commander: "c" })).toEqual({ friend: "f" });
  });

  it("writes defaults as absences and round-trips", () => {
    expect(gamesFilterToParams({}).toString()).toBe("");
    const f = { deckId: "d", result: "loss", commander: "c" };
    expect(gamesFilterFromParams((k) => gamesFilterToParams(f).get(k))).toEqual(f);
  });
});

describe("the key and the shape", () => {
  it("files equal filters together whatever order their fields were set in", () => {
    expect(gamesFilterKey({ result: "win", deckId: "d" })).toBe(gamesFilterKey({ deckId: "d", result: "win" }));
    expect(isEmptyGamesFilter({})).toBe(true);
    expect(isEmptyGamesFilter({ result: "win" })).toBe(false);
  });

  it("takes a field off with undefined or an empty string", () => {
    expect(withGamesFilter({ deckId: "d", result: "win" }, { result: undefined })).toEqual({ deckId: "d" });
    expect(withGamesFilter({ deckId: "d" }, { deckId: "" })).toEqual({});
  });

  it("is one Played against choice, and the sheet's badge counts Result and Played against, never the deck", () => {
    expect(playedAgainstOf({ friend: "f" })).toEqual({ kind: "friend", id: "f" });
    expect(playedAgainstOf({ commander: "c" })).toEqual({ kind: "commander", id: "c" });
    expect(playedAgainstOf({ deckId: "d" })).toBeNull();
    expect(sheetFilterCount({ deckId: "d", result: "win", friend: "f" })).toBe(2);
    expect(sheetFilterCount({ deckId: "d" })).toBe(0);
  });
});

describe("what a caller's filter is worth across the wire", () => {
  it("keeps a string for each of the four fields and drops everything else", () => {
    expect(cleanGamesFilter({ deckId: "d", result: 3, friend: "", commander: "c", extra: "x" })).toEqual({ deckId: "d", commander: "c" });
    expect(cleanGamesFilter(null)).toEqual({});
    expect(cleanGamesFilter("nope")).toEqual({});
  });
});
