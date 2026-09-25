import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { addPanelCopy } from "../../lib/copy/decks-builder";
import type { Availability } from "../../lib/decks/availability";
import type { DeckDetailCard } from "../../lib/decks/grouping";
import { DECK_REMOVE_FALLBACK_MESSAGE } from "../../lib/decks/mutation-result";
import type { DeckDetail } from "../../lib/decks/read";
import type { DeckMutationResult } from "../../lib/decks/mutation-result";
import { CardDetailProvider, cardDetailCopy } from "../cards/card-detail-provider";
import { spokenManaCost } from "../../lib/copy/card-surfaces";
import { deckImportCopy } from "../../lib/copy/deck-import";
import { deckVersioningCopy } from "../../lib/copy/deck-versioning";
import { PendingChangeProvider } from "./pending-change";
import { COST_TRACK } from "../ui/cost-pips";
import { proxyCopy } from "../../lib/copy/proxies";
import { markerAria } from "../ui/availability-marker";
import { recommendedMix } from "../../lib/decks/mix";
import { swapToolsCopy } from "../../lib/copy/swap-tools";
import { SwapToolsProvider, useSwapTools } from "../../lib/swaps/context";
import { OVER_LIMIT_RING } from "./buy-tag";

/** The asserted baseline, through the real function rather than restated — a hand-built
 *  literal drifts from the type the moment a field is added, which is how 120 of these broke. */
const TEST_MIX = recommendedMix(null, false);

const { addCardToDeck, removeCardFromDeck, keepAutoCard } = vi.hoisted(() => ({
  addCardToDeck: vi.fn(),
  removeCardFromDeck: vi.fn(),
  keepAutoCard: vi.fn(),
}));
vi.mock("../../app/decks/actions", () => ({
  createDeck: vi.fn(),
  getDeckSuggestions: vi.fn(async () => ({ suggestions: [], degraded: false })),
  addCardToDeck,
  removeCardFromDeck,
  keepAutoCard,
  deleteDeck: vi.fn(),
  renameDeck: vi.fn(),
}));

// The ⇄ opens the stand-ins sheet, which reads its list through this action.
const { loadStandInsAction } = vi.hoisted(() => ({ loadStandInsAction: vi.fn(async () => null) }));
vi.mock("../../lib/swaps/actions", () => ({ loadStandInsAction, setShoppingLimitAction: vi.fn() }));

// The shell mounts Consider, whose degraded banner refreshes the route.
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const { DecklistRow } = await import("./decklist-row");
const { BuilderShell } = await import("./builder-shell");

// Several tests hold a mutation mid-flight on purpose, since the optimistic
// override only exists while its action is unsettled. That override outlives
// the test unless the action is settled: React keeps it alive across the
// unmount, and the next tree inherits a card list it never asked for. Settling
// every outstanding one here is what keeps this file order-independent.
const outstanding: Array<() => void> = [];

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  outstanding.push(() => resolve(undefined as T));
  return { promise, resolve };
}

afterEach(async () => {
  const settle = outstanding.splice(0);
  await act(async () => {
    settle.forEach((resolve) => resolve());
  });
});

const card = {
  oracleId: "sol-ring",
  name: "Sol Ring",
  owned: true,
  quantity: 1,
} as DeckDetailCard;

function clickRemove(name = addPanelCopy.row.removeAria("Sol Ring")) {
  return act(async () => {
    screen.getByRole("button", { name }).click();
  });
}

beforeEach(() => {
  removeCardFromDeck.mockReset();
  addCardToDeck.mockReset();
  keepAutoCard.mockReset();
  localStorage.clear();
});

// These rows wrap their card name in CardDetailTrigger (#127), which needs the
// provider's context; the mutation behaviour under test is independent of it.
function renderRow(ui: React.ReactNode) {
  render(
    <CardDetailProvider fetchCard={vi.fn().mockResolvedValue(null)}>{ui}</CardDetailProvider>,
  );
}

describe("DecklistRow", () => {
  // Removal takes one copy, so a stack keeps its row; hiding it would blank a
  // line the deck still holds eight of.
  it("keeps the row when more than one copy remains", async () => {
    const pending = deferred<void>();
    removeCardFromDeck.mockReturnValue(pending.promise);

    renderRow(<DecklistRow deckId="d1" card={{ ...card, quantity: 9 }}  newestAsOf={null}/>);
    await clickRemove(addPanelCopy.row.removeCopyAria("Sol Ring", 9));

    expect(screen.getByText("Sol Ring")).toBeInTheDocument();
    // A stack is its own receipt, so no undo row is drawn for one.
    expect(screen.queryByText(addPanelCopy.undo.removed("Sol Ring"))).not.toBeInTheDocument();

    await act(async () => {
      pending.resolve();
    });
  });

  it("brings the card back and explains when the removal fails", async () => {
    removeCardFromDeck.mockRejectedValue(new Error("boom"));

    renderRow(<DecklistRow deckId="d1" card={card}  newestAsOf={null}/>);
    await clickRemove();

    expect(screen.getByText("Sol Ring")).toBeInTheDocument();
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(DECK_REMOVE_FALLBACK_MESSAGE);
    // role="alert" carries the implicit assertive live region; no aria-live needed.
    expect(alert).not.toHaveAttribute("aria-live");
  });
});

