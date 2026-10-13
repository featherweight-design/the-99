// I got it's held slot on the Shopping list (handoff call 8, C1/C3/C9; plan PR 3): a bought row's
// slot holds across the action's revalidation, which no longer lists the card, until the list is
// read again; the figures move at once; an undo gives the row back in place.

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DeckDetailCard } from "../../lib/decks/grouping";
import type { DeckCommander } from "../../lib/decks/read";
import { gotItCopy } from "../../lib/copy/i-got-it";
import { recommendationsCopy } from "../../lib/copy/recommendations";
import { proxyCopy } from "../../lib/copy/proxies";
import { recommendedMix } from "../../lib/decks/mix";
import { CardDetailProvider } from "../cards/card-detail-provider";
// The modal is loaded on demand; loaded here, after the mocks, a press draws it in the same tick.
await (await import("../cards/card-detail-provider")).warmCardModal();

vi.mock("../../app/decks/actions", () => ({
  createDeck: vi.fn(),
  getDeckSuggestions: vi.fn(async () => ({ suggestions: [], degraded: false })),
  addCardToDeck: vi.fn(),
  removeCardFromDeck: vi.fn(),
  keepAutoCard: vi.fn(),
  deleteDeck: vi.fn(),
  renameDeck: vi.fn(),
}));
const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
const { loadPrintingChoices, markBought, previewRevert, revertCollectionEntry } = vi.hoisted(() => ({
  loadPrintingChoices: vi.fn(),
  markBought: vi.fn(),
  previewRevert: vi.fn(),
  revertCollectionEntry: vi.fn(),
}));
vi.mock("../../app/collection/edit-actions", () => ({ loadPrintingChoices, settleCollectionWrite: vi.fn() }));
vi.mock("../../app/decks/mark-bought-actions", () => ({ markBought }));
vi.mock("../../app/collection/history-actions", () => ({ previewRevert, revertCollectionEntry }));

const { Decklist } = await import("./decklist");
const { GotItProvider } = await import("./got-it");
const { AddOptimisticCardProvider } = await import("./optimistic-deck");

const MIX = recommendedMix(null, false);
const ONLY = {
  scryfallId: "a0000000-0000-4000-8000-000000000000", setCode: "c21", setName: "Commander 2021",
  collectorNumber: "263", releasedAt: null, imageUri: null, flavorName: null, finishes: ["nonfoil" as const], owned: {},
};

const make = (o: Partial<DeckDetailCard> & { oracleId: string; name: string }): DeckDetailCard => ({
  typeLine: "Artifact", cardTypeGroup: "Artifacts", role: "ramp", cmc: 2, owned: false, quantity: 1, auto: true,
  printedName: null, printedSetCode: null, printedCollectorNumber: null, ...o,
});
const signet = make({ oracleId: "arcane-signet", name: "Arcane Signet" });
const talisman = make({ oracleId: "talisman", name: "Talisman of Progress" });
const remora = make({ oracleId: "mystic-remora", name: "Mystic Remora", role: "draw" });
const atraxa: DeckCommander = {
  oracleId: "atraxa", name: "Atraxa, Praetors' Voice", colorIdentity: ["W", "U", "B", "G"], manaCost: "{G}{W}{U}{B}",
  typeLine: "Legendary Creature — Phyrexian Angel Horror", oracleText: null, imageUri: null, artCropUri: null, owned: false,
};

const edits = {
  add: vi.fn(), remove: vi.fn(), markSpent: vi.fn(), announceUndo: vi.fn(), reportRemoveFailure: vi.fn(),
  resolveRow: vi.fn(), deleteRow: vi.fn(), keep: vi.fn(),
};

function tree(cards: DeckDetailCard[], filter: "all" | "shopping", commander?: DeckCommander) {
  return (
    <CardDetailProvider fetchCard={vi.fn().mockResolvedValue(null) as never}>
      <AddOptimisticCardProvider value={edits}>
        <GotItProvider deckId="deck-1">
          <button type="button" data-shopping-filter="">filter</button>
          <Decklist
            mix={MIX} deckId="deck-1" cards={cards} unresolvedRows={[]} commanderOracleId={commander?.oracleId ?? "c"}
            commander={commander} deckOracleIds={cards.map((c) => c.oracleId)} built={cards.length} bodySize={99}
            spentSlots={[]} filter={filter} grouping="role" onFilterChange={vi.fn()} onGroupingChange={vi.fn()}
            shoppingFigures={{}} newestAsOf={null}
          />
        </GotItProvider>
      </AddOptimisticCardProvider>
    </CardDetailProvider>
  );
}

