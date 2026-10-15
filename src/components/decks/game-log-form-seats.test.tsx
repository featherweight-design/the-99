// The "Across the table" row inside the game log form (Social R3, PR 2). The form's own states are
// `game-log-form.test.tsx`; this holds what the row adds: absent without the switch, seated by a commander
// press, the trophy and its rules, a pod held while seats are full, and what `logGame` is sent.
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GameLogForm } from "./game-log-form";
import { gameLogCopy } from "../../lib/copy/game-log";
import { gameSeatsCopy } from "../../lib/copy/game-seats";

const logGame = vi.fn<(deckId: string, input: Record<string, unknown>) => Promise<{ ok: boolean; message?: string }>>(
  async () => ({ ok: true }),
);
const YURIKO = "00000000-0000-4000-8000-0000000000a1";
const TYMNA = "00000000-0000-4000-8000-0000000000a2";
const hit = (oracleId: string, name: string) => ({
  oracleId, name, typeLine: "Legendary Creature", manaCost: null, colorIdentity: ["U", "B"], partner: null, flavorName: null, imageUri: null,
});
const search = vi.fn(async (q: string) => (q.toLowerCase().startsWith("y") ? [hit(YURIKO, "Yuriko, the Tiger’s Shadow")] : [hit(TYMNA, "Tymna the Weaver")]));

vi.mock("../../app/cards/tag-actions", () => ({ searchTagCards: async () => [] }));
vi.mock("../../app/decks/actions", () => ({ logGame: (id: string, input: Record<string, unknown>) => logGame(id, input) }));
vi.mock("../../app/decks/[id]/opponent-actions", () => ({ searchOpponentCommandersAction: (q: string) => search(q) }));

const you = { name: "Kenrith, the Returned King", deckName: "Rainbow", imageUri: null };
const seatsCopy = gameSeatsCopy.seats;

function mount(opponents: boolean) {
  render(<GameLogForm deckId="deck_1" isFirstGame={false} onSaved={vi.fn()} onAnnounce={vi.fn()} opponents={opponents ? { you } : undefined} />);
  fireEvent.click(screen.getByRole("button", { name: gameLogCopy.form.open }));
}
const result = (label: string) => fireEvent.click(screen.getByRole("radio", { name: label }));
const pod = (n: number) => fireEvent.click(screen.getByRole("radio", { name: String(n) }));
const save = () => fireEvent.click(screen.getByRole("button", { name: gameLogCopy.form.save }));

/** Opens the picker from `opener`, types `query`, and presses the commander it finds. */
async function seat(opener: string | RegExp, query: string, name: string) {
  fireEvent.click(screen.getByRole("button", { name: opener }));
  const dialog = await screen.findByRole("dialog", { name: gameSeatsCopy.picker.title });
  fireEvent.change(within(dialog).getByRole("searchbox"), { target: { value: query } });
  fireEvent.click(await within(dialog).findByRole("button", { name: new RegExp(name) }));
  await waitFor(() => expect(screen.queryByRole("dialog", { name: gameSeatsCopy.picker.title })).toBeNull());
}

beforeEach(() => {
  logGame.mockClear();
  search.mockClear();
});

describe("without the switch", () => {
  it("draws no row, and sends exactly today's payload", async () => {
    mount(false);
    expect(screen.queryByText(seatsCopy.label)).toBeNull();
    result(gameLogCopy.form.won);
    save();
    await waitFor(() => expect(logGame).toHaveBeenCalled());
    expect(Object.keys(logGame.mock.calls[0][1])).not.toContain("opponents");
  });
});

