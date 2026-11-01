// The cross-deck Games view (game history, build PR 2+3, filters PR 4): rows per state, the summary, the month heads, the
// window foot with its load-more success and failure, and the filters: chips, the no-match frame, the sheet and the panel.
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HistoryGame } from "../../lib/games/history";
import type { GamesPayload, MoreGames } from "../../lib/games/history-wire";
import type { HistorySeat } from "../../lib/social/game-history";
import { gameHistoryCopy } from "../../lib/copy/game-history";
import { gameLogCopy } from "../../lib/copy/game-log";
import { deckVersioningCopy } from "../../lib/copy/deck-versioning";
import { named } from "../../lib/person-name/mint";
import { GAME_HISTORY_WINDOW } from "../../lib/games/history-rules";

const more = vi.hoisted(() => ({ load: vi.fn<(cursor: string, filter?: unknown) => Promise<unknown>>(), read: vi.fn<(filter: unknown) => Promise<unknown>>() }));
vi.mock("../../app/decks/game-history-actions", () => ({
  loadMoreGamesAction: (c: string, f?: unknown) => more.load(c, f),
  readGameHistory: (f: unknown) => more.read(f),
}));

import { GamesView, groupByMonth } from "./games-view";

const DECK = { id: "deck-sai", name: "HD - Sai", identity: ["U"], commanderName: "Sai", partnerName: null, commanderPrintedName: null, commanderImageUri: null, commanderArtCropUri: null };
const game = (id: string, playedAt: string, over: Partial<HistoryGame> = {}): HistoryGame => ({
  id, playedAt: new Date(playedAt), result: "win", podSize: 4, versionNumber: 3, note: null, worked: ["speed"], hurt: [], deck: DECK, opponents: [], ...over,
});
const seat = (over: Partial<HistorySeat>): HistorySeat => ({
  seat: 1, friend: null, deckName: null, commander: null, partner: null, colorIdentity: [], label: null, won: false, ...over,
});
const summary = (over: Partial<GamesPayload["aggregates"]["summary"]> = {}): GamesPayload["aggregates"]["summary"] => ({
  games: 23, wins: 9, losses: 12, draws: 2, decks: 6, podMin: 3, podMax: 5,
  firstPlayedAt: new Date("2026-07-02T12:00:00Z"), lastPlayedAt: new Date("2026-10-30T12:00:00Z"),
  mostPlayed: { deckId: "deck-dina", name: "HD - Dina", games: 8 }, friendWonLosses: null, ...over,
});
const payload = (games: HistoryGame[], over: Partial<GamesPayload> = {}, sum = summary()): GamesPayload => ({
  filter: {},
  games, next: null,
  aggregates: {
    total: sum.games, months: [{ month: "2026-10", games: 6 }, { month: "2026-09", games: 5 }], summary: sum,
    byResult: { wins: 9, losses: 12, draws: 2 }, byDeck: [{ deckId: "deck-sai", games: 5 }],
    playedAgainst: {
      friends: [{ publicId: "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b", name: named("Colin"), games: 17, commander: null }],
      commanders: [{ oracleId: "2121bcb4-f5fe-447f-9112-c7e5b5c45baf", name: "Ghalta, Primal Hunger", games: 12, artCropUri: null }],
    },
  },
  ...over,
});
const onData = vi.fn();
const draw = (data: GamesPayload, decks: { id: string; name: string; identity: string[] }[] = [{ id: "deck-sai", name: "HD - Sai", identity: ["U"] }]) =>
  render(<GamesView data={data} onData={onData} viewSwitch={<span>switch</span>} decks={decks} />);

const TWO = [game("g1", "2026-10-30T12:00:00Z"), game("g2", "2026-09-19T12:00:00Z", { result: "loss", versionNumber: null, worked: [], hurt: [] })];

beforeEach(() => { more.load.mockReset(); more.read.mockReset(); onData.mockReset(); });

