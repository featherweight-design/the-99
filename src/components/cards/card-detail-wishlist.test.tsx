// The Wishlist section's wiring through the PROVIDER (Social R2 PR 5): which cards draw it, where it sits in the column,
// and that a write stales the cached card. The section's own behaviour is `wishlist/card-wishlist.test.tsx`.
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import type { BrowseCard } from "../../lib/collection/browse";
import { wishlistCopy } from "../../lib/copy/wishlist";

vi.mock("../../app/collection/actions", () => ({
  setCardArtPreference: vi.fn(async () => true),
  clearCardArtPreference: vi.fn(async () => {}),
}));
vi.mock("../../app/decks/actions", () => ({ setCardProxied: vi.fn(async () => ({ ok: true as const })) }));
const addToWishlist = vi.fn(async () => ({ ok: true as const, status: "wanted" as const, want: 2, have: 1 }));
vi.mock("../../app/collection/wishlist/actions", () => ({
  addToWishlistAction: () => addToWishlist(),
  setWishlistWantAction: vi.fn(),
  removeFromWishlistAction: vi.fn(),
}));

const { CardDetailProvider, useCardDetail } = await import("./card-detail-provider");
await (await import("./card-detail-provider")).warmCardModal();

const c = wishlistCopy.details;
const card = (over: Partial<BrowseCard> = {}) => ({
  oracleId: "held", name: "The Ozolith", typeLine: "Legendary Artifact",
  manaCost: "{1}", cmc: 1, oracleText: null, keywords: [],
  rarity: "rare" as const, colorIdentity: [], imageUri: null,
  printings: [], owned: [], quantity: 1, proxiedBy: [], ...over,
}) as unknown as BrowseCard;

function Open({ id }: { id: string }) {
  const { open } = useCardDetail();
  return <button type="button" onClick={() => open(id)}>open {id}</button>;
}
const mount = (fetchCard: (id: string) => Promise<BrowseCard | null>, deck = false) =>
  render(
    <CardDetailProvider fetchCard={fetchCard} {...(deck ? { deckId: "d1", deckName: "HD Gods", deckOracleIds: new Set(["held"]) } : {})}>
      <Open id="held" />
    </CardDetailProvider>,
  );
const openCard = async () => { await act(async () => { fireEvent.click(screen.getByText("open held")); }); };

describe("the Wishlist section in card details", () => {
  it("draws for a reader whose switch is on, whatever opened the card", async () => {
    mount(async (id) => card({ oracleId: id, wishlist: { want: null } }));
    await openCard();
    expect(screen.getByTestId("card-wishlist")).toHaveAccessibleName(c.section0);
    expect(screen.getByRole("button", { name: c.add })).toBeInTheDocument();
  });

  it("draws the line for a card already on the list", async () => {
    mount(async (id) => card({ oracleId: id, wishlist: { want: 3 } }));
    await openCard();
    expect(screen.getByTestId("card-wishlist")).toHaveAccessibleName(c.section);
    expect(screen.getByRole("status", { name: c.want })).toHaveTextContent("3");
  });

  it("is absent while the switch is off for the reader, or the read failed", async () => {
    for (const wishlist of [null, undefined]) {
      const { unmount } = mount(async (id) => card({ oracleId: id, wishlist }));
      await openCard();
      expect(screen.queryByTestId("card-wishlist")).toBeNull();
      unmount();
    }
  });

  it("is its own box beside the deck's box, never inside it", async () => {
    mount(async (id) => card({ oracleId: id, wishlist: { want: null } }), true);
    await openCard();
    const box = screen.getByTestId("card-wishlist");
    expect(screen.getByRole("switch")).toBeTruthy();
    expect(box.contains(screen.getByRole("switch"))).toBe(false);
  });

  it("a write evicts the card, so a reopen is read fresh", async () => {
    const fetchCard = vi.fn(async (id: string) => card({ oracleId: id, wishlist: { want: null } }));
    mount(fetchCard);
    await openCard();
    const before = fetchCard.mock.calls.length;
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: c.add })); });
    expect(addToWishlist).toHaveBeenCalled();
    expect(fetchCard.mock.calls.length).toBeGreaterThan(before);
  });
});
