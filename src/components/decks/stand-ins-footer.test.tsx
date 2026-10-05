// The stand-ins sheet's footer on a stacked card at phone width (stacked sheets R1, call 9), through
// the real provider and trigger: jsdom matches no media query, so the card takes its phone branch.
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { BrowseCard } from "../../lib/collection/browse";
import { swapToolsCopy } from "../../lib/copy/swap-tools";
import type { DeckDetailCard } from "../../lib/decks/grouping";
import type { StandInsRead } from "../../lib/swaps/gather";

const asOf = new Date("2026-09-20T00:00:00Z");
const cardRow = (name: string) => ({ oracleId: `id-${name}`, name, typeLine: "Instant", oracleText: "", keywords: [], cmc: 2, imageUri: null });
const standIn = (name: string, free: boolean) => ({
  card: cardRow(name), free, soft: 0, owned: free ? 1 : 0, cents: free ? null : 300, foilOnly: false,
  inclusion: null, synergy: null, isUniversal: false, shared: ["removal"], sharedThemes: [], extra: [], missing: [], once: [], rung: null, drawbacks: [], givesUp: [], credit: 1, advisory: 0, lostMethods: [],
});
const READ = {
  job: { kind: "spell", roles: ["removal"], mv: 2 }, originalCents: 1500, jobRoles: ["removal"],
  groups: [{ same: true, type: "instant", rows: [standIn("Swords to Plowshares", true), standIn("Chaos Warp", false)], total: 2 }],
  original: cardRow("Anguished Unmaking"), commanders: ["Gishath"], newestAsOf: asOf,
} as unknown as StandInsRead;

vi.mock("../../lib/swaps/actions", () => ({
  loadStandInsAction: vi.fn(async () => READ), takeStandInAction: vi.fn(), undoSwapAction: vi.fn(),
}));
vi.mock("../../app/collection/actions", () => ({
  setCardArtPreference: vi.fn(async () => true),
  clearCardArtPreference: vi.fn(async () => {}),
}));

const { CardDetailProvider } = await import("../cards/card-detail-provider");
const { SwapToolsProvider } = await import("../../lib/swaps/context");
const { StandInsSheet } = await import("./stand-ins-sheet");

const original = {
  oracleId: "id-Anguished Unmaking", name: "Anguished Unmaking", role: "removal", owned: false, quantity: 1, cardTypeGroup: "Instants",
  price: { cents: 1500, foilCents: null, etchedCents: null, asOf },
} as unknown as DeckDetailCard;

const browse = (name: string): BrowseCard => ({
  oracleId: `id-${name}`, name, typeLine: "Instant", manaCost: "{W}", cmc: 1, oracleText: null, keywords: [], rarity: "rare",
  colorIdentity: ["W"], imageUri: null, printedName: null, quantity: 1, printings: [], setCodes: [], primarySetCode: "",
  preferredPrinting: null, commanderLegal: true, hasDecks: true,
});

async function openStandIn(name: string) {
  await act(async () => {
    render(
      <CardDetailProvider fetchCard={async (id: string) => browse(id.replace(/^id-/, ""))}>
        <SwapToolsProvider deckId="d1" deckName="HD Gishath" storedLimitCents={null}>
          <StandInsSheet card={original} newestAsOf={asOf} onClose={() => {}} />
        </SwapToolsProvider>
      </CardDetailProvider>,
    );
  });
  const sheet = screen.getByTestId("stand-ins-sheet");
  await act(async () => {
    fireEvent.click(within(sheet).getAllByRole("button", { name: new RegExp(name) })[0]);
  });
}

describe("a stacked stand-in's footer on the phone", () => {
  it("keeps the free chip for a stand-in the reader owns a spare copy of, in the teaser and the foot", async () => {
    await openStandIn("Swords to Plowshares");
    expect(screen.getByTestId("teaser-footer-note")).toHaveTextContent(swapToolsCopy.sheet.free);
    fireEvent.click(screen.getByRole("button", { name: /Show all details/ }));
    expect(screen.getByTestId("sheet-footer-foot")).toHaveTextContent(swapToolsCopy.sheet.free);
  });

  it("draws no price plate for a stand-in to buy: the teaser's price line already carries it", async () => {
    await openStandIn("Chaos Warp");
    const note = screen.getByTestId("teaser-footer-note");
    expect(note).not.toHaveTextContent(swapToolsCopy.sheet.free);
    expect(note).not.toHaveTextContent("$3");
  });
});