describe("with the switch", () => {
  it("draws your seat, the count against the pod, and the dashed Add opponent", () => {
    mount(true);
    expect(screen.getByText(seatsCopy.label)).toBeInTheDocument();
    expect(screen.getByText(seatsCopy.count(0, 3))).toBeInTheDocument();
    expect(screen.getByText(seatsCopy.youTag)).toBeInTheDocument();
    expect(screen.getByText("Kenrith")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: seatsCopy.add })).toBeInTheDocument();
  });

  it("seats a commander at once, counts it, and sends it with the game", async () => {
    mount(true);
    await seat(seatsCopy.add, "yur", "Yuriko");
    expect(screen.getByText(seatsCopy.count(1, 3))).toBeInTheDocument();
    result(gameLogCopy.form.won);
    save();
    await waitFor(() => expect(logGame).toHaveBeenCalled());
    expect(logGame.mock.calls[0][1].opponents).toEqual([{ commander: YURIKO }]);
  });

  it("changes a seat in place from its art, keeping its place in the order", async () => {
    mount(true);
    await seat(seatsCopy.add, "yur", "Yuriko");
    await seat(seatsCopy.add, "tym", "Tymna");
    await seat(seatsCopy.change("Yuriko"), "tym", "Tymna");
    result(gameLogCopy.form.draw);
    save();
    await waitFor(() => expect(logGame).toHaveBeenCalled());
    expect((logGame.mock.calls[0][1].opponents as { commander: string }[]).map((o) => o.commander)).toEqual([TYMNA, TYMNA]);
  });

  it("clears a seat with its ✕", async () => {
    mount(true);
    await seat(seatsCopy.add, "yur", "Yuriko");
    fireEvent.click(screen.getByRole("button", { name: seatsCopy.clear("Yuriko") }));
    expect(screen.getByText(seatsCopy.count(0, 3))).toBeInTheDocument();
  });

  it("sends a typed name as the seat's label", async () => {
    mount(true);
    await seat(seatsCopy.add, "yur", "Yuriko");
    fireEvent.click(screen.getByRole("button", { name: seatsCopy.addName }));
    fireEvent.change(screen.getByLabelText(seatsCopy.labelAria), { target: { value: "Lee" } });
    expect(screen.getByText(seatsCopy.labelCounter(3))).toBeInTheDocument();
    result(gameLogCopy.form.won);
    save();
    await waitFor(() => expect(logGame).toHaveBeenCalled());
    expect(logGame.mock.calls[0][1].opponents).toEqual([{ commander: YURIKO, label: "Lee" }]);
  });
});

describe("who won", () => {
  it("offers a trophy per seat on a loss only, and the hint with it", async () => {
    mount(true);
    await seat(seatsCopy.add, "yur", "Yuriko");
    expect(screen.queryByRole("button", { name: seatsCopy.wonAria("Yuriko") })).toBeNull();
    result(gameLogCopy.form.lost);
    expect(screen.getByRole("button", { name: seatsCopy.wonAria("Yuriko") })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText(seatsCopy.wonHint)).toBeInTheDocument();
  });

  it("holds one winner, moves it to the seat pressed, and clears it when pressed again", async () => {
    mount(true);
    await seat(seatsCopy.add, "yur", "Yuriko");
    await seat(seatsCopy.add, "tym", "Tymna");
    result(gameLogCopy.form.lost);
    // A commander with no comma is named whole.
    const trophy = (n: string) => screen.getByRole("button", { name: seatsCopy.wonAria(n) });
    fireEvent.click(trophy("Yuriko"));
    expect(trophy("Yuriko")).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(trophy("Tymna the Weaver"));
    expect(trophy("Yuriko")).toHaveAttribute("aria-pressed", "false");
    expect(trophy("Tymna the Weaver")).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(trophy("Tymna the Weaver"));
    expect(trophy("Tymna the Weaver")).toHaveAttribute("aria-pressed", "false");
  });

  it("sends the winner on a loss", async () => {
    mount(true);
    await seat(seatsCopy.add, "yur", "Yuriko");
    result(gameLogCopy.form.lost);
    fireEvent.click(screen.getByRole("button", { name: seatsCopy.wonAria("Yuriko") }));
    save();
    await waitFor(() => expect(logGame).toHaveBeenCalledTimes(1));
    expect(logGame.mock.calls[0][1].opponents).toEqual([{ commander: YURIKO, won: true }]);
  });

  it("does not bring the winner back when the result returns to Lost", async () => {
    mount(true);
    await seat(seatsCopy.add, "yur", "Yuriko");
    result(gameLogCopy.form.lost);
    fireEvent.click(screen.getByRole("button", { name: seatsCopy.wonAria("Yuriko") }));
    result(gameLogCopy.form.draw);
    result(gameLogCopy.form.lost);
    expect(screen.getByRole("button", { name: seatsCopy.wonAria("Yuriko") })).toHaveAttribute("aria-pressed", "false");
  });

  it("drops the winner before the call when the result leaves Lost", async () => {
    mount(true);
    await seat(seatsCopy.add, "yur", "Yuriko");
    result(gameLogCopy.form.lost);
    fireEvent.click(screen.getByRole("button", { name: seatsCopy.wonAria("Yuriko") }));
    result(gameLogCopy.form.won);
    expect(screen.queryByRole("button", { name: seatsCopy.wonAria("Yuriko") })).toBeNull();
    save();
    await waitFor(() => expect(logGame).toHaveBeenCalled());
    expect(logGame.mock.calls[0][1].opponents).toEqual([{ commander: YURIKO }]);
  });
});

