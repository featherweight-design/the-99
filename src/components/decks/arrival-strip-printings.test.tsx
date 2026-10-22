// Deck printings: the clean arrival strip with the import's printing clauses.
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ArrivalStrip } from "./arrival-strip";
import { deckImportCopy } from "../../lib/copy/deck-import";

const copy = deckImportCopy.arrival;
const noop = () => {};

describe("ArrivalStrip with printings", () => {
  it("reads as main with no printings", () => {
    render(<ArrivalStrip onDismiss={noop} importedLineCount={100} />);
    expect(screen.getByText(copy.clean("100"))).toBeTruthy();
  });

  it("adds both clauses, one sentence at every width", () => {
    render(<ArrivalStrip onDismiss={noop} importedLineCount={100} printings={{ kept: 12, notOwned: 3 }} />);
    expect(screen.getByText(
      "All 100 lines came over clean, 12 with the printing you own, 3 not in your Collection. Imported from your list a moment ago.",
    )).toBeTruthy();
    expect(screen.queryByText(/came over ·/)).toBeNull();
  });

  it("drops a clause whose count is 0", () => {
    render(<ArrivalStrip onDismiss={noop} importedLineCount={99} printings={{ kept: 0, notOwned: 2 }} />);
    expect(screen.getByText(
      "All 99 lines came over clean, 2 not in your Collection. Imported from your list a moment ago.",
    )).toBeTruthy();
    render(<ArrivalStrip onDismiss={noop} importedLineCount={99} printings={{ kept: 1, notOwned: 0 }} />);
    expect(screen.getByText("All 99 lines came over clean, 1 with the printing you own. Imported from your list a moment ago.")).toBeTruthy();
  });
});
