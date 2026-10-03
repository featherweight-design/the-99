import { cleanup, render, screen, fireEvent, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { collectionFilterCopy } from "../../lib/copy/collection";
import type { BrowseFilters } from "../../lib/collection/browse";
import { FilterBar } from "../collection/filter-bar";
import {
  colorChangeAnnouncement,
  setChangeAnnouncement,
  typeChangeAnnouncement,
} from "../collection/browser";
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

describe("FilterPanel form override", () => {
  it("takes the caller's form when given one, and its own otherwise", () => {
    // `useIsDesktop` is 768 and the chassis switches at 1000, so a chassis mount
    // without this opens a desktop popover inside the compact frame across the
    // whole 768-999 band. Undefined keeps the component's own query, which
    // every collection mount predating the chassis relies on.
    setViewport(true);
    const { rerender } = render(
      <FilterPanel
        copy={collectionFilterCopy.type}
        options={[{ code: "Creature", label: "Creature", count: 1, disabled: false }]}
        selected={[]}
        onToggle={() => {}}
        onClear={() => {}}
        compact
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /type/i }));
    // Compact draws the sheet, which is the modal branch.
    expect(screen.getByRole("dialog").className).toMatch(/fixed|inset/);
    rerender(
      <FilterPanel
        copy={collectionFilterCopy.type}
        options={[{ code: "Creature", label: "Creature", count: 1, disabled: false }]}
        selected={[]}
        onToggle={() => {}}
        onClear={() => {}}
      />,
    );
  });
});

describe("FilterPanel portalSheet (collection surfaces E1)", () => {
  const mount = (portalSheet: boolean) =>
    render(
      <FilterPanel
        copy={collectionFilterCopy.type}
        options={[{ code: "Creature", label: "Creature", count: 1, disabled: false }]}
        selected={[]}
        onToggle={() => {}}
        onClear={() => {}}
        compact
        portalSheet={portalSheet}
      />,
    );

  it("draws its phone sheet into <main>, outside the head, only when asked", () => {
    setViewport(false);
    const main = document.createElement("main");
    document.body.appendChild(main);
    try {
      const { container, unmount } = mount(true);
      fireEvent.click(screen.getByRole("button", { name: /type/i }));
      const dialog = screen.getByRole("dialog");
      expect(container.contains(dialog)).toBe(false);
      expect(main.contains(dialog)).toBe(true);
      unmount();
      // Opt-in: every other mount keeps its sheet where it was drawn.
      const other = mount(false);
      fireEvent.click(screen.getByRole("button", { name: /type/i }));
      expect(other.container.contains(screen.getByRole("dialog"))).toBe(true);
    } finally {
      main.remove();
    }
  });
});

