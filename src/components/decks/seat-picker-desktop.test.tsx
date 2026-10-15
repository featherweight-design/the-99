// The picker at 1300: an anchored panel, placed by `useAnchoredPanel`. jsdom has no layout, so the width
// query is pinned to desktop and the placement is whatever the hook computes from zero rects.
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { gameSeatsCopy } from "../../lib/copy/game-seats";
import { SeatPicker } from "./seat-picker";

vi.mock("../ui/use-is-desktop", () => ({ useIsDesktop: () => true }));
vi.mock("../../app/decks/[id]/opponent-actions", () => ({ searchOpponentCommandersAction: async () => [] }));

// A browser will not focus an element under `visibility: hidden`; jsdom will. The panel is hidden until it is
// placed, so without this the test would pass on a focus the browser refuses.
const realFocus = HTMLElement.prototype.focus;
vi.spyOn(HTMLElement.prototype, "focus").mockImplementation(function (this: HTMLElement, options?: FocusOptions) {
  const hidden = this.closest<HTMLElement>('[role="dialog"]')?.style.visibility === "hidden";
  if (!hidden) realFocus.call(this, options);
});

describe("SeatPicker at desktop width", () => {
  it("focuses the search once the panel is placed, and holds the panel to the viewport so its list can scroll", async () => {
    const anchor = document.createElement("button");
    document.body.appendChild(anchor);
    render(<SeatPicker anchor={anchor} onClose={() => {}} onPick={() => {}} />);
    const dialog = screen.getByRole("dialog", { hidden: true });
    expect(dialog).toHaveAttribute("aria-label", gameSeatsCopy.picker.title);
    expect(dialog.style.maxHeight).toBe("calc(100dvh - 16px)");
    expect(dialog.className).toContain("flex-col");
    await waitFor(() => expect(screen.getByRole("searchbox")).toHaveFocus());
    anchor.remove();
  });
});
