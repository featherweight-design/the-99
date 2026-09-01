import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PageHeader } from "./page-header";
import { availabilityCopy } from "../../lib/copy/availability";

// Every assertion counts two matches: the header ships a mobile and a desktop
// branch, both always in the DOM, with visibility left to Tailwind.
describe("PageHeader subtitle", () => {
  it("names what the list is ranked by in each mode", () => {
    render(<PageHeader uniqueCardsRead={1240} avail="all" />);
    expect(
      screen.getAllByText(`1,240 cards scanned · ${availabilityCopy.ranking.subtitleAll}`),
    ).toHaveLength(2);
  });

  it("switches the clause under ?avail=free", () => {
    render(<PageHeader uniqueCardsRead={1240} avail="free" />);
    expect(
      screen.getAllByText(`1,240 cards scanned · ${availabilityCopy.ranking.subtitleFree}`),
    ).toHaveLength(2);
  });

  // The no-candidates page renders this header with nothing ranked beneath it,
  // so the clause would be a claim about a list that isn't there.
  it("drops the clause when no mode is given", () => {
    render(<PageHeader uniqueCardsRead={1240} />);
    expect(screen.getAllByText("1,240 cards scanned")).toHaveLength(2);
  });
});