describe("GamesView: the list", () => {
  it("groups by month the way the read does (UTC), newest first", () => {
    const groups = groupByMonth([game("a", "2026-10-31T23:30:00Z"), game("b", "2026-10-01T00:30:00Z"), game("c", "2026-09-30T23:59:00Z")]);
    expect(groups.map((g) => [g.key, g.games.map((x) => x.id)])).toEqual([["2026-10", ["a", "b"]], ["2026-09", ["c"]]]);
  });

  it("prints a row's day by the UTC calendar, the way the month heads group, whatever the browser's zone", () => {
    // 23:30 UTC on Oct 31 and 00:30 UTC on Oct 1 sit in October; a local reading in a zone ahead of or behind UTC would
    // print Nov 1 and Sep 30 under the October head.
    const year = new Date().getUTCFullYear() === 2026 ? "" : ", 2026";
    draw(payload([game("late", "2026-10-31T23:30:00Z"), game("early", "2026-10-01T00:30:00Z")]));
    const [late, early] = screen.getAllByRole("listitem");
    expect(late).toHaveTextContent(`Oct 31${year}`);
    expect(early).toHaveTextContent(`Oct 1${year}`);
    expect(screen.getAllByRole("heading", { name: /October 2026/ })).toHaveLength(1);
  });

  it("counts a month head from the whole month, not the window drawn", () => {
    draw(payload(TWO));
    const october = screen.getByRole("heading", { name: /October 2026/ });
    expect(october).toHaveTextContent("6 games");
    expect(screen.getByRole("heading", { name: /September 2026/ })).toHaveTextContent("5 games");
  });

  it("draws a row per game: deck, result square, pod and date, version stamp or its dash, marks", () => {
    draw(payload(TWO));
    const [first, second] = screen.getAllByRole("listitem");
    expect(within(first).getByText("HD - Sai")).toBeInTheDocument();
    expect(within(first).getByText(gameLogCopy.history.won)).toBeInTheDocument();
    // The year drops inside the current one (the shipped rule), so the expectation is written out rather than formatted.
    const year = new Date().getUTCFullYear() === 2026 ? "" : ", 2026";
    expect(within(first).getByText(gameLogCopy.history.meta("4", `Oct 30${year}`))).toBeInTheDocument();
    expect(within(first).getByText(deckVersioningCopy.stamp.value(3))).toBeInTheDocument();
    expect(within(first).getByText("Speed")).toBeInTheDocument();
    // A game with no version and no marks reads as complete: the dashes, and the loss in the neutral square.
    expect(within(second).getByText(gameLogCopy.history.lost)).toBeInTheDocument();
    // The marks row draws its own dash, so the version slot (the fixed 44px cell) is the one asked.
    const slot = Array.from(second.querySelectorAll("span")).filter((el) => el.className.includes("w-[44px]") && el.textContent === deckVersioningCopy.stamp.absent);
    expect(slot).toHaveLength(1);
    expect(within(second).getAllByText(gameLogCopy.history.noMarks).length).toBeGreaterThan(0);
  });

  it("makes the whole row one press: the deck's Games tab at that game", () => {
    draw(payload(TWO));
    const links = screen.getAllByRole("link");
    expect(links.map((l) => l.getAttribute("href"))).toEqual(["/decks/deck-sai?tab=games&game=g1", "/decks/deck-sai?tab=games&game=g2"]);
    expect(within(links[0]).getByText("HD - Sai")).toBeInTheDocument();
  });

  it("draws the vs line from the snapshot and the note, and none for a game with no seat", () => {
    const withSeats = game("g1", "2026-10-30T12:00:00Z", {
      note: "Mulled to 5.",
      opponents: [seat({ seat: 1, friend: { key: "f1", name: named("Colin"), publicId: null }, won: true }), seat({ seat: 2, label: named("Dana") })],
    });
    draw(payload([withSeats, game("g2", "2026-10-29T12:00:00Z")]));
    const [first, second] = screen.getAllByRole("listitem");
    expect(within(first).getByText("Colin")).toBeInTheDocument();
    expect(within(first).getByText("Dana")).toBeInTheDocument();
    expect(first).toHaveTextContent("“Mulled to 5.”");
    expect(within(second).queryByText("Colin")).toBeNull();
    expect(second.querySelector("[aria-hidden] .italic")).toBeNull();
  });

  it("has no ✕ and no form: reading a game is the whole job", () => {
    draw(payload(TWO));
    expect(screen.queryByRole("button", { name: gameLogCopy.history.delete })).toBeNull();
  });
});

