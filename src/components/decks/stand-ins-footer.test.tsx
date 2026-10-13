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
// The modal is loaded on demand; loaded here, after the mocks, a press draws it in the same tick.
await (await import("../cards/card-detail-provider")).warmCardModal();
const { SwapToolsProvider } = await import("../../lib/swaps/context");
const { StandInsSheet } = await import("./stand-ins-sheet");

const original = {
  oracleId: "id-Anguished Unmaking", name: "Anguished Unmaking", role: "removal", owned: false, quantity: 1, cardTypeGroup: "Instants",
  price: { cents: 1500, foilCents: null, etchedCents: null, asOf },
} as unknown as DeckDetailCard;

// A card whose own price read landed with a figure for the printing on screen.
const priced = {
  byScryfallId: {}, byPrintingKey: { "SLD|7": { cents: 450, foilCents: null, etchedCents: null, asOf } } as Record<string, unknown>,
  ambiguousKeys: [], catalogIds: [], catalogKeys: ["SLD|7"], newestAsOf: asOf,
};
// The read landed and the store has never stocked this printing: the line says `no stock`, no figure.
const noStock = { ...priced, byPrintingKey: {} as Record<string, unknown> };
const browse = (name: string, prices: typeof priced | null): BrowseCard => ({
  oracleId: `id-${name}`, name, typeLine: "Instant", manaCost: "{W}", cmc: 1, oracleText: null, keywords: [], rarity: "rare",
  colorIdentity: ["W"], imageUri: null, printedName: null, quantity: 1, setCodes: ["SLD"], primarySetCode: "SLD",
  printings: [{ setCode: "SLD", collectorNumber: "7", imageUri: null, quantity: 1 }] as unknown as BrowseCard["printings"],
  preferredPrinting: null, commanderLegal: true, hasDecks: true,
  ...(prices ? { prices } : {}),
} as BrowseCard);

async function openStandIn(name: string, prices: typeof priced | null = priced) {
  await act(async () => {
    render(
      <CardDetailProvider fetchCard={async (id: string) => browse(id.replace(/^id-/, ""), prices)}>
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

  it("keeps the stand-in's buy price where the card's own price read failed and draws no line", async () => {
    await openStandIn("Chaos Warp", null);
    expect(screen.getByTestId("teaser-footer-note")).toHaveTextContent("$3");
    fireEvent.click(screen.getByRole("button", { name: /Show all details/ }));
    expect(screen.getByTestId("sheet-footer-foot")).toHaveTextContent("$3");
  });

  it("keeps the stand-in's buy price where the card's line reads no stock and names no figure", async () => {
    await openStandIn("Chaos Warp", noStock);
    expect(screen.getByTestId("teaser-footer-note")).toHaveTextContent("$3");
    fireEvent.click(screen.getByRole("button", { name: /Show all details/ }));
    expect(screen.getByTestId("sheet-footer-foot")).toHaveTextContent("$3");
  });

  it("bounds the full sheet's Take and truncates its label, keeping the whole name for a screen reader", async () => {
    await openStandIn("Chaos Warp");
    fireEvent.click(screen.getByRole("button", { name: /Show all details/ }));
    const take = within(screen.getByTestId("sheet-footer-foot")).getByRole("button", {
      name: swapToolsCopy.sheet.takeAria("Chaos Warp", "Anguished Unmaking"),
    });
    expect(take).toHaveClass("min-w-0", "max-w-[62%]");
    expect(take.firstElementChild).toHaveClass("truncate");
  });
});
