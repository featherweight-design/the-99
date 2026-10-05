// The findings and their receipt, through the REAL provider — the stack ruling is a statement
// about two dialogs at once, and a receipt rendered alone can only prove it would not close.
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";

import type { BrowseCard } from "../../lib/collection/browse";
import type { ComboRef } from "../../lib/profile/types";
import { deckAnalysisCopy } from "../../lib/copy/deck-analysis";
import { SPELLBOOK_SOURCE } from "../../lib/bracket/sources";
import { COMMANDER, deckProfile, profileCard } from "./__fixtures__/deck-profile";

vi.mock("../../app/collection/actions", () => ({
  setCardArtPreference: vi.fn(async () => true),
  clearCardArtPreference: vi.fn(async () => {}),
}));
vi.mock("../../app/decks/actions", () => ({ setCardProxied: vi.fn(async () => ({ ok: true })) }));

const { CardDetailProvider, useCardDetail, STACK_DROP_MS } = await import("../cards/card-detail-provider");
const { FindingsBlock } = await import("./findings-block");

const copy = deckAnalysisCopy;

const card = (oracleId: string) =>
  ({
    oracleId, name: oracleId, typeLine: "Instant", manaCost: "{U}", cmc: 1, oracleText: null,
    keywords: [], rarity: "rare", colorIdentity: [], imageUri: null, printings: [], owned: [],
    proxiedBy: [],
  }) as unknown as BrowseCard;

const combo = (over: Partial<ComboRef> = {}): ComboRef => ({
  variantId: "1414-2269",
  cards: [{ oracleId: "thoracle", name: "Thassa's Oracle" }, { oracleId: "consult", name: "Demonic Consultation" }],
  produces: ["Win the game"],
  bracketTag: "ruthless",
  usesCommander: false,
  manaValueNeeded: 0,
  manaNeeded: null,
  steps: "Cast Demonic Consultation.\nExile your library.\n",
  notablePrerequisites: "Your library holds no card with the chosen name.",
  ...over,
});

const PROFILE = () =>
  deckProfile({
    cards: [
      COMMANDER,
      ...["rhystic", "rift", "drain", "thoracle", "consult", "vamp"].map((id) => profileCard(id)),
    ],
    gameChangerIds: new Set(["rhystic", "rift", "drain"]),
    tutorIds: new Set(["vamp"]),
    twoCardCombos: [combo()],
  });

// The printed name wins over the oracle one, which is how the tile tells a Secret Lair rename.
const ART = new Map([["rhystic", { name: "Rhystic Study (SLD)", imageUri: "https://img/rhystic.jpg" }]]);

/** A card opened from somewhere OTHER than a receipt, to tell a stack from a plain open. */
function OpenElsewhere() {
  const { open } = useCardDetail();
  return <button type="button" onClick={() => open("elsewhere")}>open elsewhere</button>;
}

const mount = () =>
  render(
    <CardDetailProvider fetchCard={async (id) => card(id)}>
      <FindingsBlock profile={PROFILE()} art={ART} />
      <OpenElsewhere />
    </CardDetailProvider>,
  );

const item = (id: string) => screen.getByTestId(`finding-${id}`);

describe("a finding", () => {
  it("draws a zero with no control, and says why", () => {
    mount();
    const empty = item("massLandDenial");
    expect(empty.dataset.state).toBe("empty");
    expect(within(empty).queryByRole("button")).toBeNull();
    expect(within(empty).getByText(copy.findings.empty)).toBeTruthy();
  });

  it("names its cards before counting the rest, in the printed name", () => {
    mount();
    const gc = item("gameChangers");
    // Desktop budget is two names, the phone's three; both are in the one list.
    expect(gc.textContent).toContain(copy.findings.names(["Rhystic Study (SLD)", "rift"], 1));
    expect(gc.textContent).toContain(copy.findings.names(["Rhystic Study (SLD)", "rift", "drain"], 0));
    expect(within(gc).getByRole("button", { name: copy.findings.openAria(3, "Game changers") })).toBeTruthy();
  });

  it("puts a no-limit chip on tutors, and on nothing else", () => {
    mount();
    expect(within(item("tutors")).getByText(copy.findings.noLimit)).toBeTruthy();
    expect(within(item("gameChangers")).queryByText(copy.findings.noLimit)).toBeNull();
  });

  it("names a combo as its pair and opens it as a combo", () => {
    mount();
    const f = item("twoCardCombos");
    expect(f.textContent).toContain(copy.findings.comboPair("Thassa's Oracle", "Demonic Consultation"));
    expect(within(f).getByRole("button").textContent).toContain(copy.findings.openCombo(1));
  });
});

