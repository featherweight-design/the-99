import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { GameHistoryRow } from "./game-history-row";
import { axisCopy, gameLogCopy } from "../../lib/copy/game-log";
import { deckVersioningCopy } from "../../lib/copy/deck-versioning";
import type { DeckGame } from "../../lib/decks/games";

// The row drops the year for a game played in the current year, so every date this
// file asserts on reads the way it does only while "now" is in 2026. Pinned, or the
// file starts failing on 1 January. Date alone is faked: the tests await real timers.
beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-20T12:00:00"));
});
afterAll(() => {
  vi.useRealTimers();
});

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
  versionNumber: 3,
  note: null,
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

  // §Surfaces 5 — the stamp answers "which list was on the table", which is the
  // whole reason a game is worth reading back months later.
  it("stamps the row with the version that was on the table", () => {
    mount();
    expect(screen.getByText(deckVersioningCopy.stamp.value(3))).toBeInTheDocument();
  });

  // A game logged before versioning arrived has no version to point at. The
  // slot is still drawn, so the marks of every row stay on one vertical.
  it("draws a dash, not an empty slot, for a game with no version", () => {
    mount({ ...GAME, versionNumber: null });
    expect(screen.getByText(deckVersioningCopy.stamp.absent)).toBeInTheDocument();
    expect(screen.queryByText(deckVersioningCopy.stamp.value(3))).toBeNull();
  });

  // The stamp is a fact about the game, not a route to the version.
  it("draws the stamp bare — no chip, no plate, no link", () => {
    mount();
    const stamp = screen.getByText(deckVersioningCopy.stamp.value(3));
    expect(screen.queryByRole("link", { name: /v3/ })).toBeNull();
    expect(stamp.className).not.toMatch(/\brounded|\bbg-|\bborder\b/);
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

  // The row is not unmounted by its own delete — it lives until the route
  // revalidates, and a row still asking "sure?" after saying yes reads as a
  // question that went unheard.
  it("drops the confirm once the delete succeeds", async () => {
    const { onDeleted } = mount();
    fireEvent.click(screen.getByRole("button", { name: gameLogCopy.history.delete }));
    fireEvent.click(screen.getByRole("button", { name: gameLogCopy.history.confirmYes }));
    await waitFor(() => expect(onDeleted).toHaveBeenCalled());
    expect(screen.queryByText(gameLogCopy.history.confirm)).toBeNull();
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

// ── The note ──────────────────────────────────────────────────────────────────
//
// `deck_games.note` is written by hand — no form in the app produces one — so
// the row's whole job is to draw whatever is in the column, to the properties
// deck-tuning.md §Note line specifies, and to reserve nothing when it is null.
describe("a game's note", () => {
  const NOTE = "Kept a two-lander and got there on turn four.";
  const line = (container: HTMLElement) => container.querySelector(".italic");

  it("draws the note, inside typographic quotes", () => {
    const { container } = mount({ ...GAME, note: NOTE });
    // The quotes are the handoff's: this is somebody's sentence, not a value.
    expect(line(container)).toHaveTextContent(`\u201C${NOTE}\u201D`);
  });

  // The eye reads a quoted sentence under a row of chips as a note. The ear
  // reaches it with no idea what it is, which is why deck-tuning.md
  // §Accessibility puts `note:` in the row's description after the marks.
  it("says what the line is, to a reader who cannot see it", () => {
    const { container } = mount({ ...GAME, note: NOTE });
    const spoken = container.querySelector(".sr-only")!;
    expect(spoken).toHaveTextContent(`${gameLogCopy.history.noteSpoken}\u201C${NOTE}\u201D`);
    // Spoken, never drawn: the visible line carries the sentence alone.
    expect(line(container)!.textContent).toBe(`\u201C${NOTE}\u201D`);
  });

  // The visible line is a SECOND line, below the row's own controls, so if it
  // carried the description the ear would meet the delete button between the
  // marks and the note. One copy is spoken, and it sits where the table puts
  // it: in the marks cell, right after the chips.
  it("speaks the note after the marks, not after the delete control", () => {
    const { container } = mount({ ...GAME, note: NOTE });
    const spoken = container.querySelector(".sr-only")!;
    const del = container.querySelector("button[aria-label]")!;
    expect(spoken.compareDocumentPosition(del) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // And the line the eye reads is not announced a second time.
    expect(line(container)!.closest("[aria-hidden]")).not.toBeNull();
  });

  // Null is the ordinary case — most games have nothing worth writing down. An
  // empty or blank string is a column somebody cleared by hand, and drawing it
  // would open a second line for a note nobody wrote. The handoff is explicit:
  // a row without one is exactly the shipped row, nothing reserved.
  it.each([null, "", "   "])("draws no note line for %o", (note) => {
    const { container } = mount({ ...GAME, note });
    expect(line(container)).toBeNull();
  });

  it("indents to the mark column and carries the quote rule", () => {
    const { container } = mount({ ...GAME, note: NOTE });
    const row = line(container)!.parentElement!;
    expect(row.className).toContain("md:pl-[40px]");
    const rule = row.querySelector("span:not(.italic)")!;
    expect(rule.className).toContain("w-[2px]");
    expect(rule.className).toContain("bg-border-strong");
  });

  // No truncation and no clamp. The 140-character cap is what makes that safe,
  // and the column's own check is what enforces the cap.
  it("wraps a note at the cap rather than truncating it", () => {
    const at140 = "x".repeat(140);
    const { container } = mount({ ...GAME, note: at140 });
    const text = line(container)!;
    expect(text).toHaveTextContent(`\u201C${at140}\u201D`);
    expect(text.className).not.toContain("truncate");
    expect(text.className).not.toContain("line-clamp");
    // jsdom lays nothing out, so this is the class contract rather than a
    // measurement — `break-words` cannot shrink a flex item whose automatic
    // min-content width is 140 unbroken characters. The measurement is
    // `scripts/probe-game-note.mjs`, which now requires a cap-length note.
    expect(text.className).toContain("min-w-0");
  });
});
