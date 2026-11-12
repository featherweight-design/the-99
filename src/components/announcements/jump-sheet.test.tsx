import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { JumpSheet } from "./jump-sheet";

afterEach(cleanup);

const props = { counts: { "2026-10": { release: 2 } } as never, kind: "all" as const, current: "2026-10", now: "2026-11-12T00:00:00Z", onPick: () => {} };

describe("JumpSheet as a popover", () => {
  it("takes a history entry while it is open, and Back closes it", async () => {
    const onClose = vi.fn();
    const push = vi.spyOn(window.history, "pushState");
    render(<JumpSheet {...props} onClose={onClose} popover panelRef={{ current: null }} triggerRef={{ current: null }} />);
    expect(push).toHaveBeenCalledTimes(1);
    push.mockRestore();
    await act(async () => {
      window.history.back();
      await new Promise((r) => setTimeout(r, 30));
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("2026")).toBeInTheDocument();
  });

  it("is backed once as the phone's sheet: the modal chrome's own entry, not a second one", () => {
    const push = vi.spyOn(window.history, "pushState");
    render(<JumpSheet {...props} onClose={() => {}} />);
    expect(push).toHaveBeenCalledTimes(1);
    push.mockRestore();
  });
});
