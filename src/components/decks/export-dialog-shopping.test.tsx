// The export dialog's Shopping tab now shows the same list the Shopping filter
// does, which is no longer "unowned cards": a card you own whose every copy is
// spoken for by another deck is on it too. Both the dot and the count had said
// otherwise.

import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { exportLinkOutCopy, exportShoppingCopy, ownedStateCopy, exportTabCopy } from "../../lib/copy/decks-builder";
import type { Store } from "../../lib/stores/rows";
import { StoreProvider } from "../stores/store-provider";
import type { ExportShoppingCard } from "../../lib/decks/export-data";
import { ExportDialog } from "./export-dialog";

function shoppingCard(name: string, quantity: number, owned: boolean): ExportShoppingCard {
  return {
    oracleId: `oracle-${name}`,
    name,
    typeLine: "Artifact",
    cardTypeGroup: "Other",
    role: "other",
    cmc: 1,
    owned,
    quantity,
    auto: false,
    printedName: null,
    printedSetCode: "cmm",
    printedCollectorNumber: "400",
  };
}

function openShoppingTab(store: Store = "manapool") {
  render(
    <StoreProvider store={store}>
    <ExportDialog
      deckName="Kykar, Wind's Fury"
      commanderName="Kykar, Wind's Fury"
      partnerName={null}
      decklistCards={[{ name: "Mountain", quantity: 30 }]}
      shoppingCards={[shoppingCard("Sol Ring", 1, false), shoppingCard("Cultivate", 2, true)]}
      open
      onClose={vi.fn()}
    />
    </StoreProvider>,
  );
  // Both the mobile and the desktop subtree mount; the tab is switched on the
  // shared state, so clicking either moves both.
  fireEvent.click(screen.getAllByRole("tab", { name: exportTabCopy.shopping })[0]);
}

describe("ExportDialog shopping tab", () => {
  it("reads each row's ownership rather than calling every row unowned", () => {
    openShoppingTab();
    expect(screen.getAllByText(ownedStateCopy.notOwned).length).toBeGreaterThan(0);
    expect(screen.getAllByText(ownedStateCopy.owned).length).toBeGreaterThan(0);
  });

  // "3 cards · unowned" was a false sentence the moment a spoken-for card could
  // join the list. The count is of copies, as every Shopping figure is.
  it("counts copies and names them as things to buy, not as things unowned", () => {
    openShoppingTab();
    expect(screen.getAllByText(exportShoppingCopy.countMeta(3)).length).toBeGreaterThan(0);
    expect(screen.queryByText(/unowned/)).toBeNull();
  });

  // Store choice, call 6: the whole-list link needs a cart, so only Mana Pool's draws it. The list and its copy
  // button stay for any other store.
  it("links out to the cart for Mana Pool, and to nothing for a store with no cart", () => {
    openShoppingTab();
    expect(screen.getAllByRole("link", { name: new RegExp(exportLinkOutCopy.shopping) }).length).toBeGreaterThan(0);
    cleanup();
    openShoppingTab("tcgplayer");
    expect(screen.queryByRole("link", { name: new RegExp(exportLinkOutCopy.shopping) })).toBeNull();
    expect(screen.getAllByText(ownedStateCopy.notOwned).length).toBeGreaterThan(0);
  });
});
