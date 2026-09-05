// Exporting a deck past 99 (#280). The export is not blocked — the list is
// what the player has, and a paste target will tell them the same thing. The
// note exists so the count is not a surprise on the other side.

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { overCopy } from "../../lib/copy/decks-builder";
import { ExportDialog } from "./export-dialog";

function mount(bodyCards: number) {
  render(
    <ExportDialog
      deckName="Kykar, Wind's Fury"
      commanderName="Kykar, Wind's Fury"
      // One row carrying the whole body: the note reads a summed quantity, not
      // a row count, and a stack of basics is how a real deck goes over.
      decklistCards={[{ name: "Mountain", quantity: bodyCards }]}
      shoppingCards={[]}
      open
      onClose={vi.fn()}
    />,
  );
}

describe("ExportDialog over 99", () => {
  // 104 in the body plus the commander is a list of 105, which is the figure
  // the preview header prints — the note has to agree with it. The overage is
  // still five, because a Commander deck holds a hundred.
  it("says how far over the list is, sized to the whole list", () => {
    mount(104);
    expect(screen.getAllByText(overCopy.exportNote("105", "5"))).not.toHaveLength(0);
  });

  it("says nothing at 99", () => {
    mount(99);
    expect(screen.queryByText(/over what a Commander deck can hold/)).not.toBeInTheDocument();
  });

  it("still offers the copy and download controls", () => {
    mount(104);
    expect(screen.getAllByRole("button", { name: /copy/i })[0]).toBeEnabled();
    expect(screen.getAllByRole("button", { name: /download/i })[0]).toBeEnabled();
  });
});
