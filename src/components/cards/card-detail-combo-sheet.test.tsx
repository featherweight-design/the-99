import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { BrowseCard } from "../../lib/collection/browse";
import type { CardCombo } from "../../lib/combos/near-combos";
import { combosCloseCopy } from "../../lib/copy/combos-close";

// Combos one piece away UI-3: a combo line opens its combo in a sheet the PROVIDER owns, over the card
// (OPEN-8), and the deck's commanders ride the read apart from its list (OPEN-2).

vi.mock("../../app/collection/actions", () => ({
  setCardArtPreference: vi.fn(async () => true),
  clearCardArtPreference: vi.fn(async () => {}),
}));
vi.mock("../../app/decks/actions", () => ({ addCardToDeck: vi.fn(async () => ({ ok: true })) }));

const { CardDetailProvider, CardDetailTrigger, warmCardModal } = await import("./card-detail-provider");
await warmCardModal();

const card = (oracleId: string, name: string, extra: Partial<BrowseCard> = {}): BrowseCard => ({
  oracleId, name, typeLine: "Creature", manaCost: "{2}", cmc: 2, oracleText: null, keywords: [], rarity: "rare",
  colorIdentity: [], imageUri: null, printedName: null, quantity: 0, printings: [], setCodes: [], primarySetCode: "",
  preferredPrinting: null, ...extra,
});
const COMBO: CardCombo = {
  variantId: "v-1",
  others: [{
    oracleId: "o-surge", name: "Warstorm Surge", state: "spare", mustBeCommander: false, decks: [],
    where: { kind: "spare" }, imageUri: null, isCommander: false,
  }],
  produces: ["Infinite damage"], steps: null, manaNeeded: null, manaValueNeeded: 0, notablePrerequisites: null, usesCommander: false,
};
const POLY = card("o-poly", "Polyraptor", { cardCombos: { combos: [COMBO], inScope: false } });

async function click(el: HTMLElement) {
  el.focus();
  await act(async () => {
    fireEvent.click(el);
  });
}

function mount(fetchCard = vi.fn(async (id: string) => (id === "o-surge" ? card("o-surge", "Warstorm Surge") : POLY))) {
  render(
    <CardDetailProvider fetchCard={fetchCard} comboDeckOracleIds={["o-x", "o-cmdr"]} comboCommanderOracleIds={["o-cmdr"]}>
      <CardDetailTrigger oracleId="o-poly" name="Polyraptor">Polyraptor</CardDetailTrigger>
    </CardDetailProvider>,
  );
  return fetchCard;
}

describe("a combo line opened from card details", () => {
  it("reads the card with the deck's commanders apart", async () => {
    const fetchCard = mount();
    await click(screen.getByText("Polyraptor"));
    expect(fetchCard).toHaveBeenCalledWith("o-poly", ["o-x", "o-cmdr"], ["o-cmdr"]);
  });

  it("opens the combo over the card, and its way back returns to the card with its block still open", async () => {
    mount();
    await click(screen.getByText("Polyraptor"));
    await act(async () => { screen.getByRole("button", { name: /Two-card combos/ }).click(); });
    await click(screen.getByRole("button", { name: combosCloseCopy.card.openAria("Polyraptor", "Warstorm Surge") }));
    await waitFor(() => expect(document.querySelector("[data-card-combo=v-1]")).not.toBeNull());
    // The card is lifted under the sheet, kept mounted (covered), its block still drawn.
    expect(document.querySelectorAll("[data-combo-line=v-1]").length).toBeGreaterThan(0);
    await click(screen.getByRole("button", { name: combosCloseCopy.card.backAria("Polyraptor") }));
    expect(document.querySelector("[data-card-combo=v-1]")).toBeNull();
    expect(document.getElementById("card-modal-title")).toHaveTextContent("Polyraptor");
    expect(screen.getByRole("button", { name: /Two-card combos/ }).getAttribute("aria-expanded")).toBe("true");
  });

  it("a partner opened from its plate is the deepest layer: its own combo lines open nothing (OPEN-9)", async () => {
    const back: CardCombo = { ...COMBO, variantId: "v-back", others: [{ ...COMBO.others[0], oracleId: "o-poly", name: "Polyraptor" }] };
    mount(vi.fn(async (id: string) => (id === "o-surge" ? card("o-surge", "Warstorm Surge", { cardCombos: { combos: [back], inScope: false } }) : POLY)));
    await click(screen.getByText("Polyraptor"));
    await act(async () => { screen.getByRole("button", { name: /Two-card combos/ }).click(); });
    await click(screen.getByRole("button", { name: combosCloseCopy.card.openAria("Polyraptor", "Warstorm Surge") }));
    await waitFor(() => expect(document.querySelector("[data-card-combo=v-1]")).not.toBeNull());
    const plates = document.querySelectorAll<HTMLElement>("[data-card-combo=v-1] [data-testid=receipt-tile]");
    await click(plates[1]);
    await waitFor(() => expect(document.querySelector("[data-combo-line=v-back]")).toBeNull());
    await waitFor(() => expect(screen.getAllByRole("button", { name: /Two-card combos/ }).length).toBeGreaterThan(1));
    const headers = screen.getAllByRole("button", { name: /Two-card combos/ });
    await act(async () => { headers[headers.length - 1].click(); });
    expect(document.querySelector("[data-combo-line=v-back]")).not.toBeNull();
    expect(document.querySelector("[data-combo-line=v-back] [data-combo-press]")).toBeNull();
  });
});
