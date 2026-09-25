import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { swapToolsCopy } from "../../lib/copy/swap-tools";
import type { DeckDetailCard } from "../../lib/decks/grouping";
import type { StandInsRead } from "../../lib/swaps/gather";

const asOf = new Date("2026-09-20T00:00:00Z");
const cardRow = (name: string) => ({ oracleId: `id-${name}`, name, typeLine: "Instant", oracleText: "", keywords: [], cmc: 2, imageUri: null });
const standIn = (name: string, free: boolean) => ({
  card: cardRow(name), free, soft: 0, owned: free ? 1 : 0, cents: free ? null : 300, foilOnly: false,
  inclusion: null, synergy: null, isUniversal: false, shared: ["removal"], sharedThemes: [], extra: [], missing: [], once: [], rung: null, drawbacks: [], givesUp: [],
});
const READ = {
  job: { kind: "spell", roles: ["removal"], mv: 2 }, originalCents: 1500,
  groups: [{ same: true, type: "instant", rows: [{ ...standIn("Swords to Plowshares", true), soft: 1 }, standIn("Chaos Warp", false)] }],
  original: cardRow("Anguished Unmaking"), commanders: ["Gishath"], newestAsOf: asOf,
} as unknown as StandInsRead;

const { loadStandInsAction, takeStandInAction, undoSwapAction } = vi.hoisted(() => ({
  loadStandInsAction: vi.fn(), takeStandInAction: vi.fn(), undoSwapAction: vi.fn(),
}));
vi.mock("../../lib/swaps/actions", () => ({ loadStandInsAction, takeStandInAction, undoSwapAction }));

const { CardDetailProvider } = await import("../cards/card-detail-provider");
const { SwapToolsProvider, useSwapTools } = await import("../../lib/swaps/context");
const { StandInsSheet } = await import("./stand-ins-sheet");

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
    expect(within(sheet).getByText([swapToolsCopy.sheet.leadSpellsJob("removal", 2), swapToolsCopy.sheet.leadSpellsOrderUnlisted("Anguished Unmaking")].join(" "))).toBeInTheDocument();
    expect(within(sheet).getByText(/Cheapest printing of each, from ManaPool/)).toBeInTheDocument();
    expect(screen.queryByRole("status")).toBeNull();
  });

  // Addendum §1b with Hugh's Q3: five rows, then a text button that expands the group in place.
  it("shows five rows of a longer group, and Show all expands it in place and back", async () => {
    const seven = Array.from({ length: 7 }, (_, i) => standIn(`Removal ${i + 1}`, false));
    loadStandInsAction.mockResolvedValue({ ...READ, groups: [{ same: true, type: "instant", rows: seven }] });
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
describe("StandInsSheet row preview", () => {
  const ART = "https://cards.example/chaos-warp.jpg";
  const withArt = {
    ...READ,
    groups: [{ same: true, type: "instant", rows: [{ ...standIn("Chaos Warp", false), card: { ...cardRow("Chaos Warp"), imageUri: ART } }] }],
  } as unknown as StandInsRead;

  it("opens the card's preview after the hover delay, and a press closes it", async () => {
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
      fireEvent.mouseEnter(row, { clientX: 300, clientY: 300 });
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
