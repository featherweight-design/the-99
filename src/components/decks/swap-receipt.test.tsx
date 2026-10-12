import { act, render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";

import { swapToolsCopy } from "../../lib/copy/swap-tools";
import type { DeckDetailCard } from "../../lib/decks/grouping";
import type { SwapReceipt } from "../../lib/swaps/context";

const { undoSwapAction } = vi.hoisted(() => ({ undoSwapAction: vi.fn() }));
vi.mock("../../lib/swaps/actions", () => ({ undoSwapAction }));
// The scroll is `reveal`'s; its eased motion is `reveal`'s own test. It hands back its cancel.
const { reveal } = vi.hoisted(() => ({ reveal: vi.fn(() => () => {}) }));
vi.mock("../../lib/ui/reveal", () => ({ reveal }));

const { SwapToolsProvider, useSwapTools } = await import("../../lib/swaps/context");
const { SwapReceiptRow, landOnReceipt } = await import("./swap-receipt");

const base: SwapReceipt = {
  swapId: "s1", deckId: "d1", cutOracleId: "c1", cut: "Plateau", add: "Rugged Prairie",
  cutCard: { name: "Plateau", oracleId: "c1", cardTypeGroup: "Lands", role: "land" } as DeckDetailCard, free: false, cutLeft: 0,
};

/** Seeds the provider with one receipt, then draws whatever receipts it holds. */
function Harness({ receipt }: { receipt: SwapReceipt }) {
  const tools = useSwapTools()!;
  const { addReceipt } = tools;
  useEffect(() => addReceipt(receipt), [addReceipt, receipt]);
  return <>{tools.receipts.map((r) => <SwapReceiptRow key={r.swapId} receipt={r} />)}</>;
}

async function draw(receipt: SwapReceipt) {
  await act(async () => {
    render(
      <SwapToolsProvider deckId="d1" deckName="Deck" storedLimitCents={null}>
        <Harness receipt={receipt} />
      </SwapToolsProvider>,
    );
  });
}

describe("SwapReceiptRow", () => {
  it("reads the bought, free and one-copy-fewer outcomes, and speaks the swap", async () => {
    await draw(base);
    // Whole text, never a substring: the free form begins with the bought one.
    expect(screen.getByText(swapToolsCopy.row.receipt("Plateau", "Rugged Prairie"), { exact: true })).toBeInTheDocument();
    expect(screen.getByText(swapToolsCopy.row.receiptAria("Plateau", "Rugged Prairie"))).toHaveClass("sr-only");
  });

  it("names a free copy", async () => {
    await draw({ ...base, free: true });
    expect(screen.getByTestId("swap-receipt")).toHaveTextContent(swapToolsCopy.row.receiptFree("Plateau", "Rugged Prairie"));
  });

  it("reads one copy fewer when copies of the cut remain", async () => {
    await draw({ ...base, cutLeft: 2 });
    expect(screen.getByTestId("swap-receipt")).toHaveTextContent(swapToolsCopy.row.receiptOneCopy("Rugged Prairie"));
  });

  it("leaves the list on Undo swap, and stays with the refusal under it when refused", async () => {
    undoSwapAction.mockResolvedValueOnce({ ok: false }).mockResolvedValueOnce({ ok: true });
    await draw(base);
    const undo = () => screen.getByRole("button", { name: swapToolsCopy.row.undoSwapAria("Plateau", "Rugged Prairie") });
    await act(async () => undo().click());
    expect(screen.getByRole("alert")).toHaveTextContent(swapToolsCopy.sheet.undoRefused);
    await act(async () => undo().click());
    expect(undoSwapAction).toHaveBeenLastCalledWith("s1");
    expect(screen.queryByTestId("swap-receipt")).toBeNull();
    expect(screen.getByText(swapToolsCopy.announce.undone("Plateau", "Rugged Prairie"))).toBeInTheDocument();
  });

  it("drops the receipts when the builder moves to another deck", async () => {
    let rerender: (ui: React.ReactElement) => void = () => {};
    await act(async () => {
      ({ rerender } = render(
        <SwapToolsProvider deckId="d1" deckName="Deck" storedLimitCents={null}>
          <Harness receipt={base} />
        </SwapToolsProvider>,
      ));
    });
    expect(screen.getByTestId("swap-receipt")).toBeInTheDocument();
    await act(async () => {
      rerender(
        <SwapToolsProvider deckId="d2" deckName="Other" storedLimitCents={null}>
          <Harness receipt={base} />
        </SwapToolsProvider>,
      );
    });
    expect(screen.queryByTestId("swap-receipt")).toBeNull();

    // A take made on d1 that lands after the move is refused; one made on d2 draws.
    await act(async () => {
      rerender(
        <SwapToolsProvider deckId="d2" deckName="Other" storedLimitCents={null}>
          <Harness receipt={{ ...base, swapId: "late" }} />
        </SwapToolsProvider>,
      );
    });
    expect(screen.queryByTestId("swap-receipt")).toBeNull();
    await act(async () => {
      rerender(
        <SwapToolsProvider deckId="d2" deckName="Other" storedLimitCents={null}>
          <Harness receipt={{ ...base, swapId: "here", deckId: "d2" }} />
        </SwapToolsProvider>,
      );
    });
    expect(screen.getByTestId("swap-receipt")).toBeInTheDocument();
  });
});

describe("landOnReceipt", () => {
  const frames = (n: number) => act(async () => {
    for (let i = 0; i < n; i++) await new Promise((r) => requestAnimationFrame(() => r(null)));
  });

  it("lands on a receipt that draws late, and never after the reader has pressed or typed elsewhere", async () => {
    const rects = vi.spyOn(Element.prototype, "getClientRects").mockReturnValue([{}] as unknown as DOMRectList);
    try {
      const view = render(<button type="button">Somewhere else</button>);
      const other = screen.getByRole("button", { name: "Somewhere else" });
      // The reader moves on while the list is still re-rendering: a press, then a Tab, before any receipt.
      landOnReceipt("late");
      other.focus();
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab" }));
      await frames(2);
      view.rerender(<><button type="button">Somewhere else</button><div data-swap-id="late"><button type="button">Undo swap</button></div></>);
      await frames(4);
      expect(document.activeElement).toBe(other);

      // With no input between, the same late receipt is landed on.
      landOnReceipt("late");
      (document.activeElement as HTMLElement).blur();
      await frames(2);
      expect(document.activeElement).toBe(screen.getByRole("button", { name: "Undo swap" }));
    } finally {
      rects.mockRestore();
    }
  });

  // Held each frame while out of view, a reveal asked again every frame would restart its beat and
  // never move: it is asked once per receipt node, and again for the node a revalidated page draws.
  it("reveals an out-of-view receipt once, not every frame, and again when the page redraws it", async () => {
    const rects = vi.spyOn(Element.prototype, "getClientRects").mockReturnValue([{}] as unknown as DOMRectList);
    const box = vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({ top: -400, bottom: -350 } as DOMRect);
    reveal.mockClear();
    try {
      const view = render(<div key="a" data-swap-id="held"><button type="button">Undo swap</button></div>);
      const stop = landOnReceipt("held");
      await frames(6);
      expect(reveal).toHaveBeenCalledTimes(1);
      expect(reveal).toHaveBeenLastCalledWith(document.querySelector('[data-swap-id="held"]'), "center");
      view.rerender(<div key="b" data-swap-id="held"><button type="button">Undo swap</button></div>);
      await frames(3);
      expect(reveal).toHaveBeenCalledTimes(2);
      stop();
    } finally {
      rects.mockRestore();
      box.mockRestore();
    }
  });
});
