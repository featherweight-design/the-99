import { describe, expect, it } from "vitest";
import { GAME_PARAM, LANDING_RING_MS, gameHref, gameLandingId, gameRowId } from "./landing";

const ID = "11111111-1111-4111-8111-111111111111";

describe("the landing on a deck's Games tab", () => {
  it("names the tab and the game, and a deck page reads the same pair back", () => {
    const href = gameHref("deck-1", ID);
    expect(href).toBe(`/decks/deck-1?tab=games&${GAME_PARAM}=${ID}`);
    const q = new URL(href, "https://x.test").searchParams;
    expect(gameLandingId({ tab: q.get("tab")!, game: q.get("game")! })).toBe(ID);
  });

  it("reads a game only while the URL names the Games tab, and only a uuid", () => {
    expect(gameLandingId({ game: ID })).toBeNull();
    expect(gameLandingId({ tab: "analysis", game: ID })).toBeNull();
    expect(gameLandingId({ tab: "games" })).toBeNull();
    expect(gameLandingId({ tab: "games", game: "not-a-uuid" })).toBeNull();
    expect(gameLandingId({ tab: "games", game: [ID, ID] })).toBeNull();
  });

  it("anchors a row by its game id and rings for two seconds", () => {
    expect(gameRowId(ID)).toBe(`game-${ID}`);
    expect(LANDING_RING_MS).toBe(2000);
  });
});
