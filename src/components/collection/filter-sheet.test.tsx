import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { CollectionFilterSheet } from "./filter-sheet";
import type { BrowseFilters } from "../../lib/collection/browse";

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

describe("CollectionFilterSheet", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

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
    expect(within(dialog).getByRole("switch", { name: /Bloomburrow/ })).toBeTruthy();
    expect(within(dialog).getByRole("switch", { name: /Free/ })).toBeTruthy();
  });

  it("does NOT carry search — that stays on the persistent row", () => {
    // The card-name field is visible beside the trigger at this width, so a
    // second copy in here would be two controls for one filter. The only field
    // in the sheet is the set list's own.
    render(sheet());
    expect(screen.queryByLabelText("Search your cards")).toBeNull();
    expect(screen.getByLabelText("Search your sets")).toBeTruthy();
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

  it("keeps a lit value live even at zero, so it can be turned off", () => {
    const onChange = vi.fn();
    render(sheet({ filters: { ...FILTERS, types: ["Land"] }, onChange }));
    const land = screen.getByRole("switch", { name: /Land/ });
    expect(land).not.toHaveAttribute("aria-disabled");
    fireEvent.click(land);
    expect(onChange).toHaveBeenCalledWith({ ...FILTERS, types: [] });
  });

  it("filters the set list, and keeps a selected set visible through the query", () => {
    // Otherwise unticking a set means clearing the field to find it again.
    render(sheet({ filters: { ...FILTERS, setCodes: ["LEA"] } }));
    fireEvent.change(screen.getByLabelText("Search your sets"), { target: { value: "bloom" } });
    expect(screen.getByRole("switch", { name: /Bloomburrow/ })).toBeTruthy();
    expect(screen.getByRole("switch", { name: /Limited Edition Alpha/ })).toBeTruthy();
  });

  it("tells an empty set vocabulary apart from a failed search", () => {
    // A collection whose rows all went unmatched has no sets to filter by, and
    // the sheet opens with a blank query — so the search string rendered as
    // "No sets match " with nothing after it.
    render(sheet({ setOptions: [] }));
    expect(screen.getByText("No sets to filter by")).toBeTruthy();
    expect(screen.queryByText(/No sets match\s*$/)).toBeNull();
  });

  it("says so when a set query matches nothing", () => {
    render(sheet());
    fireEvent.change(screen.getByLabelText("Search your sets"), { target: { value: "zzz" } });
    expect(screen.getByText("No sets match zzz")).toBeTruthy();
  });

  it("carries its own live region, because the chassis's line is outside the modal", () => {
    const { rerender, container } = render(sheet({ shown: 9 }));
    const region = () => container.querySelector("[role='status']");
    expect(region()?.textContent).toBe("");
    rerender(sheet({ shown: 3 }));
    // Debounced at 300ms like every other count here, so four taps are one
    // number.
    act(() => vi.advanceTimersByTime(299));
    expect(region()?.textContent).toBe("");
    act(() => vi.advanceTimersByTime(2));
    expect(region()?.textContent).toBe("3 of 40 match");
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
    fireEvent.change(screen.getByLabelText("Search your sets"), { target: { value: "BLB" } });
    expect(screen.getByRole("switch", { name: /Bloomburrow/ })).toBeTruthy();
  });
});
