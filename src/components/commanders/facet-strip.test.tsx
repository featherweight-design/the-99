import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { FacetStrip } from "./facet-strip";
import { synergyCopy } from "../../lib/copy/synergy-discovery";

const counts = { creature: 66, spell: 40, artifact: 22, enchantment: 14, land: 56, other: 0, all: 198 };

describe("FacetStrip", () => {
  it("is a radiogroup, not a tablist", () => {
    render(<FacetStrip counts={counts} selected="creature" onSelect={() => {}} />);
    expect(screen.getByRole("radiogroup", { name: synergyCopy.facet.groupAria })).toBeInTheDocument();
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });

  it("marks the selected facet checked and no other", () => {
    render(<FacetStrip counts={counts} selected="creature" onSelect={() => {}} />);
    const checked = screen.getAllByRole("radio").filter((r) => r.getAttribute("aria-checked") === "true");
    expect(checked).toHaveLength(1);
    expect(checked[0]).toHaveAccessibleName(synergyCopy.facet.itemAria("Creatures", "66"));
  });

  // A pill for a facet with no rows behind it is a control that does nothing.
  it("omits a facet with a zero count", () => {
    render(<FacetStrip counts={counts} selected="creature" onSelect={() => {}} />);
    expect(screen.queryByText(/^Other/)).not.toBeInTheDocument();
  });

  it("reports the chosen facet", () => {
    const onSelect = vi.fn();
    render(<FacetStrip counts={counts} selected="creature" onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("radio", { name: synergyCopy.facet.itemAria("Lands", "56") }));
    expect(onSelect).toHaveBeenCalledWith("land");
  });
});
