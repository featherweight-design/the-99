// Which rows the list rules while a draft is pending (#389, surface 1 state 11),
// exercised through BuilderShell because the decision is the shell's: it folds
// two change lists into one map per row, and neither list alone is the answer.
// `DecklistRow`'s own test covers what a ruled row draws.
import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { deckVersioningCopy } from "../../lib/copy/deck-versioning";
import type { DraftState } from "../../lib/decks/draft-shape";
import type { DeckDetail } from "../../lib/decks/read";

vi.mock("../../app/decks/actions", () => ({
  createDeck: vi.fn(),
  getDeckSuggestions: vi.fn(async () => ({ suggestions: [], degraded: false })),
  addCardToDeck: vi.fn(),
  removeCardFromDeck: vi.fn(),
  deleteDeck: vi.fn(),
  renameDeck: vi.fn(),
}));

const { BuilderShell } = await import("./builder-shell");

const copy = deckVersioningCopy.pending;

const DECK = {
  id: "deck-1",
  name: "Korvold",
  createdAt: new Date("2026-01-01"),
  commander: {
    oracleId: "korvold",
    name: "Korvold, Fae-Cursed King",
    colorIdentity: ["B", "R", "G"],
    manaCost: "{2}{B}{R}{G}",
    typeLine: "Legendary Creature — Dragon Noble",
    oracleText: null,
    imageUri: null,
  },
  partner: null,
  cards: [
    { oracleId: "added", name: "Sol Ring", quantity: 1 },
    { oracleId: "recounted", name: "Swamp", quantity: 7 },
    { oracleId: "untouched", name: "Command Tower", quantity: 1 },
  ].map((c) => ({
    ...c,
    typeLine: "Artifact",
    cardTypeGroup: "Artifacts" as const,
    role: "other" as const,
    owned: true,
  })),
  built: 3,
  ownedCount: 3,
  toBuyCount: 0,
  total: 3,
  unresolvedRows: [],
} as unknown as DeckDetail;

/** One card added, one recounted down to a count the version does not have, and
 *  one cut away entirely. The last has no row left on this list to rule — it is
 *  named in the banner instead — so the map is expected to hold two. */
const DRAFT: DraftState = {
  version: {
    id: "v",
    number: 2,
    committedAt: new Date("2026-09-01T00:00:00Z"),
    note: null,
    commanderOracleId: "korvold",
    partnerOracleId: null,
    commanderSince: new Date("2026-08-01T00:00:00Z"),
    partnerSince: null,
  },
  adds: [{ oracleId: "added", name: "Sol Ring", quantity: 1 }] as never,
  addChanges: [{ oracleId: "added", from: 0, to: 1 }],
  removes: [
    { oracleId: "recounted", from: 9, to: 7 },
    { oracleId: "gone", from: 1, to: 0 },
  ],
  basicsChanged: false,
  names: new Map(),
  costs: new Map(),
  prices: new Map(),
  pullFrom: new Map(),
  claimsKnown: true,
  buyCount: 0,
  unfreeCount: 0,
  pullableCount: 0,
  total: null,
  pricedCopies: 0,
  newestAsOf: null,
};

async function mount(draft: DraftState) {
  await act(async () => {
    render(
      <BuilderShell
        deck={DECK}
        suggestions={[]}
        degraded={false}
        firstRun={false}
        commanderIdentity={["B", "R", "G"]}
        arrivedFromImport={false}
        draft={draft}
      />,
    );
  });
}

describe("BuilderShell — the rows a pending draft rules", () => {
  // The defect this covers: a map built from the adds alone left a row whose
  // count merely came down unruled, which reads as a row the draft did not touch.
  it("counts an add and a quantity decrease, and not a card cut away", async () => {
    await mount(DRAFT);
    expect(screen.queryAllByText(copy.toolbarNote(2, 2)).length).toBeGreaterThan(0);
  });

  // The map decides whether any of it draws, so a draft holding nothing but a
  // full removal has no ruled row and no note above the list.
  it("says nothing above the list when every change cut its row away", async () => {
    await mount({ ...DRAFT, adds: [], addChanges: [], removes: [{ oracleId: "gone", from: 1, to: 0 }] });
    expect(screen.queryAllByText(copy.toolbarNote(1, 2))).toHaveLength(0);
    expect(screen.queryAllByText(copy.changeListCaption(1))).toHaveLength(0);
  });
});
