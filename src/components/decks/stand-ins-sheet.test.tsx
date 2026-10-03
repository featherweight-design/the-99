import * as React from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { swapToolsCopy } from "../../lib/copy/swap-tools";
import type { DeckDetailCard } from "../../lib/decks/grouping";
import type { StandInsRead } from "../../lib/swaps/gather";

const asOf = new Date("2026-09-20T00:00:00Z");
const cardRow = (name: string) => ({ oracleId: `id-${name}`, name, typeLine: "Instant", oracleText: "", keywords: [], cmc: 2, imageUri: null });
const standIn = (name: string, free: boolean) => ({
  card: cardRow(name), free, soft: 0, owned: free ? 1 : 0, cents: free ? null : 300, foilOnly: false,
  inclusion: null, synergy: null, isUniversal: false, shared: ["removal"], sharedThemes: [], extra: [], missing: [], once: [], rung: null, drawbacks: [], givesUp: [], credit: 1, advisory: 0, lostMethods: [],
});
const READ = {
  job: { kind: "spell", roles: ["removal"], mv: 2 }, originalCents: 1500, jobRoles: ["removal"],
  groups: [{ same: true, type: "instant", rows: [{ ...standIn("Swords to Plowshares", true), soft: 1 }, standIn("Chaos Warp", false)], total: 2 }],
  original: cardRow("Anguished Unmaking"), commanders: ["Gishath"], newestAsOf: asOf,
} as unknown as StandInsRead;

const { loadStandInsAction, takeStandInAction, undoSwapAction } = vi.hoisted(() => ({
  loadStandInsAction: vi.fn(), takeStandInAction: vi.fn(), undoSwapAction: vi.fn(),
}));
vi.mock("../../lib/swaps/actions", () => ({ loadStandInsAction, takeStandInAction, undoSwapAction }));

// The trigger reports the list its stacked card would page, so the sheet's Prev/Next set is
// readable here. Kept as full objects (JSON), not just oracle ids: the sibling list carries
// each row's name and art (H23 carousel PR 1b), and a mock that reduced it to ids would still
// pass if the sheet reverted to bare ids and dropped that plumbing entirely.
vi.mock("../cards/card-detail-provider", async (actual) => ({
  ...(await actual<typeof import("../cards/card-detail-provider")>()),
  CardDetailTrigger: (
    { siblings, children }: { siblings?: readonly (string | { oracleId: string; name?: string; imageUri?: string | null })[]; children: React.ReactNode },
  ) => (
    <button
      type="button"
      data-siblings={JSON.stringify(
        siblings?.map((s) => (typeof s === "string" ? { oracleId: s } : s)) ?? [],
      )}
    >
      {children}
    </button>
  ),
}));

const { CardDetailProvider } = await import("../cards/card-detail-provider");
const { SwapToolsProvider, useSwapTools } = await import("../../lib/swaps/context");
const { StandInsSheet, StandInGroup, shownRows } = await import("./stand-ins-sheet");

const original = {
  oracleId: "id-Anguished Unmaking", name: "Anguished Unmaking", role: "removal", owned: false, quantity: 1, cardTypeGroup: "Instants",
  price: { cents: 1500, foilCents: null, etchedCents: null, asOf },
} as unknown as DeckDetailCard;

/** The receipts the provider holds, which the Shopping list draws. */
function Receipts() {
  return <div data-testid="receipts">{useSwapTools()?.receipts.map((r) => `${r.cut}>${r.add}:${r.free}`).join(",")}</div>;
}

const T = swapToolsCopy.sheet;
const takeButton = (add: string) => screen.getByRole("button", { name: T.takeAria(add, "Anguished Unmaking") });

async function open() {
  await act(async () => {
    render(
      <CardDetailProvider fetchCard={vi.fn().mockResolvedValue(null)}>
        <SwapToolsProvider deckId="d1" deckName="HD Gishath" storedLimitCents={null}>
          <StandInsSheet card={original} newestAsOf={asOf} onClose={() => {}} />
          <Receipts />
        </SwapToolsProvider>
      </CardDetailProvider>,
    );
  });
}