describe("GamesView: the summary", () => {
  it("reads in the Games tab's voice, with the facts line and the leading deck", () => {
    draw(payload(TWO));
    expect(screen.getByRole("heading", { level: 2, name: "23 games logged. 9–12–2." })).toBeInTheDocument();
    expect(document.querySelector("[data-games-summary]")).toHaveTextContent("6 decks · pods of 3–5 · Jul to Oct 2026");
    expect(document.querySelector("[data-games-summary]")).toHaveTextContent("most played HD - Dina, 8 of 23");
    // From three games of history on the count is the filter chassis's result line.
    expect(document.querySelector('[data-chassis-row="result"]')).toHaveTextContent("23 games");
  });

  it("reuses the shipped one-game headline, names the deck, and says where games come from under three", () => {
    const one = payload([TWO[0]], {}, summary({ games: 1, wins: 1, losses: 0, draws: 0, decks: 1, podMin: 4, podMax: 4, mostPlayed: { deckId: "deck-sai", name: "HD - Sai", games: 1 } }));
    draw(one);
    expect(screen.getByRole("heading", { level: 2, name: gameLogCopy.headline.oneGame })).toBeInTheDocument();
    const box = document.querySelector("[data-games-summary]")!;
    expect(box).toHaveTextContent("HD - Sai · pod of 4");
    expect(box).toHaveTextContent(gameHistoryCopy.low);
    expect(box.textContent).not.toContain("most played");
    expect(document.querySelector("[data-games-count]")).toHaveTextContent("1 game");
  });

  it("gives two games a record and the same low line, and three the most played line instead", () => {
    const two = payload(TWO, {}, summary({ games: 2, wins: 1, losses: 1, draws: 0, decks: 2, podMin: 4, podMax: 4 }));
    const { unmount } = draw(two);
    expect(screen.getByRole("heading", { level: 2, name: "2 games logged. 1–1." })).toBeInTheDocument();
    expect(document.querySelector("[data-games-summary]")).toHaveTextContent(gameHistoryCopy.low);
    expect(document.querySelector("[data-games-summary]")).toHaveTextContent("2 decks · pod of 4");
    unmount();
    draw(payload(TWO, {}, summary({ games: 3, wins: 1, losses: 2, draws: 0, decks: 2, podMin: 4, podMax: 4, mostPlayed: { deckId: "deck-sai", name: "HD - Sai", games: 2 } })));
    expect(document.querySelector("[data-games-summary]")).toHaveTextContent("most played HD - Sai, 2 of 3");
    expect(document.querySelector("[data-games-summary]")?.textContent).not.toContain(gameHistoryCopy.low);
  });

  it("draws no most played line when two decks tie", () => {
    draw(payload(TWO, {}, summary({ mostPlayed: null })));
    expect(document.querySelector("[data-games-summary]")?.textContent).not.toContain("most played");
  });
});

describe("GamesView: no games", () => {
  it("says so, points at a deck's Games tab, and draws no summary, month or foot", () => {
    const empty = payload([], {}, summary({ games: 0, wins: 0, losses: 0, draws: 0, decks: 0, podMin: null, podMax: null, firstPlayedAt: null, lastPlayedAt: null, mostPlayed: null }));
    empty.aggregates.total = 0;
    empty.aggregates.months = [];
    draw(empty, [{ id: "deck-sai", name: "HD - Sai", identity: ["U"] }, { id: "deck-dina", name: "HD - Dina", identity: ["B", "G"] }]);
    expect(screen.getByRole("heading", { name: gameHistoryCopy.empty.title })).toBeInTheDocument();
    expect(screen.getByText(gameHistoryCopy.empty.body)).toBeInTheDocument();
    expect(document.querySelector("[data-games-summary]")).toBeNull();
    expect(document.querySelector("[data-games-foot]")).toBeNull();
    expect(screen.getByRole("link", { name: gameHistoryCopy.empty.log })).toHaveAttribute("href", "/decks/deck-sai?tab=games");
    // The select chooses the deck the press opens.
    fireEvent.change(screen.getByRole("combobox", { name: gameHistoryCopy.empty.pick }), { target: { value: "deck-dina" } });
    expect(screen.getByRole("link", { name: gameHistoryCopy.empty.log })).toHaveAttribute("href", "/decks/deck-dina?tab=games");
  });
});

