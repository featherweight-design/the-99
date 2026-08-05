// The tabs are the only route between the decklist and Consider, so the
// keyboard contract is load-bearing rather than decorative. Both halves of the
// roving-tabindex pattern are asserted: the inactive tab leaves the tab order,
// and the arrows are what put it back within reach.
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BuilderTabs } from "./builder-tabs";

function mount(view: "deck" | "consider" = "deck", onViewChange = vi.fn()) {
  render(
    <BuilderTabs view={view} onViewChange={onViewChange} deckCount={12} considerCount={30} />,
  );
  return onViewChange;
}

const tabs = () => screen.getAllByRole("tab");

describe("BuilderTabs — keyboard contract", () => {
  it("is one tab stop, not two", () => {
    mount();
    expect(tabs()[0]).toHaveAttribute("tabindex", "0");
    expect(tabs()[1]).toHaveAttribute("tabindex", "-1");
  });

  // The other panel is unmounted while this one is up, so a standing
  // aria-controls would point at an element that is not in the document.
  it("names a panel only from the tab whose panel exists", () => {
    mount();
    expect(tabs()[0]).toHaveAttribute("aria-controls", "panel-deck");
    expect(tabs()[1]).not.toHaveAttribute("aria-controls");
  });

  it("moves between the tabs with the arrows", () => {
    const onViewChange = mount();
    fireEvent.keyDown(tabs()[0], { key: "ArrowRight" });
    expect(onViewChange).toHaveBeenCalledWith("consider");

    onViewChange.mockClear();
    fireEvent.keyDown(tabs()[0], { key: "ArrowLeft" });
    expect(onViewChange).toHaveBeenCalledWith("deck");
  });

  it("jumps to either end with Home and End", () => {
    const onViewChange = mount();
    fireEvent.keyDown(tabs()[0], { key: "End" });
    expect(onViewChange).toHaveBeenCalledWith("consider");

    onViewChange.mockClear();
    fireEvent.keyDown(tabs()[0], { key: "Home" });
    expect(onViewChange).toHaveBeenCalledWith("deck");
  });

  // Otherwise the tablist would swallow keys the page needs.
  it("leaves every other key alone", () => {
    const onViewChange = mount();
    fireEvent.keyDown(tabs()[0], { key: "a" });
    expect(onViewChange).not.toHaveBeenCalled();
  });

  // The desktop toolbar rides the tab row, so its controls are descendants of
  // the tablist. Acting on their arrow keys would make the sort select
  // unusable by keyboard: every press would jump focus back to a tab.
  it("ignores arrow keys from the toolbar sharing its row", () => {
    const onViewChange = vi.fn();
    render(
      <BuilderTabs view="deck" onViewChange={onViewChange} deckCount={12} considerCount={30}>
        <select aria-label="Sort">
          <option>Best fit</option>
          <option>Cheapest</option>
        </select>
      </BuilderTabs>,
    );
    fireEvent.keyDown(screen.getByRole("combobox", { name: "Sort" }), { key: "ArrowDown" });
    expect(onViewChange).not.toHaveBeenCalled();
  });
});