// #179 — a phone deck could be filled and never emptied: the ✕ was `hidden
// md:block`. The glyph is unchanged; the target is the padding around it.
describe("DecklistRow remove control (#179)", () => {
  it("renders the ✕ at phone width with a 44px hit box", () => {
    renderRow(<DecklistRow deckId="d1" card={card}  newestAsOf={null}/>);

    const remove = screen.getByRole("button", { name: addPanelCopy.row.removeAria("Sol Ring") });
    expect(remove.className).not.toContain("hidden");
    expect(remove.className).toContain("w-[44px]");
    expect(remove.className).toContain("h-[44px]");
    // Desktop keeps the inline target it already had.
    expect(remove.className).toContain("md:w-auto");
    expect(remove.className).toContain("text-[13px]");
  });

  it("says which of the two outcomes a multi-copy remove has", () => {
    renderRow(<DecklistRow deckId="d1" card={{ ...card, quantity: 8 }}  newestAsOf={null}/>);

    expect(
      screen.getByRole("button", { name: "Remove one copy of Sol Ring, 8 in deck" }),
    ).toBeInTheDocument();
  });

  // Addendum C5: one row per card, the count inline after the name — not a
  // second "+N more" row, which the desktop two-column grid could flow into the
  // other column, away from the card it describes.
  it("carries the count on the card's own row", () => {
    renderRow(<DecklistRow deckId="d1" card={{ ...card, quantity: 37 }}  newestAsOf={null}/>);

    expect(screen.getByText("×37")).toBeInTheDocument();
    expect(screen.queryByText(/more$/)).not.toBeInTheDocument();
  });

  // The name block is what grows to fill the row, not the name itself: a
  // growing trigger would strand the count at the row's right edge, away from
  // the text it counts.
  // Both shells: the row with a meta line puts the growing box one level up,
  // and the count still has to ride the name rather than the row's edge.
  it.each([
    ["with a meta line", "Sorceries"],
    ["without one", "Lands"],
  ])("keeps the count beside the name text, %s", (_label, cardTypeGroup) => {
    renderRow(
      <DecklistRow
        deckId="d1"
        card={{ ...card, quantity: 37, manaCost: null, cardTypeGroup } as DeckDetailCard}
       newestAsOf={null}/>,
    );

    const count = screen.getByText("×37");
    const name = screen.getByRole("button", { name: cardDetailCopy.triggerAria("Sol Ring") });
    expect(count.parentElement).toBe(name.parentElement);
    expect(name.className).not.toContain("flex-auto");
    expect(name.closest(".flex-auto")).not.toBeNull();
  });

  // The ✕'s aria already says "37 in deck", so a reader that also voiced the
  // glyph would say the number twice.
  it("keeps the count out of the accessible name", () => {
    renderRow(<DecklistRow deckId="d1" card={{ ...card, quantity: 37 }}  newestAsOf={null}/>);

    expect(screen.getByText("×37")).toHaveAttribute("aria-hidden");
  });

  it("draws no count on a single copy", () => {
    renderRow(<DecklistRow deckId="d1" card={card}  newestAsOf={null}/>);

    expect(screen.queryByText(/^×/)).not.toBeInTheDocument();
  });
});

// #185 — the removed row is replaced in place rather than unmounting.
describe("DecklistRow undo row (#185)", () => {
  it("puts the card back through the same add the tile makes", async () => {
    const pending = deferred<DeckMutationResult>();
    addCardToDeck.mockReturnValue(pending.promise);

    renderRow(<DecklistRow deckId="d1" card={card} spent  newestAsOf={null}/>);
    await act(async () => {
      screen.getByRole("button", { name: addPanelCopy.undo.actionAria("Sol Ring") }).click();
    });

    expect(addCardToDeck).toHaveBeenCalledWith("d1", "sol-ring", { relock: true });
    expect(removeCardFromDeck).not.toHaveBeenCalled();

    await act(async () => {
      pending.resolve({ ok: true });
    });
  });
});

// #43 — the marker rides the row it annotates and never gates it.
describe("DecklistRow availability marker (#43)", () => {
  // A deck's own decklist is a self-excluded vantage, so `free` is already net
  // of this deck's own claim. It is never `owned - hard` here — the SQL says so
  // and the row is only ever handed the answer.
  const avail = (free: number, names: string[] = []): Availability => ({
    owned: 1,
    hard: names.length,
    soft: 0,
    free,
    claims: names.map((n, i) => ({ id: `d${i + 1}`, name: n, quantity: 1, mature: true, pending: false, commander: false, senior: true })),
  });

  it("carries no marker when the card is free", () => {
    renderRow(<DecklistRow deckId="d1" card={{ ...card, availability: avail(2) }}  newestAsOf={null}/>);

    expect(screen.queryByText(/free|in a draft|in a brew|short/)).toBeNull();
  });

  // Self-exclusion makes the hard state unreachable on a deck's own list
  // (design table row 4.9), so a genuine conflict arrives as over-committed.
  // Count-only in both views since #354: the other claimant is named by the
  // card modal's allocation receipt, not by this row.
  it("carries the marker when another committed deck wants the same copy", () => {
    renderRow(
      <DecklistRow deckId="d1" card={{ ...card, availability: avail(-1, ["Atraxa"]) }}  newestAsOf={null}/>,
    );

    expect(screen.getByText("short 1")).toBeInTheDocument();
    expect(document.querySelector("[data-deck-name]")).toBeNull();
  });

  // The quiet-failure half of the degraded ruling.
  it("renders exactly like the free state when the availability read failed", () => {
    renderRow(<DecklistRow deckId="d1" card={{ ...card, availability: null }}  newestAsOf={null}/>);

    expect(screen.queryByText(/free|in a draft|in a brew|short/)).toBeNull();
  });

  // §17.5. This row has no aria-label of its own to hoist the prose into — the
  // name is its own button — so a marker that did not speak would be announced
  // as the drawn shorthand, which is written for the eye.
  it("speaks the sentence rather than the shorthand", () => {
    renderRow(
      <DecklistRow deckId="d1" card={{ ...card, availability: avail(-1, ["Atraxa"]) }}  newestAsOf={null}/>,
    );

    expect(
      screen.getByText("you own 1 too few for the committed decks that include it"),
    ).toBeInTheDocument();
  });

  it("hides the drawn label from assistive tech, so it is not read twice", () => {
    renderRow(
      <DecklistRow deckId="d1" card={{ ...card, availability: avail(-1, ["Atraxa"]) }}  newestAsOf={null}/>,
    );

    expect(screen.getByText("short 1")).toHaveAttribute("aria-hidden", "true");
  });

  // Nothing on this surface is ever gated on availability.
  it("still offers the remove control on an over-committed row", () => {
    renderRow(
      <DecklistRow deckId="d1" card={{ ...card, availability: avail(-1, ["Atraxa"]) }}  newestAsOf={null}/>,
    );

    const remove = screen.getByRole("button", {
      name: addPanelCopy.row.removeAria("Sol Ring"),
    });
    expect(remove).not.toBeDisabled();
  });
});

