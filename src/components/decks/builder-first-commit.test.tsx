// The gate on `Commit as v1` (#389, surface 1 state 2), exercised through
// BuilderShell rather than the spine. `FirstCommitOffer`'s own test covers what
// the control draws; this one covers the decision the shell makes before either
// spine sees the flag, which is not reachable from the UI: a versionless list
// that has reached a full body, where "full" is the pair-aware body size.
import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { deckVersioningCopy } from "../../lib/copy/deck-versioning";
import type { DraftState } from "../../lib/decks/draft-shape";
import { BREW, COMMITTED } from "./__fixtures__/draft-state";
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

function makeDeck(
  size: number,
  partner: typeof PARTNER | null = null,
  unresolved = 0,
  built = size,
): DeckDetail {
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
    built,
    ownedCount: size,
    toBuyCount: 0,
    total: size + unresolved,
    unresolvedRows: Array.from({ length: unresolved }, (_, i) => ({
      id: `u-${i}`,
      rawName: `Unnamed ${i}`,
      quantity: 1,
      sourceLine: i + 1,
    })),
  } as unknown as DeckDetail;
}

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

  // Past the body size the deck is `Over`, and the action it is waiting for is a
  // cut, not a commit. `commitDeckVersion` checks no count, so an offer here
  // would freeze an illegal list as v1 — and a version cannot be uncut.
  it("withholds it past a full body", async () => {
    await mount(makeDeck(101), BREW);
    expect(offers()).toHaveLength(0);
  });

  // The pair-aware ceiling is 98, so 99 matched cards is over for this deck even
  // though it is exactly a single commander's body.
  it("withholds it one card past a partnered deck's body", async () => {
    await mount(makeDeck(99, PARTNER), BREW);
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

  // The status contract's rule, and the one a `total` gate got wrong: an
  // unresolved line is a card the deck wants and cannot name, so it never pushes
  // a deck to its body size. `commitVersion` snapshots matched rows, so a v1 cut
  // here would freeze 98 cards under an offer that called the list complete.
  it("withholds it at 98 matched cards plus an unresolved line", async () => {
    await mount(makeDeck(98, null, 1), BREW);
    expect(offers()).toHaveLength(0);
  });

  // A card list ahead of the server's own count is what the builder holds for as
  // long as the add that filled the last slot is in flight. `commitVersion`
  // snapshots the database, so an offer taken in that window would cut a v1
  // without the card — and a version cannot be uncut.
  it("withholds it while the list is full but the server count is not", async () => {
    await mount(makeDeck(99, null, 0, 98), BREW);
    expect(offers()).toHaveLength(0);
  });

  // The same window from the other side: a removal in flight leaves the rendered
  // list one card short while the server still counts a full body. The offer has
  // to go with the list the player is looking at, or following it freezes a v1 of
  // 98 cards under a control that called the deck whole.
  it("withholds it while the server count is full but the list is not", async () => {
    await mount(makeDeck(98, null, 0, 99), BREW);
    expect(offers()).toHaveLength(0);
  });

  // A page that could not read the draft knows neither whether a version exists
  // nor what it held, so it offers nothing rather than guessing at a brew.
  it("withholds it when there is no draft to read", async () => {
    await mount(makeDeck(99), null);
    expect(offers()).toHaveLength(0);
  });
});
