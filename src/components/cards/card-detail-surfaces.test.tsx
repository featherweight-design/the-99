// The proxy surfaces inside the card sheet: the deck-scoped control, and the
// receipt's list of decks printing this card.
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { BrowseCard } from "../../lib/collection/browse";
import { proxyCopy } from "../../lib/copy/proxies";

vi.mock("../../app/collection/actions", () => ({
  setCardArtPreference: vi.fn(async () => true),
  clearCardArtPreference: vi.fn(async () => {}),
}));
vi.mock("../../app/decks/actions", () => ({ setCardProxied: vi.fn(async () => ({ ok: true })) }));

const { CardModal } = await import("./card-modal");


describe("the sheet's proxy surfaces", () => {
  const withDeck = (over: Partial<BrowseCard> = {}) => ({
    oracleId: "o1", name: "The Ozolith", typeLine: "Legendary Artifact",
    manaCost: "{1}", cmc: 1, oracleText: null, keywords: [],
    rarity: "rare" as const, colorIdentity: [], imageUri: null,
    printings: [], owned: [], ...over,
  }) as unknown as BrowseCard;

  it("lists the decks printing a card the player owns none of", () => {
    // The headline case. `AvailabilityDetail` returns null for an unowned card,
    // so a proxy list folded into it would render nothing exactly when it matters.
    render(
      <CardModal
        card={withDeck({ proxiedBy: [{ id: "d1", name: "HD Gods" }] })}
        position={1} total={1} onClose={() => {}} onPrev={null} onNext={null}
      />,
    );
    expect(screen.getByText(proxyCopy.receipt.heading)).toBeTruthy();
    expect(screen.getByText("HD Gods")).toBeTruthy();
    expect(screen.getByText(proxyCopy.receipt.note(1))).toBeTruthy();
  });

  it("draws no proxy block when nothing prints the card", () => {
    render(
      <CardModal
        card={withDeck({ proxiedBy: [] })}
        position={1} total={1} onClose={() => {}} onPrev={null} onNext={null}
      />,
    );
    expect(screen.queryByText(proxyCopy.receipt.heading)).toBeNull();
  });

  it("draws no control without a deck", () => {
    // Opened from `/collection` there is no deck to proxy into. Absent, not
    // disabled: there is no STATE here, because there is no deck.
    render(
      <CardModal
        card={withDeck()}
        position={1} total={1} onClose={() => {}} onPrev={null} onNext={null}
      />,
    );
    expect(screen.queryByRole("switch")).toBeNull();
  });

  it("draws the control when the card was opened from a deck", () => {
    render(
      <CardModal
        card={withDeck()} deckId="d1" deckName="HD Gods"
        position={1} total={1} onClose={() => {}} onPrev={null} onNext={null}
      />,
    );
    expect(screen.getByRole("switch")).toBeTruthy();
    expect(screen.getByText(proxyCopy.control.label("HD Gods"))).toBeTruthy();
  });
});