// The undo row's lifetime is a property of the decklist, not of the row that
// asked for it — the row unmounts with the card. Exercised through BuilderShell
// because that is the seam: state held on the row would pass every assertion
// above and still be lost on a tab switch.
const solRing: DeckDetailCard = {
  oracleId: "sol-ring",
  name: "Sol Ring",
  typeLine: "Artifact",
  cardTypeGroup: "Artifacts",
  role: "ramp",
  cmc: 2,
  owned: true,
  quantity: 1,
  auto: false,
  printedName: null,
  printedSetCode: null,
  printedCollectorNumber: null,
};
const arcaneSignet: DeckDetailCard = {
  ...solRing,
  oracleId: "arcane-signet",
  name: "Arcane Signet",
};

function makeDeck(cards: DeckDetailCard[] = [solRing, arcaneSignet]): DeckDetail {
  const built = cards.reduce((sum, c) => sum + c.quantity, 0);
  return {
    id: "deck-1",
    name: "Korvold",
    createdAt: new Date("2026-01-01"),
    commander: {
      oracleId: "korvold",
      name: "Korvold, Fae-Cursed King",
      colorIdentity: ["B", "R", "G"],
      manaCost: "{2}{B}{R}{G}",
      typeLine: "Legendary Creature — Dragon Noble",
      oracleText: null,
      imageUri: null,
      artCropUri: null,
    },
    partner: null,
    filled: false,
    cards,
    built,
    ownedCount: built,
    coveredCount: built,
    toBuyCount: 0,
    total: built,
    unresolvedRows: [],
    declaredBracket: null,
    intent: null,
    intentSeeded: false,
    noteCounts: { gameChanger: 0, extraTurns: 0, tutor: 0 },
  } as DeckDetail;
}

function shell(cards?: DeckDetailCard[]) {
  return (
    <BuilderShell mix={TEST_MIX}
      deck={makeDeck(cards)}
      suggestions={[]}
      degraded={false}
      firstRun={false}
      commanderIdentity={["B", "R", "G"]}
      arrivedFromImport={false}
     newestAsOf={null}/>
  );
}

function renderBuilder() {
  const view = render(shell());
  return {
    ...view,
    /**
     * The server action's revalidation, which jsdom has no route to run. It is
     * what ends an optimistic override, so a test that never calls it can only
     * ever see a mutation mid-flight — and the states this file is about are
     * the ones on the far side of that.
     */
    revalidate: (cards: DeckDetailCard[]) =>
      act(async () => {
        view.rerender(shell(cards));
      }),
  };
}

// The builder's own region, told apart from the card-detail modal's by
// aria-atomic — every announcement here is read as one sentence.
const BUILDER_REGION = '[aria-live="polite"][aria-atomic="true"]';

function liveRegion(container: HTMLElement) {
  return container.querySelector(BUILDER_REGION)!;
}

async function removeFromBuilder(name: string) {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: addPanelCopy.row.removeAria(name) }));
  });
}

