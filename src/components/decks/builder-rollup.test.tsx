// The commitments roll-up's derivation (#43, design table §12), exercised
// through BuilderShell: the over-committed half draws as the to-do card's
// spoken-for-twice row, the soft half as a segment of its foot. This covers
// the three decisions the shell makes before either sees a number:
// the self-excluded vantage, the pre-99 window, and reading off the server list.
import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DeckDetail } from "../../lib/decks/read";
import type { Availability } from "../../lib/decks/availability";
import { availabilityCopy } from "../../lib/copy/availability";
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
}));

const { BuilderShell } = await import("./builder-shell");

type Avail = Availability;

const OVER: Avail = {
  owned: 1,
  hard: 2,
  soft: 0,
  free: -1,
  claims: [
    { id: "d1", name: "Atraxa", quantity: 1, mature: true, pending: false, commander: false, senior: true },
    { id: "d2", name: "Kykar", quantity: 1, mature: true, pending: false, commander: false, senior: true },
  ],
};
const SOFT: Avail = { owned: 2, hard: 0, soft: 2, free: 2, claims: [] };
// `free === 0` off a self-excluded query means "exactly enough for everyone,
// this deck included". Read without the vantage it would present as `hard`.
const SELF: Avail = {
  owned: 1,
  hard: 1,
  soft: 0,
  free: 0,
  claims: [{ id: "d1", name: "This deck", quantity: 1, mature: true, pending: false, commander: false, senior: true }],
};

function makeDeck(size: number, availabilities: (Avail | undefined)[] = []): DeckDetail {
  const cards = Array.from({ length: size }, (_, i) => ({
    oracleId: `card-${i}`,
    name: `Card ${i}`,
    typeLine: "Artifact",
    cardTypeGroup: "Artifacts" as const,
    role: "other" as const,
    owned: true,
    quantity: 1,
    availability: availabilities[i],
  }));
  return {
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
    cards,
    built: size,
    ownedCount: size,
    toBuyCount: 0,
    total: size,
    unresolvedRows: [],
  } as unknown as DeckDetail;
}

async function mount(deck: DeckDetail) {
  await act(async () => {
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
  });
}

/** The foot's other drafts segment, whatever its count. */
const soft = () => screen.queryByRole("button", { name: /in (other drafts|another draft) too$/ });

describe("BuilderShell — commitments roll-up derivation", () => {
  // Reading the map without `selfExcluded` would turn every one of this deck's
  // own claims into a conflict with itself, and the segment would fire on a deck
  // that has no conflict at all.
  it("does not count a deck's own claims against itself", async () => {
    await mount(makeDeck(3, [SELF, SELF, SELF]));
    expect(soft()).toBeNull();
  });

  it("speaks for a mid-build deck whose cards are wanted elsewhere", async () => {
    await mount(makeDeck(3, [SOFT, SOFT, undefined]));
    expect(screen.getByRole("button", { name: availabilityCopy.deckRollup.softFoot(2) })).toBeTruthy();
    expect(screen.queryByText(/spoken for twice/)).toBeNull();
  });

  // Row 12.15, and the reason it is not just arithmetic: `soft` counts claims by
  // OTHER unfinished decks, so this deck reaching 99 leaves them standing. The
  // window has to be closed deliberately.
  it("closes the soft line once the deck is finished", async () => {
    const availabilities = Array.from({ length: 99 }, () => SOFT);
    await mount(makeDeck(99, availabilities));
    expect(soft()).toBeNull();
  });

  // …but a shortfall is a shopping decision, and finishing the deck does not
  // buy the missing copy.
  it("keeps the shortfall line after 99", async () => {
    const availabilities: Avail[] = Array.from({ length: 99 }, (_, i) => (i === 0 ? OVER : SOFT));
    await mount(makeDeck(99, availabilities));
    expect(screen.getByText(availabilityCopy.deckSummary.headingOne("Card 0"))).toBeTruthy();
    // 98 of the 99 are soft-claimed, so a window that failed to close would say so.
    expect(soft()).toBeNull();
  });

  // The named body counts committed decks out loud, so an empty name array would
  // have it say "on 0 committed decks". The counted title carries the row alone.
  it("drops the body rather than naming nobody", async () => {
    await mount(makeDeck(2, [{ ...OVER, claims: [] }, undefined]));
    expect(screen.getByText(availabilityCopy.deckSummary.heading(1))).toBeTruthy();
    expect(screen.queryByText(availabilityCopy.deckSummary.bodyOne(0, 1))).toBeNull();
    expect(screen.queryByText(availabilityCopy.deckSummary.bodyManyShort)).toBeNull();
  });

  it("names the card when exactly one is over-committed, and offers Shopping", async () => {
    await mount(makeDeck(2, [OVER, undefined]));
    expect(screen.getByText(availabilityCopy.deckSummary.headingOne("Card 0"))).toBeTruthy();
    expect(screen.getByText(availabilityCopy.deckSummary.bodyOne(2, 1))).toBeTruthy();
    expect(screen.getByRole("button", { name: availabilityCopy.deckSummary.pressAria(1) })).toBeTruthy();
  });
});
