import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { BrowseFilters } from "../../lib/collection/browse";
import { ChipRow } from "./chip-row";

const filters: BrowseFilters = {
  search: "",
  colors: [],
  types: [],
  setCodes: [],
  availability: ["hard", "over"],
};

function renderRow(onRemoveAvailability = vi.fn()) {
  render(
    <ChipRow
      filters={filters}
      sort="name"
      resultCount={64}
      uniqueCount={1418}
      totalQuantity={2933}
      onClearAll={() => {}}
      onRemoveColor={() => {}}
      onRemoveType={() => {}}
      setLabels={{}}
      onRemoveSet={() => {}}
      onClearSearch={() => {}}
      onRemoveAvailability={onRemoveAvailability}
    />,
  );
  return onRemoveAvailability;
}

describe("ChipRow availability chips", () => {
  it("renders one removable chip per selected state, in the design's words", () => {
    renderRow();
    expect(screen.getByText("In use")).toBeInTheDocument();
    expect(screen.getByText("Over-committed")).toBeInTheDocument();
  });

  it("uses the addendum's remove label", () => {
    renderRow();
    expect(screen.getByRole("button", { name: "Remove filter: in use" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Remove filter: over-committed" }),
    ).toBeInTheDocument();
  });

  it("removes just that state", () => {
    const onRemove = renderRow();
    screen.getByRole("button", { name: "Remove filter: in use" }).click();
    expect(onRemove).toHaveBeenCalledWith("hard");
  });

  it("counts an availability selection as an active filter", () => {
    renderRow();
    expect(screen.getByText("Showing 64 of 2,933")).toBeInTheDocument();
  });
});
