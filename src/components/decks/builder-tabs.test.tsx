// The tabs are the only route between the decklist and Consider, so the
// keyboard contract is load-bearing rather than decorative. Both halves of the
// roving-tabindex pattern are asserted: the inactive tab leaves the tab order,
// and the arrows are what put it back within reach.
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BuilderTabs, type BuilderTabSpec, type BuilderView } from "./builder-tabs";

const DECK_TAB = { id: "deck" as const, label: "In deck", count: 12, accessibleName: "In deck, 12 cards" };
const CONSIDER_TAB = { id: "consider" as const, label: "Consider", count: 30, accessibleName: "Consider, 30 cards" };
const GAMES_TAB = { id: "games" as const, label: "Games", count: 3, accessibleName: "Games, 3 logged" };

function mount(
  view: BuilderView = "deck",
  onViewChange = vi.fn(),
  tabs: readonly BuilderTabSpec[] = [DECK_TAB, CONSIDER_TAB],
) {
  render(<BuilderTabs tabs={tabs} view={view} onViewChange={onViewChange} />);
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
    // Wraps rather than clamping: with the tab list now variable-length, the
    // arrows are index arithmetic modulo the list, which is also what the ARIA
    // pattern specifies. This assertion read "deck" while the handler clamped.
    fireEvent.keyDown(tabs()[0], { key: "ArrowLeft" });
    expect(onViewChange).toHaveBeenCalledWith("consider");
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
      <BuilderTabs tabs={[DECK_TAB, CONSIDER_TAB]} view="deck" onViewChange={onViewChange}>
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

describe("BuilderTabs — three tabs", () => {
  const three = [DECK_TAB, CONSIDER_TAB, GAMES_TAB];

  it("steps one tab at a time rather than jumping to an end", () => {
    const onViewChange = mount("consider", vi.fn(), three);
    fireEvent.keyDown(tabs()[1], { key: "ArrowRight" });
    expect(onViewChange).toHaveBeenCalledWith("games");
  });

  it("wraps at both ends", () => {
    const onViewChange = mount("deck", vi.fn(), three);
    fireEvent.keyDown(tabs()[0], { key: "ArrowLeft" });
    expect(onViewChange).toHaveBeenCalledWith("games");

    // A second render in the same test would leave both tablists in the
    // document and `tabs()` would index into the first one.
    cleanup();
    const second = mount("games", vi.fn(), three);
    fireEvent.keyDown(tabs()[2], { key: "ArrowRight" });
    expect(second).toHaveBeenCalledWith("deck");
  });

  it("puts End on the last tab, not on Consider", () => {
    const onViewChange = mount("deck", vi.fn(), three);
    fireEvent.keyDown(tabs()[0], { key: "End" });
    expect(onViewChange).toHaveBeenCalledWith("games");
  });

  // Decision 8: the Games tab never disappears, and at zero it is a bare label
  // rather than "Games · 0" — a zero beside a label reads as a failure state.
  it("renders no count element when count is omitted", () => {
    render(
      <BuilderTabs
        tabs={[DECK_TAB, { id: "games", label: "Games", accessibleName: "Games, none logged" }]}
        view="deck"
        onViewChange={vi.fn()}
      />,
    );
    expect(tabs()[1]).toHaveAccessibleName("Games, none logged");
    expect(tabs()[1].textContent).toBe("Games");
  });
});

describe("BuilderTabs — Versions as a fourth tab", () => {
  const VERSIONS_TAB = {
    id: "versions" as const,
    label: "Versions",
    count: 3,
    accessibleName: "Versions, 3 versions committed",
  };
  const four = [DECK_TAB, CONSIDER_TAB, GAMES_TAB, VERSIONS_TAB];

  // It used to be a link to a route of its own, which is what made it the one
  // cell in this row that took the deck's head off screen.
  it("draws Versions inside the tablist and as no link at all", () => {
    render(<BuilderTabs tabs={four} view="deck" onViewChange={vi.fn()} />);
    const tab = screen.getByRole("tab", { name: VERSIONS_TAB.accessibleName });
    expect(screen.getByRole("tablist").contains(tab)).toBe(true);
    expect(screen.queryByRole("link", { name: /Versions/ })).toBeNull();
  });

  it("selects it with the arrow keys, like every other tab", () => {
    const onViewChange = mount("games", vi.fn(), four);
    fireEvent.keyDown(tabs()[2], { key: "ArrowRight" });
    expect(onViewChange).toHaveBeenCalledWith("versions");
  });

  it("names the panel it controls once selected, and not before", () => {
    render(<BuilderTabs tabs={four} view="versions" onViewChange={vi.fn()} />);
    const tab = screen.getByRole("tab", { name: VERSIONS_TAB.accessibleName });
    expect(tab).toHaveAttribute("aria-controls", "panel-versions");
    expect(tab).toHaveAttribute("aria-selected", "true");
  });
});
