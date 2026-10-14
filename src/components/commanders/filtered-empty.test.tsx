import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { FilteredEmpty, OwnedSearchEmpty } from "./filtered-empty";

// The owned lane's zero state (canvas D4). The whole promise of the state is
// that it names ONE control and what dropping it returns, so the sentence and
// the buttons are pinned together: a heading with no correction under it is the
// state failing rather than a state with less to say.

describe("FilteredEmpty", () => {
  it("names the single control whose removal returns the most rows", () => {
    render(
      <FilteredEmpty
        nearest={{ name: "Yeva, Nature’s Herald", control: "Red", rows: 3 }}
        onDrop={() => {}}
        onClearAll={() => {}}
      />,
    );
    expect(
      screen.getByText(
        (_, el) =>
          el?.textContent ===
          "Yeva, Nature’s Herald is in your commanders, but Red excludes it. Drop the color and you get 3 rows back.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Drop Red" })).toBeInTheDocument();
  });

  it("says one row rather than 1 rows", () => {
    render(
      <FilteredEmpty
        nearest={{ name: "Yeva, Nature’s Herald", control: "Red", rows: 1 }}
        onDrop={() => {}}
        onClearAll={() => {}}
      />,
    );
    expect(screen.getByText(/you get one row back/)).toBeInTheDocument();
  });

  it("drops the promise when no single control fixes it", () => {
    render(<FilteredEmpty nearest={null} onDrop={() => {}} onClearAll={() => {}} />);
    expect(
      screen.getByText("No single filter is doing this. Several are overlapping."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Drop / })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear all filters" })).toBeInTheDocument();
  });

  it("always offers Clear all filters", () => {
    render(
      <FilteredEmpty
        nearest={{ name: "Yeva, Nature’s Herald", control: "Red", rows: 3 }}
        onDrop={() => {}}
        onClearAll={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: "Clear all filters" })).toBeInTheDocument();
  });

  it("heads the state without a CTA of its own", () => {
    render(<FilteredEmpty nearest={null} onDrop={() => {}} onClearAll={() => {}} />);
    expect(screen.getByText("Nothing in the pile matches")).toBeInTheDocument();
  });
});

// The same state said about a query rather than a pip. It is the mirror of
// `DiscoveryEmpty`, so what it is pinned on is the same: the lane boundary, and
// a handoff that carries the query the other way.
describe("OwnedSearchEmpty", () => {
  it("names the lane boundary rather than a spelling hint alone", () => {
    render(<OwnedSearchEmpty query="jodah" total={148} onClearSearch={() => {}} />);
    expect(screen.getByText("No commander by that name")).toBeInTheDocument();
    expect(screen.getByText(/it’s on Discover instead/)).toBeInTheDocument();
  });

  it("counts the lane it is speaking about", () => {
    render(<OwnedSearchEmpty query="jodah" total={1148} onClearSearch={() => {}} />);
    expect(screen.getByText(/the 1,148 you own/)).toBeInTheDocument();
  });

  it("offers the other lane, carrying the same query", () => {
    render(<OwnedSearchEmpty query="jodah" total={148} onClearSearch={() => {}} />);
    expect(screen.getByRole("link", { name: "Search Discover" })).toHaveAttribute(
      "href",
      "/discover?q=jodah",
    );
  });

  it("clears the search from its primary", () => {
    const onClearSearch = vi.fn();
    render(<OwnedSearchEmpty query="jodah" total={148} onClearSearch={onClearSearch} />);
    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(onClearSearch).toHaveBeenCalledOnce();
  });
});
