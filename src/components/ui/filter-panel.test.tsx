import { render, screen, fireEvent, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { collectionFilterCopy } from "../../lib/copy/collection";
import type { BrowseFilters } from "../../lib/collection/browse";
import { FilterBar } from "../collection/filter-bar";
import { setChangeAnnouncement, typeChangeAnnouncement } from "../collection/browser";
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
// to keep the keyboard-active row in view; a no-op is the right stand-in. Only
// patched when it is genuinely missing, so a real implementation is never masked.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

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

  it("dismisses the popover on page scroll but not on scrolling the option list", () => {
    setViewport(true);
    renderPanel();
    openPanel();
    // The dismiss listener is on window in the capture phase, so it sees the list
    // scrolling too — dismissing on that would make the list unscrollable.
    fireEvent.scroll(screen.getByRole("listbox"));
    expect(screen.queryByRole("listbox")).not.toBeNull();

    fireEvent.scroll(document);
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  // Focus draws ONE brass ring — the 2px outline at +2px. The brass border is
  // reserved for the filled state, where it means "this field is filtering";
  // drawing both at once read as two stacked focus rings.
  it("turns the search field's border brass only once there is a query", () => {
    setViewport(true);
    renderPanel();
    openPanel();
    const field = () => screen.getByRole("combobox").closest("label")!;
    expect(field().className).not.toContain("focus-within:border-[color:var(--brass)]");

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "blo" } });
    expect(field().className).toContain("focus-within:border-[color:var(--brass)]");
  });

  describe("desktop popover placement", () => {
    afterEach(() => {
      Reflect.deleteProperty(document.documentElement, "clientWidth");
      vi.restoreAllMocks();
    });

    // jsdom implements no layout, so the trigger's rect and the viewport width
    // both have to be declared. Placement is measured on open, hence before the
    // click. Returns the opened dialog.
    function openAt(triggerLeft: number, viewportWidth: number) {
      Object.defineProperty(document.documentElement, "clientWidth", {
        writable: true,
        configurable: true,
        value: viewportWidth,
      });
      const trigger = screen.getByRole("button", { name: /Filter by set/ });
      vi.spyOn(trigger, "getBoundingClientRect").mockReturnValue({
        left: triggerLeft,
        right: triggerLeft + 90,
        top: 100,
        bottom: 134,
        width: 90,
        height: 34,
        x: triggerLeft,
        y: 100,
        toJSON: () => ({}),
      });
      fireEvent.click(trigger);
      return screen.getByRole("dialog");
    }

    it("aligns to the trigger's left edge when the popover fits", () => {
      setViewport(true);
      renderPanel();
      expect(openAt(400, 1400).style.left).toBe("0px");
    });

    it("pulls left by the overflow when the trigger sits near the right edge", () => {
      setViewport(true);
      renderPanel();
      // 764 + 340 overshoots a 1000px viewport by 104, plus the 16px gutter.
      expect(openAt(764, 1000).style.left).toBe("-120px");
    });

    it("stops at the gutter rather than pulling the left edge off-screen", () => {
      setViewport(true);
      renderPanel();
      // The overflow alone would be 76px, which would put the panel's left edge
      // at -56. The clamp leaves it on the gutter and lets the right side trim.
      expect(openAt(20, 300).style.left).toBe("-4px");
    });
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

// The non-searchable path is what Type ▾ uses. With no search field there is no
// combobox to hold DOM focus or aria-activedescendant, so focus, the keyboard
// walk and the grouping all take a different branch from the Set panel above.
describe("FilterPanel, not searchable", () => {
  function openBare(over: Partial<React.ComponentProps<typeof FilterPanel>> = {}) {
    const utils = renderPanel({ searchable: false, ...over });
    return { ...utils, panel: openPanel() };
  }

  it("moves DOM focus onto the listbox, since there is no field to take it", () => {
    setViewport(true);
    const { panel } = openBare();
    expect(document.activeElement).toBe(screen.getByRole("listbox"));
    expect(panel).toContainElement(document.activeElement as HTMLElement);
  });

  it("exposes the keyboard-active row on the focused element", () => {
    setViewport(true);
    renderPanel({ searchable: false });
    fireEvent.keyDown(screen.getByRole("button", { name: /Filter by set/ }), { key: "ArrowDown" });
    const focused = document.activeElement as HTMLElement;
    const active = focused.getAttribute("aria-activedescendant");
    expect(active).toBeTruthy();
    expect(document.getElementById(active!)).toHaveAttribute("data-code", "BLB");
  });

  it("walks and toggles with the arrow keys while the panel holds focus", () => {
    setViewport(true);
    const { panel, onToggle } = openBare();
    fireEvent.keyDown(panel, { key: "ArrowDown" });
    fireEvent.keyDown(panel, { key: "ArrowDown" });
    fireEvent.keyDown(panel, { key: "Enter" });
    expect(onToggle).toHaveBeenCalledWith("MH3");
  });

  it("leaves the options in their given order rather than pinning the selection", () => {
    setViewport(true);
    openBare({ selected: ["MH3"] });
    const rows = within(screen.getByRole("listbox")).getAllByRole("option");
    expect(rows.map((r) => r.getAttribute("data-code"))).toEqual(["BLB", "MH3", "BRO"]);
    expect(screen.queryByRole("group")).toBeNull();
  });

  it("numbers the flat list without a group wrapper", () => {
    setViewport(true);
    openBare();
    const rows = within(screen.getByRole("listbox")).getAllByRole("option");
    expect(rows.map((r) => r.getAttribute("aria-posinset"))).toEqual(["1", "2", "3"]);
    expect(rows[0]).toHaveAttribute("aria-setsize", "3");
  });

  it("closes on Esc and hands focus back to the trigger", () => {
    setViewport(true);
    const { panel } = openBare();
    fireEvent.keyDown(panel, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: /Filter by set/ }));
  });

  it("still clears from the footer", () => {
    setViewport(true);
    const { onClear } = openBare({ selected: ["BLB"] });
    fireEvent.click(screen.getByRole("button", { name: collectionFilterCopy.set.clear }));
    expect(onClear).toHaveBeenCalled();
  });

  it("takes focus on the sheet too, below the breakpoint", () => {
    setViewport(false);
    openBare();
    expect(document.activeElement).toBe(screen.getByRole("listbox"));
  });
});

