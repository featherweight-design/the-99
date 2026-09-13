import { describe, expect, it } from "vitest";
import { deriveHeadline } from "./game-headline";
import { summarizeGames, type DeckGame } from "./games";
import { PATTERN_MIN, axisCopy, gameLogCopy } from "../copy/game-log";

const axisLabel = (key: keyof typeof axisCopy) => axisCopy[key].label;

function game(over: Partial<DeckGame> = {}): DeckGame {
  return {
    id: "g",
    result: "win",
    podSize: 4,
    playedAt: new Date("2026-09-01"),
    versionNumber: null,
    note: null,
    worked: [],
    hurt: [],
    ...over,
  };
}

describe("deriveHeadline", () => {
  it("is null with no games, because the empty state replaces the whole panel", () => {
    expect(deriveHeadline(summarizeGames([]))).toBeNull();
  });

  it("leads with the strongest Fix when one exists", () => {
    const h = deriveHeadline(summarizeGames([
      game({ hurt: ["card_flow", "mana"] }),
      game({ hurt: ["card_flow"], worked: ["board"] }),
      game({ hurt: ["card_flow"], worked: ["board"] }),
    ]))!;
    expect(h.heading).toContain(axisLabel("card_flow"));
    expect(h.heading).not.toContain(axisLabel("board"));
  });

  it("falls to the strongest Keep when nothing is negative", () => {
    const h = deriveHeadline(summarizeGames([
      game({ worked: ["board"] }),
      game({ worked: ["board"] }),
      game({ worked: ["board", "mana"] }),
    ]))!;
    expect(h.heading).toBe(gameLogCopy.headline.findingKeep(axisLabel("board")));
  });

  it("states the mixed case plainly when every axis is net zero", () => {
    const h = deriveHeadline(summarizeGames([
      game({ worked: ["mana"] }),
      game({ hurt: ["mana"] }),
      game({ worked: ["board"] }),
      game({ hurt: ["board"] }),
    ]))!;
    expect(h.heading).toBe(gameLogCopy.headline.findingNone);
  });

  it("falls all the way to the record when nothing is marked at all", () => {
    const h = deriveHeadline(summarizeGames([game(), game(), game()]))!;
    expect(h.heading).toBe(gameLogCopy.headline.recordOnly("3", gameLogCopy.headline.record("3", "0")));
    // No aggregate panel to describe, so no sub-line either.
    expect(h.sub).toBe("");
  });

  // The whole point of PATTERN_MIN: below it, the panel must not claim a
  // pattern it does not have, however lopsided one axis looks.
  it("uses the one-game voice at N=1 even with a strong mark", () => {
    const h = deriveHeadline(summarizeGames([game({ hurt: ["mana"] })]))!;
    expect(h.heading).toBe(gameLogCopy.headline.oneGame);
    expect(h.sub).toBe(gameLogCopy.headline.oneGameNote);
  });

  it("uses the two-game voice at N=2", () => {
    const h = deriveHeadline(summarizeGames([game({ hurt: ["mana"] }), game({ hurt: ["mana"] })]))!;
    expect(h.heading).toBe(gameLogCopy.headline.twoGames(axisLabel("mana")));
  });

  // "went wrong both times" is a claim about every game, so an axis marked in
  // only one of the two must not borrow the sentence.
  it("does not say both times when the axis was marked once", () => {
    const h = deriveHeadline(summarizeGames([game({ hurt: ["mana"] }), game()]))!;
    expect(h.heading).toBe(gameLogCopy.headline.findingNone);
    // The plain heading is still the two-game voice, so it keeps the leaning
    // note rather than the pattern voice's record sentence.
    expect(h.sub).toBe(gameLogCopy.headline.twoGamesNote);
    expect(h.subEmphasis).toBeNull();
  });

  it("switches to the pattern voice exactly at PATTERN_MIN", () => {
    const games = Array.from({ length: PATTERN_MIN }, () => game({ hurt: ["mana"] }));
    const h = deriveHeadline(summarizeGames(games))!;
    expect(h.heading).toBe(gameLogCopy.headline.finding(axisLabel("mana")));
  });

  it("names the record beside the heading only at N=1", () => {
    const one = deriveHeadline(summarizeGames([game({ result: "loss" })]))!;
    // The record travels through the copy rather than being hardcoded, so a
    // first game that was lost reads 0–1 and not 1–0.
    expect(one.record).toBe(
      gameLogCopy.headline.oneGameRecord(
        gameLogCopy.headline.record("0", "1"),
        gameLogCopy.headline.lostIt,
      ),
    );

    const two = deriveHeadline(summarizeGames([game(), game()]))!;
    expect(two.record).toBeNull();
  });

  it("renders the record with draws only when there are draws", () => {
    // Three games, because the N=2 sub-line is the leaning note and carries no
    // record at all — the record only reaches `sub` in the pattern voice.
    const noDraws = deriveHeadline(summarizeGames([
      game({ result: "win", hurt: ["mana"] }),
      game({ result: "loss", hurt: ["mana"] }),
      game({ result: "win", hurt: ["mana"] }),
    ]))!;
    expect(noDraws.sub).toContain(gameLogCopy.headline.record("2", "1"));

    const withDraws = deriveHeadline(summarizeGames([
      game({ result: "win", hurt: ["mana"] }),
      game({ result: "loss", hurt: ["mana"] }),
      game({ result: "draw", hurt: ["mana"] }),
    ]))!;
    expect(withDraws.sub).toContain(gameLogCopy.headline.recordWithDraws("1", "1", "1"));
  });

  it("counts the marked games rather than the marks", () => {
    const h = deriveHeadline(summarizeGames([
      game({ hurt: ["mana", "board", "speed"] }),
      game({ hurt: ["mana"] }),
      game(),
    ]))!;
    expect(h.sub).toContain("Marked in 2 of 3 games");
  });

  it("never prints a percentage or a signed number", () => {
    const h = deriveHeadline(summarizeGames([
      game({ hurt: ["mana"] }), game({ hurt: ["mana"] }), game({ hurt: ["mana"] }),
    ]))!;
    for (const s of [h.heading, h.sub, h.record ?? ""]) {
      expect(s).not.toMatch(/%/);
      expect(s).not.toMatch(/[−-]\d/);
    }
  });
});
