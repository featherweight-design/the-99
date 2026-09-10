// The export dialog's Shopping tab now shows the same list the Shopping filter
// does, which is no longer "unowned cards": a card you own whose every copy is
// spoken for by another deck is on it too. Both the dot and the count had said
// otherwise.

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { exportShoppingCopy } from "../../lib/copy/decks-builder";
import { ExportDialog } from "./export-dialog";

function openShoppingTab() {
  render(
    <ExportDialog
      deckName="Kykar, Wind's Fury"
      commanderName="Kykar, Wind's Fury"
      partnerName={null}
      decklistCards={[{ name: "Mountain", quantity: 30 }]}
      shoppingCards={[
        { name: "Sol Ring", quantity: 1, owned: false },
        { name: "Cultivate", quantity: 2, owned: true },
      ]}
      open
      onClose={vi.fn()}
    />,
  );
  // Both the mobile and the desktop subtree mount; the tab is switched on the
  // shared state, so clicking either moves both.
  fireEvent.click(screen.getAllByRole("button", { name: "Shopping list" })[0]);
}

describe("ExportDialog shopping tab", () => {
  it("reads each row's ownership rather than calling every row unowned", () => {
    openShoppingTab();
    expect(screen.getAllByLabelText("Not owned").length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText("Owned").length).toBeGreaterThan(0);
  });

  // "3 cards · unowned" was a false sentence the moment a spoken-for card could
  // join the list. The count is of copies, as every Shopping figure is.
  it("counts copies and names them as things to buy, not as things unowned", () => {
    openShoppingTab();
    expect(screen.getAllByText(exportShoppingCopy.countMeta(3)).length).toBeGreaterThan(0);
    expect(screen.queryByText(/unowned/)).toBeNull();
  });
});
