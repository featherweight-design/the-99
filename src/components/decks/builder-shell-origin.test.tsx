// A linked brew draws a Versions tab for v0 alone. Unlinking from v0's panel takes the tab away
// with it, and the shell must fall back to the deck rather than leave no tab selected over an
// empty rail.
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DeckDetail } from "../../lib/decks/read";
import type { DeckOrigin } from "../../lib/precons/origin";
import { recommendedMix } from "../../lib/decks/mix";
import { deckVersioningCopy } from "../../lib/copy/deck-versioning";

vi.mock("../../app/decks/actions", () => ({
  createDeck: vi.fn(),
  getDeckSuggestions: vi.fn(async () => ({ suggestions: [], degraded: false })),
  addCardToDeck: vi.fn(),
  removeCardFromDeck: vi.fn(),
  deleteDeck: vi.fn(),
  renameDeck: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("../../lib/notices/actions", () => ({ peekNotices: vi.fn(async () => null), openNotices: vi.fn(async () => null) }));
vi.mock("./version-history", () => ({ VersionRail: () => <div data-testid="rail" /> }));

const { BuilderShell } = await import("./builder-shell");

const DECK = {
  id: "deck-1",
  name: "HD - Eldrazi",
  createdAt: new Date("2026-01-01"),
  commander: {
    oracleId: "ulalek", name: "Ulalek, Fused Atrocity", colorIdentity: [],
    manaCost: "{2}", typeLine: "Legendary Creature — Eldrazi", oracleText: null, imageUri: null,
  },
  partner: null,
  cards: [],
  built: 0,
  ownedCount: 0,
  toBuyCount: 0,
  total: 0,
  unresolvedRows: [],
} as unknown as DeckDetail;

const ORIGIN: DeckOrigin = {
  fileName: "EldraziUnbound_CMM", name: "Eldrazi Unbound", setCode: "CMM", releaseDate: "2023-08-04",
  cardCount: 99, commanderOracleId: "ulalek", partnerOracleId: null, commanderName: "Ulalek, Fused Atrocity",
  partnerName: null, manaValue: 3.4, startVersionId: null,
};

function shell(preconOrigin: DeckOrigin | null) {
  return (
    <BuilderShell mix={recommendedMix(null, false)} deck={DECK} suggestions={[]} degraded={false} firstRun={false}
      commanderIdentity={[]} arrivedFromImport={false} newestAsOf={null}
      versions={[]} preconOrigin={preconOrigin} initialView="versions" />
  );
}

describe("BuilderShell — a linked brew unlinked from v0", () => {
  it("falls back to the deck when the Versions tab goes", () => {
    const { rerender } = render(shell(ORIGIN));
    expect(within(screen.getAllByRole("tablist")[0]).getByRole("tab", { selected: true }).textContent).toContain(deckVersioningCopy.history.tab);
    expect(screen.getByTestId("rail")).toBeTruthy();

    rerender(shell(null));
    expect(screen.queryByRole("tab", { name: /version/i })).toBeNull();
    expect(within(screen.getAllByRole("tablist")[0]).getByRole("tab", { selected: true })).toBeTruthy();
    expect(screen.queryByTestId("rail")).toBeNull();
  });
});
