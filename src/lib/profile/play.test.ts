import { describe, expect, it } from "vitest";

import type { DeckGame } from "../decks/games";
import { buildDeckProfile } from "./build";
import { buildPlayGroup } from "./play";

const game = (id: string, over: Partial<DeckGame> = {}): DeckGame => ({
  id, result: "loss", podSize: 4, playedAt: new Date("2026-09-01T20:00:00Z"),
  versionNumber: null, note: null, worked: [], hurt: [], ...over,
});

const games = [
  game("g1", { hurt: ["mana"], worked: ["interaction"] }),
  game("g2", { hurt: ["mana"], note: "flooded out on turn six" }),
  game("g3", { result: "win", worked: ["interaction"] }),
];

describe("buildPlayGroup", () => {
  it("strips net from every axis it carries", () => {
    for (const axis of buildPlayGroup(games).summary.axes) expect(axis).not.toHaveProperty("net");
  });

  it("orders axes fix first", () => {
    expect(buildPlayGroup(games).summary.axes.map((a) => a.key)).toEqual(["mana", "interaction"]);
  });

  it("keeps the denominator and the notes verbatim", () => {
    const play = buildPlayGroup(games);
    expect(play.summary).toMatchObject({ count: 3, marked: 3, record: { wins: 1, losses: 2, draws: 0 } });
    expect(play.games[1].note).toBe("flooded out on turn six");
  });

  it("is an empty group, not an absent one, at zero games", () => {
    expect(buildPlayGroup([])).toEqual({
      games: [],
      summary: { count: 0, marked: 0, record: { wins: 0, losses: 0, draws: 0 }, axes: [] },
    });
  });

  it("serializes playedAt as a string, because the profile is JSON-only", () => {
    expect(buildPlayGroup(games).games[0].playedAt).toBe("2026-09-01T20:00:00.000Z");
  });
});

// The play group is composed at the read and never stored: the builder must not set it, or a
// cached profile would carry the games it was built with and go stale on the next one logged.
describe("the play key on a built profile", () => {
  it("is absent from what buildDeckProfile returns", () => {
    const built = buildDeckProfile({
      deckId: "d", fingerprint: "f", cards: [], commanderOracleIds: ["cmd"], identity: [],
      condition: "C",
      composition: { pair: null, commander: null, identity: null, count: null },
      roles: { pair: null, commander: null, identity: null, count: null },
      thinCondition: false, staples: [], commanderDeckCount: null, population: null,
      mldFlags: new Map(), extraTurnFlags: new Map(), gameChangerIds: new Set(), twoCardCombos: [],
      tutorIds: new Set(),
      detection: {
        massLandDenial: { methods: [], basis: "" }, extraTurn: { methods: [], basis: "" }, twoCardCombos: { methods: [], basis: "" },
      },
    });
    expect("play" in built).toBe(false);
  });
});