describe("the picker", () => {
  it("drops the previous query's hits the moment the query changes", async () => {
    mount(true);
    fireEvent.click(screen.getByRole("button", { name: seatsCopy.add }));
    const dialog = await screen.findByRole("dialog", { name: gameSeatsCopy.picker.title });
    fireEvent.change(within(dialog).getByRole("searchbox"), { target: { value: "yur" } });
    await within(dialog).findByRole("button", { name: /Yuriko/ });
    fireEvent.change(within(dialog).getByRole("searchbox"), { target: { value: "tym" } });
    // Before the debounce fires: the old answer is not on screen to be pressed.
    expect(within(dialog).queryByRole("button", { name: /Yuriko/ })).toBeNull();
    expect(await within(dialog).findByRole("button", { name: /Tymna/ })).toBeInTheDocument();
  });

  it("returns focus to the seat just filled when it was the last and Add opponent is gone", async () => {
    mount(true);
    pod(2);
    await seat(seatsCopy.add, "yur", "Yuriko");
    expect(screen.queryByRole("button", { name: seatsCopy.add })).toBeNull();
    await waitFor(() => expect(screen.getByRole("button", { name: seatsCopy.change("Yuriko") })).toHaveFocus());
  });
});

describe("focus and failure", () => {
  it("moves focus to Add opponent when a seat is cleared, instead of dropping it to the page", async () => {
    mount(true);
    await seat(seatsCopy.add, "yur", "Yuriko");
    const clear = screen.getByRole("button", { name: seatsCopy.clear("Yuriko") });
    clear.focus();
    fireEvent.click(clear);
    await waitFor(() => expect(screen.getByRole("button", { name: seatsCopy.add })).toHaveFocus());
  });

  it("says so when the search fails, rather than reporting no commander by that name", async () => {
    search.mockRejectedValueOnce(new Error("down"));
    mount(true);
    fireEvent.click(screen.getByRole("button", { name: seatsCopy.add }));
    const dialog = await screen.findByRole("dialog", { name: gameSeatsCopy.picker.title });
    fireEvent.change(within(dialog).getByRole("searchbox"), { target: { value: "yur" } });
    expect(await within(dialog).findByText(gameSeatsCopy.picker.failed)).toBeInTheDocument();
    expect(within(dialog).queryByText(gameSeatsCopy.picker.noMatch)).toBeNull();
  });
});

describe("the pod", () => {
  it("holds a pod size below the filled seats, and says why", async () => {
    mount(true);
    await seat(seatsCopy.add, "yur", "Yuriko");
    await seat(seatsCopy.add, "tym", "Tymna");
    pod(2);
    expect(screen.getByRole("radio", { name: "4" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "2" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByText(seatsCopy.held(2))).toBeInTheDocument();
    // Two filled seats fit a pod of 3 (two seats), so that size is not held.
    pod(3);
    expect(screen.getByRole("radio", { name: "3" })).toHaveAttribute("aria-checked", "true");
  });

  it("draws no Add opponent once every seat is filled, and brings it back when one is cleared", async () => {
    mount(true);
    pod(2);
    await seat(seatsCopy.add, "yur", "Yuriko");
    expect(screen.queryByRole("button", { name: seatsCopy.add })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: seatsCopy.clear("Yuriko") }));
    expect(screen.getByRole("button", { name: seatsCopy.add })).toBeInTheDocument();
  });

  it("clears the seats with the form on a cancel", async () => {
    mount(true);
    await seat(seatsCopy.add, "yur", "Yuriko");
    fireEvent.click(screen.getByRole("button", { name: gameLogCopy.form.cancel }));
    fireEvent.click(screen.getByRole("button", { name: gameLogCopy.form.open }));
    expect(screen.getByText(seatsCopy.count(0, 3))).toBeInTheDocument();
  });
});