describe("undo row lifetime (#185)", () => {
  it("announces the removal and the undo on the builder's one live region", async () => {
    removeCardFromDeck.mockReturnValue(deferred<void>().promise);
    addCardToDeck.mockReturnValue(deferred<DeckMutationResult>().promise);

    const { container } = renderBuilder();
    expect(container.querySelectorAll(BUILDER_REGION)).toHaveLength(1);

    await removeFromBuilder("Sol Ring");
    expect(liveRegion(container)).toHaveTextContent(
      addPanelCopy.undo.announceRemoved("Sol Ring", 1, 99),
    );

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: addPanelCopy.undo.actionAria("Sol Ring") }),
      );
    });
    expect(liveRegion(container)).toHaveTextContent(
      addPanelCopy.undo.announceUndone("Sol Ring", 2, 99),
    );
    expect(container.querySelectorAll(BUILDER_REGION)).toHaveLength(1);
  });

  it("puts the undo row where the removed card's row was", async () => {
    removeCardFromDeck.mockReturnValue(deferred<void>().promise);

    renderBuilder();
    await removeFromBuilder("Sol Ring");

    expect(
      screen.queryByRole("button", { name: addPanelCopy.row.removeAria("Sol Ring") }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(addPanelCopy.undo.removed("Sol Ring"))).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: addPanelCopy.undo.actionAria("Sol Ring") }),
    ).toBeInTheDocument();
  });

  // The slot is a receipt, not a pending state: a deck that held its counts for
  // the life of the row would be lying about its own size.
  it("decrements the deck and the group the moment the row is spent", async () => {
    removeCardFromDeck.mockReturnValue(deferred<void>().promise);

    renderBuilder();
    expect(screen.getByRole("button", { name: /All 2/ })).toBeInTheDocument();

    await removeFromBuilder("Sol Ring");

    expect(screen.getByRole("button", { name: /All 1/ })).toBeInTheDocument();
    expect(screen.getByText(addPanelCopy.undo.removed("Sol Ring"))).toBeInTheDocument();
  });

  it("settles the first undo row when a second card is removed", async () => {
    removeCardFromDeck.mockReturnValue(deferred<void>().promise);

    renderBuilder();
    await removeFromBuilder("Sol Ring");
    await removeFromBuilder("Arcane Signet");

    expect(screen.getByText(addPanelCopy.undo.removed("Arcane Signet"))).toBeInTheDocument();
    expect(screen.queryByText(addPanelCopy.undo.removed("Sol Ring"))).not.toBeInTheDocument();
  });

  // Emptying the deck would otherwise swap the whole decklist for the empty
  // state, taking the undo row with it — the one removal hardest to recover from.
  it("keeps the undo row when the last card leaves the deck", async () => {
    removeCardFromDeck.mockReturnValue(deferred<void>().promise);

    renderBuilder();
    await removeFromBuilder("Sol Ring");
    await removeFromBuilder("Arcane Signet");

    expect(screen.getByText(addPanelCopy.undo.removed("Arcane Signet"))).toBeInTheDocument();
    expect(screen.queryByText(/king with no army/i)).not.toBeInTheDocument();
  });

  // Gate 5's repeat pass. The bug class it exists for is a receipt keyed to
  // something that outlives the thing it describes, which forward-only use
  // never reveals: the second removal looks identical to the first until you
  // have undone one in between.
  it("offers undo again when the same card is removed, undone, then removed once more", async () => {
    removeCardFromDeck.mockResolvedValue(undefined);
    addCardToDeck.mockResolvedValue({ ok: true } as DeckMutationResult);

    const { revalidate } = renderBuilder();
    await removeFromBuilder("Sol Ring");
    await revalidate([arcaneSignet]);
    expect(screen.getByText(addPanelCopy.undo.removed("Sol Ring"))).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: addPanelCopy.undo.actionAria("Sol Ring") }),
      );
    });
    await revalidate([solRing, arcaneSignet]);
    expect(screen.queryByText(addPanelCopy.undo.removed("Sol Ring"))).not.toBeInTheDocument();

    await removeFromBuilder("Sol Ring");
    await revalidate([arcaneSignet]);
    expect(screen.getByText(addPanelCopy.undo.removed("Sol Ring"))).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: addPanelCopy.undo.actionAria("Sol Ring") }),
    ).toBeInTheDocument();
  });

  // The undo row is the only thing between a mis-tap and a lost card, so a
  // refusal says so where the row is rather than in a banner. Through the
  // builder rather than a lone row, because the mounted-long-enough-to-say-it
  // part is decklist state: a row rendered without the providers cannot see an
  // optimistic re-add taking the slot away before the message arrives.
  it("states a refused undo in the row, and withdraws the control", async () => {
    removeCardFromDeck.mockResolvedValue(undefined);
    addCardToDeck.mockResolvedValue({ ok: false, message: addPanelCopy.undo.failed });

    const { revalidate } = renderBuilder();
    await removeFromBuilder("Sol Ring");
    await revalidate([arcaneSignet]);

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: addPanelCopy.undo.actionAria("Sol Ring") }),
      );
    });

    expect(screen.getByRole("alert")).toHaveTextContent(addPanelCopy.undo.failed);
    expect(
      screen.queryByRole("button", { name: addPanelCopy.undo.actionAria("Sol Ring") }),
    ).not.toBeInTheDocument();
    // The receipt stays: the card is still out of the deck, and this is the
    // only place that says which one.
    expect(screen.getByText(addPanelCopy.undo.removed("Sol Ring"))).toBeInTheDocument();
  });

  it("survives a tab switch to Consider and back", async () => {
    removeCardFromDeck.mockReturnValue(deferred<void>().promise);

    renderBuilder();
    await removeFromBuilder("Sol Ring");

    await act(async () => {
      fireEvent.click(screen.getByRole("tab", { name: /cards to consider/i }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("tab", { name: /your deck/i }));
    });

    expect(screen.getByText(addPanelCopy.undo.removed("Sol Ring"))).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: addPanelCopy.undo.actionAria("Sol Ring") }),
    ).toBeInTheDocument();
  });
});

// #130 — the auto tag is the keep control.
describe("DecklistRow auto tag (#130)", () => {
  it("a row with auto=true renders the auto tag between the buy tag and the remove button", () => {
    renderRow(<DecklistRow deckId="d1" card={{ ...card, auto: true }}  newestAsOf={null}/>);
    // The tag renders as a button whose accessible name is the keep aria label
    expect(
      screen.getByRole("button", { name: /Keep Sol Ring in this deck/ }),
    ).toBeInTheDocument();
  });

  it("a row with auto=false renders no auto tag", () => {
    renderRow(<DecklistRow deckId="d1" card={{ ...card, auto: false }}  newestAsOf={null}/>);
    expect(
      screen.queryByRole("button", { name: /Keep Sol Ring in this deck/ }),
    ).not.toBeInTheDocument();
  });

  it("a multi-copy stack renders one auto tag, not one per copy", () => {
    renderRow(<DecklistRow deckId="d1" card={{ ...card, auto: true, quantity: 4 }}  newestAsOf={null}/>);
    expect(
      screen.getAllByRole("button", { name: /Keep Sol Ring in this deck/ }),
    ).toHaveLength(1);
  });
});

