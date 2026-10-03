import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { CollectionFilterSheet } from "./filter-sheet";
import type { BrowseFilters } from "../../lib/collection/browse";
import { availabilityCopy } from "../../lib/copy/availability";

const FILTERS: BrowseFilters = {
  search: "",
  colors: [],
  types: [],
  setCodes: [],
  availability: [],
};

const TYPES = [
  { code: "Instant", label: "Instant", count: 12, disabled: false },
  { code: "Land", label: "Land", count: 0, disabled: true },
];

const SETS = [
  { code: "BLB", label: "Bloomburrow", count: 40, disabled: false, releasedAt: "2024-08-02" },
  { code: "LEA", label: "Limited Edition Alpha", count: 3, disabled: false, releasedAt: "1993-08-05" },
];

const AVAILABILITY = [
  { code: "free" as const, label: "Free", count: 9 },
  { code: "soft" as const, label: "In a draft", count: 2 },
];

const COLOURS = [
  { code: "W", label: "White", hint: "W", count: 4, disabled: false },
  { code: "B", label: "Black", hint: "B", count: 0, disabled: true },
];

function sheet(over: Partial<Parameters<typeof CollectionFilterSheet>[0]> = {}) {
  return (
    <CollectionFilterSheet
      open
      onDismiss={() => {}}
      filters={FILTERS}
      onChange={() => {}}
      colorOptions={COLOURS}
      typeOptions={TYPES}
      setOptions={SETS}
      availabilityOptions={AVAILABILITY}
      availabilityOk
      shown={9}
      total={40}
      {...over}
    />
  );
}

// The set list is a panel of its own above the sheet (#6), so every set
// assertion opens it first. The trigger is the sheet's only route to it.
const openSets = () => {
  fireEvent.click(screen.getByRole("button", { name: /Filter by set/ }));
  return screen.getByRole("dialog", { name: "Filter by set" });
};

