// A commander makes tokens whether or not the list holds a card yet, and the shell draws its own empty
// state (not `Decklist`) for a deck with nothing built. The Tokens group must be on that branch too.
// Follows `builder-shell-tuning-off.test.tsx`.
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DeckDetail } from "../../lib/decks/read";
import type { DeckTokensRead } from "../../lib/tokens/read";
import { recommendedMix } from "../../lib/decks/mix";

vi.mock("../../app/decks/actions", () => ({
  createDeck: vi.fn(),
  getDeckSuggestions: vi.fn(async () => ({ suggestions: [], degraded: false })),
  addCardToDeck: vi.fn(),
  removeCardFromDeck: vi.fn(),
  deleteDeck: vi.fn(),
  renameDeck: vi.fn(),
}));
vi.mock("../../app/decks/token-actions", () => ({ setTokenHeld: vi.fn(), setTokenJoined: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("../../lib/notices/actions", () => ({ peekNotices: vi.fn(async () => null), openNotices: vi.fn(async () => null) }));

const { BuilderShell } = await import("./builder-shell");
const { DeckTokensProvider } = await import("./deck-tokens-context");
const { CardDetailProvider } = await import("../cards/card-detail-provider");
// The modal is loaded on demand; loaded here, after the mocks, a press draws it in the same tick.
await (await import("../cards/card-detail-provider")).warmCardModal();

const commander = {
  oracleId: "aang", name: "Avatar Aang", colorIdentity: ["W", "U", "R", "G"],
  manaCost: "{W}{U}{B}{R}{G}", typeLine: "Legendary Creature — Human Avatar", oracleText: null, imageUri: null,
};
const EMPTY = {
  id: "deck-1", name: "Aang", createdAt: new Date("2026-01-01"), commander, partner: null,
  cards: [], built: 0, ownedCount: 0, toBuyCount: 0, total: 0, unresolvedRows: [],
} as unknown as DeckDetail;

const read: DeckTokensRead = {
  status: "ok", read: true, makerCount: 1, newestPriceAsOf: null,
  tokens: [{
    oracleId: "t-ally", name: "Ally", typeLine: "Token Creature — Ally", colors: ["W"], power: "1", toughness: "1",
    oracleText: null, makers: [{ oracleId: "aang", name: "Avatar Aang", imageUri: null }], state: "not", source: null,
    joined: false, picture: null, printingPick: null, price: null,
  }],
};

const draw = (deck: DeckDetail, tokens: DeckTokensRead | null) => render(
  <CardDetailProvider fetchCard={vi.fn().mockResolvedValue(null) as never}>
    {tokens ? (
      <DeckTokensProvider deckId="deck-1" read={tokens}>
        <BuilderShell mix={recommendedMix(null, false)} deck={deck} suggestions={[]} degraded={false} firstRun={false}
          commanderIdentity={["W", "U", "R", "G"]} arrivedFromImport={false} newestAsOf={null} />
      </DeckTokensProvider>
    ) : (
      <BuilderShell mix={recommendedMix(null, false)} deck={deck} suggestions={[]} degraded={false} firstRun={false}
        commanderIdentity={["W", "U", "R", "G"]} arrivedFromImport={false} newestAsOf={null} />
    )}
  </CardDetailProvider>,
);

afterEach(cleanup);

describe("BuilderShell: the Tokens group on an empty deck", () => {
  it("draws the commander's tokens on the empty branch", () => {
    draw(EMPTY, read);
    expect(screen.getByRole("heading", { name: "Tokens · 1" })).toBeTruthy();
    expect(screen.getByText("Ally")).toBeTruthy();
  });

  it("draws nothing there without the provider (the switch off)", () => {
    draw(EMPTY, null);
    expect(screen.queryByRole("heading", { name: /Tokens/ })).toBeNull();
  });
});

describe("BuilderShell: card details asks for the Tokens group", () => {
  const WITH_CARD = {
    ...EMPTY,
    cards: [{ oracleId: "sol-ring", name: "Sol Ring", quantity: 1, typeLine: "Artifact", cardTypeGroup: "Artifacts", role: "other", owned: false }],
    built: 1, total: 1, toBuyCount: 1,
  } as unknown as DeckDetail;

  it("moves a deck on its Shopping view back to All, where the group is drawn", async () => {
    const { SHOW_DECK_TOKENS } = await import("./deck-tokens-landing");
    draw(WITH_CARD, read);
    // The Tokens group is the All view's: on Shopping, with nothing joined, there is no such heading.
    expect(screen.getByRole("heading", { name: /^Tokens/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: /^Shopping/ }));
    expect(screen.queryByRole("heading", { name: /^Tokens/ })).toBeNull();
    act(() => { window.dispatchEvent(new Event(SHOW_DECK_TOKENS)); });
    expect(screen.getByRole("heading", { name: /^Tokens/ })).toBeTruthy();
  });

  it("brings a deck on another tab back to its list", async () => {
    const { SHOW_DECK_TOKENS } = await import("./deck-tokens-landing");
    draw(WITH_CARD, read);
    fireEvent.click(screen.getByRole("tab", { name: /^Games/ }));
    expect(screen.queryByRole("heading", { name: /^Tokens/ })).toBeNull();
    act(() => { window.dispatchEvent(new Event(SHOW_DECK_TOKENS)); });
    expect(screen.getByRole("heading", { name: /^Tokens/ })).toBeTruthy();
  });
});
