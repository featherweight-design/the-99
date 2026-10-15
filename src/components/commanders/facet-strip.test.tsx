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

  // Announcing the radiogroup role promises a keyboard model: one tab stop for
  // the whole group, and the arrows moving within it. Without the roving
  // tabIndex the group is six tab stops that arrow keys do nothing in.
  it("is a single tab stop on the checked pill", () => {
    render(<FacetStrip counts={counts} selected="creature" onSelect={() => {}} />);
    const reachable = screen
      .getAllByRole("radio")
      .filter((r) => r.getAttribute("tabindex") === "0");
    expect(reachable).toHaveLength(1);
    expect(reachable[0]).toHaveAccessibleName(synergyCopy.facet.itemAria("Creatures", "66"));
  });

  it("moves the selection with the arrow keys and wraps at both ends", () => {
    const onSelect = vi.fn();
    render(<FacetStrip counts={counts} selected="creature" onSelect={onSelect} />);
    const creatures = screen.getByRole("radio", {
      name: synergyCopy.facet.itemAria("Creatures", "66"),
    });
    fireEvent.keyDown(creatures, { key: "ArrowRight" });
    expect(onSelect).toHaveBeenLastCalledWith("spell");
    fireEvent.keyDown(creatures, { key: "ArrowLeft" });
    expect(onSelect).toHaveBeenLastCalledWith("all");

    // Wrap: the last pill's ArrowRight lands back on the first.
    const lands = screen.getByRole("radio", { name: synergyCopy.facet.itemAria("Lands", "56") });
    fireEvent.keyDown(lands, { key: "ArrowRight" });
    expect(onSelect).toHaveBeenLastCalledWith("all");
  });

  // The wrap has to count the pills actually drawn. A zero-count All is dropped,
  // so wrapping over a fixed six-pill order would land on a pill that is not there.
  it("wraps over the pills actually drawn when the All pill is omitted", () => {
    const onSelect = vi.fn();
    render(
      <FacetStrip counts={{ ...counts, all: 0 }} selected="land" onSelect={onSelect} />,
    );
    const lands = screen.getByRole("radio", { name: synergyCopy.facet.itemAria("Lands", "56") });
    fireEvent.keyDown(lands, { key: "ArrowRight" });
    expect(onSelect).toHaveBeenLastCalledWith("creature");
  });

  // "other" never gets a pill — its rows are only reachable through "All".
  it("omits the other facet regardless of count", () => {
    render(<FacetStrip counts={{ ...counts, other: 5 }} selected="creature" onSelect={() => {}} />);
    expect(screen.queryByRole("radio", { name: /Other/ })).not.toBeInTheDocument();
  });

  // Selecting a zero-count pill is the only route to the panel's empty-facet
  // line, so the pill stays present and clickable.
  it("keeps a zero-count facet pill selectable so the empty-facet state is reachable", () => {
    const onSelect = vi.fn();
    render(
      <FacetStrip
        counts={{ ...counts, artifact: 0 }}
        selected="creature"
        onSelect={onSelect}
      />,
    );
    const pill = screen.getByRole("radio", { name: synergyCopy.facet.itemAria("Artifacts", "0") });
    expect(pill).toBeEnabled();
    fireEvent.click(pill);
    expect(onSelect).toHaveBeenCalledWith("artifact");
  });

  it("reports the chosen facet", () => {
    const onSelect = vi.fn();
    render(<FacetStrip counts={counts} selected="creature" onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("radio", { name: synergyCopy.facet.itemAria("Lands", "56") }));
    expect(onSelect).toHaveBeenCalledWith("land");
  });

  // Segmented switch 3b: the strip is the shared switch, a well that scrolls sideways, every pill drawn alike (the
  // dashed All and the accent ring are gone), and Home and End reach the ends.
  it("draws every pill alike in a scrolling well, and Home and End reach the ends", () => {
    const onSelect = vi.fn();
    render(<FacetStrip counts={counts} selected="creature" onSelect={onSelect} />);
    const group = screen.getByRole("radiogroup", { name: synergyCopy.facet.groupAria });
    expect(group.className).toContain("overflow-x-auto");
    const radios = screen.getAllByRole("radio");
    expect(radios.every((r) => !r.getAttribute("style"))).toBe(true);
    expect(radios[0].className).toBe(radios[2].className);
    const creatures = screen.getByRole("radio", { name: synergyCopy.facet.itemAria("Creatures", "66") });
    fireEvent.keyDown(creatures, { key: "End" });
    expect(onSelect).toHaveBeenLastCalledWith("land");
    fireEvent.keyDown(creatures, { key: "Home" });
    expect(onSelect).toHaveBeenLastCalledWith("all");
  });
});
