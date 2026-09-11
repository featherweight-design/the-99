import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { FilterChassis, type FilterChip } from "./filter-chassis";

const base = {
  sort: <button type="button">Sort · Recent</button>,
  onClearAll: () => {},
  resultLine: "41 decks",
  form: "wide" as const,
};

const chip = (key: string, label: string): FilterChip => ({ key, label, onRemove: () => {} });

describe("FilterChassis", () => {
  it("prints No filters on at rest rather than collapsing the row", () => {
    // Decision 2. The line IS the invariant that keeps the frame a fixed height;
    // a conditionally rendered chip row is the bug this forbids.
    const { container } = render(<FilterChassis {...base} controls={null} chips={[]} />);
    expect(screen.getByText("No filters on")).toBeTruthy();
    expect(container.querySelector("[data-chassis-row='chips']")).toBeTruthy();
  });

  it("keeps all three rows present whether filtered or not", () => {
    const { container, rerender } = render(<FilterChassis {...base} controls={null} chips={[]} />);
    const rowsAtRest = container.querySelectorAll("[data-chassis-row]").length;
    rerender(<FilterChassis {...base} controls={null} chips={[chip("status:playing", "Status · Playing")]} />);
    expect(container.querySelectorAll("[data-chassis-row]").length).toBe(rowsAtRest);
    expect(rowsAtRest).toBe(3);
  });

  it("draws the same three rows at four dimensions and at five", () => {
    // The height invariant the whole round turns on: a route with five
    // dimensions and a route with four get the same frame, which is what lets
    // `Printed in` land later without the chassis changing.
    const four = <><i>a</i><i>b</i><i>c</i><i>d</i></>;
    const five = <><i>a</i><i>b</i><i>c</i><i>d</i><i>e</i></>;
    const { container, rerender } = render(<FilterChassis {...base} controls={four} chips={[]} />);
    const before = container.querySelectorAll("[data-chassis-row]").length;
    rerender(<FilterChassis {...base} controls={five} chips={[]} />);
    expect(container.querySelectorAll("[data-chassis-row]").length).toBe(before);
  });

  it("separates sort from the filters with a hairline, on both forms", () => {
    // Decision 11. Sort is not a filter and the separation is what says so.
    for (const form of ["wide", "compact"] as const) {
      const { container, unmount } = render(
        <FilterChassis {...base} form={form} controls={null} chips={[]} />,
      );
      expect(container.querySelector("[data-chassis-hairline]")).toBeTruthy();
      unmount();
    }
  });

  it("never lets the control row wrap", () => {
    // Decision 18: two forms, nothing in between. A sort landing on its own
    // line reads as a bug, which is exactly how R1's wrapping row was reported.
    const { container } = render(<FilterChassis {...base} controls={null} chips={[]} />);
    const row = container.querySelector("[data-chassis-row='controls']")!;
    expect(row.className).not.toMatch(/flex-wrap/);
  });

  it("names the value a chip removes, never a bare Remove", () => {
    const onRemove = vi.fn();
    render(
      <FilterChassis {...base} controls={null} chips={[{ key: "c", label: "3 colours", onRemove }]} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Remove filter: 3 colours" }));
    expect(onRemove).toHaveBeenCalled();
  });

  it("says the sort is unchanged when clearing every filter", () => {
    // "filters" is load-bearing in the copy: this control deliberately does not
    // touch the sort, and the accessible name is where that promise is made.
    const onClearAll = vi.fn();
    render(
      <FilterChassis {...base} onClearAll={onClearAll} controls={null} chips={[chip("a", "Status · Playing")]} />,
    );
    const clear = screen.getByRole("button", { name: "Clear all filters. The sort is unchanged." });
    fireEvent.click(clear);
    expect(onClearAll).toHaveBeenCalled();
  });

  it("offers no clear-all when there is nothing to clear", () => {
    render(<FilterChassis {...base} controls={null} chips={[]} />);
    expect(screen.queryByText("Clear all filters")).toBeNull();
  });

  it("gives a chip's remove a real 44px target without growing the chip", () => {
    // The chip line's height is the invariant the whole frame rests on, so the
    // target is an overlay rather than padding — the same treatment
    // `collection/chip-row.tsx` uses.
    render(<FilterChassis {...base} controls={null} chips={[chip("a", "3 colours")]} />);
    const remove = screen.getByRole("button", { name: "Remove filter: 3 colours" });
    expect(remove.className).toContain("after:h-[44px]");
    expect(remove.className).toContain("after:min-w-[44px]");
  });

  it("carries exactly one live region", () => {
    const { container } = render(
      <FilterChassis {...base} controls={null} chips={[chip("a", "x")]} />,
    );
    expect(container.querySelectorAll("[aria-live]")).toHaveLength(1);
  });
});
