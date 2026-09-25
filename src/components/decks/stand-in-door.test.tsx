import { act, fireEvent, render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";

import type { BrowseCard } from "../../lib/collection/browse";
import { swapToolsCopy } from "../../lib/copy/swap-tools";
import type { DeckDetailCard } from "../../lib/decks/grouping";
import type { SwapReceipt } from "../../lib/swaps/context";

vi.mock("../../app/collection/actions", () => ({
  setCardArtPreference: vi.fn(async () => true),
  clearCardArtPreference: vi.fn(async () => {}),
}));

const { CardDetailProvider, CardDetailTrigger, useCardDetail } = await import("../cards/card-detail-provider");
const { SwapToolsProvider, useSwapTools } = await import("../../lib/swaps/context");
const { StandInDoorRegistration } = await import("./stand-in-door");

const asOf = new Date("2026-09-20T00:00:00Z");
const browse = (oracleId: string, name: string): BrowseCard => ({
  oracleId, name, typeLine: "Land", manaCost: null, cmc: 0, oracleText: null, keywords: [], rarity: "rare",
  colorIdentity: [], imageUri: null, printedName: null, quantity: 0, printings: [], setCodes: [], primarySetCode: "",
  preferredPrinting: null,
});
const row = (oracleId: string, name: string, cents: number) => ({
  oracleId, name, typeLine: "Land", cardTypeGroup: "Lands", role: "land", cmc: 0, owned: false, quantity: 1, auto: false,
  printedName: null, printedSetCode: null, printedCollectorNumber: null,
  price: { cents, foilCents: null, etchedCents: null, asOf },
}) as DeckDetailCard;

const PLATEAU = row("o-plateau", "Plateau", 28_863);
const TOWER = row("o-tower", "Command Tower", 50);
const cards: Record<string, BrowseCard> = { "o-plateau": browse("o-plateau", "Plateau"), "o-tower": browse("o-tower", "Command Tower") };
const fetchCard = async (id: string) => cards[id] ?? null;
const copy = swapToolsCopy.modal;

/** Declares a sheet opened over the open card, as the stand-ins sheet does from the door. */
function OverCard() {
  const { registerSheet } = useCardDetail();
  useEffect(() => registerSheet("Cheaper stand-ins", undefined, true), [registerSheet]);
  return null;
}
function Seed({ receipt }: { receipt?: SwapReceipt }) {
  const add = useSwapTools()!.addReceipt;
  useEffect(() => {
    if (receipt) add(receipt);
  }, [add, receipt]);
  return null;
}

function draw({ sheet = false, receipt }: { sheet?: boolean; receipt?: SwapReceipt } = {}) {
  return (
    <SwapToolsProvider deckId="d1" deckName="Deck" storedLimitCents={null}>
      <CardDetailProvider fetchCard={fetchCard}>
        <StandInDoorRegistration shoppingCards={[PLATEAU, TOWER]} newestAsOf={asOf} />
        <Seed receipt={receipt} />
        <CardDetailTrigger oracleId="o-plateau" name="Plateau" door>shop plateau</CardDetailTrigger>
        <CardDetailTrigger oracleId="o-tower" name="Command Tower" door>shop tower</CardDetailTrigger>
        <CardDetailTrigger oracleId="o-plateau" name="Plateau">all plateau</CardDetailTrigger>
        {sheet ? <OverCard /> : null}
      </CardDetailProvider>
    </SwapToolsProvider>
  );
}

async function press(text: string) {
  await act(async () => {
    fireEvent.click(screen.getByText(text));
  });
}
const doors = () => screen.queryAllByTestId("stand-in-door");

describe("the card modal's door (swap tools PR 4c)", () => {
  it("draws only on a card a Shopping row opened (F17), over or under the limit, with the link", async () => {
    render(draw());
    await press("all plateau");
    expect(doors()).toHaveLength(0);

    await press("shop plateau");
    // Two layouts are mounted and CSS shows one: the art column's and the phone's strip.
    expect(doors()).toHaveLength(2);
    expect(doors()[0]).toHaveTextContent(copy.overLimit("$10"));
    expect(screen.getAllByRole("button", { name: /See cheaper stand-ins/ })).toHaveLength(2);

    await press("shop tower");
    expect(doors()[0]).toHaveTextContent(copy.underLimit("$10"));
  });

  // A card with no figure makes no claim about the limit: "under" is only ever said of a price.
  it("says nothing about the limit for a card with no price, and still offers the stand-ins", async () => {
    const UNPRICED = { ...row("o-unpriced", "Unpriced Land", 0), price: null } as DeckDetailCard;
    cards["o-unpriced"] = browse("o-unpriced", "Unpriced Land");
    render(
      <SwapToolsProvider deckId="d1" deckName="Deck" storedLimitCents={null}>
        <CardDetailProvider fetchCard={fetchCard}>
          <StandInDoorRegistration shoppingCards={[UNPRICED]} newestAsOf={asOf} />
          <CardDetailTrigger oracleId="o-unpriced" name="Unpriced Land" door>shop unpriced</CardDetailTrigger>
        </CardDetailProvider>
      </SwapToolsProvider>,
    );
    await press("shop unpriced");
    expect(doors()).toHaveLength(2);
    for (const d of doors()) {
      expect(d).not.toHaveTextContent(copy.underLimit("$10"));
      expect(d).not.toHaveTextContent(copy.overLimit("$10"));
    }
    expect(screen.getAllByRole("button", { name: /See cheaper stand-ins/ })).toHaveLength(2);
  });

  it("says what came in after a take, and is no longer a control", async () => {
    const receipt: SwapReceipt = {
      swapId: "s1", deckId: "d1", cutOracleId: "o-plateau", cut: "Plateau", add: "Rugged Prairie",
      cutCard: PLATEAU, free: false, cutLeft: 0,
    };
    render(draw({ receipt }));
    await press("shop plateau");
    expect(doors()[0]).toHaveTextContent(copy.swapped("Rugged Prairie"));
    expect(screen.queryByRole("button", { name: /See cheaper stand-ins/ })).toBeNull();
  });

  // A combo partner arrives from the combo block, not from a Shopping row, so it never draws the
  // door, even when it is ALSO on the Shopping list. Paging keeps the door; this does not.
  it("draws no door on a combo partner reached from a Shopping card, even one Shopping holds", async () => {
    const withPartner = { ...cards["o-plateau"], comboPartners: [{ oracleId: "o-tower", name: "Command Tower", state: "notOwned" as const, popularity: null }] };
    render(
      <SwapToolsProvider deckId="d1" deckName="Deck" storedLimitCents={null}>
        <CardDetailProvider fetchCard={async (id) => (id === "o-plateau" ? withPartner : cards[id] ?? null)}>
          <StandInDoorRegistration shoppingCards={[PLATEAU, TOWER]} newestAsOf={asOf} />
          <CardDetailTrigger oracleId="o-plateau" name="Plateau" door>shop plateau</CardDetailTrigger>
        </CardDetailProvider>
      </SwapToolsProvider>,
    );
    await press("shop plateau");
    expect(doors()).toHaveLength(2);
    await act(async () => {
      screen.getByRole("button", { name: /Two-card combos/ }).click();
    });
    await act(async () => {
      screen.getByRole("button", { name: "Command Tower" }).click();
    });
    expect(screen.getByRole("dialog", { name: /Command Tower/ })).toBeInTheDocument();
    expect(doors()).toHaveLength(0);
  });

  // The door belongs to the card the open asked for, so it moves only when that card ARRIVES: an
  // open whose read fails leaves the Shopping card on screen, door and all.
  it("keeps the door on the card on screen when a plain open's read fails", async () => {
    render(
      <SwapToolsProvider deckId="d1" deckName="Deck" storedLimitCents={null}>
        <CardDetailProvider fetchCard={async (id) => { if (id === "o-fail") throw new Error("down"); return cards[id] ?? null; }}>
          <StandInDoorRegistration shoppingCards={[PLATEAU]} newestAsOf={asOf} />
          <CardDetailTrigger oracleId="o-plateau" name="Plateau" door>shop plateau</CardDetailTrigger>
          <CardDetailTrigger oracleId="o-fail" name="Broken">all broken</CardDetailTrigger>
        </CardDetailProvider>
      </SwapToolsProvider>,
    );
    await press("shop plateau");
    expect(doors()).toHaveLength(2);
    await press("all broken");
    expect(screen.getByRole("dialog", { name: /Plateau/ })).toBeInTheDocument();
    expect(doors()).toHaveLength(2);
  });

  it("draws no door on a card the Shopping list does not hold, flag or no flag", async () => {
    cards["o-other"] = browse("o-other", "Other Card");
    render(
      <SwapToolsProvider deckId="d1" deckName="Deck" storedLimitCents={null}>
        <CardDetailProvider fetchCard={fetchCard}>
          <StandInDoorRegistration shoppingCards={[PLATEAU]} newestAsOf={asOf} />
          <CardDetailTrigger oracleId="o-other" name="Other Card" door>shop other</CardDetailTrigger>
        </CardDetailProvider>
      </SwapToolsProvider>,
    );
    await press("shop other");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(doors()).toHaveLength(0);
    // No empty wrapper either: the door's room is not taken from the art.
    expect(document.querySelector(".md\\:hidden.flex-none:empty")).toBeNull();
  });
});

// Locked (PR 6's modal half): a card locked in this deck draws no door, since offering stand-ins
// is offering to cut it. `locked` rides the list the page draws, the shell's optimistic overrides
// included, so a lock pressed a moment ago hides the door before the server has settled.
describe("the door on a locked card", () => {
  function drawRows(rows: DeckDetailCard[]) {
    return (
      <SwapToolsProvider deckId="d1" deckName="Deck" storedLimitCents={null}>
        <CardDetailProvider fetchCard={fetchCard}>
          <StandInDoorRegistration shoppingCards={rows} newestAsOf={asOf} />
          <CardDetailTrigger oracleId="o-plateau" name="Plateau" door>shop plateau</CardDetailTrigger>
        </CardDetailProvider>
      </SwapToolsProvider>
    );
  }

  it("draws on an unlocked Shopping row and not on a locked one", async () => {
    const view = render(drawRows([PLATEAU]));
    await press("shop plateau");
    expect(doors()).toHaveLength(2);
    view.unmount();

    render(drawRows([{ ...PLATEAU, locked: true }]));
    await press("shop plateau");
    expect(screen.getByRole("dialog", { name: /Plateau/ })).toBeInTheDocument();
    expect(doors()).toHaveLength(0);
  });

  // A lock that lands, settles or reverts WHILE the card is open moves its door: the provider calls
  // the renderer during its own render, so the rows it reads must be fresh by then.
  it("hides and restores the door on a card already open as the lock changes", async () => {
    const view = render(drawRows([PLATEAU]));
    await press("shop plateau");
    expect(doors()).toHaveLength(2);
    await act(async () => view.rerender(drawRows([{ ...PLATEAU, locked: true }])));
    expect(doors()).toHaveLength(0);
    await act(async () => view.rerender(drawRows([{ ...PLATEAU, locked: false }])));
    expect(doors()).toHaveLength(2);
  });

  // The list the page draws changes under the registration (the optimistic lock), not a remount.
  it("hides the door once the drawn list says the card is locked, before any server reply", async () => {
    const view = render(drawRows([PLATEAU]));
    view.rerender(drawRows([{ ...PLATEAU, locked: true }]));
    await press("shop plateau");
    expect(doors()).toHaveLength(0);
  });
});

describe("focus after a take", () => {
  const receipt: SwapReceipt = {
    swapId: "s1", deckId: "d1", cutOracleId: "o-plateau", cut: "Plateau", add: "Rugged Prairie",
    cutCard: PLATEAU, free: false, cutLeft: 0,
  };
  const frame = () => act(async () => { await new Promise((r) => requestAnimationFrame(() => r(null))); });

  it("lands on the receipt's Undo swap when the swapped-out card closes, and not when it only pages", async () => {
    render(
      <>
        {draw({ receipt })}
        <div data-swap-id="s1"><button type="button">Undo swap</button></div>
      </>,
    );
    const undo = screen.getByRole("button", { name: "Undo swap" });
    await press("shop plateau");
    // Paging to another card while the modal stays open: focus stays out of the page behind it.
    await press("shop tower");
    // Focus left on the page for a moment, as a real browser can while the next card mounts.
    (document.activeElement as HTMLElement | null)?.blur();
    await frame();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(document.activeElement).not.toBe(undo);

    await press("shop plateau");
    await act(async () => {
      fireEvent.keyDown(window, { key: "Escape" });
    });
    (document.activeElement as HTMLElement | null)?.blur();
    await frame();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(undo);
  });
});

describe("a sheet over the card", () => {
  it("keeps the card mounted under it, inert, and hands the same node back when it goes", async () => {
    const view = render(draw());
    await press("shop plateau");
    const card = screen.getByRole("dialog");
    expect(card.closest("[inert]")).toBeNull();

    await act(async () => view.rerender(draw({ sheet: true })));
    const held = document.querySelector('[aria-labelledby="card-modal-title-held"]');
    expect(held).toBe(card);
    expect(held!.closest("[inert]")).not.toBeNull();

    await act(async () => view.rerender(draw()));
    const back = document.querySelector('[aria-labelledby="card-modal-title"]');
    expect(back).toBe(card);
    expect(back!.closest("[inert]")).toBeNull();
    // Its door came back with it.
    expect(doors()[0]).toHaveTextContent(copy.overLimit("$10"));
  });

  it("stacks a card opened from the sheet over both, leaving the held card where it was", async () => {
    const view = render(draw());
    await press("shop plateau");
    const held = screen.getByRole("dialog");
    await act(async () => view.rerender(draw({ sheet: true })));
    await press("shop tower");
    const dialogs = document.querySelectorAll('[aria-labelledby^="card-modal-title"]');
    expect(dialogs).toHaveLength(2);
    // Two dialogs, two names: the held card's title id is its own, or the top card is announced
    // by the held card's heading.
    expect(new Set([...dialogs].map((d) => d.getAttribute("aria-labelledby"))).size).toBe(2);
    expect(dialogs[1].getAttribute("aria-labelledby")).toBe("card-modal-title");
    expect(document.getElementById("card-modal-title")?.textContent).toBe("Command Tower");
    expect(dialogs[0]).toBe(held);
    // A stand-in over the sheet draws no door of its own.
    expect(dialogs[1].querySelector('[data-testid="stand-in-door"]')).toBeNull();
    // Its way back names the sheet at both widths: the desktop pill and the phone's ×.
    const backs = [...dialogs[1].querySelectorAll("button")].filter((b) => b.getAttribute("aria-label") === "Back to Cheaper stand-ins");
    expect(backs).toHaveLength(2);
  });
});
