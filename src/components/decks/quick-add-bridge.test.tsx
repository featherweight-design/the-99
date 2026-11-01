// The dock's bridge (add a card from anywhere, PR 4; Dock K2 to K7, K-D1, K-D2; READINESS O6 dock part, O8, O9).
//
// With Owned only on and nothing owned matching, one press opens the shell's Add cards sheet with the query carried.
// Closing it brings the dock back as it was; a save has the search run again and rings the rows that landed owned.
import { EMPTY_NOTE_COUNTS } from "../../lib/bracket/card-note";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SearchResult } from "../../app/decks/[id]/search-action";
import type { AddCardsSheetProps } from "../collection/add-cards-sheet";

const searchCards = vi.fn<(...args: unknown[]) => Promise<SearchResult[]>>();
const addCardToDeck = vi.fn(async () => ({ ok: true as const }));
vi.mock("../../app/decks/[id]/search-action", () => ({ searchCards }));
vi.mock("../../app/decks/actions", () => ({ addCardToDeck }));
vi.mock("../../app/collection/edit-actions", () => ({ settleCollectionWrite: vi.fn(async () => {}) }));
let pathname = "/decks/deck-1";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));
// The sheet has its own tests: a stand-in that reports its props and offers a save and a close.
const sheetProps = vi.fn();
vi.mock("../collection/add-cards-sheet", () => ({
  AddCardsSheet: (p: Extract<AddCardsSheetProps, { mode: "add" }>) => {
    sheetProps(p);
    return (
      <div role="dialog" aria-label="Add cards">
        <button type="button" onClick={() => p.onSaved?.(1)}>save</button>
        <button type="button" onClick={() => p.onClose()}>done</button>
      </div>
    );
  },
}));

const { QuickAddBar } = await import("./quick-add-bar");
const { AddCardsHost } = await import("../collection/add-cards-host");
const { CollectionEditScope } = await import("../cards/collection-edit-scope");
const { addPanelCopy } = await import("../../lib/copy/decks-builder");
const { isJustOwned, forgetJustOwned } = await import("../../lib/decks/just-owned");

const ghalta: SearchResult = {
  oracleId: "ghalta",
  name: "Ghalta, Primal Hunger",
  typeLine: "Creature",
  cmc: 12,
  owned: true,
  ownedQty: 1,
  cardTypeGroup: "Creatures",
  role: "other",
  imageUri: null,
  manaCost: null,
  flavorName: null,
  facts: null,
};

function bar(props: Partial<React.ComponentProps<typeof QuickAddBar>> = {}) {
  return (
    <QuickAddBar
      deckId="deck-1"
      commanderIdentity={["R", "G", "W"]}
      deckOracleIds={[]}
      commanderShortName="Gishath"
      commanderOracleId="cmd-gishath"
      declaredBracket={null}
      noteCounts={EMPTY_NOTE_COUNTS}
      {...props}
    />
  );
}
function mount(props: Partial<React.ComponentProps<typeof QuickAddBar>> = {}) {
  return render(
    <CollectionEditScope>
      <AddCardsHost totalCards={4492}>{bar(props)}</AddCardsHost>
    </CollectionEditScope>,
  );
}

const field = () => screen.getByRole("combobox");
const bridge = () => screen.queryByRole("button", { name: addPanelCopy.quickAddEmpty.addToCollection });
const sheet = () => screen.queryByRole("dialog", { name: "Add cards" });
const toggle = () => screen.getByRole("checkbox", { name: /only cards you own/i });

async function typeAndMiss(q = "ghalta") {
  fireEvent.change(field(), { target: { value: q } });
  await waitFor(() => expect(screen.getByText(addPanelCopy.quickAddEmpty.heading)).toBeTruthy());
  // The miss's one read with the filter off (could the dock list this card once owned?) lands.
  await act(async () => {});
}

beforeEach(() => {
  pathname = "/decks/deck-1";
  vi.clearAllMocks();
  // Nothing owned matches; with the filter off the dock would list the card (it is in identity and Commander-legal).
  searchCards.mockImplementation(async (...args: unknown[]) => (args[2] ? [] : [{ ...ghalta, owned: false, ownedQty: 0 }]));
  forgetJustOwned("deck-1", "ghalta");
});
afterEach(() => cleanup());

