// An unresolved line is a card the player already chose and we could not name,
// so it holds the slot it came in on. The top-off door offers the slots nobody
// has spoken for, and an import that came up two lines short has none: offering
// to choose two more there would put the deck two cards over once those lines
// are resolved. Exercised through BuilderShell because the seam is the count it
// hands the strip, not anything inside the strip.
import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { topOffCopy } from "../../lib/copy/top-off";
import type { DeckDetail } from "../../lib/decks/read";
import { unresolvedCardCount } from "../../lib/decks/grouping";
import type { DeckUnresolvedRow } from "../../lib/decks/grouping";
import type { TopOffCandidateWithFacts } from "../../lib/decks/last-slots";
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
  commitTopOff: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
  usePathname: () => "/decks/deck-1",
}));

const { BuilderShell } = await import("./builder-shell");

function unresolved(n: number): DeckUnresolvedRow[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `row-${i}`,
    rawName: `Unknown Card ${i}`,
    quantity: 1,
    sourceLine: i + 1,
  }));
}

function makeDeck(matched: number, unresolvedRows: DeckUnresolvedRow[]): DeckDetail {
  const cards = Array.from({ length: matched }, (_, i) => ({
    oracleId: `card-${i}`,
    name: `Card ${i}`,
    typeLine: "Artifact",
    cardTypeGroup: "Artifacts" as const,
    role: "other" as const,
    owned: true,
    quantity: 1,
    auto: false,
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
      artCropUri: null,
    },
    partner: null,
    cards,
    built: matched,
    ownedCount: matched,
    toBuyCount: 0,
    // Copies, not lines — the same sum `getDeckDetail` builds `total` from, so
    // a fixture whose rows ever carry a quantity above one still describes a
    // real deck.
    total: matched + unresolvedCardCount(unresolvedRows),
    filled: false,
    unresolvedRows,
  } as DeckDetail;
}

// A pool with something left in it, so the strip draws its door rather than the
// exhausted plate that stands in for one.
const candidates: TopOffCandidateWithFacts[] = Array.from({ length: 12 }, (_, i) => ({
  oracleId: `cand-${i}`,
  name: `Candidate ${i}`,
  typeLine: "Instant",
  facet: "spell",
  inclusionPct: 40,
  synergyPts: 20,
  imageUri: null,
  owned: false,
  committedTo: null,
  manaCost: null,
  price: null,
  availability: null,
  // Stated, not omitted: both deck-scoped fields are required on the row type so the page's
  // attachment cannot be deleted without a compile error.
  facts: null,
  comboPartner: null,
}));

async function shell(matched: number, unresolvedRows: DeckUnresolvedRow[]) {
  await act(async () => {
    render(
      <BuilderShell mix={TEST_MIX}
        deck={makeDeck(matched, unresolvedRows)}
        suggestions={[]}
        degraded={false}
        firstRun={false}
        commanderIdentity={["B", "R", "G"]}
        arrivedFromImport={false}
        candidates={candidates}
       newestAsOf={null}/>,
    );
  });
}

const door = (slots: string) => topOffCopy.strip.openAria(slots);

describe("Top-off door — unresolved lines hold their slots", () => {
  it("takes the door away when every open slot is an unresolved line", async () => {
    await shell(97, unresolved(2));
    expect(screen.queryByRole("button", { name: door("2") })).toBeNull();
    expect(screen.queryByText(topOffCopy.strip.heading("2"))).toBeNull();
  });

  it("counts only the slots no line has spoken for", async () => {
    await shell(90, unresolved(2));
    expect(screen.getByRole("button", { name: door("7") })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: door("9") })).toBeNull();
  });
});