describe("StandInsSheet", () => {
  it("draws the head at once and the loading state while the list is read", async () => {
    loadStandInsAction.mockReturnValue(new Promise(() => {}));
    await open();
    expect(screen.getByText(swapToolsCopy.sheet.replacing("HD Gishath"))).toBeInTheDocument();
    expect(screen.getByText(swapToolsCopy.row.over("$10"))).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(swapToolsCopy.sheet.loadingSpells("removal"));
  });

  // Stand-in row addendum 3a: the comparison's tags are for the eye; a screen reader hears the same word.
  it("draws a spell row's comparison with hidden-for-sighted labels and aria-hidden tags", async () => {
    loadStandInsAction.mockResolvedValue(READ);
    await open();
    const sheet = screen.getByTestId("stand-ins-sheet");
    const row = within(sheet).getByText("Swords to Plowshares").closest("li")!;
    const compare = row.querySelector("[data-compare]")!;
    expect(compare).not.toBeNull();
    const tag = compare.querySelector('[aria-hidden="true"]')!;
    expect(tag.textContent).toBe(swapToolsCopy.sheet.compare.keeps);
    expect(compare.querySelector(".sr-only")!.textContent).toBe(`${swapToolsCopy.sheet.compare.keeps} `);
    expect(compare.textContent).toContain(swapToolsCopy.sheet.job.removal);
    // No mana value on the row: the fixture's rows share the original's.
    expect(compare.textContent).not.toMatch(/MV|mana value/);
  });

  it("draws the list in its type group once read, ownership on the row, with the foot", async () => {
    loadStandInsAction.mockResolvedValue(READ);
    await open();
    const sheet = screen.getByTestId("stand-ins-sheet");
    const headings = within(sheet).getAllByRole("heading", { level: 4 }).map((h) => h.textContent);
    expect(headings).toEqual([swapToolsCopy.sheet.groupSameType("instants")]);
    expect(within(sheet).getByText(swapToolsCopy.sheet.orderMostShared)).toBeInTheDocument();
    // Two rows, under the five a group shows: no toggle.
    expect(within(sheet).queryByRole("button", { name: /Show all/ })).toBeNull();
    expect(within(sheet).getByText(swapToolsCopy.sheet.free)).toBeInTheDocument();
    // The free copy a draft holds carries the shipped marker; the row to buy carries none.
    const swords = within(sheet).getByText("Swords to Plowshares").closest("li")!;
    expect(swords.textContent).toMatch(/1 in a draft/);
    expect(within(sheet).getByText("Chaos Warp").closest("li")!.textContent).not.toMatch(/in a draft/);
    expect(within(sheet).getByText([swapToolsCopy.sheet.leadSpellsJob("Anguished Unmaking", "removal"), swapToolsCopy.sheet.leadSpellsOrderUnlisted("Anguished Unmaking")].join(" "))).toBeInTheDocument();
    expect(within(sheet).getByText(/Cheapest printing of each, from ManaPool/)).toBeInTheDocument();
    expect(screen.queryByRole("status")).toBeNull();
  });

  // Addendum §1b with Hugh's Q3: five rows, then a text button that expands the group in place.
  it("shows five rows of a longer group, and Show all expands it in place and back", async () => {
    const seven = Array.from({ length: 7 }, (_, i) => standIn(`Removal ${i + 1}`, false));
    loadStandInsAction.mockResolvedValue({ ...READ, groups: [{ same: true, type: "instant", rows: seven, total: 7 }] });
    await open();
    const sheet = screen.getByTestId("stand-ins-sheet");
    expect(within(sheet).getAllByTestId("stand-in-row")).toHaveLength(5);
    const toggle = within(sheet).getByRole("button", { name: swapToolsCopy.sheet.showAll(7, "instants") });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(within(sheet).getAllByTestId("stand-in-row")).toHaveLength(7);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(toggle).toHaveTextContent(swapToolsCopy.sheet.showFewer);
    fireEvent.click(toggle);
    expect(within(sheet).getAllByTestId("stand-in-row")).toHaveLength(5);
  });

  // A taken row is drawn wherever it ranks: collapsing the group keeps it, with its Undo swap.
  it("keeps a taken row ranked past five when the group collapses", async () => {
    const seven = Array.from({ length: 7 }, (_, i) => standIn(`Removal ${i + 1}`, false));
    loadStandInsAction.mockReset().mockResolvedValue({ ...READ, groups: [{ same: true, type: "instant", rows: seven, total: 7 }] });
    takeStandInAction.mockResolvedValue({ ok: true, swapId: "s7", addWasFree: false, cutLeft: 0 });
    await open();
    const sheet = screen.getByTestId("stand-ins-sheet");
    fireEvent.click(within(sheet).getByRole("button", { name: swapToolsCopy.sheet.showAll(7, "instants") }));
    await act(async () => takeButton("Removal 7").click());
    fireEvent.click(within(sheet).getByRole("button", { name: swapToolsCopy.sheet.showFewer }));
    expect(within(sheet).getByTestId("stand-in-taken")).toHaveTextContent("Removal 7");
    expect(within(sheet).getAllByTestId("stand-in-row")).toHaveLength(5);
  });

  // Close-out ruling 8: the stacked card pages only the rows the sheet is showing.
  it("pages the stacked card over the five shown rows, and over all seven once expanded", async () => {
    const seven = Array.from({ length: 7 }, (_, i) => standIn(`Removal ${i + 1}`, false));
    loadStandInsAction.mockResolvedValue({ ...READ, groups: [{ same: true, type: "instant", rows: seven, total: 7 }] });
    await open();
    const sheet = screen.getByTestId("stand-ins-sheet");
    const pagedSiblings = () =>
      JSON.parse(within(sheet).getByText("Removal 1").closest("button")!.getAttribute("data-siblings")!) as
        { oracleId: string; name?: string; imageUri?: string | null }[];
    const paged = () => pagedSiblings().map((s) => s.oracleId);
    expect(paged()).toEqual(seven.slice(0, 5).map((r) => r.card.oracleId));
    // Carries each row's own name and art (H23 carousel PR 1b), not just its id — a mutation
    // that reduced the sibling list back to bare ids would still pass the id-only assertions
    // above.
    expect(pagedSiblings()).toEqual(
      seven.slice(0, 5).map((r) => ({ oracleId: r.card.oracleId, name: r.card.name, imageUri: r.card.imageUri })),
    );
    fireEvent.click(within(sheet).getByRole("button", { name: swapToolsCopy.sheet.showAll(7, "instants") }));
    expect(paged()).toEqual(seven.map((r) => r.card.oracleId));
    expect(pagedSiblings()).toEqual(
      seven.map((r) => ({ oracleId: r.card.oracleId, name: r.card.name, imageUri: r.card.imageUri })),
    );
  });

  // Close-out ruling 1: the first read is capped for payload size, so `Show all` counts the group's true
  // size and fetches the rest on the press. A rung-4 land past row 30 was unreachable before this.
  it("counts a capped group's true size, and fetches the whole group on Show all", async () => {
    const rows = (n: number) => Array.from({ length: n }, (_, i) => standIn(`Removal ${i + 1}`, false));
    loadStandInsAction.mockReset()
      .mockResolvedValueOnce({ ...READ, groups: [{ same: true, type: "instant", rows: rows(7), total: 12 }] })
      .mockResolvedValueOnce({ ...READ, groups: [{ same: true, type: "instant", rows: rows(12), total: 12 }] });
    await open();
    const sheet = screen.getByTestId("stand-ins-sheet");
    const toggle = within(sheet).getByRole("button", { name: swapToolsCopy.sheet.showAll(12, "instants") });
    expect(loadStandInsAction).toHaveBeenLastCalledWith("d1", "id-Anguished Unmaking", false);
    await act(async () => fireEvent.click(toggle));
    expect(loadStandInsAction).toHaveBeenLastCalledWith("d1", "id-Anguished Unmaking", true);
    expect(within(sheet).getAllByTestId("stand-in-row")).toHaveLength(12);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });

  it("leaves a capped group collapsed under its true count when the whole read fails", async () => {
    const seven = Array.from({ length: 7 }, (_, i) => standIn(`Removal ${i + 1}`, false));
    loadStandInsAction.mockReset()
      .mockResolvedValueOnce({ ...READ, groups: [{ same: true, type: "instant", rows: seven, total: 12 }] })
      .mockResolvedValueOnce(null);
    await open();
    const sheet = screen.getByTestId("stand-ins-sheet");
    const toggle = within(sheet).getByRole("button", { name: swapToolsCopy.sheet.showAll(12, "instants") });
    await act(async () => fireEvent.click(toggle));
    expect(within(sheet).getAllByTestId("stand-in-row")).toHaveLength(5);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).not.toBeDisabled();
  });

  // Close-out ruling 7: each thumb hatches as its design-table row says, the head's and a row's apart.
  it("hatches the head's thumb and each row's with their own tokens when there is no art", async () => {
    loadStandInsAction.mockReset().mockResolvedValue(READ);
    await open();
    const sheet = screen.getByTestId("stand-ins-sheet");
    const hatch = (el: Element) => el.querySelector('span[aria-hidden="true"]')!.getAttribute("style");
    expect(hatch(within(sheet).getByText("Chaos Warp").closest('[data-testid="stand-in-row"]')!))
      .toContain("repeating-linear-gradient(135deg, var(--elevated) 0 3px, var(--border) 3px 6px)");
    expect(hatch(sheet)).toContain("repeating-linear-gradient(135deg, var(--border) 0 3px, var(--surface-raised) 3px 6px)");
  });

  it("offers another try when the read fails, and reads again on it", async () => {
    loadStandInsAction.mockReset();
    loadStandInsAction.mockResolvedValueOnce(null).mockResolvedValueOnce(READ);
    await open();
    await act(async () => screen.getByRole("button", { name: swapToolsCopy.sheet.retry }).click());
    expect(loadStandInsAction).toHaveBeenCalledTimes(2);
    expect(screen.getByText("Chaos Warp")).toBeInTheDocument();
  });

  describe("Take", () => {
    it("lands the taken row, puts Take away on the others, leaves a receipt, and undoes", async () => {
      loadStandInsAction.mockReset().mockResolvedValue(READ);
      takeStandInAction.mockResolvedValue({ ok: true, swapId: "s1", addWasFree: false, cutLeft: 0 });
      undoSwapAction.mockResolvedValue({ ok: true });
      await open();
      await act(async () => takeButton("Chaos Warp").click());
      expect(takeStandInAction).toHaveBeenCalledWith("d1", "id-Anguished Unmaking", "id-Chaos Warp");
      expect(screen.getByTestId("stand-in-taken")).toHaveTextContent("Chaos Warp");
      expect(screen.queryByRole("button", { name: T.takeAria("Swords to Plowshares", "Anguished Unmaking") })).toBeNull();
      expect(screen.getByText(T.takenNote("Anguished Unmaking"))).toBeInTheDocument();
      expect(screen.getByTestId("receipts")).toHaveTextContent("Anguished Unmaking>Chaos Warp:false");
      await act(async () => screen.getByRole("button", { name: swapToolsCopy.row.undoSwapAria("Anguished Unmaking", "Chaos Warp") }).click());
      expect(undoSwapAction).toHaveBeenCalledWith("s1");
      expect(screen.queryByTestId("stand-in-taken")).toBeNull();
      expect(screen.getByTestId("receipts")).toHaveTextContent(/^$/);
      expect(takeButton("Swords to Plowshares")).toBeInTheDocument();
    });

    // Close-out ruling 2: closed after a take from a Shopping row, focus lands on the receipt, not the page.
    it.each([
      ["a Shopping row", false, true],
      ["the card's door, which closes back onto the card", true, false],
    ])("from %s, closing after a take lands on the receipt (%s)", async (_, fromCard, lands) => {
      loadStandInsAction.mockReset().mockResolvedValue(READ);
      takeStandInAction.mockResolvedValue({ ok: true, swapId: "s1", addWasFree: false, cutLeft: 0 });
      // jsdom lays nothing out; the helper takes the visible copy of the receipt.
      const rects = vi.spyOn(Element.prototype, "getClientRects").mockReturnValue([{}] as unknown as DOMRectList);
      const { SwapReceiptRow } = await import("./swap-receipt");
      function Host() {
        const tools = useSwapTools();
        const [shown, setShown] = React.useState(true);
        return (
          <>
            {shown ? <StandInsSheet card={original} newestAsOf={asOf} onClose={() => setShown(false)} fromCard={fromCard} /> : null}
            {tools?.receipts.map((r) => <SwapReceiptRow key={r.swapId} receipt={r} />)}
          </>
        );
      }
      try {
        await act(async () => {
          render(
            <CardDetailProvider fetchCard={vi.fn().mockResolvedValue(null)}>
              <SwapToolsProvider deckId="d1" deckName="HD Gishath" storedLimitCents={null}><Host /></SwapToolsProvider>
            </CardDetailProvider>,
          );
        });
        await act(async () => takeButton("Chaos Warp").click());
        await act(async () => screen.getAllByRole("button", { name: fromCard ? T.backToCardAria("Anguished Unmaking") : T.closeAria })[0].click());
        await act(async () => { await new Promise((r) => requestAnimationFrame(() => r(null))); });
        const undo = screen.getByRole("button", { name: swapToolsCopy.row.undoSwapAria("Anguished Unmaking", "Chaos Warp") });
        expect(document.activeElement === undo).toBe(lands);
      } finally {
        rects.mockRestore();
      }
    });

    it("lands on the receipt when the sheet was closed while the take was still in flight", async () => {
      loadStandInsAction.mockReset().mockResolvedValue(READ);
      let land!: (r: unknown) => void;
      takeStandInAction.mockReturnValueOnce(new Promise((r) => { land = r; }));
      const rects = vi.spyOn(Element.prototype, "getClientRects").mockReturnValue([{}] as unknown as DOMRectList);
      const { SwapReceiptRow } = await import("./swap-receipt");
      function Host() {
        const tools = useSwapTools();
        const [shown, setShown] = React.useState(true);
        return (
          <>
            {shown ? <StandInsSheet card={original} newestAsOf={asOf} onClose={() => setShown(false)} /> : null}
            {tools?.receipts.map((r) => <SwapReceiptRow key={r.swapId} receipt={r} />)}
          </>
        );
      }
      try {
        await act(async () => {
          render(
            <CardDetailProvider fetchCard={vi.fn().mockResolvedValue(null)}>
              <SwapToolsProvider deckId="d1" deckName="HD Gishath" storedLimitCents={null}><Host /></SwapToolsProvider>
            </CardDetailProvider>,
          );
        });
        await act(async () => takeButton("Chaos Warp").click());
        await act(async () => screen.getByRole("button", { name: T.closeAria }).click());
        await act(async () => land({ ok: true, swapId: "s2", addWasFree: false, cutLeft: 0 }));
        await act(async () => { await new Promise((r) => requestAnimationFrame(() => r(null))); });
        const undo = screen.getByRole("button", { name: swapToolsCopy.row.undoSwapAria("Anguished Unmaking", "Chaos Warp") });
        expect(document.activeElement).toBe(undo);
      } finally {
        rects.mockRestore();
      }
    });

    it("starts one swap for two presses before the first lands, and holds every Take while it runs", async () => {
      loadStandInsAction.mockReset().mockResolvedValue(READ);
      let land: (v: unknown) => void = () => {};
      takeStandInAction.mockReset().mockReturnValue(new Promise((r) => { land = r; }));
      await open();
      // Both presses in one frame, before a render can disable anything: only the ref can refuse the second.
      await act(async () => {
        takeButton("Chaos Warp").click();
        takeButton("Swords to Plowshares").click();
      });
      expect(takeStandInAction).toHaveBeenCalledTimes(1);
      expect(takeButton("Swords to Plowshares")).toBeDisabled();
      await act(async () => land({ ok: true, swapId: "s1", addWasFree: false, cutLeft: 0 }));
      expect(screen.getByTestId("receipts")).toHaveTextContent("Anguished Unmaking>Chaos Warp:false");
    });

    it("names the cause of a refusal only when the swap body reported it (F11)", async () => {
      loadStandInsAction.mockReset().mockResolvedValue(READ);
      takeStandInAction.mockResolvedValueOnce({ ok: false, reason: "cutGone" }).mockResolvedValueOnce({ ok: false, reason: "addHeld" });
      await open();
      await act(async () => takeButton("Chaos Warp").click());
      expect(screen.getByRole("alert")).toHaveTextContent(T.refused.body("HD Gishath", "Anguished Unmaking", "Chaos Warp"));
      // The row stays live: Take is still there on the refused row.
      await act(async () => takeButton("Chaos Warp").click());
      expect(screen.getByRole("alert")).toHaveTextContent(T.refused.bodyPlain("Anguished Unmaking", "Chaos Warp"));
      expect(screen.getByRole("alert")).not.toHaveTextContent("another tab");
      await act(async () => screen.getByRole("button", { name: T.refused.close }).click());
      expect(screen.queryByRole("alert")).toBeNull();
    });

    it("says a thrown take failed, under its row, and changes nothing", async () => {
      loadStandInsAction.mockReset().mockResolvedValue(READ);
      takeStandInAction.mockRejectedValueOnce(new Error("boom"));
      await open();
      await act(async () => takeButton("Chaos Warp").click());
      expect(screen.getByRole("alert")).toHaveTextContent(T.takeFailed);
      expect(screen.queryByTestId("stand-in-taken")).toBeNull();
    });
  });
});

