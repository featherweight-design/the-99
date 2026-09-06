import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GameHistoryRow } from "./game-history-row";
import { axisCopy, gameLogCopy } from "../../lib/copy/game-log";
import type { DeckGame } from "../../lib/decks/games";

const deleteGame = vi.fn<(deckId: string, gameId: string) => Promise<{ ok: boolean; message?: string }>>(
  async () => ({ ok: true }),
);
vi.mock("../../app/decks/actions", () => ({
  deleteGame: (deckId: string, gameId: string) => deleteGame(deckId, gameId),
}));

const GAME: DeckGame = {
  id: "game_1",
  result: "loss",
  podSize: 4,
  playedAt: new Date("2026-09-01T12:00:00"),
  worked: ["engine"],
  hurt: ["speed", "mana"],
};

function mount(game: DeckGame = GAME, onDeleted = vi.fn()) {
  return {
    ...render(<GameHistoryRow deckId="deck_1" game={game} isLast={false} onDeleted={onDeleted} />),
    onDeleted,
  };
}

describe("GameHistoryRow", () => {
  beforeEach(() => deleteGame.mockClear());

  // Vocabulary order, not grouped by direction — the row reads in the same
  // sequence as the form that produced it.
  it("draws the marks in vocabulary order regardless of polarity", () => {
    const { container } = mount();
    const text = container.textContent!;
    expect(text.indexOf(axisCopy.speed.label)).toBeLessThan(text.indexOf(axisCopy.mana.label));
    expect(text.indexOf(axisCopy.mana.label)).toBeLessThan(text.indexOf(axisCopy.engine.label));
  });

  // Pod size first, then the date — the pod is what changes how a game read.
  it("puts the pod size before the date in the meta slot", () => {
    mount();
    expect(screen.getByText(gameLogCopy.history.meta("4", "1 Sep"))).toBeInTheDocument();
  });

  it("shows an em dash rather than an empty slot when nothing was marked", () => {
    mount({ ...GAME, worked: [], hurt: [] });
    expect(screen.getByText(gameLogCopy.history.noMarks)).toBeInTheDocument();
  });

  // A loss is a result, not an error state. Scoped to the square rather than
  // the whole row, because the delete affordance is legitimately danger-tinted.
  it("never paints a loss in the danger colour", () => {
    mount();
    const square = screen.getByText(gameLogCopy.history.lost);
    expect(square.outerHTML).not.toContain("danger");
    expect(square.outerHTML).not.toContain("--success");
  });

  // One confirm, in the row. There is no edit action, so a stray tap would
  // destroy the only copy of a game.
  it("asks once, in the row, before deleting", async () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: gameLogCopy.history.delete }));
    expect(deleteGame).not.toHaveBeenCalled();
    expect(screen.getByText(gameLogCopy.history.confirm)).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: gameLogCopy.history.confirmYes }));
    await waitFor(() => expect(deleteGame).toHaveBeenCalledWith("deck_1", "game_1"));
  });

  it("backs out of the confirm without deleting", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: gameLogCopy.history.delete }));
    fireEvent.click(screen.getByRole("button", { name: gameLogCopy.history.confirmNo }));
    expect(deleteGame).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: gameLogCopy.history.delete })).toBeInTheDocument();
  });

  it("renders the refusal in the row and keeps the game", async () => {
    deleteGame.mockResolvedValueOnce({ ok: false, message: gameLogCopy.history.deleteRefused });
    mount();
    fireEvent.click(screen.getByRole("button", { name: gameLogCopy.history.delete }));
    fireEvent.click(screen.getByRole("button", { name: gameLogCopy.history.confirmYes }));
    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText(gameLogCopy.history.deleteRefused)).toBeInTheDocument();
  });
});