describe("GamesView: the window", () => {
  const first = payload(TWO, { next: "2026-09-19 12:00:00|11111111-1111-4111-8111-111111111111" }, summary({ games: 212 }));

  it("shows what is drawn of the whole and offers fifty more", () => {
    draw(first);
    expect(screen.getByText("Showing 2 of 212 games")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: `Show ${GAME_HISTORY_WINDOW} more` })).not.toHaveAttribute("aria-disabled");
  });

  it("draws no foot for a history that fits one window", () => {
    draw(payload(TWO));
    expect(document.querySelector("[data-games-foot]")).toBeNull();
  });

  it("asks for the cursor, holds its place while loading, and appends the next window", async () => {
    let resolve!: (r: MoreGames) => void;
    more.load.mockReturnValue(new Promise<MoreGames>((r) => { resolve = r; }));
    draw(first);
    fireEvent.click(screen.getByRole("button", { name: `Show ${GAME_HISTORY_WINDOW} more` }));
    expect(more.load).toHaveBeenCalledWith(first.next);
    const busy = screen.getByRole("button", { name: gameHistoryCopy.loading });
    // Held, not removed: the button stays enabled and focusable (aria-disabled), so focus is not thrown out of the page.
    expect(busy).not.toBeDisabled();
    expect(busy).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("status")).toHaveTextContent(gameHistoryCopy.loading);
    // A second press while it runs is swallowed by the guard: the action is asked once.
    fireEvent.click(busy);
    fireEvent.click(busy);
    expect(more.load).toHaveBeenCalledTimes(1);
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    await act(async () => resolve({ ok: true, games: [game("g3", "2026-09-12T12:00:00Z")], next: null }));
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    // The last window: it is all of them now, and nothing else asks.
    expect(screen.queryByRole("button", { name: /more/ })).toBeNull();
    expect(screen.queryByText("Showing 2 of 212 games")).toBeNull();
  });

  it("joins a window to the month it continues without a second head, and never doubles a row", async () => {
    more.load.mockResolvedValue({ ok: true, games: [TWO[1], game("g3", "2026-09-12T12:00:00Z")], next: null } satisfies MoreGames);
    draw(first);
    fireEvent.click(screen.getByRole("button", { name: `Show ${GAME_HISTORY_WINDOW} more` }));
    await waitFor(() => expect(screen.getAllByRole("listitem")).toHaveLength(3));
    expect(screen.getAllByRole("heading", { name: /September 2026/ })).toHaveLength(1);
  });

  it("keeps the rows and says so when the next window fails, the button back as it was", async () => {
    more.load.mockResolvedValue({ ok: false } satisfies MoreGames);
    draw(first);
    fireEvent.click(screen.getByRole("button", { name: `Show ${GAME_HISTORY_WINDOW} more` }));
    expect(await screen.findByRole("alert")).toHaveTextContent(gameHistoryCopy.moreFailed);
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByRole("button", { name: `Show ${GAME_HISTORY_WINDOW} more` })).not.toHaveAttribute("aria-disabled");
    // Try again asks for the same cursor.
    more.load.mockResolvedValue({ ok: true, games: [game("g3", "2026-09-12T12:00:00Z")], next: null } satisfies MoreGames);
    fireEvent.click(screen.getByRole("button", { name: gameHistoryCopy.retry }));
    await waitFor(() => expect(screen.getAllByRole("listitem")).toHaveLength(3));
    expect(more.load).toHaveBeenNthCalledWith(2, first.next);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("moves focus to the first appended row", async () => {
    more.load.mockResolvedValue({ ok: true, games: [game("g3", "2026-09-12T12:00:00Z"), game("g4", "2026-09-11T12:00:00Z")], next: null } satisfies MoreGames);
    draw(first);
    fireEvent.click(screen.getByRole("button", { name: `Show ${GAME_HISTORY_WINDOW} more` }));
    await waitFor(() => expect(screen.getAllByRole("listitem")).toHaveLength(4));
    await waitFor(() => expect(document.activeElement).toBe(within(screen.getAllByRole("listitem")[2]).getByRole("link")));
  });

  it("drops a window that comes back after the first one was replaced", async () => {
    let resolve!: (r: MoreGames) => void;
    more.load.mockReturnValue(new Promise<MoreGames>((r) => { resolve = r; }));
    const { rerender } = draw(first);
    fireEvent.click(screen.getByRole("button", { name: `Show ${GAME_HISTORY_WINDOW} more` }));
    const replaced = payload([game("n1", "2026-10-31T12:00:00Z")], { next: "2026-10-31 12:00:00|22222222-2222-4222-8222-222222222222" }, summary({ games: 212 }));
    rerender(<GamesView data={replaced} onData={onData} viewSwitch={<span>switch</span>} decks={[]} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    await act(async () => resolve({ ok: true, games: [game("old3", "2026-09-12T12:00:00Z")], next: null }));
    // The old window is not appended onto the new first one, and the new position is untouched.
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByRole("button", { name: `Show ${GAME_HISTORY_WINDOW} more` })).toBeInTheDocument();
  });
});