// `Clear` and "toggle the last set off" both end at an empty selection, so the
// announcement cannot be inferred from the resulting count — the button says so.
describe("FilterPanel Clear announcement", () => {
  const filtersWith = (setCodes: string[]): BrowseFilters => ({
    search: "",
    colors: [],
    types: [],
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
        typeOptions={[]}
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

// Design review of #100 found these five: each is a way the non-searchable
// panel diverged from the Set ▾ panel it inherited from.
describe("FilterPanel, the non-searchable variant's own hazards", () => {
  it("sizes the desktop popover from widthPx, so a narrow panel is not over-shifted", () => {
    setViewport(true);
    renderPanel({ searchable: false, widthPx: 300 });
    const panel = openPanel();
    expect((panel as HTMLElement).style.width).toBe("300px");
  });

  it("drops the bottom scroll fade when the list does not scroll", () => {
    setViewport(true);
    const { container } = renderPanel({ searchable: false });
    openPanel();
    // jsdom reports scrollHeight === clientHeight === 0, i.e. never scrollable.
    expect(container.querySelector(".bg-gradient-to-b")).toBeNull();
  });

  it("keeps the card-count status out of the sheet footer when footerStatus is off", () => {
    setViewport(false);
    renderPanel({ searchable: false, footerStatus: false, copy: collectionFilterCopy.type });
    fireEvent.click(screen.getByRole("button", { name: /Filter by type/ }));
    // "7 cards" would be a lie about a list of types.
    expect(screen.queryByText(/cards$/)).toBeNull();
    expect(screen.getByRole("button", { name: collectionFilterCopy.type.done })).toBeTruthy();
  });

  it("leaves the option list reachable by Tab when there is no search field", () => {
    setViewport(false);
    renderPanel({ searchable: false });
    const list = within(openPanel()).getByRole("listbox");
    // At -1 the list takes focus on open but can never be Tabbed back to, and
    // the options are only reachable through it.
    expect(list.tabIndex).toBe(0);
    expect(document.activeElement).toBe(list);
  });

  it("keeps the search field owning focus when there IS one", () => {
    setViewport(false);
    renderPanel({ searchable: true });
    const list = within(openPanel()).getByRole("listbox");
    expect(list.hasAttribute("tabindex")).toBe(false);
  });

  it("adopts the first row on Space rather than scrolling the page behind it", () => {
    setViewport(true);
    const { onToggle } = renderPanel({ searchable: false });
    const panel = openPanel();
    const space = fireEvent.keyDown(panel, { key: " " });
    // Returns false when a handler called preventDefault.
    expect(space).toBe(false);
    expect(onToggle).not.toHaveBeenCalled();
    const list = within(panel).getByRole("listbox");
    expect(list.getAttribute("aria-activedescendant")).toBeTruthy();
  });
});

// Type ▾ is the same panel with the search field off (#100). These cover the
// wiring — that the bar reaches the multi-select, not the old single <select>.
describe("Type ▾ in the filter bar", () => {
  const TYPE_OPTIONS = [
    { code: "Creature", label: "Creature", count: 120, disabled: false },
    { code: "Land", label: "Land", count: 40, disabled: false },
  ];
  const filtersWith = (types: string[]): BrowseFilters => ({
    search: "",
    colors: [],
    types,
    setCodes: [],
  });

  function renderBar(types: string[]) {
    const onFiltersChange = vi.fn();
    render(
      <FilterBar
        filters={filtersWith(types)}
        sort="name"
        view="grid"
        setOptions={[]}
        typeOptions={TYPE_OPTIONS}
        announcement=""
        onAnnounce={() => {}}
        onFiltersChange={onFiltersChange}
        onSortChange={() => {}}
        onViewChange={() => {}}
      />,
    );
    return onFiltersChange;
  }

  function openType() {
    fireEvent.click(screen.getByRole("button", { name: /Filter by type/ }));
  }

  it("opens a panel with no search field", () => {
    setViewport(true);
    renderBar([]);
    openType();
    const panel = screen.getByRole("dialog", { name: "Filter by type" });
    // The Sort <select> is also a combobox, so scope this to the panel.
    expect(within(panel).queryByRole("combobox")).toBeNull();
  });

  it("adds a type without dropping the one already selected", () => {
    setViewport(true);
    const onFiltersChange = renderBar(["Creature"]);
    openType();
    fireEvent.click(screen.getByRole("option", { name: /Land/ }));
    expect(onFiltersChange).toHaveBeenCalledWith(filtersWith(["Creature", "Land"]));
  });

  it("toggles a selected type back off", () => {
    setViewport(true);
    const onFiltersChange = renderBar(["Creature", "Land"]);
    openType();
    fireEvent.click(screen.getByRole("option", { name: /Creature/ }));
    expect(onFiltersChange).toHaveBeenCalledWith(filtersWith(["Land"]));
  });

  it("flags the panel's Clear as a type clear, not a set clear", () => {
    setViewport(true);
    const onFiltersChange = renderBar(["Creature"]);
    openType();
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(onFiltersChange).toHaveBeenCalledWith(filtersWith([]), "clear-types");
  });

  it("reads the cleared string for Clear, and the removed string for a toggle", () => {
    expect(
      typeChangeAnnouncement(
        filtersWith(["Creature"]), filtersWith([]), [], TYPE_OPTIONS, 2933, "clear-types",
      ),
    ).toBe(collectionFilterCopy.type.announceCleared("2,933"));
    expect(
      typeChangeAnnouncement(filtersWith(["Creature"]), filtersWith([]), [], TYPE_OPTIONS, 2933),
    ).toBe(collectionFilterCopy.type.announceRemoved("Creature", 0, "0", "2,933"));
  });

  it("says nothing about types when only the set selection moved", () => {
    const before = filtersWith([]);
    const after = { ...before, setCodes: ["BLB"] };
    expect(typeChangeAnnouncement(before, after, [], TYPE_OPTIONS, 2933)).toBeNull();
  });
});
