// Which rows the list rules while a draft is pending (#389, surface 1 state 11),
// exercised through BuilderShell because the decision is the shell's: it folds
// two change lists into one map per row, and neither list alone is the answer.
// `DecklistRow`'s own test covers what a ruled row draws.
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { deckVersioningCopy } from "../../lib/copy/deck-versioning";
import { addPanelCopy } from "../../lib/copy/decks-builder";
import type { DraftState } from "../../lib/decks/draft-shape";
import type { DeckDetail } from "../../lib/decks/read";
import { recommendedMix } from "../../lib/decks/mix";

/** The asserted baseline, through the real function rather than restated — a hand-built
 *  literal drifts from the type the moment a field is added, which is how 120 of these broke. */
const TEST_MIX = recommendedMix(null, false);

vi.mock("../../app/decks/actions", () => ({
  createDeck: vi.fn(),
  getDeckSuggestions: vi.fn(async () => ({ suggestions: [], degraded: false })),
  addCardToDeck: vi.fn(),
  removeCardFromDeck: vi.fn(),
  setBasicQuantity: vi.fn(async (_d: string, _o: string, n: number) => ({ ok: true, quantity: n, changed: true })),
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
      <BuilderShell mix={TEST_MIX}
        deck={DECK}
        suggestions={[]}
        degraded={false}
        firstRun={false}
        commanderIdentity={["B", "R", "G"]}
        arrivedFromImport={false}
        draft={draft}
       newestAsOf={null}/>,
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

// A committed deck with NOTHING pending: the shell still says there is a version to compare against (an empty
// map, not null), so the basics stepper's first burst draws `from N` before any move exists.
describe("BuilderShell — a clean committed deck and the basics stepper", () => {
  it("draws `from 7` on the first press, before the save lands", async () => {
    const swamp = { ...DECK.cards[1], typeLine: "Basic Land — Swamp", cardTypeGroup: "Lands" as const, role: "land" as const };
    const clean = { ...DRAFT, adds: [], addChanges: [], removes: [] };
    await act(async () => {
      render(
        <BuilderShell mix={TEST_MIX}
          deck={{ ...DECK, cards: [swamp] } as DeckDetail}
          suggestions={[]}
          degraded={false}
          firstRun={false}
          commanderIdentity={["B", "R", "G"]}
          arrivedFromImport={false}
          draft={clean}
         newestAsOf={null}/>,
      );
    });
    expect(screen.queryByText(addPanelCopy.basicStepper.from(7))).not.toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: addPanelCopy.basicStepper.moreAria("Swamp", 8) }));
    });
    expect(screen.getByText(addPanelCopy.basicStepper.from(7))).toBeInTheDocument();
  });
});

