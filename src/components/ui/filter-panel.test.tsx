import { render, screen, fireEvent, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { collectionFilterCopy } from "../../lib/copy/collection";
import type { BrowseFilters } from "../../lib/collection/browse";
import { FilterBar } from "../collection/filter-bar";
import { setChangeAnnouncement } from "../collection/browser";
import { FilterPanel, type FilterPanelOption } from "./filter-panel";

// jsdom ships no matchMedia, and useIsDesktop() decides which of the popover /
// sheet is mounted — so every test here has to declare a breakpoint.
function setViewport(desktop: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: desktop,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

// jsdom implements no layout, so it ships no scrollIntoView. The panel calls it
// to keep the keyboard-active row in view; a no-op is the right stand-in.
Element.prototype.scrollIntoView = () => {};

afterEach(() => {
  vi.useRealTimers();
});

const OPTIONS: FilterPanelOption[] = [
  { code: "BLB", label: "Bloomburrow", count: 42, disabled: false },
  { code: "MH3", label: "Modern Horizons 3", count: 17, disabled: false },
  { code: "BRO", label: "The Brothers' War", count: 0, disabled: true },
];

function renderPanel(over: Partial<React.ComponentProps<typeof FilterPanel>> = {}) {
  const onToggle = vi.fn();
  const onClear = vi.fn();
  const utils = render(
    <FilterPanel
      copy={collectionFilterCopy.set}
      options={OPTIONS}
      selected={[]}
      searchable
      onToggle={onToggle}
      onClear={onClear}
      {...over}
    />,
  );
  return { ...utils, onToggle, onClear };
}

function openPanel() {
  fireEvent.click(screen.getByRole("button", { name: /Filter by set/ }));
  return screen.getByRole("dialog");
}

describe("FilterPanel", () => {
  it("mounts only the desktop popover above the breakpoint", () => {
    setViewport(true);
    renderPanel();
    const dialog = openPanel();
    expect(dialog).not.toHaveAttribute("aria-modal");
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    // The sheet's Done button belongs to the mobile mount only.
    expect(screen.queryByRole("button", { name: "Done" })).toBeNull();
  });

  it("mounts only the modal sheet below the breakpoint", () => {
    setViewport(false);
    renderPanel();
    const dialog = openPanel();
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(screen.getAllByRole("listbox")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Done" })).toBeTruthy();
  });

  it("filters the list as the search field is typed into", () => {
    setViewport(true);
    renderPanel();
    openPanel();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "horizons" } });
    const names = screen.getAllByRole("option").map((el) => el.getAttribute("data-code"));
    expect(names).toEqual(["MH3"]);
  });

  it("ranks prefix matches above substring matches", () => {
    setViewport(true);
    renderPanel({
      options: [
        { code: "AAA", label: "The Brothers' War", count: 1, disabled: false },
        { code: "BBB", label: "Brothers of the Coast", count: 1, disabled: false },
      ],
    });
    openPanel();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "brothers" } });
    expect(screen.getAllByRole("option").map((el) => el.getAttribute("data-code"))).toEqual([
      "BBB",
      "AAA",
    ]);
  });

  it("shows the empty state and drops the footer when nothing matches", () => {
    setViewport(true);
    renderPanel();
    openPanel();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "zzzz" } });
    expect(screen.getByText(collectionFilterCopy.set.emptyTitle)).toBeTruthy();
    expect(screen.queryByRole("listbox")).toBeNull();
    // "254 sets owned" under "no matches" contradicts itself — the whole footer goes.
    expect(screen.queryByText(/sets owned/)).toBeNull();
    expect(screen.queryByRole("button", { name: "Clear" })).toBeNull();
  });

  it("keeps the sheet's Done bar in the no-results state", () => {
    setViewport(false);
    renderPanel();
    openPanel();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "zzzz" } });
    expect(screen.getByText(collectionFilterCopy.set.emptyTitle)).toBeTruthy();
    // Desktop drops the footer here; the sheet cannot — Done is its way out.
    expect(screen.getByRole("button", { name: "Done" })).toBeTruthy();
  });

  it("closes the desktop popover when focus tabs out of it", () => {
    setViewport(true);
    renderPanel();
    openPanel();
    const outside = document.createElement("button");
    document.body.appendChild(outside);
    fireEvent.focusOut(screen.getByRole("combobox"), { relatedTarget: outside });
    expect(screen.queryByRole("dialog")).toBeNull();
    outside.remove();
  });

  it("keeps the popover open while focus moves between its own controls", () => {
    setViewport(true);
    renderPanel({ selected: ["BLB"] });
    openPanel();
    const clear = screen.getByRole("button", { name: "Clear" });
    fireEvent.focusOut(screen.getByRole("combobox"), { relatedTarget: clear });
    expect(screen.getByRole("dialog")).toBeTruthy();
    // A transient null relatedTarget is not "focus left the panel".
    fireEvent.focusOut(clear, { relatedTarget: null });
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("numbers every option over the flat visible list", () => {
    setViewport(true);
    renderPanel({ selected: ["MH3"] });
    openPanel();
    // MH3 is pinned into `Selected · 1`, so it leads the flat order across the
    // two groups; the set size spans both.
    expect(
      screen.getAllByRole("option").map((el) => [
        el.getAttribute("data-code"),
        el.getAttribute("aria-posinset"),
        el.getAttribute("aria-setsize"),
      ]),
    ).toEqual([
      ["MH3", "1", "3"],
      ["BLB", "2", "3"],
      ["BRO", "3", "3"],
    ]);

    // Under a query the positions renumber over the matches, not the whole list.
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "b" } });
    expect(
      screen.getAllByRole("option").map((el) => el.getAttribute("aria-setsize")),
    ).toEqual(["2", "2"]);
  });

  it("marks a zero-count row aria-disabled and never toggles it", () => {
    setViewport(true);
    const { onToggle } = renderPanel();
    openPanel();
    const row = screen.getAllByRole("option").find((el) => el.getAttribute("data-code") === "BRO")!;
    expect(row).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(row);
    expect(onToggle).not.toHaveBeenCalled();
  });

  it("still lists a zero-count row rather than removing it", () => {
    setViewport(true);
    renderPanel();
    openPanel();
    expect(screen.getAllByRole("option")).toHaveLength(3);
  });

  it("moves aria-activedescendant with the arrow keys while DOM focus stays in the field", () => {
    setViewport(true);
    renderPanel();
    const dialog = openPanel();
    const input = screen.getByRole("combobox");
    expect(document.activeElement).toBe(input);

    fireEvent.keyDown(dialog, { key: "ArrowDown" });
    const first = input.getAttribute("aria-activedescendant");
    expect(first).toBeTruthy();
    expect(document.getElementById(first!)).toHaveAttribute("data-code", "BLB");
    expect(document.activeElement).toBe(input);

    fireEvent.keyDown(dialog, { key: "ArrowDown" });
    const second = input.getAttribute("aria-activedescendant");
    expect(document.getElementById(second!)).toHaveAttribute("data-code", "MH3");
    expect(document.activeElement).toBe(input);

    fireEvent.keyDown(dialog, { key: "ArrowUp" });
    expect(input.getAttribute("aria-activedescendant")).toBe(first);
    expect(document.activeElement).toBe(input);
  });

  it("walks the arrow keys in the rendered order, which pins the selection to the top", () => {
    setViewport(true);
    // MH3 is second in OPTIONS but renders first once pinned, so walking the raw
    // option order instead of the visible one would disagree with both the screen
    // and the aria-posinset the row announces.
    renderPanel({ selected: ["MH3"] });
    const dialog = openPanel();
    const input = screen.getByRole("combobox");
    fireEvent.keyDown(dialog, { key: "ArrowDown" });
    expect(
      document.getElementById(input.getAttribute("aria-activedescendant")!),
    ).toHaveAttribute("data-code", "MH3");
    fireEvent.keyDown(dialog, { key: "ArrowDown" });
    expect(
      document.getElementById(input.getAttribute("aria-activedescendant")!),
    ).toHaveAttribute("data-code", "BLB");
  });

  it("opens on the first VISIBLE row when ArrowDown opens the panel with a selection", () => {
    setViewport(true);
    renderPanel({ selected: ["MH3"] });
    fireEvent.keyDown(screen.getByRole("button", { name: /Filter by set/ }), { key: "ArrowDown" });
    const input = screen.getByRole("combobox");
    expect(
      document.getElementById(input.getAttribute("aria-activedescendant")!),
    ).toHaveAttribute("data-code", "MH3");
  });

  it("does not wrap past either end of the list", () => {
    setViewport(true);
    renderPanel();
    const dialog = openPanel();
    const input = screen.getByRole("combobox");
    fireEvent.keyDown(dialog, { key: "ArrowUp" });
    const top = input.getAttribute("aria-activedescendant");
    fireEvent.keyDown(dialog, { key: "ArrowUp" });
    expect(input.getAttribute("aria-activedescendant")).toBe(top);
    for (let i = 0; i < 6; i++) fireEvent.keyDown(dialog, { key: "ArrowDown" });
    expect(document.getElementById(input.getAttribute("aria-activedescendant")!)).toHaveAttribute(
      "data-code",
      "BRO",
    );
  });

  it("toggles the active row on Enter but leaves Space alone with no active row", () => {
    setViewport(true);
    const { onToggle } = renderPanel();
    const dialog = openPanel();
    // No active row: Space has to reach the field — set names contain spaces.
    fireEvent.keyDown(dialog, { key: " " });
    expect(onToggle).not.toHaveBeenCalled();
    fireEvent.keyDown(dialog, { key: "ArrowDown" });
    fireEvent.keyDown(dialog, { key: "Enter" });
    expect(onToggle).toHaveBeenCalledWith("BLB");
  });

  it("closes on Esc, returns focus to the trigger, and does not undo selections", () => {
    setViewport(true);
    const { onToggle, onClear } = renderPanel({ selected: ["BLB"] });
    const trigger = screen.getByRole("button", { name: /Filter by set/ });
    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
    // Esc is dismiss, never undo — nothing is rolled back on the way out.
    expect(onToggle).not.toHaveBeenCalled();
    expect(onClear).not.toHaveBeenCalled();
    expect(trigger.textContent).toContain("Bloomburrow");
  });

  it("groups the selection at the top, computed on open and frozen while open", () => {
    setViewport(true);
    renderPanel({ selected: ["MH3"] });
    openPanel();
    expect(screen.getByText(collectionFilterCopy.set.groupSelected(1))).toBeTruthy();
    const list = screen.getByRole("listbox");
    expect(within(list).getAllByRole("option")[0]).toHaveAttribute("data-code", "MH3");
  });

  it("replaces the group labels with a single match count under a query", () => {
    setViewport(true);
    renderPanel({ selected: ["MH3"] });
    openPanel();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "b" } });
    expect(screen.queryByText(collectionFilterCopy.set.groupDefault)).toBeNull();
    expect(screen.getByText(collectionFilterCopy.set.groupMatches(2))).toBeTruthy();
  });

  it("announces the match count once, debounced, rather than per keystroke", () => {
    vi.useFakeTimers();
    setViewport(true);
    const onAnnounce = vi.fn();
    renderPanel({ onAnnounce });
    openPanel();
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "b" } });
    fireEvent.change(input, { target: { value: "bl" } });
    fireEvent.change(input, { target: { value: "blo" } });
    expect(onAnnounce).not.toHaveBeenCalled();
    vi.advanceTimersByTime(300);
    expect(onAnnounce).toHaveBeenCalledTimes(1);
    expect(onAnnounce).toHaveBeenCalledWith(collectionFilterCopy.set.announceMatches(1, "blo"));
  });

  it("labels the trigger with the set name at one selection and a count past that", () => {
    setViewport(true);
    const { rerender } = renderPanel({ selected: ["BLB"] });
    expect(screen.getByRole("button", { name: "Filter by set, Bloomburrow, collapsed" })).toBeTruthy();
    rerender(
      <FilterPanel
        copy={collectionFilterCopy.set}
        options={OPTIONS}
        selected={["BLB", "MH3"]}
        searchable
        onToggle={() => {}}
        onClear={() => {}}
      />,
    );
    const trigger = screen.getByRole("button", {
      name: collectionFilterCopy.set.triggerAriaWithSelection(2),
    });
    // Past one selection the names live in the chip row, not the label.
    expect(trigger.textContent).not.toContain("Bloomburrow");
    expect(trigger.textContent).toContain("2");
  });

  it("opens with the first row active when ArrowDown is pressed on the trigger", () => {
    setViewport(true);
    renderPanel();
    fireEvent.keyDown(screen.getByRole("button", { name: /Filter by set/ }), { key: "ArrowDown" });
    const input = screen.getByRole("combobox");
    expect(document.getElementById(input.getAttribute("aria-activedescendant")!)).toHaveAttribute(
      "data-code",
      "BLB",
    );
  });

  it("omits the search field entirely when not searchable", () => {
    setViewport(true);
    renderPanel({ searchable: false });
    openPanel();
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.queryByText(collectionFilterCopy.set.groupDefault)).toBeNull();
  });
});