// #350 — the printed cost on the row.
describe("DecklistRow cost pips (#350)", () => {
  const withCost = { ...card, manaCost: "{2}{U}{B}" } as DeckDetailCard;
  const rowShell = () => document.querySelector(".group")!;

  it("draws the cost in two runs, one per width, so it is spoken once", () => {
    renderRow(<DecklistRow deckId="d1" card={withCost}  newestAsOf={null}/>);
    const spoken = screen.getAllByText(spokenManaCost("{2}{U}{B}"));
    expect(spoken).toHaveLength(2);
    // `hidden` is display:none, so the run that is not drawn is not in the
    // accessibility tree either — which is the whole reason two runs is one
    // utterance rather than two.
    const wrappers = spoken.map((el) => el.parentElement!.className);
    expect(wrappers.some((c) => c.includes("hidden") && c.includes("md:flex"))).toBe(true);
    expect(wrappers.some((c) => c.includes("md:hidden"))).toBe(true);
  });

  it("grows the phone row to 52px for the meta line it now carries", () => {
    renderRow(<DecklistRow deckId="d1" card={withCost}  newestAsOf={null}/>);
    expect(rowShell().className).toContain("min-h-[52px]");
  });

  it("leaves a land at 44px", () => {
    renderRow(
      <DecklistRow
        deckId="d1"
        card={{ ...card, manaCost: null, cardTypeGroup: "Lands" } as DeckDetailCard}
       newestAsOf={null}/>,
    );
    expect(rowShell().className).toContain("min-h-[44px]");
  });

  // The height is the group's, not the card's. Ancestral Vision and Restore
  // Balance have no printed cost and are not lands, and a row that measured its
  // own cost would sit 8px short in the middle of a column of Sorceries.
  it("keeps a costless spell at its group's height", () => {
    renderRow(
      <DecklistRow
        deckId="d1"
        card={{ ...card, manaCost: null, cardTypeGroup: "Sorceries" } as DeckDetailCard}
       newestAsOf={null}/>,
    );
    expect(rowShell().className).toContain("min-h-[52px]");
    // No pips, though — the row has the line, and nothing to put on it.
    expect(screen.queryByText(spokenManaCost("{1}"))).toBeNull();
  });

  it("holds the desktop track at a fixed width whatever the cost costs", () => {
    renderRow(<DecklistRow deckId="d1" card={withCost}  newestAsOf={null}/>);
    const track = document.querySelector(".hidden.md\\:flex > span")!;
    expect(track).toHaveStyle({ width: `${COST_TRACK}px` });
  });

  it("puts the cost alone on the All tab's meta line, and before the figure in Shopping", () => {
    renderRow(<DecklistRow deckId="d1" card={{ ...withCost, owned: false }}  newestAsOf={null}/>);
    expect(screen.queryByText(/edhrec/)).toBeNull();
    cleanup();
    renderRow(
      <DecklistRow deckId="d1" card={{ ...withCost, owned: false }} shoppingFigure={24} inShopping  newestAsOf={null}/>,
    );
    const line = screen.getByText(/edhrec/).closest("span.md\\:hidden")!;
    expect(line.textContent).toContain("edhrec");
    expect(line.querySelector("span[aria-hidden]")).not.toBeNull();
  });
});

// #350 — the All tab collapses the tag; Shopping keeps it whole.
describe("DecklistRow buy tag density (#350)", () => {
  // One slot, one mark. The row draws the buy tag off `deckRowTag` now, so a
  // printed card cannot also be told to buy itself — the state nobody drew.
  it("draws the proxy mark instead of the buy tag on a printed card", () => {
    renderRow(<DecklistRow deckId="d1" card={{ ...card, owned: false, proxied: true }}  newestAsOf={null}/>);

    expect(screen.getByText(proxyCopy.tag.aria)).toBeInTheDocument();
    expect(screen.queryByText(addPanelCopy.unowned.tag)).not.toBeInTheDocument();
  });

  it("draws no availability marker on a printed row", () => {
    // The tile suppresses its chip for this state; the row must agree, or one
    // card reads two ways a toggle apart. Printing IS the slot's answer, so a
    // chip about the copies competing for it contradicts the mark beside it.
    // `free < 0` — the over state, which is the one that still speaks from this
    // row's own vantage. At `free === 0` self-excluded the marker is silent by
    // design, so a fixture built there asserts nothing about suppression.
    const availability = { owned: 1, hard: 1, soft: 0, free: -1, claims: [] };
    const marker = markerAria(availability, { selfExcluded: true });
    // The marker's own prose, not a testid it does not carry: the first version
    // of this asserted `queryByTestId("availability-marker")`, which is absent
    // whatever the row draws, so it passed with the suppression removed.
    expect(marker).toBeTruthy();

    renderRow(
      <DecklistRow deckId="d1" card={{ ...card, owned: true, proxied: true, availability }}  newestAsOf={null}/>,
    );

    expect(screen.getByText(proxyCopy.tag.aria)).toBeInTheDocument();
    expect(document.body.textContent).not.toContain(marker as string);
  });

  it("keeps the buy tag on an unowned card that is not printed", () => {
    renderRow(<DecklistRow deckId="d1" card={{ ...card, owned: false }}  newestAsOf={null}/>);

    expect(screen.queryByText(proxyCopy.tag.aria)).not.toBeInTheDocument();
    expect(screen.getByText(addPanelCopy.unowned.tag)).toBeInTheDocument();
  });

  it("collapses to $ on the All tab", () => {
    renderRow(<DecklistRow deckId="d1" card={{ ...card, owned: false }}  newestAsOf={null}/>);
    expect(screen.getByText("$")).toBeInTheDocument();
  });

  it("keeps the word on the Shopping list, which is being paid from", () => {
    renderRow(
      <DecklistRow deckId="d1" card={{ ...card, owned: false }} shoppingFigure={24} inShopping  newestAsOf={null}/>,
    );
    expect(screen.queryByText("$")).toBeNull();
  });
});