const slot = (name: string) => screen.queryByText(gotItCopy.slot.held(name));
const pill = (n: number) => screen.getByRole("button", { name: `Shopping ${n}` });

async function buy(name: string, receipt: unknown = { tookCopy: [], stillNeeds: 0 }) {
  markBought.mockResolvedValueOnce({ applied: { id: "e0000000-0000-4000-8000-000000000001", receipt } });
  await act(async () => fireEvent.click(screen.getByRole("button", { name: gotItCopy.row.tagAria(name) })));
  const add = await screen.findByRole("button", { name: gotItCopy.confirm.add(1) });
  await act(async () => fireEvent.click(add));
}

beforeEach(() => {
  loadPrintingChoices.mockResolvedValue([ONLY]);
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("I got it's Shopping key", () => {
  // The wiring `buildMarkKeyEntries` is told about: with I got it mounted, the Shopping key above the
  // list decodes the buy mark and the mark key under it must not say `to buy` again. Mutation: pass
  // `shoppingKeyDraws: false` in `Decklist` and the first assertion fails.
  it("is the only place Shopping says `to buy`, and the All view's key still does", () => {
    const { rerender } = render(tree([signet, talisman], "shopping"));
    expect(screen.getByTestId("shopping-key")).toBeInTheDocument();
    expect(screen.getByText(gotItCopy.row.keyBuy)).toBeInTheDocument();
    expect(screen.queryByText(proxyCopy.key.buy)).toBeNull();

    rerender(tree([signet, talisman], "all"));
    expect(screen.queryByTestId("shopping-key")).toBeNull();
    expect(screen.getByText(proxyCopy.key.buy)).toBeInTheDocument();
  });
});

describe("I got it's held slot", () => {
  it("holds a bought row's slot across the revalidation that drops the card, and the figures move at once", async () => {
    const { rerender } = render(tree([signet, talisman, remora], "shopping"));
    expect(pill(3)).toBeInTheDocument();
    await buy("Arcane Signet");
    // The action's revalidation: the card is owned now, so the fresh list no longer bills it.
    rerender(tree([{ ...signet, owned: true }, talisman, remora], "shopping"));
    const held = slot("Arcane Signet")!;
    expect(held).toBeInTheDocument();
    const shell = held.closest("[data-held-slot]")!;
    // The spent-slot shape, in the row's own shell, and no control inside it.
    expect(shell.className).toContain("border-dashed");
    expect(shell.className).toMatch(/min-h-\[52px\]|h-\[52px\]/);
    expect(shell.querySelector("button, a, [tabindex]")).toBeNull();
    // It sits where the row was: before its neighbor in the Ramp group.
    const next = screen.getByRole("button", { name: /View details for Talisman of Progress/ });
    expect(shell.compareDocumentPosition(next) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // The tab count and the group count moved; the slot is not counted.
    expect(pill(2)).toBeInTheDocument();
    // Ramp's clause now counts the one row left, from the deck's new owned count.
    expect(screen.getByText(recommendationsCopy.shopping.groupGap("1", "1", "2"))).toBeInTheDocument();
    // A second render with the row still gone keeps the slot.
    rerender(tree([{ ...signet, owned: true }, talisman, remora], "shopping"));
    expect(slot("Arcane Signet")).toBeInTheDocument();
  });

  it("goes when the list is read again: a tab switch", async () => {
    const { rerender } = render(tree([signet, remora], "shopping"));
    await buy("Arcane Signet");
    rerender(tree([{ ...signet, owned: true }, remora], "shopping"));
    expect(slot("Arcane Signet")).toBeInTheDocument();
    rerender(tree([{ ...signet, owned: true }, remora], "all"));
    rerender(tree([{ ...signet, owned: true }, remora], "shopping"));
    expect(slot("Arcane Signet")).toBeNull();
  });

  it("pins a row that stays to the group it was drawn in until the next read, then it joins Spoken for", async () => {
    const owned = (c: DeckDetailCard): DeckDetailCard => ({
      ...c, owned: true,
      availability: { owned: 1, hard: 2, soft: 0, free: -1, claims: [{ id: "d2", name: "HD Atraxa", quantity: 1, mature: true, pending: false, commander: false, senior: true }] },
    } as DeckDetailCard);
    const { rerender } = render(tree([signet, talisman, remora], "shopping"));
    await buy("Arcane Signet", { tookCopy: [{ deckId: "d2", deckName: "HD Atraxa", copies: 1 }], stillNeeds: 1 });
    // The revalidation: owned now, claimed by the older deck, so the filter alone calls it spoken for.
    rerender(tree([owned(signet), talisman, remora], "shopping"));
    expect(screen.queryByText(recommendationsCopy.shopping.spokenForGroupLabel)).toBeNull();
    const row = screen.getByRole("button", { name: /View details for Arcane Signet/ });
    const next = screen.getByRole("button", { name: /View details for Talisman of Progress/ });
    expect(row.compareDocumentPosition(next) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // Undoing it (it never left): the row redraws, with no fade-in, since nothing came back.
    previewRevert.mockResolvedValueOnce({ rows: [], entryRows: [], differs: false, decks: [], expected: { k: 1 } });
    revertCollectionEntry.mockResolvedValueOnce({ reverted: { id: "r1" } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: gotItCopy.receipt.undoAria("Arcane Signet") })));
    expect(screen.getByText(gotItCopy.receipt.undoneElsewhere("Arcane Signet", 1))).toBeInTheDocument();
    // The revert's refresh lands. The row never left (no slot was drawn), so it does not fade in.
    rerender(tree([signet, talisman, remora], "shopping"));
    expect(screen.getByRole("button", { name: gotItCopy.row.tagAria("Arcane Signet") }).closest(".anim-slot-in")).toBeNull();
    // The next read: it joins Spoken for.
    rerender(tree([owned(signet), talisman, remora], "all"));
    rerender(tree([owned(signet), talisman, remora], "shopping"));
    expect(screen.getByText(recommendationsCopy.shopping.spokenForGroupLabel)).toBeInTheDocument();
  });

  it("is not drawn for a row that stays: it redraws in place", async () => {
    const { rerender } = render(tree([{ ...signet, quantity: 1 }, remora], "shopping"));
    await buy("Arcane Signet", { tookCopy: [{ deckId: "d2", deckName: "HD Atraxa", copies: 1 }], stillNeeds: 1 });
    // An older deck took the copy: still unowned from this deck's vantage, still on the list.
    rerender(tree([{ ...signet }, remora], "shopping"));
    expect(slot("Arcane Signet")).toBeNull();
    expect(screen.getByRole("button", { name: gotItCopy.row.tagAria("Arcane Signet") })).toBeInTheDocument();
  });

  it("after an undo answered alreadyReverted, keeps the slot until the re-read list bills the card", async () => {
    previewRevert.mockResolvedValueOnce({ alreadyReverted: true });
    const { rerender } = render(tree([signet, talisman], "shopping"));
    await buy("Arcane Signet");
    rerender(tree([{ ...signet, owned: true }, talisman], "shopping"));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: gotItCopy.receipt.undoAria("Arcane Signet") })));
    expect(refresh).toHaveBeenCalledTimes(1);
    // The refresh has not landed: the slot still holds rather than blinking out.
    expect(slot("Arcane Signet")).toBeInTheDocument();
    expect(screen.getByText(gotItCopy.receipt.undoneElsewhere("Arcane Signet", 1))).toBeInTheDocument();
    rerender(tree([signet, talisman], "shopping"));
    expect(slot("Arcane Signet")).toBeNull();
    expect(screen.getByRole("button", { name: gotItCopy.row.tagAria("Arcane Signet") }).closest(".anim-slot-in")).not.toBeNull();
  });

  it("an undo releases nothing: a refreshed list that still omits the card keeps the slot until the next read", async () => {
    previewRevert.mockResolvedValue({ rows: [], entryRows: [], differs: false, decks: [], expected: { k: 1 } });
    revertCollectionEntry.mockResolvedValue({ reverted: { id: "r1" } });
    const { rerender } = render(tree([signet, talisman], "shopping"));
    await buy("Arcane Signet");
    rerender(tree([{ ...signet, owned: true }, talisman], "shopping"));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: gotItCopy.receipt.undoAria("Arcane Signet") })));
    // Copies were added elsewhere since: the refreshed list still does not bill the card.
    rerender(tree([{ ...signet, owned: true }, talisman], "shopping"));
    expect(screen.getByText(gotItCopy.receipt.undoneElsewhere("Arcane Signet", 1))).toBeInTheDocument();
    expect(slot("Arcane Signet")).toBeInTheDocument();
    // The next read ends it.
    rerender(tree([{ ...signet, owned: true }, talisman], "all"));
    rerender(tree([{ ...signet, owned: true }, talisman], "shopping"));
    expect(slot("Arcane Signet")).toBeNull();
  });

  it("keeps one baseline per card: a second press keeps the first snapshot, and an undo releases nothing", async () => {
    previewRevert.mockResolvedValue({ rows: [], entryRows: [], differs: false, decks: [], expected: { k: 1 } });
    revertCollectionEntry.mockResolvedValue({ reverted: { id: "r1" } });
    const claimed = {
      ...signet, owned: true,
      availability: { owned: 1, hard: 2, soft: 0, free: -1, claims: [{ id: "d2", name: "HD Atraxa", quantity: 1, mature: true, pending: false, commander: false, senior: true }] },
    } as DeckDetailCard;
    const stayed = { tookCopy: [{ deckId: "d2", deckName: "HD Atraxa", copies: 1 }], stillNeeds: 1 };
    const { rerender } = render(tree([signet, talisman, remora], "shopping"));
    await buy("Arcane Signet", stayed);
    rerender(tree([claimed, talisman, remora], "shopping"));
    // The second press starts from the row as it now reads (owned, spoken for).
    markBought.mockResolvedValueOnce({ applied: { id: "e0000000-0000-4000-8000-000000000002", receipt: stayed } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: gotItCopy.row.tagAria("Arcane Signet") })));
    await act(async () => fireEvent.click(await screen.findByRole("button", { name: gotItCopy.confirm.add(1) })));
    rerender(tree([claimed, talisman, remora], "shopping"));
    // Still pinned to Ramp by the FIRST snapshot.
    expect(screen.queryByText(recommendationsCopy.shopping.spokenForGroupLabel)).toBeNull();
    // Undo the second purchase: the baseline (and the pin) stays until the next read.
    await act(async () => fireEvent.click(screen.getByRole("button", { name: gotItCopy.receipt.undoAria("Arcane Signet") })));
    rerender(tree([claimed, talisman, remora], "shopping"));
    expect(screen.getByText(gotItCopy.receipt.undoneElsewhere("Arcane Signet", 1))).toBeInTheDocument();
    expect(screen.queryByText(recommendationsCopy.shopping.spokenForGroupLabel)).toBeNull();
  });

  it("holds a bought commander's slot in the commander group", async () => {
    const { rerender } = render(tree([signet], "shopping", atraxa));
    await buy(atraxa.name);
    rerender(tree([signet], "shopping", { ...atraxa, owned: true, availability: null }));
    expect(slot(atraxa.name)).toBeInTheDocument();
    expect(screen.getByText(recommendationsCopy.shopping.commanderGroupLabel(1))).toBeInTheDocument();
    expect(pill(1)).toBeInTheDocument();
  });

  it("gives the row back in place after an undo, fading in where the slot was", async () => {
    previewRevert.mockResolvedValue({ rows: [], entryRows: [], differs: false, decks: [], expected: { k: 1 } });
    revertCollectionEntry.mockResolvedValue({ reverted: { id: "r1" } });
    const { rerender } = render(tree([signet, talisman], "shopping"));
    await buy("Arcane Signet");
    rerender(tree([{ ...signet, owned: true }, talisman], "shopping"));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: gotItCopy.receipt.undoAria("Arcane Signet") })));
    // Done: the toast says what the revert did; the slot stands until a list billing the card lands.
    expect(screen.getByText(gotItCopy.receipt.undoneElsewhere("Arcane Signet", 1))).toBeInTheDocument();
    expect(slot("Arcane Signet")).toBeInTheDocument();
    // It lands, listing the card again: the row is back, fading in from the render that draws it.
    rerender(tree([signet, talisman], "shopping"));
    expect(slot("Arcane Signet")).toBeNull();
    const tag = screen.getByRole("button", { name: gotItCopy.row.tagAria("Arcane Signet") });
    expect(tag.closest(".anim-slot-in")).not.toBeNull();
  });
});

// C9: the crossfade is the only new motion, and reduced motion makes it a swap in one frame.
describe("the held slot's motion", () => {
  it("is a 150ms opacity fade that the reduced-motion block turns off", async () => {
    const { readFileSync } = await import("node:fs");
    const css = readFileSync(`${process.cwd()}/src/app/globals.css`, "utf8");
    expect(css).toMatch(/\.anim-slot-in \{ animation: backdrop-in 0\.15s ease-out both; \}/);
    const reduce = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
    const block = reduce.slice(0, reduce.indexOf("animation: none;"));
    expect(block).toContain(".anim-slot-in");
  });
});
