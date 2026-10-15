import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DeckNotesView } from "../../../lib/decks/notes-types";

vi.mock("../../../app/decks/notes-actions", () => ({
  addNote: vi.fn(), editNote: vi.fn(), setNoteDone: vi.fn(), deleteNote: vi.fn(), searchNoteCards: vi.fn(),
}));
vi.mock("../../cards/card-detail-provider", () => ({ useCardDetail: () => ({ open: vi.fn() }) }));

const { EmptyDeckNotes } = await import("./empty-deck-notes");

const DECK = "22222222-2222-4222-8222-222222222222";
const cmdr = [{ oracleId: "6d0a5f7e-1111-4222-8333-444455556666", name: "Atraxa", typeLine: "Legendary Creature", imageUri: null }];
const kept: DeckNotesView = {
  open: [{ id: "n1", body: "swap the mana rock", drawn: [{ kind: "text", text: "swap the mana rock" }], createdAt: "2026-10-02T12:00:00.000Z", doneAt: null }],
  done: [], readAt: 1,
};
const mount = (notes: DeckNotesView | null, enabled = true) =>
  render(<EmptyDeckNotes enabled={enabled} deckId={DECK} notes={notes} deckCards={cmdr}><p>the empty state</p></EmptyDeckNotes>);

afterEach(cleanup);

describe("notes on an empty deck", () => {
  it("opens notes from a deck whose last card was removed, and keeps the notes it already had", () => {
    mount(kept);
    expect(screen.getByText("the empty state")).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: "Notes, 1 open" }));
    expect(screen.queryByText("the empty state")).toBeNull();
    expect(screen.getByText("swap the mana rock")).toBeTruthy();
  });

  it("opens notes on a commander-only deck with none yet, and All brings the empty state back", () => {
    mount(null);
    fireEvent.click(screen.getByRole("tab", { name: "Notes, none yet" }));
    expect(screen.queryByText("the empty state")).toBeNull();
    fireEvent.click(screen.getByRole("tab", { name: /^All/ }));
    expect(screen.getByText("the empty state")).toBeTruthy();
  });

  it("draws the empty state alone when notes are switched off", () => {
    mount(kept, false);
    expect(screen.getByText("the empty state")).toBeTruthy();
    expect(screen.queryByRole("tab", { name: /^Notes/ })).toBeNull();
  });
});
