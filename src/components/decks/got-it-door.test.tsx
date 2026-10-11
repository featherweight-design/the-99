// I got it's second way in (plan PR 4, A4 and A11): `Bought this card?` on the receipt of a card a
// Shopping row opened, opening the same confirm, with the card held under it and re-read after a write.
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { BrowseCard } from "../../lib/collection/browse";
import type { DeckDetailCard } from "../../lib/decks/grouping";

vi.mock("../../app/collection/actions", () => ({
  setCardArtPreference: vi.fn(async () => true),
  clearCardArtPreference: vi.fn(async () => {}),
}));

type Opts = { onClose: (wrote: boolean) => void };
const gotItOpen = vi.fn<(card: DeckDetailCard, name: string, asOf: Date | null, trigger: HTMLElement, opts?: Opts) => void>();
let undoing: ReadonlySet<string> = new Set();
vi.mock("./got-it", () => ({
  useGotIt: () => ({ deckId: "d1", openFor: null, pending: false, open: gotItOpen, held: new Map(), undoing, clearHeld: () => {} }),
}));

const { CardDetailProvider, CardDetailTrigger } = await import("../cards/card-detail-provider");
const { GotItDoorRegistration } = await import("./got-it-door");

const asOf = new Date("2026-10-10T00:00:00Z");
const browse = (oracleId: string, name: string, owned = 0): BrowseCard => ({
  oracleId, name, typeLine: "Creature", manaCost: null, cmc: 3, oracleText: null, keywords: [], rarity: "rare",
  colorIdentity: [], imageUri: null, printedName: null, quantity: owned, printings: [], setCodes: [], primarySetCode: "",
  preferredPrinting: null,
});
const row = (oracleId: string, name: string, over: Partial<DeckDetailCard> = {}) => ({
  oracleId, name, typeLine: "Creature", cardTypeGroup: "Creatures", role: "creature", cmc: 3, owned: false, quantity: 1, auto: false,
  printedName: null, printedSetCode: null, printedCollectorNumber: null,
  price: { cents: 250, foilCents: null, etchedCents: null, asOf }, ...over,
}) as DeckDetailCard;

const POLY = row("o-poly", "Polyraptor");
const reads: Record<string, BrowseCard> = { "o-poly": browse("o-poly", "Polyraptor"), "o-sol": browse("o-sol", "Sol Ring") };
const fetchCard = vi.fn(async (id: string) => reads[id] ?? null);

function draw() {
  return render(
    <CardDetailProvider deckPage fetchCard={fetchCard}>
      <GotItDoorRegistration shoppingCards={[POLY]} newestAsOf={asOf} />
      <CardDetailTrigger oracleId="o-poly" name="Polyraptor" door>shop poly</CardDetailTrigger>
      <CardDetailTrigger oracleId="o-poly" name="Polyraptor">all poly</CardDetailTrigger>
      <CardDetailTrigger oracleId="o-sol" name="Sol Ring" door>shop sol</CardDetailTrigger>
    </CardDetailProvider>,
  );
}

async function press(el: HTMLElement) {
  await act(async () => {
    fireEvent.click(el);
  });
}
const links = () => screen.queryAllByTestId("got-it-details-link");

describe("Bought this card? in card details (A11)", () => {
  it("draws on the receipt of an unowned card a Shopping row opened, with `none` under the label", async () => {
    draw();
    await press(screen.getByText("shop poly"));
    expect(links()).toHaveLength(1);
    expect(links()[0]).toHaveTextContent("Bought this card?");
    const receipt = screen.getByTestId("owned-receipt");
    expect(receipt).toHaveTextContent("In your collection");
    expect(receipt).toHaveTextContent("none");
    expect(receipt.contains(links()[0])).toBe(true);
    // Never beside Edit copies: that link is /collection's alone.
    expect(screen.queryByTestId("edit-copies-link")).toBeNull();
  });

  it("is absent from the same card opened from the All tab, and draws no empty receipt there", async () => {
    draw();
    await press(screen.getByText("all poly"));
    expect(await screen.findByRole("dialog")).toBeTruthy();
    expect(links()).toHaveLength(0);
    expect(screen.queryByTestId("owned-receipt")).toBeNull();
  });

  it("is absent from a card the Shopping list does not bill", async () => {
    draw();
    await press(screen.getByText("shop sol"));
    expect(await screen.findByRole("dialog")).toBeTruthy();
    expect(links()).toHaveLength(0);
  });

  it("opens the confirm for the row's card, holds the card under it, and re-reads it after a write", async () => {
    draw();
    await press(screen.getByText("shop poly"));
    const link = links()[0];
    await press(link);
    expect(gotItOpen).toHaveBeenCalledTimes(1);
    const [card, name, at, trigger, opts] = gotItOpen.mock.calls[0];
    expect(card).toBe(POLY);
    expect(name).toBe("Polyraptor");
    expect(at).toBe(asOf);
    expect(trigger).toBe(link);
    // Held under the confirm: the card stays drawn, covered and inert (stacked sheets).
    expect(screen.getByTestId("got-it-details-link").closest("[inert]")).not.toBeNull();
    const before = fetchCard.mock.calls.length;
    reads["o-poly"] = browse("o-poly", "Polyraptor", 1);
    await act(async () => opts!.onClose(true));
    // Back, live, and read again from after the write: none becomes ×1.
    expect(fetchCard.mock.calls.length).toBe(before + 1);
    await waitFor(() => expect(screen.getByTestId("owned-receipt")).toHaveTextContent(/×1$/));
    expect(links()[0].closest("[inert]")).toBeNull();
  });

  it("is not read again when the confirm closes unwritten", async () => {
    reads["o-poly"] = browse("o-poly", "Polyraptor");
    draw();
    await press(screen.getByText("shop poly"));
    gotItOpen.mockClear();
    await press(links()[0]);
    const before = fetchCard.mock.calls.length;
    await act(async () => gotItOpen.mock.calls[0][4]!.onClose(false));
    expect(fetchCard.mock.calls.length).toBe(before);
    expect(links()[0].closest("[inert]")).toBeNull();
  });

  it("is disabled while an undo for the card is in flight (A9)", async () => {
    undoing = new Set(["o-poly"]);
    draw();
    await press(screen.getByText("shop poly"));
    expect(links()[0]).toBeDisabled();
    undoing = new Set();
  });
});
