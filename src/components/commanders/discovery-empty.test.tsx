import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { discoveryCopy } from "../../lib/copy/commander-discovery";
import { FloorEmpty, NoDecksBanner } from "./discovery-empty";

const copy = discoveryCopy.empty;

describe("NoDecksBanner", () => {
  it("names the collection it can still rank against", () => {
    render(<NoDecksBanner cardsRead={2805} />);
    expect(screen.getByText(copy.noDecksHeading)).toBeTruthy();
    expect(screen.getByText(/2,805 cards in it/)).toBeTruthy();
  });

  // The marked clause is a substring of the body, so the emphasis has to be a
  // slice of the one sentence rather than a second copy of the words.
  it("marks the clause the copy module nominates, inside the body it came from", () => {
    render(<NoDecksBanner cardsRead={2805} />);
    const mark = screen.getByText(copy.noDecksEmphasis);
    expect(mark.tagName).toBe("STRONG");
    expect(mark.closest("p")?.textContent).toBe(copy.noDecksBody(2805));
  });
});

describe("FloorEmpty", () => {
  const props = {
    floorPct: 30,
    candidateCount: 3334,
    cardsRead: 2805,
    bestPct: 18,
    onRankByFit: () => {},
  };

  it("states the floor, the pool it was applied to, and the nearest miss", () => {
    render(<FloorEmpty {...props} />);
    expect(screen.getByText(copy.floorHeading)).toBeTruthy();
    expect(
      screen.getByText((_, el) => el?.tagName === "P" && el.textContent === copy.floorBody(30, 3334, 2805, 18)),
    ).toBeTruthy();
  });

  it("marks the floor rule rather than the misses it caused", () => {
    render(<FloorEmpty {...props} />);
    expect(screen.getByText(copy.floorEmphasis(30)).tagName).toBe("STRONG");
  });

  // The only way out of this state is the other ordering — never a looser floor.
  it("offers the other sort, with the count that ordering would carry", () => {
    const onRankByFit = vi.fn();
    render(<FloorEmpty {...props} onRankByFit={onRankByFit} />);
    fireEvent.click(screen.getByRole("button", { name: copy.floorCta }));
    expect(onRankByFit).toHaveBeenCalledOnce();
    expect(screen.getByText(copy.floorCtaNote(3334))).toBeTruthy();
  });
});
