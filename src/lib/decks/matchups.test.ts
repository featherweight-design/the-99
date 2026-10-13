import { describe, expect, it } from "vitest";
import type { DeckGame } from "./games";
import type { GameOpponent } from "./game-opponents";
import { summarizeMatchups } from "./matchups";

const game = (id: string, result: DeckGame["result"], hurt: DeckGame["hurt"] = []): DeckGame => ({
  id, result, podSize: 4, playedAt: new Date("2026-10-01"), versionNumber: null, note: null, worked: [], hurt,
});
const yuriko = { oracleId: "y", name: "Yuriko" };
const tymna = { oracleId: "t", name: "Tymna" };
const thrasios = { oracleId: "h", name: "Thrasios" };
const seat = (over: Partial<GameOpponent>): GameOpponent => ({
  seat: 1, friend: null, deckName: null, commander: null, partner: null, colorIdentity: [], label: null, won: false, ...over,
});

describe("summarizeMatchups", () => {
  const games = [game("g1", "loss", ["interaction"]), game("g2", "win"), game("g3", "loss", ["interaction"]), game("g4", "draw")];
  const opponents = new Map<string, GameOpponent[]>([
    ["g1", [
      seat({ friend: { key: "f1", name: "Dave" }, commander: yuriko, colorIdentity: ["U", "B"], won: true }),
      seat({ seat: 2, commander: tymna, partner: thrasios, colorIdentity: ["W", "U", "B", "G"] }),
    ]],
    ["g2", [seat({ friend: { key: "f1", name: "Dave" }, commander: yuriko, colorIdentity: ["U", "B"] })]],
    ["g3", [seat({ label: "Sam", commander: yuriko, colorIdentity: ["U", "B"], won: true })]],
  ]);
  const m = summarizeMatchups(games, opponents);

  it("counts every game, and the games with an opponent recorded", () => {
    expect([m.games, m.recorded]).toEqual([4, 3]);
  });

  it("splits by commander, counting games with their denominators and who beat the player", () => {
    const y = m.commanders.find((c) => c.commander.name === "Yuriko")!;
    expect(y.summary.count).toBe(3);
    expect(y.summary.record).toEqual({ wins: 1, losses: 2, draws: 0 });
    expect(y.beatMe).toBe(2);
    expect(y.summary.axes.find((a) => a.key === "interaction")).toMatchObject({ hurt: 2, worked: 0 });
    const pair = m.commanders.find((c) => c.partner !== null)!;
    expect([pair.key, pair.summary.count, pair.beatMe]).toEqual(["h+t", 1, 0]);
  });

  it("files a pair under one cell whichever side was stored first", () => {
    const both = summarizeMatchups([game("a", "win"), game("b", "loss")], new Map([
      ["a", [seat({ commander: tymna, partner: thrasios })]],
      ["b", [seat({ commander: thrasios, partner: tymna, won: true })]],
    ]));
    expect(both.commanders.map((c) => [c.key, c.summary.count, c.beatMe])).toEqual([["h+t", 2, 1]]);
  });

  it("orders cells by games held, never by record", () => {
    expect(m.commanders.map((c) => c.key)).toEqual(["y", "h+t"]);
  });

  it("splits by color identity, colorless included", () => {
    expect(m.identities.map((c) => [c.colorIdentity.join(""), c.summary.count])).toEqual([["UB", 3], ["WUBG", 1]]);
    const colorless = summarizeMatchups([game("g", "win")], new Map([["g", [seat({ commander: yuriko })]]]));
    expect(colorless.identities.map((c) => [c.key, c.colorIdentity])).toEqual([["C", []]]);
  });

  it("splits by friend, across their decks", () => {
    expect(m.friends.map((f) => [f.name, f.summary.count, f.beatMe])).toEqual([["Dave", 2, 1]]);
  });

  it("counts one game once in a cell, however many of its seats fall there", () => {
    const twin = summarizeMatchups([game("g", "loss")], new Map([["g", [
      seat({ commander: yuriko, colorIdentity: ["U", "B"] }), seat({ seat: 2, commander: yuriko, colorIdentity: ["U", "B"], won: true }),
    ]]]));
    expect([twin.commanders[0].summary.count, twin.commanders[0].beatMe, twin.identities[0].summary.count]).toEqual([1, 1, 1]);
  });

  it("returns no rate anywhere", () => {
    expect(JSON.stringify(m)).not.toMatch(/rate|percent|ratio/i);
  });
});