describe("the receipt", () => {
  const openReceipt = (id: string) => {
    fireEvent.click(within(item(id)).getByRole("button"));
    return screen.getByTestId("receipt-modal");
  };

  it("opens a tile grid of the finding's cards, with no fact mark on any tile", () => {
    mount();
    const receipt = openReceipt("gameChangers");
    expect(within(receipt).getByRole("heading", { name: "Game changers" })).toBeTruthy();
    const tiles = within(receipt).getAllByTestId("receipt-tile");
    expect(tiles).toHaveLength(3);
    expect(tiles[0].textContent).toBe("Rhystic Study (SLD)");
    // Ruling 2: the header names the fact, so a mark on every tile carries nothing.
    expect(within(within(receipt).getByTestId("receipt-grid")).queryAllByTestId(/^card-fact-/)).toHaveLength(0);
  });

  it("closes on its own control, which is named for what it closes", () => {
    mount();
    const receipt = openReceipt("gameChangers");
    fireEvent.click(within(receipt).getByRole("button", { name: copy.receipt.closeAria("Game changers") }));
    expect(screen.queryByTestId("receipt-modal")).toBeNull();
  });

  it("draws the combo's mana as a state, its steps, its prerequisites and its source", () => {
    mount();
    const receipt = openReceipt("twoCardCombos");
    const body = within(receipt).getByTestId("receipt-combo");
    expect(within(body).getByText(copy.receipt.manaFree)).toBeTruthy();
    // Split on Spellbook's own newlines, the trailing blank dropped.
    expect(within(body).getAllByRole("listitem").map((li) => li.textContent)).toContain("Exile your library.");
    expect(within(body).getByText("Your library holds no card with the chosen name.")).toBeTruthy();
    expect(within(body).getByRole("link").getAttribute("href")).toBe(SPELLBOOK_SOURCE.variantUrl("1414-2269"));
  });

  it("says Spellbook does not say, where the cost is unknown, rather than drawing a blank", () => {
    render(
      <CardDetailProvider fetchCard={async (id) => card(id)}>
        <FindingsBlock
          profile={deckProfile({
            cards: [COMMANDER, profileCard("thoracle"), profileCard("consult")],
            twoCardCombos: [combo({ manaValueNeeded: null, notablePrerequisites: null })],
          })}
          art={new Map()}
        />
      </CardDetailProvider>,
    );
    fireEvent.click(within(item("twoCardCombos")).getByRole("button"));
    const body = screen.getByTestId("receipt-combo");
    expect(within(body).getByText(copy.receipt.manaUnknown)).toBeTruthy();
    expect(within(body).queryByText(copy.receipt.prerequisites)).toBeNull();
  });
});