// `Clear` and "toggle the last set off" both end at an empty selection, so the
// announcement cannot be inferred from the resulting count — the button says so.
describe("FilterPanel Clear announcement", () => {
  const filtersWith = (setCodes: string[]): BrowseFilters => ({
    search: "",
    colors: [],
    type: null,
    setCodes,
  });

  function renderBar(setCodes: string[]) {
    const onFiltersChange = vi.fn();
    render(
      <FilterBar
        filters={filtersWith(setCodes)}
        sort="name"
        view="grid"
        setOptions={OPTIONS.map((o) => ({ ...o, releasedAt: null }))}
        announcement=""
        onAnnounce={() => {}}
        onFiltersChange={onFiltersChange}
        onSortChange={() => {}}
        onViewChange={() => {}}
      />,
    );
    return onFiltersChange;
  }

  it("flags the panel's Clear as a clear, at any selection size", () => {
    setViewport(true);
    const onFiltersChange = renderBar(["BLB"]);
    fireEvent.click(screen.getByRole("button", { name: /Filter by set/ }));
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(onFiltersChange).toHaveBeenCalledWith(filtersWith([]), "clear-sets");
  });

  it("reads the cleared string for Clear with exactly one set selected", () => {
    expect(
      setChangeAnnouncement(filtersWith(["BLB"]), filtersWith([]), [], OPTIONS, 2933, "clear-sets"),
    ).toBe(collectionFilterCopy.set.announceCleared("2,933"));
  });

  it("still reads the removed string when the last set is toggled off", () => {
    expect(setChangeAnnouncement(filtersWith(["BLB"]), filtersWith([]), [], OPTIONS, 2933)).toBe(
      collectionFilterCopy.set.announceRemoved("Bloomburrow", 0, "0", "2,933"),
    );
  });
});
