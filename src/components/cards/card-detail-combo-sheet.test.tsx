import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useEffect } from "react";
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
const addCardToDeck = vi.fn(async (..._args: unknown[]) => ({ ok: true }) as { ok: boolean });
vi.mock("../../app/decks/actions", () => ({ addCardToDeck: (...a: unknown[]) => addCardToDeck(...a) }));

const { CardDetailProvider, CardDetailTrigger, useCardDetail, warmCardModal } = await import("./card-detail-provider");
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

  it("a card opened over a sheet draws its combo lines with no press (OPEN-9, the live card's rule)", async () => {
    function Sheet() {
      const { registerSheet } = useCardDetail();
      useEffect(() => registerSheet("Cheaper stand-ins"), [registerSheet]);
      return null;
    }
    render(
      <CardDetailProvider fetchCard={vi.fn(async () => POLY)} comboDeckOracleIds={["o-x", "o-cmdr"]} comboCommanderOracleIds={["o-cmdr"]}>
        <Sheet />
        <CardDetailTrigger oracleId="o-poly" name="Polyraptor">Polyraptor</CardDetailTrigger>
      </CardDetailProvider>,
    );
    await click(screen.getByText("Polyraptor"));
    await act(async () => { screen.getByRole("button", { name: /Two-card combos/ }).click(); });
    expect(document.querySelector("[data-combo-line=v-1]")).not.toBeNull();
    expect(document.querySelector("[data-combo-line=v-1] [data-combo-press]")).toBeNull();
    expect(screen.queryByRole("button", { name: combosCloseCopy.card.openAria("Polyraptor", "Warstorm Surge") })).toBeNull();
  });

  describe("Add from the combo (round 1)", () => {
    const IN_DECK = card("o-poly", "Polyraptor", { cardCombos: { combos: [COMBO], inScope: true } });
    const mountDeck = (fetchCard = vi.fn(async (id: string) => (id === "o-surge" ? card("o-surge", "Warstorm Surge") : IN_DECK))) => {
      render(
        <CardDetailProvider fetchCard={fetchCard} deckPage deckId="deck-1" deckName="HD - Gishath" comboDeckOracleIds={["o-poly", "o-cmdr"]} comboCommanderOracleIds={["o-cmdr"]}>
          <CardDetailTrigger oracleId="o-poly" name="Polyraptor">Polyraptor</CardDetailTrigger>
        </CardDetailProvider>,
      );
      return fetchCard;
    };
    const openCombo = async () => {
      await click(screen.getByText("Polyraptor"));
      await act(async () => { screen.getByRole("button", { name: /Two-card combos/ }).click(); });
      await click(screen.getByRole("button", { name: combosCloseCopy.card.openAria("Polyraptor", "Warstorm Surge") }));
      await waitFor(() => expect(document.querySelector("[data-card-combo=v-1]")).not.toBeNull());
    };

    it("re-reads the card even when the sheet was dismissed while the Add was pending", async () => {
      let resolve!: (v: { ok: boolean }) => void;
      addCardToDeck.mockImplementationOnce(() => new Promise((r) => { resolve = r; }));
      const fetchCard = mountDeck();
      await openCombo();
      await act(async () => { screen.getByRole("button", { name: combosCloseCopy.detail.add("Warstorm Surge") }).click(); });
      await click(screen.getByRole("button", { name: combosCloseCopy.card.backAria("Polyraptor") }));
      expect(document.querySelector("[data-card-combo=v-1]")).toBeNull();
      const reads = fetchCard.mock.calls.filter(([id]) => id === "o-poly").length;
      await act(async () => { resolve({ ok: true }); });
      await waitFor(() => expect(fetchCard.mock.calls.filter(([id]) => id === "o-poly").length).toBe(reads + 1));
    });

    it("a partner opened over the sheet stays when the Add settles under it", async () => {
      let resolve!: (v: { ok: boolean }) => void;
      addCardToDeck.mockImplementationOnce(() => new Promise((r) => { resolve = r; }));
      mountDeck();
      await openCombo();
      await act(async () => { screen.getByRole("button", { name: combosCloseCopy.detail.add("Warstorm Surge") }).click(); });
      const plates = document.querySelectorAll<HTMLElement>("[data-card-combo=v-1] [data-testid=receipt-tile]");
      await click(plates[1]);
      await waitFor(() => expect(screen.getAllByText("Warstorm Surge").length).toBeGreaterThan(0));
      await act(async () => { resolve({ ok: true }); });
      expect(document.querySelector("[data-card-combo=v-1]")).not.toBeNull();
    });

    it("the way back puts focus on the line that opened the combo", async () => {
      mountDeck();
      await openCombo();
      await click(screen.getByRole("button", { name: combosCloseCopy.card.backAria("Polyraptor") }));
      await waitFor(() =>
        expect(document.activeElement).toBe(screen.getByRole("button", { name: combosCloseCopy.card.openAria("Polyraptor", "Warstorm Surge") })),
      );
    });

    it("after an Add, focus lands on the line once the re-read has moved it to Whole in this deck (round 2)", async () => {
      const WHOLE = card("o-poly", "Polyraptor", {
        cardCombos: { combos: [{ ...COMBO, others: [{ ...COMBO.others[0], state: "inDeck", where: { kind: "inDeck" } }] }], inScope: true },
      });
      let added = false;
      let release!: () => void;
      const fetchCard = vi.fn(async (id: string) => {
        if (id === "o-surge") return card("o-surge", "Warstorm Surge");
        if (!added) return IN_DECK;
        await new Promise<void>((r) => { release = r; });
        return WHOLE;
      });
      mountDeck(fetchCard);
      await openCombo();
      addCardToDeck.mockImplementationOnce(async () => { added = true; return { ok: true }; });
      await act(async () => { screen.getByRole("button", { name: combosCloseCopy.detail.add("Warstorm Surge") }).click(); });
      await waitFor(() => expect(document.querySelector("[data-card-combo=v-1]")).toBeNull());
      await waitFor(() => expect(release).toBeTypeOf("function"));
      await act(async () => { release(); });
      await waitFor(() => {
        // The line now sits under `Whole in this deck` (the re-read's answer), and its press holds focus.
        const whole = document.querySelector(`[data-combo-group="${combosCloseCopy.card.groups.whole}"]`);
        expect(whole).not.toBeNull();
        expect(document.querySelector(`[data-combo-group="${combosCloseCopy.card.groups.oneAway}"]`)).toBeNull();
        expect(document.activeElement).toBe(screen.getByRole("button", { name: combosCloseCopy.card.openAria("Polyraptor", "Warstorm Surge") }));
      });
    });
  });
});