// Two cases retired with the control they covered: the mobile `Color ▾` panel
// is gone, because `ColourPips` draws one colour control at both widths rather
// than a desktop pip row and a phone panel with different ARIA roles for the
// same filter. `src/components/ui/colour-pips.test.tsx` covers what replaced
// them, including the toggle and the lit state.
describe("FilterPanel", () => {
  it("announces why a disabled trigger will not open", () => {
    renderPanel({ disabled: true, disabledAriaLabel: "Availability unavailable right now" });
    const trigger = screen.getByRole("button", { name: "Availability unavailable right now" });
    expect(trigger).toBeDisabled();
  });

  // The phone sheet is `aria-modal` over a scrim, so the page behind it has to hold still —
  // and the desktop popover, which travels with the page like any dropdown, must not take
  // the same lock. `probe:scroll-lock` proves the gesture in a browser; this is the half a
  // suite can hold, so a regression in `open && !isDesktop` fails `pnpm test`.
  it("holds the page while the sheet is up, and lets go when it closes", () => {
    setViewport(false);
    const { unmount } = renderPanel();
    expect(document.body.style.overflow).not.toBe("hidden");
    openPanel();
    expect(document.body.style.overflow).toBe("hidden");
    // Dismissed rather than unmounted: the lock tracks the dialog, not the component.
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(document.body.style.overflow).not.toBe("hidden");
    unmount();
  });

  it("does not hold the page for the desktop popover", () => {
    setViewport(true);
    const { unmount } = renderPanel();
    openPanel();
    expect(screen.getByRole("dialog")).not.toHaveAttribute("aria-modal");
    expect(document.body.style.overflow).not.toBe("hidden");
    unmount();
  });

  // Focus returns to the trigger on every close, and a browser scrolls a focused element into
  // view — which put a reader who had scrolled away back at the top of the list for having
  // dismissed a sheet. The distinction is who dismissed it: the keyboard has to see where
  // focus went, a thumb has not asked to be moved.
  it("returns focus without scrolling when a pointer dismisses the sheet", () => {
    setViewport(false);
    renderPanel();
    const trigger = screen.getByRole("button", { name: /Filter by set/ });
    const focus = vi.spyOn(trigger, "focus");
    fireEvent.click(trigger);
    // `detail: 1` is a real press. `fireEvent.click` defaults it to 0, which is what a
    // native button reports for Enter and Space — so the default is the KEYBOARD case, and
    // a test that omits it is testing the other branch.
    fireEvent.click(screen.getByRole("button", { name: "Done" }), { detail: 1 });
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  // A native button fires `onClick` for Enter and Space too, so `Done` pressed from the
  // keyboard arrives looking exactly like a click. `detail` is the only thing that separates
  // them: 0 for the synthetic click, 1 or more for a press.
  it("returns focus the visible way when Done is pressed from the keyboard", () => {
    setViewport(false);
    renderPanel();
    const trigger = screen.getByRole("button", { name: /Filter by set/ });
    const focus = vi.spyOn(trigger, "focus");
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("button", { name: "Done" }), { detail: 0 });
    expect(focus).toHaveBeenCalledWith({ preventScroll: false });
  });

  // Single-select dismisses on the row itself, which is the third way out of the sheet and
  // the one neither test above reaches.
  it("keeps the reader's place when a tap commits a single-select", () => {
    setViewport(false);
    renderPanel({ selectionMode: "single", options: OPTIONS.slice(0, 2) });
    const trigger = screen.getByRole("button", { name: /Filter by set/ });
    const focus = vi.spyOn(trigger, "focus");
    fireEvent.click(trigger);
    fireEvent.click(screen.getAllByRole("option")[0], { detail: 1 });
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it("returns focus the visible way when the keyboard commits a single-select", () => {
    setViewport(false);
    renderPanel({ selectionMode: "single", options: OPTIONS.slice(0, 2) });
    const trigger = screen.getByRole("button", { name: /Filter by set/ });
    const focus = vi.spyOn(trigger, "focus");
    fireEvent.click(trigger);
    const dialog = screen.getByRole("dialog");
    fireEvent.keyDown(dialog, { key: "ArrowDown" });
    fireEvent.keyDown(dialog, { key: "Enter" });
    expect(focus).toHaveBeenCalledWith({ preventScroll: false });
  });

  // The sheet has four pointer ways out and they must not drift apart: Done, the ✕, the
  // scrim and the drag handle. A regression in any one of them jumps the page for a thumb
  // while the others keep passing.
  it.each([
    ["the ✕", () => fireEvent.click(screen.getByRole("button", { name: /close/i }), { detail: 1 })],
    ["the scrim", () => fireEvent.click(document.querySelector('[role="presentation"]')!, { detail: 1 })],
    ["a drag past the threshold", () => {
      const handle = document.querySelector('[role="dialog"] .touch-none')!;
      fireEvent.pointerDown(handle, { clientY: 0 });
      fireEvent.pointerMove(handle, { clientY: 90 });
      fireEvent.pointerUp(handle, { clientY: 90 });
    }],
  ])("keeps the reader's place when %s dismisses the sheet", (_name, dismiss) => {
    setViewport(false);
    renderPanel();
    const trigger = screen.getByRole("button", { name: /Filter by set/ });
    const focus = vi.spyOn(trigger, "focus");
    fireEvent.click(trigger);
    dismiss();
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it("returns focus the visible way when Escape dismisses it", () => {
    setViewport(false);
    renderPanel();
    const trigger = screen.getByRole("button", { name: /Filter by set/ });
    const focus = vi.spyOn(trigger, "focus");
    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(focus).toHaveBeenCalledWith({ preventScroll: false });
  });

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

  // Focus draws ONE accent ring — the 2px outline at +2px. The accent border is
  // reserved for the filled state, where it means "this field is filtering";
  // drawing both at once read as two stacked focus rings.
  it("turns the search field's border accent only once there is a query", () => {
    setViewport(true);
    renderPanel();
    openPanel();
    const field = () => screen.getByRole("combobox").closest("label")!;
    expect(field().className).not.toContain("focus-within:border-[color:var(--accent)]");

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "blo" } });
    expect(field().className).toContain("focus-within:border-[color:var(--accent)]");
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
    // Set's trigger counts rather than names (`triggerCount`), so its text is `Set 1`.
    expect(trigger.querySelector("[data-trigger-label]")?.textContent).toBe("Set 1");
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
    // The name STARTS with what the trigger shows (WCAG 2.5.3), then says what it filters.
    expect(screen.getByRole("button", { name: "Set 1, Filter by set, Bloomburrow, collapsed" })).toBeTruthy();
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
    const trigger = screen.getByRole("button", { name: "Sets 2, Filter by set, collapsed" });
    expect(trigger.textContent).toContain("Sets 2");
    // Past one selection the names live in the chip row, not the label.
    expect(trigger.textContent).not.toContain("Bloomburrow");
    expect(trigger.textContent).toContain("2");
  });

  // Hugh's staging walk: `Set: Bloomburrow` grew the trigger on a pick and pushed every control
  // after it along the row. A counting trigger says `Set 0`, `Set 1`, `Sets 2`, never a name, and
  // draws no pill beside the figure it already prints.
  it("counts rather than names on a trigger that carries `triggerCount`", () => {
    for (const [selected, label] of [[[], "Set 0"], [["BLB"], "Set 1"], [["BLB", "MH3"], "Sets 2"]] as const) {
      const { unmount } = renderPanel({ selected: [...selected] });
      const trigger = screen.getByRole("button", { name: /Filter by set/ });
      expect(trigger.querySelector("[data-trigger-label]")?.textContent).toBe(label);
      // No pill: the only figure drawn is the label's own.
      expect(trigger.querySelector(".rounded-full")).toBeNull();
      unmount();
    }
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
        sortDirection="asc"
        view="grid"
        setOptions={OPTIONS.map((o) => ({ ...o, releasedAt: null }))}
        typeOptions={[]}
        availabilityOptions={[]}
      colorOptions={[]}
      shown={0}
      total={0}
        chips={[]}
      onClearAll={() => {}}
      resultLine="Showing 0 unique · 0 total"
    availabilityOk
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
    ).toBe(collectionFilterCopy.set.announceCleared(0));
  });

  it("still reads the removed string when the last set is toggled off", () => {
    expect(setChangeAnnouncement(filtersWith(["BLB"]), filtersWith([]), [], OPTIONS, 2933)).toBe(
      collectionFilterCopy.set.announceRemoved("Bloomburrow", 0, 0, 2933),
    );
  });

  // Clearing ONE dimension leaves the others on, so the figure the clear
  // announces is what survives them — not the whole collection, which is a list
  // the reader is not looking at.
  const CARDS = [
    { oracleId: "a", name: "A", quantity: 2, colorIdentity: ["R"], typeLine: "Instant",
      setCodes: ["BLB"], setCounts: [["BLB", 2]], primarySetCode: "BLB", rarity: "common", cmc: 1 },
    { oracleId: "b", name: "B", quantity: 5, colorIdentity: ["U"], typeLine: "Instant",
      setCodes: ["BLB"], setCounts: [["BLB", 5]], primarySetCode: "BLB", rarity: "common", cmc: 1 },
  ] as unknown as Parameters<typeof setChangeAnnouncement>[2];

  it("counts what the OTHER filters leave when one dimension is cleared", () => {
    const before = { search: "", colors: ["R"], types: [], setCodes: ["BLB"] } as BrowseFilters;
    const after = { ...before, setCodes: [] };
    // Red still filters, so 2 copies survive — not the 7 in the fixture.
    expect(
      setChangeAnnouncement(before, after, CARDS, OPTIONS, 7, "clear-sets"),
    ).toBe(collectionFilterCopy.set.announceCleared(2));
  });

  it("counts the same way when the last value is toggled off", () => {
    const before = { search: "", colors: ["R"], types: [], setCodes: ["BLB"] } as BrowseFilters;
    const after = { ...before, setCodes: [] };
    expect(setChangeAnnouncement(before, after, CARDS, OPTIONS, 7)).toBe(
      collectionFilterCopy.set.announceRemoved("Bloomburrow", 0, 2, 7),
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
        sortDirection="asc"
        view="grid"
        setOptions={[]}
        typeOptions={TYPE_OPTIONS}
        availabilityOptions={[]}
      colorOptions={[]}
      shown={0}
      total={0}
        chips={[]}
      onClearAll={() => {}}
      resultLine="Showing 0 unique · 0 total"
    availabilityOk
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
    ).toBe(collectionFilterCopy.type.announceCleared(0));
    expect(
      typeChangeAnnouncement(filtersWith(["Creature"]), filtersWith([]), [], TYPE_OPTIONS, 2933),
    ).toBe(collectionFilterCopy.type.announceRemoved("Creature", 0, 0, 2933));
  });

  it("says nothing about types when only the set selection moved", () => {
    const before = filtersWith([]);
    const after = { ...before, setCodes: ["BLB"] };
    expect(typeChangeAnnouncement(before, after, [], TYPE_OPTIONS, 2933)).toBeNull();
  });
});

// Sort ▾ (#119) and mobile Color ▾ (#116) are the same panel in new modes, so
// they are exercised through the real FilterBar rather than the panel directly:
// what broke before was the wiring, not the panel.
describe("FilterBar sort and color controls", () => {
  const NO_FILTERS: BrowseFilters = { search: "", colors: [], types: [], setCodes: [] };

  function renderBar(over: Partial<React.ComponentProps<typeof FilterBar>> = {}) {
    const onFiltersChange = vi.fn();
    const onSortChange = vi.fn();
    render(
      <FilterBar
        filters={NO_FILTERS}
        sort="name"
        sortDirection="asc"
        view="grid"
        setOptions={[]}
        typeOptions={[]}
        availabilityOptions={[]}
      colorOptions={[]}
      shown={0}
      total={0}
        chips={[]}
      onClearAll={() => {}}
      resultLine="Showing 0 unique · 0 total"
    availabilityOk
        announcement=""
        onAnnounce={() => {}}
        onFiltersChange={onFiltersChange}
        onSortChange={onSortChange}
        onViewChange={() => {}}
        {...over}
      />,
    );
    return { onFiltersChange, onSortChange };
  }

  it("sorting is a panel, not a native select", () => {
    setViewport(true);
    renderBar();
    expect(screen.queryByRole("combobox", { name: "Sort cards" })).toBeNull();
    expect(screen.getByRole("button", { name: /Sort cards/ })).toBeTruthy();
  });

  it("the trigger names the order AND its direction", () => {
    setViewport(true);
    renderBar({ sort: "quantity", sortDirection: "desc" });
    expect(screen.getByRole("button", { name: /Sort cards/ }).textContent).toContain("Quantity · Most");
  });

  it("picking a different key switches to it in that key's natural direction", () => {
    setViewport(true);
    const { onSortChange } = renderBar();
    fireEvent.click(screen.getByRole("button", { name: /Sort cards/ }));
    fireEvent.click(screen.getByRole("option", { name: /Quantity/ }));
    expect(onSortChange).toHaveBeenCalledWith("quantity", "desc");
  });

  it("picking the current key reverses it — the only direction control there is", () => {
    setViewport(true);
    const { onSortChange } = renderBar({ sort: "name", sortDirection: "asc" });
    fireEvent.click(screen.getByRole("button", { name: /Sort cards/ }));
    fireEvent.click(screen.getByRole("option", { name: /Name/ }));
    expect(onSortChange).toHaveBeenCalledWith("name", "desc");
  });

  it("the sort list is single-select and dismisses on choice", () => {
    setViewport(true);
    renderBar();
    fireEvent.click(screen.getByRole("button", { name: /Sort cards/ }));
    expect(screen.getByRole("listbox").getAttribute("aria-multiselectable")).toBeNull();
    fireEvent.click(screen.getByRole("option", { name: /Rarity/ }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("the sort panel offers no Clear — a list is always sorted by something", () => {
    setViewport(true);
    renderBar();
    fireEvent.click(screen.getByRole("button", { name: /Sort cards/ }));
    expect(within(screen.getByRole("dialog")).queryByRole("button", { name: "Clear" })).toBeNull();
  });

  // Local to these announcement cases: the module-level OPTIONS is the panel's
  // own fixture and carries no colour labels, so the announcement would read
  // the hue code where it should read the name.
  const OPTIONS = [
    { code: "W", label: "White" },
    { code: "R", label: "Red" },
  ];
  const base: BrowseFilters = { search: "", colors: [], types: [], setCodes: [] };
  const withColors = (colors: string[]): BrowseFilters => ({ ...base, colors });

  it("reads the added string when a color is toggled on", () => {
    expect(colorChangeAnnouncement(base, withColors(["R"]), [], OPTIONS, 2933)).toBe(
      collectionFilterCopy.color.announceAdded("Red", 1, 0, 2933),
    );
  });

  it("reads the removed string when a color is toggled off", () => {
    expect(colorChangeAnnouncement(withColors(["R"]), base, [], OPTIONS, 2933)).toBe(
      collectionFilterCopy.color.announceRemoved("Red", 0, 0, 2933),
    );
  });

  it("reads the cleared string for Clear rather than the removed string", () => {
    expect(
      colorChangeAnnouncement(withColors(["R"]), base, [], OPTIONS, 2933, "clear-colors"),
    ).toBe(collectionFilterCopy.color.announceCleared(0));
  });

  it("says nothing about colors when only the type selection moved", () => {
    expect(
      colorChangeAnnouncement(base, { ...base, types: ["Creature"] }, [], OPTIONS, 2933),
    ).toBeNull();
  });
});

// Two branches keyed on `selected.length > 0`, which under single-select is
// unconditionally true — so both drew permanently and neither carried
// information. Found when the deck toolbar mounted this panel: that bar's own
// rule is "No accent fill anywhere on the builder's control bar"
// (`group-toggle.tsx:105-110`), and the borrowed border broke it on arrival.
// Both fixes land on `/collection`'s Sort too, which is the same single-select
// mount, and remove the same two signals there.
describe("selectionOrnament", () => {
  const chosen = { selected: [OPTIONS[0].code], options: OPTIONS.slice(0, 2) };

  it("leaves the resting trigger's border alone when it is off", () => {
    renderPanel({ selectionMode: "single", selectionOrnament: false, ...chosen });
    expect(screen.getByRole("button", { name: /Filter by set/ }).className)
      .not.toContain("border-[color:var(--accent)]");
  });

  it("draws no count badge on the sheet's title when it is off", () => {
    setViewport(false);
    renderPanel({ selectionMode: "single", selectionOrnament: false, ...chosen });
    fireEvent.click(screen.getByRole("button", { name: /Filter by set/ }));
    const heading = screen.getByRole("dialog").querySelector("h2");
    expect(heading?.textContent).toBe(collectionFilterCopy.set.sheetTitle);
  });

  // THE CASE THAT MAKES IT A PROP. The set page's rarity panel is single-select
  // WITH an off state, so a chosen rarity there is a real active filter and must
  // keep saying so. Keying the suppression on `selectionMode` regressed it.
  it("still lights a single-select panel that can be off, like the rarity filter", () => {
    renderPanel({ selectionMode: "single", ...chosen });
    expect(screen.getByRole("button", { name: /Filter by set/ }).className)
      .toContain("border-[color:var(--accent)]");
  });

  it("still lights and badges a multi-select panel", () => {
    renderPanel({ selectionMode: "multi", ...chosen });
    expect(screen.getByRole("button", { name: /Filter by set/ }).className)
      .toContain("border-[color:var(--accent)]");
    cleanup();

    setViewport(false);
    renderPanel({ selectionMode: "multi", ...chosen });
    fireEvent.click(screen.getByRole("button", { name: /Filter by set/ }));
    expect(screen.getByRole("dialog").querySelector("h2")?.textContent)
      .toBe(`${collectionFilterCopy.set.sheetTitle}1`);
  });
});