// Ruling 1. The card modal stacks on the receipt; the receipt does not close.
describe("a card opened from the receipt", () => {
  const openCardFromReceipt = async () => {
    mount();
    fireEvent.click(within(item("gameChangers")).getByRole("button"));
    await act(async () => {
      fireEvent.click(within(screen.getByTestId("receipt-modal")).getAllByTestId("receipt-tile")[1]);
    });
  };
  const cardDialog = () =>
    screen.getAllByRole("dialog").find((d) => d.getAttribute("aria-labelledby") === "card-modal-title")!;

  it("opens stacked over the receipt, which stays and steps down a ground", async () => {
    await openCardFromReceipt();
    expect(cardDialog()).toBeTruthy();
    expect(cardDialog().parentElement!.dataset.stacked).toBe("true");
    expect(screen.getByTestId("receipt-modal").dataset.behind).toBe("true");
  });

  it("closes alone on Escape, landing on the receipt", async () => {
    await openCardFromReceipt();
    cardDialog().querySelector("button")!.focus();
    await act(async () => { fireEvent.keyDown(window, { key: "Escape" }); });
    // jsdom matches no media query, so this is the phone's drop (stacked sheets R1, motion).
    await act(() => new Promise<void>((r) => { setTimeout(r, STACK_DROP_MS); }));
    expect(screen.queryAllByRole("dialog").some((d) => d.getAttribute("aria-labelledby") === "card-modal-title")).toBe(false);
    const receipt = screen.getByTestId("receipt-modal");
    expect(receipt.dataset.behind).toBeUndefined();
  });

  // Handoff §3: the desktop close becomes the way back, named for the sheet it lands on, and the
  // sheet's body steps down further than its header.
  it("offers the way back by the finding's name, and dims the receipt's body", async () => {
    await openCardFromReceipt();
    const back = within(cardDialog()).getByTestId("card-modal-back");
    expect(back.getAttribute("aria-label")).toBe("Back to Game changers");
    expect(back.textContent).toBe("←Game changers");
    const receipt = screen.getByTestId("receipt-modal");
    expect((receipt.lastElementChild as HTMLElement).style.opacity).toBe("0.35");
    await act(async () => { fireEvent.click(back); });
    await act(() => new Promise<void>((r) => { setTimeout(r, STACK_DROP_MS); }));
    expect(screen.queryAllByRole("dialog").some((d) => d.getAttribute("aria-labelledby") === "card-modal-title")).toBe(false);
    expect(screen.getByTestId("receipt-modal")).toBeTruthy();
  });

  // An engine without ResizeObserver still draws the pill: the reserve is measured once.
  it("draws the way back where ResizeObserver does not exist", async () => {
    const saved = globalThis.ResizeObserver;
    // @ts-expect-error removing the API the way an older engine lacks it
    delete globalThis.ResizeObserver;
    try {
      await openCardFromReceipt();
      expect(within(cardDialog()).getByTestId("card-modal-back")).toBeTruthy();
    } finally {
      globalThis.ResizeObserver = saved;
    }
  });

  it("keeps the plain close on a card opened from nowhere", async () => {
    mount();
    await act(async () => { fireEvent.click(screen.getByText("open elsewhere")); });
    expect(within(cardDialog()).queryByTestId("card-modal-back")).toBeNull();
    expect(within(cardDialog()).getAllByRole("button", { name: "Close card details" }).length).toBe(2);
  });

  // The receipt at 760 draws four across (3a).
  it("lays the receipt out four across at 760", () => {
    mount();
    fireEvent.click(within(item("gameChangers")).getByRole("button"));
    const receipt = screen.getByTestId("receipt-modal");
    expect(receipt.className).toContain("md:w-[760px]");
    expect(within(receipt).getByTestId("receipt-grid").className).toContain("md:grid-cols-4");
  });

  // The registration is withdrawn on unmount. Left standing, every card opened anywhere on the
  // page after a receipt had closed would draw offset and without a backdrop.
  it("is not stacked once the receipt has closed", async () => {
    await openCardFromReceipt();
    await act(async () => { fireEvent.keyDown(window, { key: "Escape" }); });
    fireEvent.click(within(screen.getByTestId("receipt-modal")).getByRole("button", { name: copy.receipt.closeAria("Game changers") }));
    expect(screen.queryByTestId("receipt-modal")).toBeNull();
    await act(async () => { fireEvent.click(screen.getByText("open elsewhere")); });
    expect(cardDialog().parentElement!.dataset.stacked).toBeUndefined();
  });
});
