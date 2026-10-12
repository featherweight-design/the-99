// The mobile empty deck must always keep a way in.
//
// This exists because deleting the empty state's "Open suggestions" CTA very
// nearly stranded a mobile empty deck with no control that opens the Add sheet:
// the copy change and the shell rewiring that replaces the sheet land in
// different PRs, and in between there would have been no entrance at all. The
// component renders correctly in isolation either way — what breaks is that the
// only affordance is gone, which is invisible to a props-level check.
//
// The shell rewiring has since landed, so the two entrances the empty deck must
// keep are the Consider tab and the quick-add bar.
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DeckDetail } from "../../lib/decks/read";
import { recommendationsCopy } from "../../lib/copy/recommendations";
import { recommendedMix } from "../../lib/decks/mix";

/** The asserted baseline, through the real function rather than restated — a hand-built
 *  literal drifts from the type the moment a field is added, which is how 120 of these broke. */
const TEST_MIX = recommendedMix(null, false);

vi.mock("../../app/decks/actions", () => ({
  createDeck: vi.fn(),
  getDeckSuggestions: vi.fn(async () => ({ suggestions: [], degraded: false })),
  addCardToDeck: vi.fn(),
  removeCardFromDeck: vi.fn(),
  deleteDeck: vi.fn(),
  renameDeck: vi.fn(),
  fillDeck: vi.fn(),
}));

vi.mock("../../app/decks/notes-actions", () => ({
  addNote: vi.fn(), editNote: vi.fn(), setNoteDone: vi.fn(), deleteNote: vi.fn(), searchNoteCards: vi.fn(),
}));

const { BuilderShell } = await import("./builder-shell");

const emptyDeck = {
  id: "deck-1",
  name: "Korvold",
  createdAt: new Date("2026-01-01"),
  filled: false,
  commander: {
    oracleId: "korvold",
    name: "Korvold, Fae-Cursed King",
    colorIdentity: ["B", "R", "G"],
    manaCost: "{2}{B}{R}{G}",
    typeLine: "Legendary Creature — Dragon Noble",
    oracleText: null,
    imageUri: null,
  },
  cards: [],
  built: 0,
  ownedCount: 0,
  toBuyCount: 0,
  total: 0,
  unresolvedRows: [],
} as unknown as DeckDetail;

const sweptDeck: DeckDetail = {
  ...emptyDeck,
  id: "deck-2",
  filled: true,
} as unknown as DeckDetail;

describe("empty builder", () => {
  const renderEmpty = () =>
    render(
      <BuilderShell mix={TEST_MIX}
        deck={emptyDeck}
        suggestions={[]}
        degraded={false}
        firstRun={false}
        commanderIdentity={["B", "R", "G"]}
        arrivedFromImport={false}
       newestAsOf={null}/>,
    );

  it("opens Notes on a deck with no cards, keeping the notes it already had, and All brings the empty state back", () => {
    render(
      <BuilderShell mix={TEST_MIX}
        deck={emptyDeck}
        suggestions={[]}
        degraded={false}
        firstRun={false}
        commanderIdentity={["B", "R", "G"]}
        arrivedFromImport={false}
        newestAsOf={null}
        notesEnabled
        notesData={{
          open: [{ id: "n1", body: "swap the mana rock", drawn: [{ kind: "text", text: "swap the mana rock" }], createdAt: "2026-10-02T12:00:00.000Z", doneAt: null }],
          done: [], readAt: 1,
        }} />,
    );
    const hint = /ramp, draw, removal, and wipe slots first/i;
    expect(screen.getByText(hint)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Notes, 1 open" }));
    expect(screen.queryByText(hint)).toBeNull();
    expect(screen.getByText("swap the mana rock")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^All/ }));
    expect(screen.getByText(hint)).toBeInTheDocument();
  });

  it("keeps both entrances: the Consider tab and the quick-add bar", () => {
    renderEmpty();
    expect(screen.getByRole("tab", { name: /cards to consider/i })).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("no longer offers the retired Open suggestions CTA", () => {
    renderEmpty();
    expect(screen.queryByRole("button", { name: /open suggestions/i })).toBeNull();
  });

  it("serves the role hint at both widths, not desktop only", () => {
    renderEmpty();
    const hint = screen.getByText(/ramp, draw, removal, and wipe slots first/i);
    expect(hint.className).not.toContain("hidden");
  });
});

describe("swept-empty branch", () => {
  const renderSwept = () =>
    render(
      <BuilderShell mix={TEST_MIX}
        deck={sweptDeck}
        suggestions={[]}
        degraded={false}
        firstRun={false}
        commanderIdentity={["B", "R", "G"]}
        arrivedFromImport={false}
       newestAsOf={null}/>,
    );

  const renderNeverFilled = () =>
    render(
      <BuilderShell mix={TEST_MIX}
        deck={emptyDeck}
        suggestions={[]}
        degraded={false}
        firstRun={false}
        commanderIdentity={["B", "R", "G"]}
        arrivedFromImport={false}
       newestAsOf={null}/>,
    );

  it("an empty deck that was filled takes the swept copy", () => {
    renderSwept();
    // The swept heading must be present
    expect(screen.getByText(recommendationsCopy.sweptEmpty.heading)).toBeInTheDocument();
    // The first-run heading must NOT be present
    expect(screen.queryByText(/a king with no army/i)).toBeNull();
  });

  it("names the commander the short way the rest of the shell does", () => {
    renderSwept();
    // "Korvold", not "Korvold, Fae-Cursed King" — the sibling first-run branch
    // and every other commander mention in the shell use the short name.
    expect(
      screen.getByText(recommendationsCopy.sweptEmpty.body("Korvold")),
    ).toBeInTheDocument();
  });

  it("offers the way back into Consider", () => {
    renderSwept();
    expect(
      screen.getByRole("button", { name: recommendationsCopy.sweptEmpty.cta }),
    ).toBeInTheDocument();
  });

  it("an empty deck that was never filled keeps the shipped first-run copy", () => {
    renderNeverFilled();
    // The first-run heading must be present
    expect(screen.getByText(/a king with no army/i)).toBeInTheDocument();
    // The swept heading must NOT be present
    expect(screen.queryByText(recommendationsCopy.sweptEmpty.heading)).toBeNull();
  });
});

// An import whose every line went unresolved lands as filled=false with zero
// cards — the same shape a failed fill leaves behind. It is not one: the player
// asked for a decklist, and the unresolved group already explains what happened.
describe("fill-failed banner on an empty deck", () => {
  const renderWith = (deck: DeckDetail) =>
    render(
      <BuilderShell mix={TEST_MIX}
        deck={deck}
        suggestions={[]}
        degraded={false}
        firstRun={false}
        commanderIdentity={["B", "R", "G"]}
        arrivedFromImport={false}
       newestAsOf={null}/>,
    );

  it("offers the retry when nothing came over", () => {
    renderWith(emptyDeck);
    expect(
      screen.getByText(recommendationsCopy.fill.failedHeading),
    ).toBeInTheDocument();
  });

  it("stays away when the deck is empty because an import went unresolved", () => {
    renderWith({
      ...emptyDeck,
      unresolvedRows: [
        { id: "row-1", rawName: "Sol Ringg", quantity: 1, sourceLine: 1 },
      ],
    } as unknown as DeckDetail);
    expect(screen.queryByText(recommendationsCopy.fill.failedHeading)).toBeNull();
  });
});