describe("CollectionFilterSheet", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("draws outside the head that opened it, inside <main> (E1)", () => {
    // Fixed inside a sticky head, a sheet sits in the head's stacking context, under the tab
    // bar. It is portalled to <main> rather than <body>, where `onPage` would not find it.
    const main = document.createElement("main");
    document.body.appendChild(main);
    try {
      const { container } = render(sheet());
      const dialog = screen.getByRole("dialog");
      expect(container.contains(dialog)).toBe(false);
      expect(main.contains(dialog)).toBe(true);
    } finally {
      main.remove();
    }
  });

  it("renders nothing when closed, rather than a hidden duplicate of the row", () => {
    const { container } = render(sheet({ open: false }));
    expect(container.innerHTML).toBe("");
  });

  it("is a modal dialog carrying every dimension the wide row draws", () => {
    render(sheet());
    const dialog = screen.getByRole("dialog", { name: "Filter cards" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    // Colour, type, availability and set — the four the compact row used to
    // push off-screen.
    for (const heading of ["Color identity", "Type", "Set"]) {
      expect(within(dialog).getByRole("heading", { name: heading })).toBeTruthy();
    }
    expect(within(dialog).getByRole("switch", { name: /White/ })).toBeTruthy();
    expect(within(dialog).getByRole("switch", { name: /Instant/ })).toBeTruthy();
    expect(within(dialog).getByRole("switch", { name: /Free/ })).toBeTruthy();
    // Set is the one dimension that is a row rather than chips: a collection
    // reaches into the hundreds, and the list under a field was most of the
    // sheet and resized it on every keystroke.
    expect(within(dialog).getByRole("button", { name: /Filter by set/ })).toBeTruthy();
    expect(within(dialog).queryByRole("switch", { name: /Bloomburrow/ })).toBeNull();
  });

  it("does NOT carry search — that stays on the persistent row", () => {
    // The card-name field is visible beside the trigger at this width, so a
    // second copy in here would be two controls for one filter. The only field
    // in the sheet is the set list's own.
    render(sheet());
    expect(screen.queryByLabelText("Search your cards")).toBeNull();
    // Nor the set field, which lives in the panel the Set row opens.
    expect(screen.queryByLabelText("Search your sets")).toBeNull();
    expect(within(openSets()).getByLabelText("Search your sets")).toBeTruthy();
  });

  it("hands a toggle back as a whole new value, as the wide form does", () => {
    const onChange = vi.fn();
    render(sheet({ onChange }));
    fireEvent.click(screen.getByRole("switch", { name: /Instant/ }));
    expect(onChange).toHaveBeenCalledWith({ ...FILTERS, types: ["Instant"] });
  });

  it("refuses a value the other filters leave nothing in", () => {
    const onChange = vi.fn();
    render(sheet({ onChange }));
    const land = screen.getByRole("switch", { name: /Land/ });
    expect(land).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(land);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("lays the type chips in a fixed two-column grid, each filling its cell (H8)", () => {
    // Content-sized chips are as wide as their counts, so zeroing counts reflowed the group
    // and the sheet shrank. A fixed grid keeps the rows whatever the counts say.
    render(sheet());
    const instant = screen.getByRole("switch", { name: /Instant/ });
    const grid = instant.parentElement!;
    expect(grid.hasAttribute("data-type-grid")).toBe(true);
    expect(grid.className).toMatch(/\bgrid\b/);
    // Two columns from 360px; one below, where two stop fitting (320 is supported).
    expect(grid.className).toMatch(/(^|\s)grid-cols-1(\s|$)/);
    expect(grid.className).toMatch(/min-\[360px\]:grid-cols-2/);
    expect(instant.className).toMatch(/w-full/);
    expect(instant.className).toMatch(/justify-between/);
  });

  it("keeps a lit value live even at zero, so it can be turned off", () => {
    const onChange = vi.fn();
    render(sheet({ filters: { ...FILTERS, types: ["Land"] }, onChange }));
    const land = screen.getByRole("switch", { name: /Land/ });
    expect(land).not.toHaveAttribute("aria-disabled");
    fireEvent.click(land);
    expect(onChange).toHaveBeenCalledWith({ ...FILTERS, types: [] });
  });

  // The wide panel draws each set's code after its name, and so does this list now that it is
  // the shared set list (ui/set-list-sheet.tsx).
  it("draws each set's code after its name, as the wide panel does", () => {
    render(sheet({ setOptions: [{ ...SETS[0], hint: "BLB" }] }));
    const row = within(openSets()).getByRole("switch", { name: /Bloomburrow/ });
    // Named as the wide panel names it: the code in parentheses after the set.
    expect(row).toHaveAccessibleName(/^Bloomburrow \(BLB\)/);
  });

  it("keeps the code in the name of a set that is out", () => {
    render(sheet({ setOptions: [{ ...SETS[0], hint: "BLB", count: 0, disabled: true }] }));
    const row = within(openSets()).getByRole("switch", { name: /Bloomburrow/ });
    expect(row).toHaveAccessibleName(/Bloomburrow \(BLB\)/);
  });

  it("filters the set list, and keeps a selected set visible through the query", () => {
    // Otherwise unticking a set means clearing the field to find it again.
    render(sheet({ filters: { ...FILTERS, setCodes: ["LEA"] } }));
    openSets();
    fireEvent.change(screen.getByLabelText("Search your sets"), { target: { value: "bloom" } });
    expect(screen.getByRole("switch", { name: /Bloomburrow/ })).toBeTruthy();
    expect(screen.getByRole("switch", { name: /Limited Edition Alpha/ })).toBeTruthy();
  });

  it("announces the set-search match count, as the shared panel's search does", () => {
    // The result region is keyed on `shown`, which a LOCAL query never moves —
    // so a reader typing `zzz` watched the list empty and heard nothing.
    const { container } = render(sheet());
    const panel = openSets();
    fireEvent.change(screen.getByLabelText("Search your sets"), { target: { value: "zzz" } });
    act(() => vi.advanceTimersByTime(301));
    // The PANEL's region, not the sheet's: the panel is `aria-modal`, so a count
    // written outside it is written where nothing can read it.
    expect(panel.querySelector("[role='status']")?.textContent).toContain("No sets match zzz");
    expect(container).toBeTruthy();
  });

  it("counts MATCHES, not the list it prepends selections to", () => {
    // `sets` keeps a selected option visible through a query, so its length is
    // not the match count — with LEA selected and `bloom` typed the list holds
    // two and exactly one matches.
    render(sheet({ filters: { ...FILTERS, setCodes: ["LEA"] } }));
    const panel = openSets();
    fireEvent.change(screen.getByLabelText("Search your sets"), { target: { value: "bloom" } });
    act(() => vi.advanceTimersByTime(301));
    expect(panel.querySelector("[role='status']")?.textContent).toBe("1 set matches bloom");
  });

  it("says nothing when the set field is cleared", () => {
    // Clearing a field is not a result, and a blank query would announce the
    // whole vocabulary as a match count nobody asked for.
    render(sheet());
    const panel = openSets();
    fireEvent.change(screen.getByLabelText("Search your sets"), { target: { value: "bloom" } });
    act(() => vi.advanceTimersByTime(301));
    fireEvent.change(screen.getByLabelText("Search your sets"), { target: { value: "" } });
    act(() => vi.advanceTimersByTime(301));
    expect(panel.querySelector("[role='status']")?.textContent).toBe("1 set matches bloom");
  });

  it("stays quiet on an empty vocabulary rather than contradicting the list", () => {
    // The list already reads "No sets to filter by"; "No sets match zzz" would
    // say something different about the same state.
    render(sheet({ setOptions: [] }));
    const panel = openSets();
    fireEvent.change(screen.getByLabelText("Search your sets"), { target: { value: "zzz" } });
    act(() => vi.advanceTimersByTime(301));
    expect(panel.querySelector("[role='status']")?.textContent).toBe("");
  });

  it("says WHY a value is out, in its own dimension's words", () => {
    // The wide panel explains a zero-count option; a chip carrying only its
    // label and count leaves a screen-reader user an unexplained dead control.
    render(sheet());
    expect(
      screen.getByRole("switch", { name: /Land, no cards match your other filters/i }),
    ).toBeTruthy();
  });

  it("dims a degraded group once, not twice", () => {
    // CSS opacity compounds through a parent: 0.42 × 0.42 is 0.18, far fainter
    // than the selected chips beside them.
    render(sheet({ availabilityOk: false }));
    const chip = screen.getByRole("switch", { name: /Free/ });
    expect(chip.className).not.toContain("opacity-[0.42]");
  });

  it("keeps the status region atomic, so a count is read in its sentence", () => {
    render(sheet());
    // The sheet is portalled out of the render container (E1), so it is read off the document.
    expect(document.querySelector("[role='status']")).toHaveAttribute("aria-atomic", "true");
  });

  it("tells an empty set vocabulary apart from a failed search", () => {
    // A collection whose rows all went unmatched has no sets to filter by, and
    // the sheet opens with a blank query — so the search string rendered as
    // "No sets match " with nothing after it.
    render(sheet({ setOptions: [] }));
    openSets();
    expect(screen.getByText("No sets to filter by")).toBeTruthy();
    expect(screen.queryByText(/No sets match\s*$/)).toBeNull();
  });

  it("says so when a set query matches nothing", () => {
    render(sheet());
    openSets();
    fireEvent.change(screen.getByLabelText("Search your sets"), { target: { value: "zzz" } });
    expect(screen.getByText("No sets match zzz")).toBeTruthy();
  });

  it("carries its own live region, because the chassis's line is outside the modal", () => {
    const { rerender } = render(sheet({ shown: 9 }));
    const region = () => document.querySelector("[role='status']");
    expect(region()?.textContent).toBe("");
    rerender(sheet({ shown: 3 }));
    // Debounced at 300ms like every other count here, so four taps are one
    // number.
    act(() => vi.advanceTimersByTime(299));
    expect(region()?.textContent).toBe("");
    act(() => vi.advanceTimersByTime(2));
    expect(region()?.textContent).toBe("3 of 40 match");
  });

  it("says WHY availability is out, not just that it is", () => {
    // Disabled chips alone tell a screen reader four values are out and nothing
    // about why; the wide surface puts the same sentence on its trigger.
    render(sheet({ availabilityOk: false }));
    expect(
      screen.getByRole("group", {
        name: availabilityCopy.degraded.collectionFilterDisabledAria,
      }),
    ).toBeTruthy();
  });

  it("refuses every availability chip when the aggregate could not be read", () => {
    // On the chip, not on a wrapper: `pointer-events-none` refuses a mouse and
    // lets a keyboard straight through.
    const onChange = vi.fn();
    render(sheet({ availabilityOk: false, onChange }));
    const free = screen.getByRole("switch", { name: /Free/ });
    expect(free).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(free);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("disables an availability state no card is in, as the wide panel does", () => {
    const onChange = vi.fn();
    render(sheet({ availabilityOptions: [{ code: "soft", label: "In a draft", count: 0 }], onChange }));
    fireEvent.click(screen.getByRole("switch", { name: /In a draft/ }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("normalises availability to the canonical order, as the wide form does", () => {
    // Click order would round-trip through the URL and come back reordered.
    const onChange = vi.fn();
    render(sheet({ filters: { ...FILTERS, availability: ["over"] }, onChange }));
    fireEvent.click(screen.getByRole("switch", { name: /In a draft/ }));
    expect(onChange).toHaveBeenCalledWith({ ...FILTERS, availability: ["soft", "over"] });
  });

  it("finds a set by its code, not only its name", () => {
    // The wide panel ranks with `rankSetOptions`, which matches the code. A
    // hand-rolled label match found nothing for `BLB` while desktop found
    // Bloomburrow.
    render(sheet());
    openSets();
    fireEvent.change(screen.getByLabelText("Search your sets"), { target: { value: "BLB" } });
    expect(screen.getByRole("switch", { name: /Bloomburrow/ })).toBeTruthy();
  });

  // #6 — the panel above the sheet.
  it("opens the set list as a second dialog, and makes the sheet inert", () => {
    render(sheet());
    const sheetDialog = screen.getByRole("dialog", { name: "Filter cards" });
    expect(sheetDialog).not.toHaveAttribute("inert");
    openSets();
    expect(screen.getAllByRole("dialog", { hidden: true })).toHaveLength(2);
    // Every control in the sheet stays mounted for layout, and the focus trap
    // collects buttons by query — so without this, Tab reaches the covered
    // `Done` underneath the panel.
    expect(sheetDialog).toHaveAttribute("inert");
  });

  it("names the chosen set to a screen reader, and tracks its own expanded state", () => {
    // An `aria-label` REPLACES the button's text, so a bare "1 selected" throws
    // away the set name the row is visibly showing — and the word at the end has
    // to track `aria-expanded`, or the label says `collapsed` while the panel is
    // up. Composed exactly as `FilterPanel` composes its own.
    const { rerender } = render(sheet({ filters: { ...FILTERS, setCodes: ["BLB"] } }));
    expect(screen.getByRole("button", { name: "Filter by set, Bloomburrow, collapsed" }))
      .toBeTruthy();
    rerender(sheet({ filters: { ...FILTERS, setCodes: ["BLB", "LEA"] } }));
    expect(screen.getByRole("button", { name: "Filter by set, 2 selected, collapsed" }))
      .toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Filter by set/ }));
    expect(screen.getByRole("button", { name: "Filter by set, 2 selected, expanded" }))
      .toBeTruthy();
  });

  it("announces the result count from the panel, not from behind it", () => {
    // The sheet is `inert` while the panel is up, and an inert subtree is out of
    // the accessibility tree — so a set toggled in here moved the list and said
    // so where nothing could read it.
    const { rerender } = render(sheet({ shown: 9 }));
    const panel = openSets();
    rerender(sheet({ shown: 3 }));
    act(() => vi.advanceTimersByTime(301));
    expect(panel.querySelector("[role='status']")?.textContent).toBe("3 of 40 match");
  });

  it("says what is chosen on the row, not what the control is", () => {
    // The heading above already names the dimension; a row reading `Set` under a
    // heading reading `Set` tells the reader nothing.
    const { rerender } = render(sheet());
    expect(screen.getByRole("button", { name: /Filter by set/ })).toHaveTextContent("Any set");
    rerender(sheet({ filters: { ...FILTERS, setCodes: ["BLB"] } }));
    expect(screen.getByRole("button", { name: /Filter by set/ })).toHaveTextContent("Bloomburrow");
    rerender(sheet({ filters: { ...FILTERS, setCodes: ["BLB", "LEA"] } }));
    expect(screen.getByRole("button", { name: /Filter by set/ })).toHaveTextContent("2 sets");
  });

  it("hands a set toggle back as a whole new value, exactly as the chips do", () => {
    const onChange = vi.fn();
    render(sheet({ onChange }));
    openSets();
    fireEvent.click(screen.getByRole("switch", { name: /Bloomburrow/ }));
    expect(onChange).toHaveBeenCalledWith({ ...FILTERS, setCodes: ["BLB"] });
  });

  it("holds every option at 44px in a list that overflows", () => {
    // The options are direct children of a `flex-1` column, and a flex item's
    // default `flex-shrink: 1` compresses it toward min-content the moment the
    // column overflows — `min-h-0` constrains the LIST, and nothing was holding
    // these. jsdom lays nothing out, so the assertion is the property that stops
    // it rather than a measured height.
    render(sheet());
    const panel = openSets();
    for (const chip of within(panel).getAllByRole("switch")) {
      expect(chip.className).toContain("h-[44px]");
      expect(chip.className).toContain("shrink-0");
    }
  });

  it("gives the list the only flexible row, so narrowing it resizes nothing", () => {
    // The complaint that moved the list here was that typing shrank the whole
    // shelf. A fixed panel height with one `flex-1 min-h-0` row is what stops it.
    const panel = (render(sheet()), openSets());
    expect(panel.className).toContain("h-[86vh]");
    expect(panel.className).not.toContain("max-h-");
    const list = panel.querySelector("div.flex-1");
    expect(list?.className).toContain("min-h-0");
    expect(list?.className).toContain("overflow-y-auto");
  });
});

describe("CollectionFilterSheet drag-to-dismiss", () => {
  it("dismisses on a drag past the threshold", () => {
    // The route's own wiring, not the shell's. `ui/sheet.test.tsx` proves the
    // shell in isolation, so dropping `onDismiss` or the handle props here would
    // leave every existing test green while /collection lost the gesture.
    const onDismiss = vi.fn();
    render(sheet({ onDismiss }));
    const handle = document.querySelector('[role="dialog"] [aria-hidden]')!;
    fireEvent.pointerDown(handle, { clientY: 0, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientY: 90, pointerId: 1 });
    fireEvent.pointerUp(handle, { clientY: 90, pointerId: 1 });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("keeps its own 38px handle rather than the shell's default", () => {
    render(sheet());
    const bar = document.querySelector('[role="dialog"] [aria-hidden] > span')!;
    expect(bar.className).toContain("w-[38px]");
  });
});