// Swap tools v2, item 5: a stand-in row previews its card on hover, as a decklist row does, and a
// press puts the box away so it cannot sit over the card the press stacks.
// Close-out ruling 8: the stacked card's Prev/Next walks these rows, and only these.
describe("shownRows", () => {
  const row = (i: number) => ({ oracleId: `r${i}` }) as never;
  const group = (n: number, total = n) => ({ heading: "h", order: "", noun: "", rows: Array.from({ length: n }, (_, i) => row(i)), total });
  const ids = (rs: { oracleId: string }[]) => rs.map((r) => r.oracleId);
  it("is the first five of a collapsed group, the taken row kept wherever it ranks", () => {
    expect(ids(shownRows(group(8), false, null))).toEqual(["r0", "r1", "r2", "r3", "r4"]);
    expect(ids(shownRows(group(8), false, "r7"))).toEqual(["r0", "r1", "r2", "r3", "r4", "r7"]);
  });
  it("is every row of an expanded group, and of one no longer than five", () => {
    expect(shownRows(group(8), true, null)).toHaveLength(8);
    expect(shownRows(group(4), false, null)).toHaveLength(4);
  });
});

describe("StandInsSheet row preview", () => {
  const ART = "https://cards.example/chaos-warp.jpg";
  const withArt = {
    ...READ,
    groups: [{ same: true, type: "instant", rows: [{ ...standIn("Chaos Warp", false), card: { ...cardRow("Chaos Warp"), imageUri: ART } }], total: 1 }],
  } as unknown as StandInsRead;

  it("opens the card's preview once the pointer moves, after the hover delay, and a press closes it", async () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true, configurable: true,
      value: (query: string) => ({
        matches: query === "(hover: hover)", media: query, onchange: null,
        addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {},
        dispatchEvent: () => false,
      }),
    });
    loadStandInsAction.mockResolvedValue(withArt);
    await open();
    vi.useFakeTimers();
    try {
      const row = within(screen.getByTestId("stand-ins-sheet")).getByText("Chaos Warp").closest('[data-testid="stand-in-row"]')!;
      // Close-out ruling 3: a row drawn under a resting pointer previews nothing until it moves.
      fireEvent.mouseEnter(row, { clientX: 300, clientY: 300 });
      fireEvent.mouseMove(row, { clientX: 300, clientY: 300 });
      act(() => void vi.advanceTimersByTime(1000));
      expect(screen.queryByTestId("hover-preview")).toBeNull();
      fireEvent.mouseMove(row, { clientX: 306, clientY: 300 });
      act(() => void vi.advanceTimersByTime(240));
      const box = screen.getByTestId("hover-preview");
      expect(box.getAttribute("style")).toContain(ART);
      fireEvent.pointerDown(row);
      act(() => void vi.advanceTimersByTime(1000));
      expect(screen.queryByTestId("hover-preview")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});

// E3 (About launch entries): the group and its rows are exported so the About figure can draw one
// without the sheet's read. That is only honest while a standalone mount draws what the sheet draws.
describe("StandInGroup and StandInRow, mounted alone", () => {
  it("draw the same markup as the sheet's own group", async () => {
    const { StandInGroup, StandInRow } = await import("./stand-ins-sheet");
    const { sheetModel } = await import("../../lib/swaps/sheet-model");
    loadStandInsAction.mockResolvedValue(READ);
    await open();
    const group = sheetModel(READ).groups[0];
    const inSheet = screen.getByRole("region", { name: group.heading }).outerHTML;
    document.body.innerHTML = "";
    const siblings = group.rows.map((r) => ({ oracleId: r.oracleId, name: r.name, imageUri: r.imageUri }));
    const take = { onTake: () => {}, taking: false, busy: false, refused: null, error: null, cut: "Anguished Unmaking" };
    const alone = render(
      <CardDetailProvider fetchCard={vi.fn().mockResolvedValue(null)}>
        <StandInGroup group={group} keep={null}>
          {(row) => <StandInRow key={row.oracleId} row={row} newestAsOf={asOf} take={take} siblings={siblings} />}
        </StandInGroup>
      </CardDetailProvider>,
    );
    expect(alone.getByRole("region", { name: group.heading }).outerHTML).toBe(inSheet);
  });
});

// The group reads its heading and toggle from ui/sheet-group.tsx, shared with the Change commander sheet.
// Pinned before the move and held across it: folded, open, and busy while Show all fetches the rest.
describe("StandInGroup's markup", () => {
  const rows = Array.from({ length: 7 }, (_, i) => ({
    oracleId: `r${i}`, name: `Row ${i}`, imageUri: null, free: false, soft: 0, cents: 100, foilOnly: false, body: [], muted: [],
  }));
  const group = { heading: "same type · instants", order: "most in common first", noun: "instants", rows, total: 12 };
  const draw = (props: { expanded?: boolean; fetching?: boolean }) =>
    render(
      <StandInGroup group={group} {...props} onToggle={() => {}}>
        {(row) => <li key={row.oracleId}>{row.name}</li>}
      </StandInGroup>,
    ).container.innerHTML;
  it.each([
    ["folded", {}],
    ["open", { expanded: true }],
    ["busy", { fetching: true }],
  ])("is unchanged %s", (_, props) => {
    expect(draw(props)).toMatchSnapshot();
  });
});
