// The PROVIDER's own wiring. The surface tests pass `deckId`/`deckHolds`
// straight to `CardModal`, so they would all stay green while the provider
// handed the modal nothing — which is the production path, and the one that
// decides whether the deck sheet has a control at all.
import { describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { BrowseCard } from "../../lib/collection/browse";
import { proxyCopy } from "../../lib/copy/proxies";
import { DeckTokensProvider } from "../decks/deck-tokens-context";
import { reveal } from "../../lib/ui/reveal";
import type { DeckToken, DeckTokensRead } from "../../lib/tokens/read";

// The jump is `reveal`'s; its eased scroll is `reveal`'s own test.
vi.mock("../../lib/ui/reveal", () => ({ reveal: vi.fn() }));
vi.mock("../../app/collection/actions", () => ({
  setCardArtPreference: vi.fn(async () => true),
  clearCardArtPreference: vi.fn(async () => {}),
}));
const setCardProxied = vi.fn(async () => ({ ok: true as const }));
vi.mock("../../app/decks/actions", () => ({
  setCardProxied: (...a: unknown[]) => setCardProxied(...(a as [])),
}));

const { CardDetailProvider, useCardDetail } = await import("./card-detail-provider");
// The modal is loaded on demand; loaded here, after the mocks, a press draws it in the same tick.
await (await import("./card-detail-provider")).warmCardModal();

const card = (over: Partial<BrowseCard> = {}) => ({
  oracleId: "held", name: "The Ozolith", typeLine: "Legendary Artifact",
  manaCost: "{1}", cmc: 1, oracleText: null, keywords: [],
  rarity: "rare" as const, colorIdentity: [], imageUri: null,
  printings: [], owned: [],
  // A READ state, not an absent one: undefined means the proxy query failed,
  // which correctly disables the control — and would make these tests measure
  // the failure path while claiming to measure scoping.
  proxiedBy: [], ...over,
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

describe("the tokens line in the deck box", () => {
  const food = (over: Partial<DeckToken> = {}): DeckToken => ({
    oracleId: "t1", name: "Food", typeLine: "Token Artifact — Food", colors: [], power: null, toughness: null,
    oracleText: null, makers: [{ oracleId: "held", name: "The Ozolith", imageUri: null }], state: "not", source: null,
    joined: false, picture: null, printingPick: null, price: null, ...over,
  });
  const readOf = (tokens: DeckToken[]): DeckTokensRead =>
    ({ status: "ok", read: true, tokens, makerCount: 1, newestPriceAsOf: null });
  // The line is a sentence with the names in their own weight, so it is matched by the span's whole text.
  const lineIs = (text: string) => screen.getByText((_, el) => el?.tagName === "SPAN" && el.textContent === text);
  const mountWithTokens = (read: DeckTokensRead | null) => {
    const fetchCard = async (id: string) => card({ oracleId: id });
    const tree = (
      <CardDetailProvider fetchCard={fetchCard} deckId="d1" deckName="HD Gods" deckOracleIds={new Set(["held"])}>
        <Open id="held" />
        <Open id="loose" />
      </CardDetailProvider>
    );
    return render(read ? <DeckTokensProvider deckId="d1" read={read}>{tree}</DeckTokensProvider> : tree);
  };

  it("draws one line, with In Shopping and the link, for a card that makes a joined token", async () => {
    mountWithTokens(readOf([food({ joined: true })]));
    await openCard("open held");
    expect(lineIs("Makes a Food token · In Shopping")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Show this deck’s tokens" }).textContent).toBe("Tokens ›");
  });

  it("says nothing of Shopping when the token is not joined, and names a held one as in the collection", async () => {
    mountWithTokens(readOf([food()]));
    await openCard("open held");
    expect(lineIs("Makes a Food token")).toBeTruthy();
    cleanup();
    mountWithTokens(readOf([food({ state: "owned", source: "upload" })]));
    await openCard("open held");
    expect(lineIs("Makes a Food token · in your collection")).toBeTruthy();
    cleanup();
    mountWithTokens(readOf([food({ name: "Ally", state: "owned", source: "upload" })]));
    await openCard("open held");
    expect(lineIs("Makes an Ally token · in your collection")).toBeTruthy();
  });

  it("draws nothing outside the switch (no provider), for a card that makes no token, or when the read failed", async () => {
    mountWithTokens(null);
    await openCard("open held");
    expect(screen.queryByText(/Makes a/)).toBeNull();
    cleanup();
    mountWithTokens(readOf([food({ makers: [{ oracleId: "other", name: "Other", imageUri: null }] })]));
    await openCard("open held");
    expect(screen.queryByText(/Makes a/)).toBeNull();
    cleanup();
    mountWithTokens({ status: "failed" });
    await openCard("open held");
    expect(screen.queryByText(/Makes a/)).toBeNull();
  });

  it("is absent from a card the deck does not hold, which has no In this deck box at all", async () => {
    mountWithTokens(readOf([food({ makers: [{ oracleId: "loose", name: "Loose", imageUri: null }] })]));
    await openCard("open loose");
    expect(screen.queryByText(/Makes a/)).toBeNull();
  });

  it("bolds each name whole when one token's name begins another's", async () => {
    mountWithTokens(readOf([food({ oracleId: "z1", name: "Zombie" }), food({ oracleId: "z2", name: "Zombie Army" })]));
    await openCard("open held");
    const bold = [...document.querySelectorAll("b")].map((b) => b.textContent);
    expect(bold).toEqual(["Zombie", "Zombie Army"]);
  });

  it("asks the deck for its All view and focuses the group when the link is pressed", async () => {
    const heading = document.createElement("h3");
    heading.id = "deck-tokens-heading"; heading.tabIndex = -1;
    vi.mocked(reveal).mockClear();
    document.body.append(heading);
    const asked = vi.fn();
    window.addEventListener("the99:show-deck-tokens", asked);
    mountWithTokens(readOf([food()]));
    await openCard("open held");
    vi.useFakeTimers({ toFake: ["requestAnimationFrame"] });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Show this deck’s tokens" })); });
    await act(async () => { vi.advanceTimersByTime(100); });
    vi.useRealTimers();
    window.removeEventListener("the99:show-deck-tokens", asked);
    expect(asked).toHaveBeenCalledTimes(1);
    expect(reveal).toHaveBeenCalledWith(heading, "start");
    expect(document.activeElement).toBe(heading);
    heading.remove();
  });

  it("closes the sheet when the link is pressed", async () => {
    mountWithTokens(readOf([food()]));
    await openCard("open held");
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Show this deck’s tokens" })); });
    expect(screen.queryByRole("switch")).toBeNull();
  });
});
