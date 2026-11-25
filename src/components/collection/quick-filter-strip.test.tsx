import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { QuickFilterStrip, drawnQuickChips } from "./quick-filter-strip";
import { quickFilterCopy } from "../../lib/copy/quick-filters";
import type { QuickCounts } from "../../lib/collection/quick-counts";

const counts: QuickCounts = { free: 4, gc: 1, tutor: 0, turns: 2, mld: 0, foil: 3 };

describe("QuickFilterStrip", () => {
  it("draws the chips in design's order and leaves out a chip with no cards", () => {
    expect(drawnQuickChips(counts, undefined)).toEqual(["free", "gc", "turns", "foil"]);
  });

  it("keeps a pressed chip drawn at zero, so the press can be taken back", () => {
    expect(drawnQuickChips({ ...counts, tutor: 0 }, "tutor")).toContain("tutor");
  });

  it("draws nothing when every count is zero", () => {
    const zero: QuickCounts = { free: 0, gc: 0, tutor: 0, turns: 0, mld: 0, foil: 0 };
    const { container } = render(<QuickFilterStrip counts={zero} pressed={undefined} onPress={() => {}} layout="wide" />);
    expect(container.firstChild).toBeNull();
  });

  it("is a toggle per chip: aria-pressed follows the pressed key and a press reports its key", () => {
    const onPress = vi.fn();
    render(<QuickFilterStrip counts={counts} pressed="gc" onPress={onPress} layout="phone" />);
    const on = screen.getByRole("button", { name: quickFilterCopy.chipAria(quickFilterCopy.chips.gameChanger, 1, true) });
    const off = screen.getByRole("button", { name: quickFilterCopy.chipAria(quickFilterCopy.chips.free, 4, false) });
    expect(on.getAttribute("aria-pressed")).toBe("true");
    expect(off.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(off);
    expect(onPress).toHaveBeenCalledWith("free");
    // The pressed chip ends in the take-back mark.
    expect(on.textContent).toContain(quickFilterCopy.pressedMark);
    expect(off.textContent).not.toContain(quickFilterCopy.pressedMark);
  });

  it("scrolls a chip into view when keyboard focus lands on it", () => {
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    render(<QuickFilterStrip counts={counts} pressed={undefined} onPress={() => {}} layout="phone" />);
    fireEvent.focus(screen.getByRole("button", { name: quickFilterCopy.chipAria(quickFilterCopy.chips.foil, 3, false) }));
    expect(scroll).toHaveBeenCalled();
  });
});
