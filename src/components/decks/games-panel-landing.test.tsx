// The landing from the cross-deck Games view (game history, Place W3/W4): `/decks/<id>?tab=games&game=<id>` scrolls that
// game's row into view and rings it for two seconds, once; the parameter leaves the address; an id that is not one of the
// deck's rows rings nothing and is spent all the same.
import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GamesPanel } from "./games-panel";
import { summarizeGames, type DeckGame } from "../../lib/decks/games";
import { LANDING_RING_MS, gameRowId } from "../../lib/games/landing";

vi.mock("../../app/decks/actions", () => ({ logGame: async () => ({ ok: true }), deleteGame: async () => ({ ok: true }) }));

const game = (id: string): DeckGame => ({ id, result: "win", podSize: 4, playedAt: new Date("2026-09-01"), versionNumber: null, note: null, worked: [], hurt: [] });
const GAMES = [game("g1"), game("g2"), game("g3")];
const scrolledOn: Element[] = [];
const scroll = vi.fn(function (this: Element, _arg?: ScrollIntoViewOptions) { scrolledOn.push(this); });

const mount = (landingGameId: string | null, onLandingSpent = vi.fn()) => ({
  onLandingSpent,
  ...render(<GamesPanel deckId="deck_1" games={GAMES} summary={summarizeGames(GAMES)} landingGameId={landingGameId} onLandingSpent={onLandingSpent} />),
});
const row = (id: string) => document.getElementById(gameRowId(id))!;

beforeEach(() => {
  vi.useFakeTimers();
  scroll.mockClear();
  scrolledOn.length = 0;
  Element.prototype.scrollIntoView = scroll;
  window.history.replaceState(null, "", "/decks/deck_1?tab=games&game=g2");
});
afterEach(() => vi.useRealTimers());

describe("GamesPanel: the arrival ring", () => {
  it("gives every row an anchor and rings none without a landing", () => {
    mount(null);
    expect(GAMES.every((g) => row(g.id) !== null)).toBe(true);
    expect(document.querySelector("[data-ringed]")).toBeNull();
    expect(scroll).not.toHaveBeenCalled();
  });

  it("scrolls the landed row into view, rings it alone, and lets go after two seconds", () => {
    const { onLandingSpent } = mount("g2");
    expect(row("g2").hasAttribute("data-ringed")).toBe(true);
    expect(row("g1").hasAttribute("data-ringed")).toBe(false);
    expect(scroll).toHaveBeenCalledTimes(1);
    expect(scrolledOn[0]).toBe(row("g2"));
    expect(scroll.mock.calls[0][0]).toMatchObject({ block: "center" });
    act(() => { vi.advanceTimersByTime(LANDING_RING_MS - 1); });
    expect(row("g2").hasAttribute("data-ringed")).toBe(true);
    act(() => { vi.advanceTimersByTime(1); });
    expect(row("g2").hasAttribute("data-ringed")).toBe(false);
    // The ring clearing is not a reason to move the page again, and the shell was told to forget the landing once.
    expect(scroll).toHaveBeenCalledTimes(1);
    expect(onLandingSpent).toHaveBeenCalledTimes(1);
  });

  it("takes the parameter out of the address on arrival, and keeps the tab", () => {
    mount("g2");
    expect(window.location.search).toBe("?tab=games");
  });

  it("rings nothing for a game that is not on this deck, but still spends the landing and clears the address", () => {
    const { onLandingSpent } = mount("not-here");
    expect(document.querySelector("[data-ringed]")).toBeNull();
    expect(scroll).not.toHaveBeenCalled();
    expect(onLandingSpent).toHaveBeenCalledTimes(1);
    expect(window.location.search).toBe("?tab=games");
  });
});
