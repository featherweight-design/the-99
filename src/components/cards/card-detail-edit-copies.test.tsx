import * as React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BrowseCard } from "../../lib/collection/browse";
import { collectionEditCopy } from "../../lib/copy/collection-edit";

vi.mock("../../app/collection/actions", () => ({
  setCardArtPreference: vi.fn(async () => true),
  clearCardArtPreference: vi.fn(async () => {}),
}));

// The host is its own module with its own tests; here it only has to be mounted with the right
// card and to hand control back.
const hostProps = vi.fn();
vi.mock("../collection/edit-copies-host", () => ({
  EditCopiesHost: (p: { card: { oracleId: string; name: string }; onReopen: () => void; onDone: () => void }) => {
    hostProps(p);
    return (
      <div data-testid="host">
        <button onClick={p.onReopen}>reopen</button>
        <button onClick={p.onDone}>done</button>
      </div>
    );
  },
}));

const { CardDetailProvider, CardDetailTrigger } = await import("./card-detail-provider");
const { CollectionEditScope } = await import("./collection-edit-scope");
// The modal is loaded on demand; loaded here, after the mocks, a press draws it in the same tick.
await (await import("./card-detail-provider")).warmCardModal();

const copy = collectionEditCopy.copies;
const sol = (over: Partial<BrowseCard> = {}): BrowseCard => ({
  oracleId: "o-sol", name: "Sol Ring", typeLine: "Artifact", manaCost: "{1}", cmc: 1, oracleText: null, keywords: [],
  rarity: "uncommon", colorIdentity: [], imageUri: null, printedName: null, quantity: 5, printings: [], setCodes: [],
  primarySetCode: "", preferredPrinting: null, ...over,
});
const free = { owned: 5, hard: 0, soft: 0, free: 5, claims: [] } as unknown as BrowseCard["availability"];

function mount(card: BrowseCard, props: { collectionEdit?: boolean; deckId?: string | null } = {}, { inShell = false } = {}) {
  const fetchCard = vi.fn(async () => card);
  const provider = (
    <CardDetailProvider fetchCard={fetchCard} {...props}>
      <CardDetailTrigger oracleId={card.oracleId} name={card.name}>open</CardDetailTrigger>
    </CardDetailProvider>
  );
  render(inShell ? <CollectionEditScope>{provider}</CollectionEditScope> : provider);
  return fetchCard;
}
async function openCard() {
  await act(async () => fireEvent.click(screen.getByRole("button", { name: /View details for Sol Ring/ })));
  await screen.findByRole("dialog");
}

afterEach(() => {
  cleanup();
  hostProps.mockClear();
});

describe("the receipt's Edit copies link", () => {
  it("draws on a free card with no claims when /collection asks for it, so the link has a label line to live on", async () => {
    mount(sol({ availability: free }), { collectionEdit: true });
    await openCard();
    expect(screen.getByTestId("edit-copies-link").textContent).toBe(copy.edit);
    expect(screen.getByText("In your collection")).toBeTruthy();
  });

  it("says Add to collection for a card the reader does not own", async () => {
    mount(sol({ quantity: 0, availability: { owned: 0, hard: 0, soft: 0, free: 0, claims: [] } as unknown as BrowseCard["availability"] }), { collectionEdit: true });
    await openCard();
    expect(screen.getByTestId("edit-copies-link").textContent).toBe(copy.addToCollection);
  });

  it("is absent outside the shell (a signed-out page), and a free card keeps NO receipt there", async () => {
    mount(sol({ availability: free }));
    await openCard();
    expect(screen.queryByTestId("edit-copies-link")).toBeNull();
    expect(screen.queryByText("In your collection")).toBeNull();
  });

  it("is absent from a deck page's provider outside the shell", async () => {
    // Outside the shell nothing turns it on: the scope, or the prop, is the only gate.
    mount(sol({ availability: free }), { deckId: "deck-1" });
    await openCard();
    expect(screen.queryByTestId("edit-copies-link")).toBeNull();
  });
});

// Add a card from anywhere, D (READINESS O3): every provider inside the shell draws the link by default.
describe("the link inside the shell", () => {
  const none = { owned: 0, hard: 0, soft: 0, free: 0, claims: [] } as unknown as BrowseCard["availability"];

  it("draws Add to collection on a deck page's card the reader owns none of, with no prop passed", async () => {
    mount(sol({ quantity: 0, availability: none }), { deckId: "deck-1" }, { inShell: true });
    await openCard();
    expect(screen.getByTestId("edit-copies-link").textContent).toBe(copy.addToCollection);
    // The receipt draws with nothing to report, so the link has its label line (D2).
    expect(screen.getByTestId("owned-receipt").textContent).toContain("In your collection");
  });

  it("draws Edit copies on any other surface's card the reader owns", async () => {
    mount(sol({ availability: free }), {}, { inShell: true });
    await openCard();
    expect(screen.getByTestId("edit-copies-link").textContent).toBe(copy.edit);
  });

  it("is off where a provider inside the shell says so", async () => {
    mount(sol({ availability: free }), { collectionEdit: false }, { inShell: true });
    await openCard();
    expect(screen.queryByTestId("edit-copies-link")).toBeNull();
  });

  it("opens the Edit copies host from a deck page, as it does on /collection", async () => {
    mount(sol({ quantity: 0, availability: none }), { deckId: "deck-1" }, { inShell: true });
    await openCard();
    await act(async () => fireEvent.click(screen.getByTestId("edit-copies-link")));
    await screen.findByTestId("host");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(hostProps.mock.calls.at(-1)?.[0].card).toMatchObject({ oracleId: "o-sol", name: "Sol Ring" });
  });
});

describe("pressing it", () => {
  it("closes the modal, opens the host for that card, and reopens the card re-read when the host hands it back", async () => {
    const fetchCard = mount(sol({ availability: free }), { collectionEdit: true });
    await openCard();
    await act(async () => fireEvent.click(screen.getByTestId("edit-copies-link")));
    await screen.findByTestId("host");
    expect(screen.queryByRole("dialog")).toBeNull(); // never a modal plus a sheet
    expect(hostProps.mock.calls.at(-1)?.[0].card).toMatchObject({ oracleId: "o-sol", name: "Sol Ring" });
    const reads = fetchCard.mock.calls.length;
    await act(async () => fireEvent.click(screen.getByText("reopen")));
    await screen.findByRole("dialog");
    // Re-read: the card was dropped from the cache, so opening it asked the server again.
    await waitFor(() => expect(fetchCard.mock.calls.length).toBeGreaterThan(reads));
    await act(async () => fireEvent.click(screen.getByText("done")));
    expect(screen.queryByTestId("host")).toBeNull();
  });
});

describe("pressing it again while the first host is still up (its toast)", () => {
  it("mounts a fresh host, so the second sheet opens", async () => {
    mount(sol({ availability: free }), { collectionEdit: true });
    await openCard();
    await act(async () => fireEvent.click(screen.getByTestId("edit-copies-link")));
    await screen.findByTestId("host");
    const first = hostProps.mock.calls.length;
    await act(async () => fireEvent.click(screen.getByText("reopen")));
    await screen.findByRole("dialog");
    await act(async () => fireEvent.click(screen.getByTestId("edit-copies-link")));
    await screen.findByTestId("host");
    expect(hostProps.mock.calls.length).toBeGreaterThan(first);
  });
});
