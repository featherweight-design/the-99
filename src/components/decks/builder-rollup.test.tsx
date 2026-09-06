// The commitments roll-up's derivation (#43, design table §12), exercised
// through BuilderShell rather than the spine. The spine's own test covers what
// the region draws; this one covers the three decisions the shell makes before
// the spine ever sees a number, none of which can be forced from the UI:
// the self-excluded vantage, the pre-99 window, and reading off the server list.
import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DeckDetail } from "../../lib/decks/read";
import type { Availability } from "../../lib/decks/availability";
import { availabilityCopy } from "../../lib/copy/availability";

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
    { id: "d1", name: "Atraxa", quantity: 1, mature: true },
    { id: "d2", name: "Kykar", quantity: 1, mature: true },
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
  claims: [{ id: "d1", name: "This deck", quantity: 1, mature: true }],
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
      <BuilderShell
        deck={deck}
        suggestions={[]}
        degraded={false}
        firstRun={false}
        commanderIdentity={["B", "R", "G"]}
        arrivedFromImport={false}
      />,
    );
  });
}

const region = () => screen.queryByRole("region", { name: availabilityCopy.deckRollup.regionAria });

describe("BuilderShell — commitments roll-up derivation", () => {
  // Reading the map without `selfExcluded` would turn every one of this deck's
  // own claims into a conflict with itself, and the region would fire on a deck
  // that has no conflict at all.
  it("does not count a deck's own claims against itself", async () => {
    await mount(makeDeck(3, [SELF, SELF, SELF]));
    expect(region()).toBeNull();
  });

  it("speaks for a mid-build deck whose cards are wanted elsewhere", async () => {
    await mount(makeDeck(3, [SOFT, SOFT, undefined]));
    expect(screen.getAllByText(availabilityCopy.deckRollup.softHeading(2))).toHaveLength(2);
  });

  // Row 12.15, and the reason it is not just arithmetic: `soft` counts claims by
  // OTHER unfinished decks, so this deck reaching 99 leaves them standing. The
  // window has to be closed deliberately.
  it("closes the soft line once the deck is finished", async () => {
    const availabilities = Array.from({ length: 99 }, () => SOFT);
    await mount(makeDeck(99, availabilities));
    expect(region()).toBeNull();
  });

  // …but a shortfall is a shopping decision, and finishing the deck does not
  // buy the missing copy.
  it("keeps the shortfall line after 99", async () => {
    const availabilities: Avail[] = Array.from({ length: 99 }, (_, i) => (i === 0 ? OVER : SOFT));
    await mount(makeDeck(99, availabilities));
    expect(screen.getAllByText(availabilityCopy.deckRollup.overHeading(1))).toHaveLength(2);
    // 98 of the 99 are soft-claimed, so a window that failed to close would say
    // so in the "N more" form that sits under a red line.
    expect(screen.queryByText(availabilityCopy.deckRollup.softHeadingAfterOver(98))).toBeNull();
  });

  // The named body counts finished lists out loud, so an empty name array would
  // have it say "on 0 finished lists". The heading carries the line alone.
  it("drops the body rather than naming nobody", async () => {
    await mount(makeDeck(2, [{ ...OVER, claims: [] }, undefined]));
    expect(screen.getAllByText(availabilityCopy.deckRollup.overHeading(1))).toHaveLength(2);
    // Ungated, the name array's length would be interpolated straight in, and
    // the sentence would count zero finished lists out loud.
    expect(screen.queryByText(availabilityCopy.deckSummary.body("Card 0", 0, 1))).toBeNull();
  });

  it("names the card when exactly one is over-committed", async () => {
    await mount(makeDeck(2, [OVER, undefined]));
    expect(screen.getAllByText(availabilityCopy.deckSummary.body("Card 0", 2, 1))).toHaveLength(2);
  });
});