// The printed name (#467 follow-on). Both render sites are asserted: the row
// picks its branch off `cardTypeGroup`, and a Lands row takes the other one.
describe("DecklistRow printed name", () => {
  const renamed = {
    ...card,
    name: "World at War",
    printedName: "Battle of Olympus",
  } as DeckDetailCard;

  it("names the card by the printing the player owns", () => {
    renderRow(<DecklistRow deckId="d1" card={renamed}  newestAsOf={null}/>);
    expect(screen.getByText("Battle of Olympus")).toBeInTheDocument();
    expect(screen.queryByText("World at War")).not.toBeInTheDocument();
  });

  it("names it on the Lands branch too, which is the other render site", () => {
    renderRow(
      <DecklistRow deckId="d1" card={{ ...renamed, cardTypeGroup: "Lands" } as DeckDetailCard}  newestAsOf={null}/>,
    );
    expect(screen.getByText("Battle of Olympus")).toBeInTheDocument();
  });

  it("carries the full printed name in the accessible name, and never a title", () => {
    const { container } = render(
      <CardDetailProvider fetchCard={vi.fn().mockResolvedValue(null)}>
        <DecklistRow
          deckId="d1"
          card={{ ...renamed, printedName: "Battle of Olympus // Aftermath",
                  layout: "transform" } as DeckDetailCard}
         newestAsOf={null}/>
      </CardDetailProvider>,
    );
    // Visible: the front face alone, single line. Spoken: the whole string.
    expect(screen.getByText("Battle of Olympus")).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: cardDetailCopy.triggerAria("Battle of Olympus // Aftermath"),
      }),
    ).toBeInTheDocument();
    expect(container.querySelector("[title]")).toBeNull();
  });

  it("leaves an ordinary card on its oracle name, byte for byte", () => {
    renderRow(
      <DecklistRow deckId="d1" card={{ ...card, name: "Fire // Ice" } as DeckDetailCard}  newestAsOf={null}/>,
    );
    expect(screen.getByText("Fire // Ice")).toBeInTheDocument();
  });
});

// §Errata: the dot is decorative and the row itself carries the availability
// word, because "the bucket heading is the accessible statement" described
// buckets that were withdrawn.
describe("DecklistRow ownership (§Errata)", () => {
  const dot = (container: HTMLElement) => container.querySelector("[aria-hidden]");

  it("leaves the dot decorative and says the word through the name", () => {
    const { container } = render(
      <CardDetailProvider fetchCard={vi.fn().mockResolvedValue(null)}>
        <DecklistRow deckId="d1" card={card}  newestAsOf={null}/>
      </CardDetailProvider>,
    );
    // No labelled dot anywhere: the shape is decoration now.
    expect(screen.queryByLabelText("Owned")).toBeNull();
    expect(dot(container)).not.toBeNull();
    expect(
      screen.getByRole("button", { name: cardDetailCopy.triggerAria("Sol Ring") }),
    ).toHaveAccessibleDescription(/Owned/);
  });

  it("says the other word on a card the player does not own", () => {
    renderRow(<DecklistRow deckId="d1" card={{ ...card, owned: false } as DeckDetailCard}  newestAsOf={null}/>);
    expect(
      screen.getByRole("button", { name: cardDetailCopy.triggerAria("Sol Ring") }),
    ).toHaveAccessibleDescription(/Not owned/);
  });
});

// #389, surface 1: the brass rule says the draft touched this row, and only the
// printed pair says what it did to a count the version already held.
describe("DecklistRow pending change (#389)", () => {
  const withMoves = (moves: Array<[string, { from: number; to: number }]>, ui: React.ReactNode) =>
    render(
      <CardDetailProvider fetchCard={vi.fn().mockResolvedValue(null)}>
        <PendingChangeProvider value={{ moves: new Map(moves) }}>{ui}</PendingChangeProvider>
      </CardDetailProvider>,
    );

  it("prints the pair on a row whose count moved", () => {
    withMoves(
      [["sol-ring", { from: 1, to: 2 }]],
      <DecklistRow deckId="d1" card={{ ...card, quantity: 2 } as DeckDetailCard}  newestAsOf={null}/>,
    );
    expect(
      screen.getByText(deckImportCopy.update.diff.recountedItem("Sol Ring", "1", "2")),
    ).toBeInTheDocument();
    // The ×2 glyph stands down: `1 → 2` already ends in the count it would say.
    expect(screen.queryByText(addPanelCopy.row.quantity(2))).toBeNull();
  });

  it("leaves a card the version never held on its bare name", () => {
    withMoves(
      [["sol-ring", { from: 0, to: 1 }]],
      <DecklistRow deckId="d1" card={card}  newestAsOf={null}/>,
    );
    expect(screen.getByText("Sol Ring")).toBeInTheDocument();
    expect(screen.queryByText(/→/)).toBeNull();
  });

  it("keeps the accessible name on the card, not on the pair", () => {
    withMoves(
      [["sol-ring", { from: 1, to: 3 }]],
      <DecklistRow deckId="d1" card={{ ...card, quantity: 3 } as DeckDetailCard}  newestAsOf={null}/>,
    );
    expect(
      screen.getByRole("button", { name: cardDetailCopy.triggerAria("Sol Ring") }),
    ).toBeInTheDocument();
  });

  // The visible pair rides the name's child text, which an explicit `aria-label`
  // on the trigger excludes — so without this the move is seen and never heard.
  it("speaks the pair through the name's description", () => {
    withMoves(
      [["sol-ring", { from: 1, to: 3 }]],
      <DecklistRow deckId="d1" card={{ ...card, quantity: 3 } as DeckDetailCard}  newestAsOf={null}/>,
    );
    expect(
      screen.getByRole("button", { name: cardDetailCopy.triggerAria("Sol Ring") }),
    ).toHaveAccessibleDescription(
      new RegExp(deckVersioningCopy.pending.addMarkRecountedA11y(1, 3)),
    );
  });

  // State 11 is `+1 / −1`: a cut that leaves copies behind is as much a ruled row
  // as an add, and it cannot borrow the add's word — the card is in the version,
  // at a count the version does not have.
  it("prints the pair and says `cut` on a row whose count came down", () => {
    withMoves([["sol-ring", { from: 3, to: 1 }]], <DecklistRow deckId="d1" card={card}  newestAsOf={null}/>);
    expect(
      screen.getByText(deckImportCopy.update.diff.recountedItem("Sol Ring", "3", "1")),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: cardDetailCopy.triggerAria("Sol Ring") }),
    ).toHaveAccessibleDescription(
      new RegExp(deckVersioningCopy.pending.cutMarkRecountedA11y(3, 1)),
    );
  });

  it("says only the word on a card the version never held", () => {
    withMoves([["sol-ring", { from: 0, to: 1 }]], <DecklistRow deckId="d1" card={card}  newestAsOf={null}/>);
    expect(
      screen.getByRole("button", { name: cardDetailCopy.triggerAria("Sol Ring") }),
    ).toHaveAccessibleDescription(new RegExp(deckVersioningCopy.pending.addMarkA11y));
  });

  it("says nothing about a draft on a row the draft did not touch", () => {
    withMoves([["other-card", { from: 1, to: 2 }]], <DecklistRow deckId="d1" card={card}  newestAsOf={null}/>);
    expect(screen.getByText("Sol Ring")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: cardDetailCopy.triggerAria("Sol Ring") }),
    ).not.toHaveAccessibleDescription(
      new RegExp(deckVersioningCopy.pending.addMarkA11y),
    );
  });
});