const COLIN = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
// A filtered window: the whole history is still 23 games, the list holds what the filter left.
const filtered = (games: HistoryGame[], filter: GamesPayload["filter"], sum = summary({ games: games.length })): GamesPayload => {
  const base = payload(games, { filter }, sum);
  return { ...base, aggregates: { ...base.aggregates, total: 23 } };
};

describe("GamesView: the filters", () => {
  it("draws none under three games of history, and every control from three", () => {
    const { unmount } = draw(payload([TWO[0]], {}, summary({ games: 1, wins: 1, losses: 0, draws: 0, decks: 1, mostPlayed: null })));
    expect(screen.queryByRole("button", { name: gameHistoryCopy.filter.open })).toBeNull();
    unmount();
    draw(payload(TWO));
    expect(screen.getByRole("button", { name: gameHistoryCopy.filter.open })).toBeInTheDocument();
    expect(screen.getByText("No filters on")).toBeInTheDocument();
  });

  it("names each active filter on a chip with its own way off, and the deck stays in its picker on the phone", () => {
    draw(filtered(TWO, { deckId: "deck-sai", friend: COLIN, result: "win" }));
    const chips = document.querySelector('[data-chassis-row="chips"]')!;
    expect(chips).toHaveTextContent("Colin");
    expect(chips).toHaveTextContent("Won");
    // The phone's deck is the picker beside the switch, as the shelf is on Decks: not a chip.
    expect(chips.textContent).not.toContain("HD - Sai");
    expect(screen.getByRole("button", { name: gameHistoryCopy.filter.open })).toHaveTextContent("2");
  });

  it("asks for the list without a filter when its chip's ✕ is pressed, and keeps the others", async () => {
    more.read.mockResolvedValue(payload(TWO));
    draw(filtered(TWO, { friend: COLIN, result: "win" }));
    fireEvent.click(screen.getByRole("button", { name: /Remove filter: Won/i }));
    expect(more.read).toHaveBeenCalledWith({ friend: COLIN });
    await waitFor(() => expect(onData).toHaveBeenCalledTimes(1));
  });

  it("serves a filter it has already read from the visit's cache, with no second ask", async () => {
    const won = filtered(TWO, { result: "win" });
    const all = payload(TWO);
    more.read.mockResolvedValue(all);
    const { rerender } = draw(won);
    fireEvent.click(screen.getByRole("button", { name: /Remove filter: Won/i }));
    await waitFor(() => expect(onData).toHaveBeenCalledWith(all));
    // The parent draws what it was handed; Won was filed on its way past, so asking for it again reads nothing.
    rerender(<GamesView data={all} onData={onData} viewSwitch={<span>switch</span>} decks={[]} />);
    fireEvent.click(screen.getByRole("button", { name: gameHistoryCopy.filter.open }));
    fireEvent.click(within(screen.getByRole("dialog", { name: gameHistoryCopy.filter.open })).getByRole("button", { name: /Won\s*9/ }));
    expect(onData).toHaveBeenLastCalledWith(won);
    expect(more.read).toHaveBeenCalledTimes(1);
  });

  it("draws the no-match frame in the list's place: no headline, no months, no foot, and a way out", async () => {
    more.read.mockResolvedValue(payload(TWO));
    draw(filtered([], { friend: COLIN, result: "win" }, summary({ games: 0, wins: 0, losses: 0, draws: 0, decks: 0, podMin: null, podMax: null, firstPlayedAt: null, lastPlayedAt: null, mostPlayed: null })));
    expect(screen.getByRole("heading", { name: gameHistoryCopy.filter.noMatch })).toBeInTheDocument();
    expect(document.querySelector("[data-games-summary]")).toBeNull();
    expect(document.querySelector("[data-games-month]")).toBeNull();
    expect(document.querySelector("[data-games-foot]")).toBeNull();
    expect(document.querySelector('[data-chassis-row="result"]')).toHaveTextContent("0 games");
    expect(document.querySelector('[data-chassis-row="chips"]')).toHaveTextContent("Won");
    fireEvent.click(screen.getByRole("button", { name: gameHistoryCopy.filter.clearFilters }));
    expect(more.read).toHaveBeenCalledWith({});
  });

  it("scopes the summary: the deck with the friend at the table, and the trophy line, with no most played", () => {
    const sum = summary({ games: 5, wins: 2, losses: 3, draws: 0, decks: 1, podMin: 4, podMax: 4, friendWonLosses: { won: 2, losses: 3 }, mostPlayed: { deckId: "deck-sai", name: "HD - Sai", games: 5 } });
    draw(filtered(TWO, { deckId: "deck-sai", friend: COLIN }, sum));
    const box = document.querySelector("[data-games-summary]")!;
    expect(box).toHaveTextContent("5 games logged. 2–3.");
    expect(box).toHaveTextContent("HD - Sai with Colin at the table");
    expect(box).toHaveTextContent("Colin won 2 of the 3 you lost");
    expect(box.textContent).not.toContain("most played");
    expect(box.textContent).not.toContain(gameHistoryCopy.low);
  });

  it("scopes the summary to the payload drawn, not the filter being read for", () => {
    more.read.mockReturnValue(new Promise(() => {}));
    const sum = summary({ games: 5, wins: 2, losses: 3, draws: 0, decks: 1, friendWonLosses: { won: 2, losses: 3 } });
    draw(filtered(TWO, { friend: COLIN }, sum));
    fireEvent.click(screen.getByRole("button", { name: /Remove filter: Colin/i }));
    // The chips already say Colin is off; the list and its counts are still the ones read with Colin on.
    expect(document.querySelector('[data-chassis-row="chips"]')?.textContent).not.toContain("Colin ");
    expect(document.querySelector("[data-games-summary]")).toHaveTextContent("with Colin at the table");
    expect(document.querySelector("[data-games-summary]")).toHaveTextContent("Colin won 2 of the 3 you lost");
  });

  it("pages a filtered list under the filter it was read with", async () => {
    more.load.mockResolvedValue({ ok: true, games: [], next: null } satisfies MoreGames);
    const data = payload(TWO, { filter: { result: "loss" }, next: "2026-09-19 12:00:00|11111111-1111-4111-8111-111111111111" }, summary({ games: 212 }));
    draw(data);
    fireEvent.click(screen.getByRole("button", { name: `Show ${GAME_HISTORY_WINDOW} more` }));
    await waitFor(() => expect(more.load).toHaveBeenCalledWith(data.next, { result: "loss" }));
  });

  it("opens the shared sheet with Result counts under the other filters, and a button that says what it would show", () => {
    draw(payload(TWO));
    fireEvent.click(screen.getByRole("button", { name: gameHistoryCopy.filter.open }));
    const sheet = screen.getByRole("dialog", { name: gameHistoryCopy.filter.open });
    expect(within(sheet).getByRole("button", { name: /Won\s*9/ })).toBeInTheDocument();
    expect(within(sheet).getByRole("button", { name: /Drawn\s*2/ })).toBeInTheDocument();
    expect(within(sheet).getByRole("button", { name: "Show 23 games" })).toBeInTheDocument();
    expect(within(sheet).getByText("Colin")).toBeInTheDocument();
    expect(within(sheet).getByText("Ghalta, Primal Hunger")).toBeInTheDocument();
  });

  it("never disables an option: a zero stays pressable", () => {
    const base = payload(TWO);
    draw({ ...base, aggregates: { ...base.aggregates, byResult: { wins: 2, losses: 3, draws: 0 } } });
    fireEvent.click(screen.getByRole("button", { name: gameHistoryCopy.filter.open }));
    expect(within(screen.getByRole("dialog", { name: gameHistoryCopy.filter.open })).getByRole("button", { name: /Drawn\s*0/ })).toBeEnabled();
  });

  it("searches friends and commanders in the sheet's list", () => {
    draw(payload(TWO));
    fireEvent.click(screen.getByRole("button", { name: gameHistoryCopy.filter.open }));
    const sheet = screen.getByRole("dialog", { name: gameHistoryCopy.filter.open });
    fireEvent.change(within(sheet).getByRole("searchbox", { name: gameHistoryCopy.filter.search }), { target: { value: "ghal" } });
    expect(within(sheet).queryByText("Colin")).toBeNull();
    expect(within(sheet).getByText("Ghalta, Primal Hunger")).toBeInTheDocument();
  });

  it("picks a friend in the sheet as one Played against choice", () => {
    more.read.mockResolvedValue(payload(TWO));
    draw(payload(TWO));
    fireEvent.click(screen.getByRole("button", { name: gameHistoryCopy.filter.open }));
    fireEvent.click(within(screen.getByRole("dialog", { name: gameHistoryCopy.filter.open })).getByRole("button", { name: /Colin/ }));
    expect(more.read).toHaveBeenCalledWith({ friend: COLIN });
  });
});