describe("QuickAddBar — the bridge to Add cards", () => {
  it("draws the press above the shipped escape, only while Owned only is on (K2, K9)", async () => {
    mount();
    await typeAndMiss();
    const press = bridge();
    expect(press).toBeTruthy();
    const escape = screen.getByRole("button", { name: addPanelCopy.quickAddEmpty.dropFilter });
    // Above: earlier in document order, in the same empty state.
    expect(press!.compareDocumentPosition(escape) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(press!.className).toContain("min-h-[44px]");

    // With the filter off the dock lists the card the press was offered for (E15), and the press goes with the filter.
    fireEvent.click(toggle());
    await waitFor(() => expect(screen.getAllByRole("row").length).toBe(1));
    expect(bridge()).toBeNull();
    expect(screen.queryByText(addPanelCopy.quickAddEmpty.heading)).toBeNull();
  });

  it("draws no press on a miss with Owned only off (K9)", async () => {
    searchCards.mockImplementation(async () => []);
    mount();
    fireEvent.click(toggle());
    fireEvent.change(field(), { target: { value: "ghalta" } });
    await waitFor(() => expect(screen.getByText(addPanelCopy.quickAddEmpty.bodyAllCards("ghalta", "Naya"))).toBeTruthy());
    await act(async () => {});
    expect(bridge()).toBeNull();
    // No probe off the filter: the miss already is the filter-off answer.
    expect(searchCards).toHaveBeenCalledTimes(1);
  });

  it("asks once, with the filter off and the dock's identity, whether the dock could list the card", async () => {
    mount();
    await typeAndMiss();
    expect(bridge()).toBeTruthy();
    const unfiltered = searchCards.mock.calls.filter((c) => c[2] === false);
    expect(unfiltered).toEqual([["ghalta", ["R", "G", "W"], false, "deck-1"]]);
  });

  it("draws no press for a card the dock can never list: off-identity or not Commander-legal", async () => {
    searchCards.mockImplementation(async () => []);
    mount();
    await typeAndMiss("abstract iguanart");
    expect(searchCards.mock.calls.some((c) => c[2] === false)).toBe(true);
    expect(bridge()).toBeNull();
    // The shipped escape still stands.
    expect(screen.getByRole("button", { name: addPanelCopy.quickAddEmpty.dropFilter })).toBeTruthy();
  });

  /** The filter-off reads, each held until the test answers it, in the order they were asked. */
  function holdUnfiltered() {
    const held: { q: unknown; answer: (r: SearchResult[]) => void }[] = [];
    searchCards.mockImplementation((...args: unknown[]) =>
      args[2] ? Promise.resolve([]) : new Promise<SearchResult[]>((answer) => held.push({ q: args[0], answer })),
    );
    return held;
  }
  const listableRow: SearchResult = { ...ghalta, owned: false, ownedQty: 0 };

  it("draws no press for a later query when an earlier query's read lands after the reader moved on", async () => {
    const held = holdUnfiltered();
    mount();
    await typeAndMiss("ghalta");
    expect(held.map((h) => h.q)).toEqual(["ghalta"]);
    await typeAndMiss("zzyzx");
    expect(held.map((h) => h.q)).toEqual(["ghalta", "zzyzx"]);
    // The first query's answer arrives late, and says listable: it is filed under "ghalta", not the field's query.
    await act(async () => held[0].answer([listableRow]));
    expect(bridge()).toBeNull();
    await act(async () => held[1].answer([]));
    expect(bridge()).toBeNull();
    // Back to the earlier miss: its kept answer draws the press, with no second read.
    await typeAndMiss("ghalta");
    expect(held).toHaveLength(2);
    expect(bridge()).toBeTruthy();
  });

  it("draws no press when Owned only is turned off while the read is out", async () => {
    const held = holdUnfiltered();
    mount();
    await typeAndMiss("ghalta");
    fireEvent.click(toggle());
    // The dock's own filter-off search is held too: answer it empty, so the all-cards miss is drawn.
    await waitFor(() => expect(held).toHaveLength(2));
    await act(async () => held[1].answer([]));
    await waitFor(() => expect(screen.getByText(addPanelCopy.quickAddEmpty.bodyAllCards("ghalta", "Naya"))).toBeTruthy());
    await act(async () => held[0].answer([listableRow]));
    expect(bridge()).toBeNull();
  });

  it("draws no press when the read with the filter off is never answered", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const held = holdUnfiltered();
      mount();
      await typeAndMiss("ghalta");
      expect(held).toHaveLength(1);
      await act(async () => void vi.advanceTimersByTime(8_000));
      expect(bridge()).toBeNull();
      // A late answer after the timeout changes nothing.
      await act(async () => held[0].answer([listableRow]));
      expect(bridge()).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("draws no press when the read with the filter off fails", async () => {
    searchCards.mockImplementation(async (...args: unknown[]) => {
      if (args[2]) return [];
      throw new Error("boom");
    });
    mount();
    await typeAndMiss();
    expect(bridge()).toBeNull();
  });

  it("draws no press with no shell host (the About figure), nor on the public card page (E6)", async () => {
    render(bar());
    await typeAndMiss();
    expect(bridge()).toBeNull();
    cleanup();

    pathname = "/card/ghalta";
    mount();
    await typeAndMiss();
    expect(bridge()).toBeNull();
  });

  it("opens the shipped sheet with the dock's query carried, and keeps the query while it is up (K3)", async () => {
    mount();
    await typeAndMiss("  ghalta ");
    fireEvent.click(bridge()!);
    await waitFor(() => expect(sheet()).toBeTruthy());
    expect(sheetProps).toHaveBeenLastCalledWith(expect.objectContaining({ mode: "add", initialQuery: "ghalta" }));
    // A press inside the sheet is outside the bar, and is not the reader putting the search down.
    fireEvent.pointerDown(screen.getByRole("button", { name: "save" }));
    expect(field()).toHaveValue("  ghalta ");
  });

  it("comes back as it was on a close with no save: query, filter, focus, and no second search (K6)", async () => {
    mount();
    await typeAndMiss();
    const reads = searchCards.mock.calls.length;
    fireEvent.click(bridge()!);
    await waitFor(() => expect(sheet()).toBeTruthy());
    await act(async () => screen.getByRole("button", { name: "done" }).click());
    await waitFor(() => expect(sheet()).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(field()));
    expect(field()).toHaveValue("ghalta");
    expect(toggle()).toBeChecked();
    expect(searchCards.mock.calls.length).toBe(reads);
  });

  it("runs the search again after a save and rings the row that landed owned, its count in --success (K6, K-D2)", async () => {
    mount();
    await typeAndMiss();
    fireEvent.click(bridge()!);
    await waitFor(() => expect(sheet()).toBeTruthy());
    searchCards.mockResolvedValue([ghalta]);
    await act(async () => screen.getByRole("button", { name: "save" }).click());
    await act(async () => screen.getByRole("button", { name: "done" }).click());
    await waitFor(() => expect(screen.getAllByRole("row").length).toBe(1));
    const row = screen.getByRole("row");
    expect(row).toHaveAttribute("data-quick-add-ring");
    expect(row.style.boxShadow).toBe("inset 0 0 0 1.5px var(--success)");
    const counts = screen.getAllByText(addPanelCopy.quickAdd.rowOwned(1));
    expect(counts.some((n) => n.style.color === "var(--success)")).toBe(true);
    expect(document.activeElement).toBe(field());

    // Typing is a new search: the ring goes.
    fireEvent.change(field(), { target: { value: "ghalt" } });
    await waitFor(() => expect(screen.getByRole("row")).not.toHaveAttribute("data-quick-add-ring"));
  });

  /** Typed, missed, bridged, saved and closed: the re-run's rows land ringed. */
  async function returnRinged() {
    mount();
    await typeAndMiss();
    fireEvent.click(bridge()!);
    await waitFor(() => expect(sheet()).toBeTruthy());
    searchCards.mockResolvedValue([ghalta]);
    await act(async () => screen.getByRole("button", { name: "save" }).click());
    await act(async () => screen.getByRole("button", { name: "done" }).click());
    await waitFor(() => expect(screen.getByRole("row")).toHaveAttribute("data-quick-add-ring"));
  }

  it("notes a ringed card once the deck accepts it, for this deck only, so its deck row rings (K7)", async () => {
    let answer!: (r: { ok: true }) => void;
    addCardToDeck.mockImplementationOnce(() => new Promise((resolve) => (answer = resolve)));
    await returnRinged();
    expect(isJustOwned("deck-1", "ghalta")).toBe(false);
    await act(async () => fireEvent.click(screen.getByRole("row")));
    expect(addCardToDeck).toHaveBeenCalledWith("deck-1", "ghalta");
    // Not at the press: the add has not been accepted yet.
    expect(isJustOwned("deck-1", "ghalta")).toBe(false);
    await act(async () => answer({ ok: true }));
    expect(isJustOwned("deck-1", "ghalta")).toBe(true);
    expect(isJustOwned("deck-2", "ghalta")).toBe(false);
  });

  it("notes nothing when the deck refuses the add", async () => {
    addCardToDeck.mockResolvedValueOnce({ ok: false, message: "Nope." } as never);
    await returnRinged();
    await act(async () => fireEvent.click(screen.getByRole("row")));
    expect(addCardToDeck).toHaveBeenCalledWith("deck-1", "ghalta");
    expect(isJustOwned("deck-1", "ghalta")).toBe(false);
  });

  it("notes nothing for an add from a row the bridge did not ring", async () => {
    searchCards.mockResolvedValue([ghalta]);
    mount();
    fireEvent.change(field(), { target: { value: "ghalta" } });
    await waitFor(() => expect(screen.getAllByRole("row").length).toBe(1));
    await act(async () => fireEvent.click(screen.getByRole("row")));
    expect(isJustOwned("deck-1", "ghalta")).toBe(false);
  });

  /** Typed, missed, bridged, saved and closed, with the re-run held so it never lands. */
  async function returnWithRerunHeld() {
    mount();
    await typeAndMiss();
    fireEvent.click(bridge()!);
    await waitFor(() => expect(sheet()).toBeTruthy());
    searchCards.mockImplementationOnce(() => new Promise<SearchResult[]>(() => {}));
    searchCards.mockResolvedValue([ghalta]);
    await act(async () => screen.getByRole("button", { name: "save" }).click());
    await act(async () => screen.getByRole("button", { name: "done" }).click());
    await waitFor(() => expect(sheet()).toBeNull());
    // The close reaches the dock once the sheet's history entry has gone: it hands focus back and starts the re-run.
    await waitFor(() => expect(document.activeElement).toBe(field()));
    // The owned-only miss, its read with the filter off, and the re-run.
    await waitFor(() => expect(searchCards).toHaveBeenCalledTimes(3));
  }

  it("rings nothing for a search typed before the re-run landed", async () => {
    await returnWithRerunHeld();
    fireEvent.change(field(), { target: { value: "ghalt" } });
    await waitFor(() => expect(screen.getAllByRole("row").length).toBe(1));
    expect(screen.getByRole("row")).not.toHaveAttribute("data-quick-add-ring");
  });

  it("leaves a search typed in the beat before the close arrives alone: no re-run, no ring", async () => {
    mount();
    await typeAndMiss();
    fireEvent.click(bridge()!);
    await waitFor(() => expect(sheet()).toBeTruthy());
    searchCards.mockResolvedValue([ghalta]);
    await act(async () => screen.getByRole("button", { name: "save" }).click());
    // Synchronous: the sheet goes, and the host's close waits a tick for the sheet's history entry.
    act(() => screen.getByRole("button", { name: "done" }).click());
    expect(sheet()).toBeNull();
    const before = searchCards.mock.calls.length;
    fireEvent.change(field(), { target: { value: "ghalt" } });
    await waitFor(() => expect(screen.getAllByRole("row").length).toBe(1));
    expect(screen.getByRole("row")).not.toHaveAttribute("data-quick-add-ring");
    // Only the typed search ran: the close started no re-run over it.
    expect(searchCards.mock.calls.length).toBe(before + 1);
  });

  it("leaves a filter flipped in the beat before the close arrives alone: no re-run, no ring (C1)", async () => {
    mount();
    await typeAndMiss();
    fireEvent.click(bridge()!);
    await waitFor(() => expect(sheet()).toBeTruthy());
    searchCards.mockResolvedValue([ghalta]);
    await act(async () => screen.getByRole("button", { name: "save" }).click());
    act(() => screen.getByRole("button", { name: "done" }).click());
    expect(sheet()).toBeNull();
    const before = searchCards.mock.calls.length;
    fireEvent.click(toggle());
    await waitFor(() => expect(screen.getAllByRole("row").length).toBe(1));
    expect(screen.getByRole("row")).not.toHaveAttribute("data-quick-add-ring");
    expect(searchCards.mock.calls.length).toBe(before + 1);
  });

  it("keeps waiting through a failed re-run and rings the rows Try again lands (K7)", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      mount();
      await typeAndMiss();
      fireEvent.click(bridge()!);
      await waitFor(() => expect(sheet()).toBeTruthy());
      searchCards.mockRejectedValueOnce(new Error("boom"));
      searchCards.mockResolvedValue([ghalta]);
      await act(async () => screen.getByRole("button", { name: "save" }).click());
      await act(async () => screen.getByRole("button", { name: "done" }).click());
      const alert = await screen.findByRole("alert");
      await act(async () => within(alert).getByRole("button", { name: addPanelCopy.quickAdd.searchRetry }).click());
      await waitFor(() => expect(screen.getAllByRole("row").length).toBe(1));
      expect(screen.getByRole("row")).toHaveAttribute("data-quick-add-ring");
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("lets a press outside clear the query again after the sheet left with a navigation (K8)", async () => {
    const { rerender } = mount();
    await typeAndMiss();
    fireEvent.click(bridge()!);
    await waitFor(() => expect(sheet()).toBeTruthy());
    // The host drops the sheet on a navigation and reports no close.
    pathname = "/decks/deck-1/versions";
    rerender(
      <CollectionEditScope>
        <AddCardsHost totalCards={4492}>{bar()}</AddCardsHost>
      </CollectionEditScope>,
    );
    await waitFor(() => expect(sheet()).toBeNull());
    fireEvent.pointerDown(document.body);
    expect(field()).toHaveValue("");
  });

  it("rings nothing for a filter flipped before the re-run landed", async () => {
    await returnWithRerunHeld();
    fireEvent.click(toggle());
    await waitFor(() => expect(screen.getAllByRole("row").length).toBe(1));
    expect(screen.getByRole("row")).not.toHaveAttribute("data-quick-add-ring");
  });
});
