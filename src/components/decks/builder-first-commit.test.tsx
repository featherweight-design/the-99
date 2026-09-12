// The gate on `Commit as v1` (#389, surface 1 state 2), exercised through
// BuilderShell rather than the spine. `FirstCommitOffer`'s own test covers what
// the control draws; this one covers the decision the shell makes before either
// spine sees the flag, which is not reachable from the UI: a versionless list
// that has reached a full body, where "full" is the pair-aware body size.
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

const PARTNER = {
  oracleId: "partner",
  name: "Tana, the Bloodsower",
  colorIdentity: ["R", "G"],
  manaCost: "{2}{R}{G}",
  typeLine: "Legendary Creature — Human Rogue",
  oracleText: null,
  imageUri: null,
};

function makeDeck(size: number, partner: typeof PARTNER | null = null): DeckDetail {
  const cards = Array.from({ length: size }, (_, i) => ({
    oracleId: `card-${i}`,
    name: `Card ${i}`,
    typeLine: "Artifact",
    cardTypeGroup: "Artifacts" as const,
    role: "other" as const,
    owned: true,
    quantity: 1,
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
    partner,
    cards,
    built: size,
    ownedCount: size,
    toBuyCount: 0,
    total: size,
    unresolvedRows: [],
  } as unknown as DeckDetail;
}

/** A draft whose deck has never been committed — every figure empty, because a
 *  brew has no version for anything to be pending against. */
const BREW: DraftState = {
  version: null,
  adds: [],
  addChanges: [],
  removes: [],
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
  manaValue: null,
  manaValueBefore: null,
};

const COMMITTED: DraftState = {
  ...BREW,
  version: {
    id: "v",
    number: 1,
    committedAt: new Date("2026-09-01T00:00:00Z"),
    note: null,
    commanderOracleId: "korvold",
    partnerOracleId: null,
    commanderSince: new Date("2026-08-01T00:00:00Z"),
    partnerSince: null,
  },
};

async function mount(deck: DeckDetail, draft: DraftState | null) {
  await act(async () => {
    render(
      <BuilderShell
        deck={deck}
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

/** One control per width, so a present offer is two links and an absent one is
 *  none — a single link would mean one spine had been missed. */
const offers = () => screen.queryAllByRole("link", { name: copy.firstCommitCta });

describe("BuilderShell — the gate on Commit as v1", () => {
  it("offers the first commit on a versionless list at a full body", async () => {
    await mount(makeDeck(99), BREW);
    expect(offers()).toHaveLength(2);
  });

  // The offer is to make a claim permanent, and a deck one card short is not the
  // deck the player would be locking.
  it("withholds it one card short of a full body", async () => {
    await mount(makeDeck(98), BREW);
    expect(offers()).toHaveLength(0);
  });

  // Already committed: the banner owns this deck's commit, and the spine offering
  // a first one beside it would name a version that already exists.
  it("withholds it on a deck that already has a version, however full", async () => {
    await mount(makeDeck(99), COMMITTED);
    expect(offers()).toHaveLength(0);
  });

  // A pair's body is 98, not 99 — 100 minus the commanders. Read against a
  // hardcoded 99 this deck would be a card short of an offer it has earned.
  it("counts a partnered deck's body as 98", async () => {
    await mount(makeDeck(98, PARTNER), BREW);
    expect(offers()).toHaveLength(2);
  });

  // A page that could not read the draft knows neither whether a version exists
  // nor what it held, so it offers nothing rather than guessing at a brew.
  it("withholds it when there is no draft to read", async () => {
    await mount(makeDeck(99), null);
    expect(offers()).toHaveLength(0);
  });
});