// The whole row opens the card, which is how `/collection`'s rows have always behaved. The
// name keeps the real trigger — a button, focusable, named — and the container adds the
// pointer target the rest of the row already looked like.
describe("DecklistRow — the row is the click target", () => {
  it("opens the card when the press lands beside the name, not on it", () => {
    const { container } = render(
      <CardDetailProvider fetchCard={vi.fn().mockResolvedValue(null)}>
        <DecklistRow deckId="d1" card={card}  newestAsOf={null}/>
      </CardDetailProvider>,
    );
    // The ownership dot: inside the row, part of no control, and exactly the kind of place a
    // thumb lands when it means "this card".
    const dot = container.querySelector("span[aria-hidden]");
    fireEvent.click(dot ?? container.firstElementChild!);
    expect(screen.getByRole("button", { name: cardDetailCopy.triggerAria("Sol Ring") }))
      .toHaveAttribute("aria-busy", "true");
  });

  // A selection somewhere else on the page is not this row's business: the guard used to read
  // the document's selection, so a name highlighted in one row left every other row inert.
  it("still opens when the selection belongs to another row", () => {
    const { container } = render(
      <CardDetailProvider fetchCard={vi.fn().mockResolvedValue(null)}>
        <DecklistRow deckId="d1" card={card}  newestAsOf={null}/>
        <DecklistRow deckId="d1" card={{ ...card, oracleId: "mox", name: "Mox Diamond" }}  newestAsOf={null}/>
      </CardDetailProvider>,
    );
    const [first, second] = [...container.querySelectorAll("div.group")];
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(first.querySelector("button")!);
    selection?.removeAllRanges();
    selection?.addRange(range);
    fireEvent.click(second.querySelector("span[aria-hidden]") ?? second);
    expect(screen.getByRole("button", { name: cardDetailCopy.triggerAria("Mox Diamond") }))
      .toHaveAttribute("aria-busy", "true");
    selection?.removeAllRanges();
  });

  it("leaves the row's own controls to do their own job", () => {
    render(
      <CardDetailProvider fetchCard={vi.fn().mockResolvedValue(null)}>
        <DecklistRow deckId="d1" card={card}  newestAsOf={null}/>
      </CardDetailProvider>,
    );
    const trigger = screen.getByRole("button", { name: cardDetailCopy.triggerAria("Sol Ring") });
    fireEvent.click(screen.getByRole("button", { name: addPanelCopy.row.removeAria("Sol Ring") }));
    // The remove button removes. It does not also open the card underneath it.
    expect(trigger).not.toHaveAttribute("aria-busy", "true");
  });
});

// The receipt stands in for a row and sits in the row's place in the order, so
// it has to call the card what that row calls it. A renamed printing named by
// its oracle name would sit in the list by one name and announce itself by
// another — and the list's own order is computed from the printed one.
describe("the undo receipt names the player's own copy", () => {
  it("uses the printed name, not the oracle name", () => {
    renderRow(
      <DecklistRow
        deckId="d1"
        spent
        card={{
          ...card,
          name: "Wolfbitten Captive",
          printedName: "Alpha Strike",
        } as DeckDetailCard}
       newestAsOf={null}/>,
    );

    expect(screen.getByText(addPanelCopy.undo.removed("Alpha Strike"))).toBeInTheDocument();
    expect(
      screen.queryByText(addPanelCopy.undo.removed("Wolfbitten Captive")),
    ).not.toBeInTheDocument();
  });
});

// The receipt, its action and the announcement are one act described three
// times, so they have to name the same card. A renamed printing used to show
// the printed name and announce the oracle one.
describe("the receipt's action and announcement name the same card", () => {
  it("labels Put back with the printed name", () => {
    renderRow(
      <DecklistRow
        deckId="d1"
        spent
        card={{ ...card, name: "Wolfbitten Captive", printedName: "Alpha Strike" } as DeckDetailCard}
       newestAsOf={null}/>,
    );
    expect(
      screen.getByRole("button", { name: addPanelCopy.undo.actionAria("Alpha Strike") }),
    ).toBeInTheDocument();
  });

  it("labels the remove control with the printed name too", () => {
    renderRow(
      <DecklistRow
        deckId="d1"
        card={{ ...card, name: "Wolfbitten Captive", printedName: "Alpha Strike" } as DeckDetailCard}
       newestAsOf={null}/>,
    );
    expect(
      screen.getByRole("button", { name: addPanelCopy.row.removeAria("Alpha Strike") }),
    ).toBeInTheDocument();
  });
});

// The multi-copy branch, which the first sweep missed: a stack's remove control
// is a different string from a single copy's and named the oracle card while
// the row beside it showed the printed one.
describe("a stack's remove control names the printed card too", () => {
  it("names the printed card in removeCopyAria", () => {
    renderRow(
      <DecklistRow
        deckId="d1"
        card={{
          ...card,
          quantity: 4,
          name: "Wolfbitten Captive",
          printedName: "Alpha Strike",
        } as DeckDetailCard}
       newestAsOf={null}/>,
    );
    expect(
      screen.getByRole("button", { name: addPanelCopy.row.removeCopyAria("Alpha Strike", 4) }),
    ).toBeInTheDocument();
  });
});

