// The PROVIDER's own wiring. The surface tests pass `deckId`/`deckHolds`
// straight to `CardModal`, so they would all stay green while the provider
// handed the modal nothing — which is the production path, and the one that
// decides whether the deck sheet has a control at all.
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import type { BrowseCard } from "../../lib/collection/browse";
import { proxyCopy } from "../../lib/copy/proxies";

vi.mock("../../app/collection/actions", () => ({
  setCardArtPreference: vi.fn(async () => true),
  clearCardArtPreference: vi.fn(async () => {}),
}));
const setCardProxied = vi.fn(async () => ({ ok: true as const }));
vi.mock("../../app/decks/actions", () => ({
  setCardProxied: (...a: unknown[]) => setCardProxied(...(a as [])),
}));

const { CardDetailProvider, useCardDetail } = await import("./card-detail-provider");

const card = (over: Partial<BrowseCard> = {}) => ({
  oracleId: "held", name: "The Ozolith", typeLine: "Legendary Artifact",
  manaCost: "{1}", cmc: 1, oracleText: null, keywords: [],
  rarity: "rare" as const, colorIdentity: [], imageUri: null,
  printings: [], owned: [], ...over,
}) as unknown as BrowseCard;

function Open({ id }: { id: string }) {
  const { open } = useCardDetail();
  return <button type="button" onClick={() => open(id)}>open {id}</button>;
}

const mount = (fetchCard: (id: string) => Promise<BrowseCard | null>) =>
  render(
    <CardDetailProvider
      fetchCard={fetchCard}
      deckId="d1"
      deckName="HD Gods"
      deckOracleIds={new Set(["held"])}
    >
      <Open id="held" />
      <Open id="loose" />
    </CardDetailProvider>,
  );

const openCard = async (label: string) => {
  await act(async () => { fireEvent.click(screen.getByText(label)); });
};

describe("the provider scopes the proxy control", () => {
  it("gives the control to a card the deck holds", async () => {
    mount(async (id) => card({ oracleId: id }));
    await openCard("open held");
    expect(screen.getByRole("switch")).toBeTruthy();
    expect(screen.getByText(proxyCopy.control.label("HD Gods"))).toBeTruthy();
  });

  it("withholds it from a card the deck does not hold", async () => {
    // Consider and search open cards through this same provider. The server
    // refuses those on its membership test, so a control there could only fail.
    mount(async (id) => card({ oracleId: id, name: "Loose Card" }));
    await openCard("open loose");
    expect(screen.queryByRole("switch")).toBeNull();
  });

  it("evicts the card after a write, so the receipt stops being stale", async () => {
    const fetchCard = vi.fn(async (id: string) => card({ oracleId: id }));
    mount(fetchCard);
    await openCard("open held");
    const beforeWrite = fetchCard.mock.calls.length;

    await act(async () => { fireEvent.click(screen.getByRole("switch")); });
    // The eviction re-reads the OPEN card, so the receipt beside the control
    // stops describing the state before the tap without the reader doing
    // anything. Asserted as "went back to the server", not as an exact count:
    // the open card's own refresh is the behaviour, and pinning the number
    // would break on a second, equally correct read.
    expect(fetchCard.mock.calls.length).toBeGreaterThan(beforeWrite);
  });
});
