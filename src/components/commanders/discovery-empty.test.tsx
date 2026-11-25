import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { discoveryCopy } from "../../lib/copy/commander-discovery";
import { DiscoveryEmpty, FloorEmpty, NoDecksBanner } from "./discovery-empty";

const copy = discoveryCopy.empty;

describe("DiscoveryEmpty", () => {
  it("names the lane boundary rather than a spelling hint alone", () => {
    render(<DiscoveryEmpty query="jodah" total={3301} onClearSearch={() => {}} />);
    expect(screen.getByText("No commander by that name")).toBeTruthy();
    expect(screen.getByText(/it’s on your commanders instead/)).toBeTruthy();
  });

  it("offers the other lane, carrying the same query", () => {
    render(<DiscoveryEmpty query="jodah" total={3301} onClearSearch={() => {}} />);
    expect(screen.getByRole("link", { name: "Search your commanders" })).toHaveAttribute(
      "href",
      "/commanders?q=jodah",
    );
  });

  it("clears the query in place rather than routing", () => {
    const onClearSearch = vi.fn();
    render(<DiscoveryEmpty query="jodah" total={3301} onClearSearch={onClearSearch} />);
    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(onClearSearch).toHaveBeenCalledOnce();
  });
});

describe("NoDecksBanner", () => {
  // No card figure: the page header above the banner already ends "read against
  // N cards", so the banner naming it again printed the same count twice.
  it("names the sort that still works, and no card count", () => {
    render(<NoDecksBanner />);
    expect(screen.getByText(copy.noDecksHeading)).toBeTruthy();
    expect(screen.getByText(copy.noDecksEmphasis)).toBeTruthy();
    expect(screen.queryByText(/cards in it/)).toBeNull();
  });

  // The marked clause is a substring of the body, so the emphasis has to be a
  // slice of the one sentence rather than a second copy of the words.
  it("marks the clause the copy module nominates, inside the body it came from", () => {
    render(<NoDecksBanner />);
    const mark = screen.getByText(copy.noDecksEmphasis);
    expect(mark.tagName).toBe("STRONG");
    expect(mark.closest("p")?.textContent).toBe(copy.noDecksBody);
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
