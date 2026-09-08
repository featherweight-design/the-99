import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FilteredEmpty } from "./filtered-empty";

// The owned lane's zero state (canvas D4). The whole promise of the state is
// that it names ONE control and what dropping it returns, so the sentence and
// the buttons are pinned together: a heading with no correction under it is the
// state failing rather than a state with less to say.

describe("FilteredEmpty", () => {
  it("names the single control whose removal returns the most rows", () => {
    render(
      <FilteredEmpty
        nearest={{ name: "Yeva, Nature's Herald", control: "Red", rows: 3 }}
        onDrop={() => {}}
        onClearAll={() => {}}
      />,
    );
    expect(
      screen.getByText(
        (_, el) =>
          el?.textContent ===
          "Yeva, Nature's Herald is in your commanders, but Red excludes it. Drop the colour and you get 3 rows back.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Drop Red" })).toBeInTheDocument();
  });

  it("says one row rather than 1 rows", () => {
    render(
      <FilteredEmpty
        nearest={{ name: "Yeva, Nature's Herald", control: "Red", rows: 1 }}
        onDrop={() => {}}
        onClearAll={() => {}}
      />,
    );
    expect(screen.getByText(/you get one row back/)).toBeInTheDocument();
  });

  it("drops the promise when no single control fixes it", () => {
    render(<FilteredEmpty nearest={null} onDrop={() => {}} onClearAll={() => {}} />);
    expect(
      screen.getByText("No single filter is doing this — several are overlapping."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Drop / })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear all filters" })).toBeInTheDocument();
  });

  it("always offers Clear all filters", () => {
    render(
      <FilteredEmpty
        nearest={{ name: "Yeva, Nature's Herald", control: "Red", rows: 3 }}
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
