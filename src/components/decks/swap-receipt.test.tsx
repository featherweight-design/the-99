import { act, render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";

import { swapToolsCopy } from "../../lib/copy/swap-tools";
import type { SwapReceipt } from "../../lib/swaps/context";

const { undoSwapAction } = vi.hoisted(() => ({ undoSwapAction: vi.fn() }));
vi.mock("../../lib/swaps/actions", () => ({ undoSwapAction }));

const { SwapToolsProvider, useSwapTools } = await import("../../lib/swaps/context");
const { SwapReceiptRow } = await import("./swap-receipt");

const base: SwapReceipt = {
  swapId: "s1", cutOracleId: "c1", cut: "Plateau", add: "Rugged Prairie",
  sections: ["Lands"], groupLabel: "Lands", free: false, cutLeft: 0,
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
    expect(screen.getByTestId("swap-receipt")).toHaveTextContent(swapToolsCopy.row.receipt("Plateau", "Rugged Prairie"));
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
});
