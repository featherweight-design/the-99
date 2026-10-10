// Deck printings: the clean arrival strip with the import's printing clauses.
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ArrivalStrip } from "./arrival-strip";
import { deckImportCopy } from "../../lib/copy/deck-import";

const copy = deckImportCopy.arrival;

describe("ArrivalStrip with printings", () => {
  it("reads as main with no printings", () => {
    render(<ArrivalStrip deckId="d-none" importedLineCount={100} />);
    expect(screen.getByText(copy.clean("100"))).toBeTruthy();
    expect(screen.getByText(copy.cleanMobile("100"))).toBeTruthy();
  });

  it("adds both clauses, desktop and phone", () => {
    render(<ArrivalStrip deckId="d-both" importedLineCount={100} printings={{ kept: 12, notOwned: 3 }} />);
    expect(screen.getByText(
      "All 100 lines came over clean, 12 with the printing you own, 3 not in your Collection. Imported from your list a moment ago.",
    )).toBeTruthy();
    expect(screen.getByText("All 100 came over · 12 printings kept, 3 not in your Collection")).toBeTruthy();
  });

  it("drops a clause whose count is 0", () => {
    render(<ArrivalStrip deckId="d-one" importedLineCount={99} printings={{ kept: 0, notOwned: 2 }} />);
    expect(screen.getByText(
      "All 99 lines came over clean, 2 not in your Collection. Imported from your list a moment ago.",
    )).toBeTruthy();
    render(<ArrivalStrip deckId="d-kept" importedLineCount={99} printings={{ kept: 1, notOwned: 0 }} />);
    expect(screen.getByText("All 99 came over · 1 printing kept")).toBeTruthy();
  });
});