describe("DecklistRow — an owned card this deck prints", () => {
  // The tile was fixed for this in #654; the row kept the defect, and the row's
  // half is worse because it is SPOKEN. `grouping.ts` rules that `owned` and
  // `proxied` are meant to disagree out loud — *not in your collection · this
  // deck's slot is filled* — and a filled dot beside a `P` says the opposite.
  const printed = { ...card, owned: true, proxied: true };

  it("draws a hollow dot beside the mark", () => {
    const { container } = render(
      <CardDetailProvider fetchCard={vi.fn().mockResolvedValue(null)}>
        <DecklistRow deckId="d1" card={printed}  newestAsOf={null}/>
      </CardDetailProvider>,
    );

    // The dot is unlabelled and aria-hidden by design — the word is the row's,
    // said in its description — so this reads its SKIN.
    //
    // Matched on the arbitrary-property class the component actually emits.
    // A `[class*="border-dashed"]` selector passes on the broken build: that
    // literal appears nowhere on the dot (`[border:1px_dashed_…]` is what it
    // writes) and does appear elsewhere on the row, so the check found a
    // different element and reported a hollow dot either way.
    const dot = container.querySelector('[class*="1px_dashed_var(--fg-locked)"]');
    expect(dot).not.toBeNull();
    expect(container.querySelector('[class*="1px_solid_var(--success)"]')).toBeNull();
  });

  it("does not tell a reader the deck owns it", () => {
    renderRow(<DecklistRow deckId="d1" card={printed}  newestAsOf={null}/>);

    // The failure this closes: a reader who cannot see the dot was told `Owned`
    // about a card the deck is printing.
    expect(screen.queryByText("Owned")).toBeNull();
    expect(screen.getByText("Not owned")).toBeInTheDocument();
  });

  it("still says Owned for a card the deck is not printing", () => {
    renderRow(<DecklistRow deckId="d1" card={{ ...card, owned: true }}  newestAsOf={null}/>);

    expect(screen.getByText("Owned")).toBeInTheDocument();
  });
});

// Swap tools, ruling 4: a Shopping row over the deck's limit gains a ring on its buy tag and an
// `over $X` on its meta line. Nothing changes with the tools off, or on the All tab.
describe("DecklistRow over the Shopping limit (swap tools)", () => {
  const asOf = new Date("2026-09-20T00:00:00Z");
  const priced = (cents: number) => ({ ...(card as DeckDetailCard), owned: false, price: { cents, foilCents: null, etchedCents: null, asOf } });
  const inTools = (ui: React.ReactNode, stored: number | null = null) =>
    renderRow(<SwapToolsProvider deckId="d1" deckName="Test deck" storedLimitCents={stored}>{ui}</SwapToolsProvider>);
  const ring = () => Array.from(document.querySelectorAll<HTMLElement>("span")).filter((s) => s.style.boxShadow === OVER_LIMIT_RING);

  it("rings the tag and says over $10 for a card above the default", () => {
    inTools(<DecklistRow deckId="d1" card={priced(1500)} shoppingFigure={24} inShopping newestAsOf={asOf} />);
    expect(ring()).toHaveLength(1);
    expect(screen.getAllByText(swapToolsCopy.row.over("$10")).length).toBeGreaterThan(0);
  });

  it("does not mark a card at the limit exactly, or one under a raised limit", () => {
    inTools(<DecklistRow deckId="d1" card={priced(1000)} shoppingFigure={24} inShopping newestAsOf={asOf} />);
    expect(ring()).toHaveLength(0);
    cleanup();
    inTools(<DecklistRow deckId="d1" card={priced(1500)} shoppingFigure={24} inShopping newestAsOf={asOf} />, 2000);
    expect(ring()).toHaveLength(0);
    expect(screen.queryByText(swapToolsCopy.row.over("$20"))).toBeNull();
  });

  it("marks nothing with the tools off, or on the All tab", () => {
    renderRow(<DecklistRow deckId="d1" card={priced(1500)} shoppingFigure={24} inShopping newestAsOf={asOf} />);
    expect(ring()).toHaveLength(0);
    cleanup();
    inTools(<DecklistRow deckId="d1" card={priced(1500)} newestAsOf={asOf} />);
    expect(ring()).toHaveLength(0);
    expect(screen.queryByText(swapToolsCopy.row.over("$10"))).toBeNull();
  });

  it("draws the ⇄ on an over row only, and opens that card's stand-ins", async () => {
    const swap = () => screen.queryByRole("button", { name: swapToolsCopy.row.swapOverAria("Sol Ring", "$10") });
    // The sheet itself is the Decklist's (a take removes the row that opened it); the row says which card.
    function Open() {
      return <div data-testid="open-stand-ins">{useSwapTools()?.standIns?.oracleId ?? ""}</div>;
    }
    inTools(<DecklistRow deckId="d1" card={priced(900)} shoppingFigure={24} inShopping newestAsOf={asOf} />);
    expect(swap()).toBeNull();
    cleanup();
    inTools(<DecklistRow deckId="d1" card={priced(1500)} newestAsOf={asOf} />);
    expect(swap()).toBeNull();
    cleanup();
    inTools(<><DecklistRow deckId="d1" card={priced(1500)} shoppingFigure={24} inShopping newestAsOf={asOf} /><Open /></>);
    expect(screen.getByTestId("open-stand-ins")).toHaveTextContent("");
    await act(async () => swap()!.click());
    expect(screen.getByTestId("open-stand-ins")).toHaveTextContent("sol-ring");
  });
});
