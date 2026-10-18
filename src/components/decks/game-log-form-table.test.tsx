// The game log opened from a Rule 0 table (plan §PR 8, boards L2 and H2): the form opens with the from line, the pod
// size and every other seat filled, the non-friend's marked `from the table`. Decision 5: nothing the form sends
// names another player's deck or profile, before an edit or after one.
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GameLogForm } from "./game-log-form";
import { GamesPanel } from "./games-panel";
import { summarizeGames, type DeckGame } from "../../lib/decks/games";
import { gameLogCopy } from "../../lib/copy/game-log";
import { gameSeatsCopy } from "../../lib/copy/game-seats";
import { ruleZeroCopy } from "../../lib/copy/rule-zero";
import type { TablePrefill } from "../../lib/social/rule-zero-log";

const logGame = vi.fn<(deckId: string, input: Record<string, unknown>) => Promise<{ ok: boolean; message?: string }>>(
  async () => ({ ok: true }),
);
const YURIKO = "00000000-0000-4000-8000-0000000000a1";
const hit = (oracleId: string, name: string) => ({
  oracleId, name, typeLine: "Legendary Creature", manaCost: null, colorIdentity: ["U", "B"], partner: null, flavorName: null, imageUri: null,
});

vi.mock("../../app/cards/tag-actions", () => ({ searchTagCards: async () => [] }));
vi.mock("../../app/decks/actions", () => ({ logGame: (id: string, input: Record<string, unknown>) => logGame(id, input), deleteGame: async () => ({ ok: true }) }));
vi.mock("../../app/decks/[id]/opponent-actions", () => ({
  searchOpponentCommandersAction: async () => [hit(YURIKO, "Yuriko, the Tiger’s Shadow")],
  listPickerFriendsAction: async () => [],
  listFriendDecksAction: async () => [],
  listPickerPodsAction: async () => [],
  listPodSeatsAction: async () => [],
}));

const you = { name: "Ghalta, Primal Hunger", deckName: "Ghalta Stompy", imageUri: null };
const seatsCopy = gameSeatsCopy.seats;
const SEATING = "a".repeat(64);
const prefill: TablePrefill = {
  table: { id: "7a0e0000-0000-4000-8000-000000000001", seating: SEATING },
  podName: "Thursday night",
  podSize: 4,
  seats: [
    { seat: 2, name: "Colin", deckName: "Zimone Combo", commanderName: "Zimone, Quandrix Prodigy", artCropUri: null, friend: true },
    { seat: 3, name: "Peter", deckName: null, commanderName: null, artCropUri: null, friend: true },
    { seat: 4, name: "Max", deckName: "Gisa Zombies", commanderName: "Gisa, Glorious Resurrector", artCropUri: null, friend: false },
  ],
};
// What the server holds and the client must never be sent: every other seat's deck and profile ids.
const SERVER_IDS = ["dec0dec0-0000-4000-8000-0000000000c0", "c01c01c0-0000-4000-8000-000000000001", "dec0dec0-0000-4000-8000-0000000000a0"];

function mount(withPrefill = true) {
  render(
    <GameLogForm deckId="deck_1" isFirstGame={false} onSaved={vi.fn()} onAnnounce={vi.fn()} opponents={{ you }} prefill={withPrefill ? prefill : undefined} />,
  );
}
const result = (label: string) => fireEvent.click(screen.getByRole("radio", { name: label }));
const save = () => fireEvent.click(screen.getByRole("button", { name: gameLogCopy.form.save }));
const sent = () => logGame.mock.calls[0][1];
const assertNoServerIds = () => {
  const wire = JSON.stringify(sent());
  for (const id of SERVER_IDS) expect(wire).not.toContain(id);
  expect(JSON.stringify(sent().opponents)).not.toMatch(/friend|deck/);
};

beforeEach(() => logGame.mockClear());

describe("opened from a table", () => {
  it("opens with the from line, the pod's phrase in bold, the pod size and the seats", () => {
    mount();
    const from = screen.getByTestId("log-from");
    expect(from).toHaveTextContent("From Thursday night’s table. Seats filled; change anything.");
    expect(within(from).getByText("Thursday night’s table").tagName).toBe("B");
    expect(screen.getByRole("radio", { name: "4" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText(seatsCopy.count(3, 3))).toBeInTheDocument();
    expect(screen.getByText("Zimone Combo")).toBeInTheDocument();
    expect(screen.getByText("Gisa Zombies")).toBeInTheDocument();
    // Result is the player's to pick.
    for (const r of [gameLogCopy.form.won, gameLogCopy.form.lost]) expect(screen.getByRole("radio", { name: r })).toHaveAttribute("aria-checked", "false");
  });

  it("marks the seat of someone who is not a friend, and only that one", () => {
    mount();
    const marks = screen.getAllByText(ruleZeroCopy.log.fromTable);
    expect(marks).toHaveLength(1);
    expect(marks[0].tagName).toBe("SMALL");
    expect(marks[0].parentElement).toHaveTextContent(/^Max/);
  });

  it("sends each seat by its number and the table beside them, naming no deck or profile", async () => {
    mount();
    result(gameLogCopy.form.lost);
    fireEvent.click(screen.getByRole("button", { name: seatsCopy.wonAria("Max") }));
    save();
    await waitFor(() => expect(logGame).toHaveBeenCalled());
    expect(sent().opponents).toEqual([{ tableSeat: 2 }, { tableSeat: 3 }, { tableSeat: 4, won: true }]);
    expect(sent().table).toEqual(prefill.table);
    expect(sent().podSize).toBe(4);
    assertNoServerIds();
  });

  it("sends an edited seat in its ordinary shape, and still nothing of the table's", async () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: seatsCopy.clear("Peter") }));
    fireEvent.click(screen.getByRole("button", { name: seatsCopy.change("Max") }));
    const dialog = await screen.findByRole("dialog", { name: gameSeatsCopy.picker.title });
    fireEvent.change(within(dialog).getByRole("searchbox"), { target: { value: "yur" } });
    fireEvent.click(await within(dialog).findByRole("button", { name: /Yuriko/ }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: gameSeatsCopy.picker.title })).toBeNull());
    result(gameLogCopy.form.won);
    save();
    await waitFor(() => expect(logGame).toHaveBeenCalled());
    expect(sent().opponents).toEqual([{ tableSeat: 2 }, { commander: YURIKO }]);
    expect(sent().table).toEqual(prefill.table);
    assertNoServerIds();
  });

  it("sends no table once every seat from it is gone", async () => {
    mount();
    for (const n of ["Colin", "Peter", "Max"]) fireEvent.click(screen.getByRole("button", { name: seatsCopy.clear(n) }));
    result(gameLogCopy.form.won);
    save();
    await waitFor(() => expect(logGame).toHaveBeenCalled());
    expect(Object.keys(sent())).not.toContain("table");
  });

  it("Cancel clears the from line and the table's seats", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: gameLogCopy.form.cancel }));
    fireEvent.click(screen.getByRole("button", { name: gameLogCopy.form.open }));
    expect(screen.queryByTestId("log-from")).toBeNull();
    expect(screen.getByText(seatsCopy.count(0, 3))).toBeInTheDocument();
  });

  it("is the shipped form without a prefill", () => {
    mount(false);
    expect(screen.getByRole("button", { name: gameLogCopy.form.open })).toBeInTheDocument();
    expect(screen.queryByTestId("log-from")).toBeNull();
  });
});

describe("the Games panel spends the prefill", () => {
  it("takes `table` off the address on arrival, and the list's form opens plain after the first save", async () => {
    window.history.replaceState(null, "", `/decks/deck_1?tab=games&table=${prefill.table.id}`);
    const panel = (games: DeckGame[]) => (
      <GamesPanel deckId="deck_1" games={games} summary={summarizeGames(games)} opponents={{ you }} prefill={prefill} />
    );
    const { rerender } = render(panel([]));
    expect(window.location.search).toBe("?tab=games");
    expect(screen.getByTestId("log-from")).toBeTruthy();
    result(gameLogCopy.form.won);
    save();
    await waitFor(() => expect(logGame).toHaveBeenCalledTimes(1));
    // The save revalidates the page: the panel now draws the list, whose form is a second mount.
    const saved: DeckGame = { id: "g1", result: "win", podSize: 4, playedAt: new Date("2026-10-17"), versionNumber: null, note: null, worked: [], hurt: [] };
    rerender(panel([saved]));
    expect(screen.queryByTestId("log-from")).toBeNull();
  });
});
