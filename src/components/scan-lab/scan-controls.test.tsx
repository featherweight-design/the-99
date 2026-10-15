// A verdict records the reading the player was looking at when the press began, never one that arrived between the
// finger coming down and the click (Hugh, 2026-10-15: a Zirda verdict landed on the next frame's guess).
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ScanControls, VERDICT_CLICK_WAIT_MS } from "./scan-controls";
import { scanLabCopy as copy } from "../../lib/copy/scan-lab";
import type { Reading } from "../../lib/scan-lab/reading";

const card = (name: string): Reading => ({
  kind: "card", crop: new Float32Array(3), margin: 0.2, agreed: 5, committed: true, detMs: 1, embMs: 2, matchMs: 3, totalMs: 6,
  guesses: [{ oracleId: `00000000-0000-4000-8000-${name.length.toString().padStart(12, "0")}`, name, score: 0.9 }],
} as Reading);
const ZIRDA = card("Zirda, the Dawnwalker");
const NEXT = card("Sol Ring");

afterEach(cleanup);

function setup() {
  const onVerdict = vi.fn(async () => {});
  const view = render(<ScanControls reading={ZIRDA} keepFrame onKeepFrame={vi.fn()} onVerdict={onVerdict} />);
  const redraw = (r: Reading) => view.rerender(<ScanControls reading={r} keepFrame onKeepFrame={vi.fn()} onVerdict={onVerdict} />);
  return { onVerdict, redraw };
}

describe("ScanControls", () => {
  it("records the reading on screen at pointerdown when a new one lands before the click", async () => {
    const { onVerdict, redraw } = setup();
    const right = screen.getByRole("button", { name: copy.right });
    fireEvent.pointerDown(right);
    redraw(NEXT);
    // Held: the guess on screen did not move.
    expect(screen.getByText("Zirda, the Dawnwalker")).toBeTruthy();
    expect(screen.getByText(copy.held)).toBeTruthy();
    fireEvent.pointerUp(right);
    await act(async () => { fireEvent.click(right); });
    expect(onVerdict).toHaveBeenCalledWith(ZIRDA, true);
  });

  it("holds from a press anywhere in the controls, Keep this frame included", async () => {
    const { onVerdict, redraw } = setup();
    fireEvent.pointerDown(screen.getByLabelText(copy.keepFrame));
    redraw(NEXT);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: copy.wrong })); });
    expect(onVerdict).toHaveBeenCalledWith(ZIRDA, false);
  });

  it("lets go once the verdict is saved, and shows the live reading again", async () => {
    const { redraw } = setup();
    const right = screen.getByRole("button", { name: copy.right });
    fireEvent.pointerDown(right);
    redraw(NEXT);
    await act(async () => { fireEvent.click(right); });
    expect(screen.getByText("Sol Ring")).toBeTruthy();
    expect(screen.queryByText(copy.held)).toBeNull();
  });

  it("keeps the hold for a phone's click that lands after the pointerup's own task", async () => {
    vi.useFakeTimers();
    const { onVerdict, redraw } = setup();
    const right = screen.getByRole("button", { name: copy.right });
    fireEvent.pointerDown(right);
    redraw(NEXT);
    fireEvent.pointerUp(right);
    await act(async () => { vi.advanceTimersByTime(300); });
    await act(async () => { fireEvent.click(right); });
    vi.useRealTimers();
    expect(onVerdict).toHaveBeenCalledWith(ZIRDA, true);
  });

  it("lets go of a ✓/✗ press that never clicks (a finger slid off)", async () => {
    vi.useFakeTimers();
    const { redraw } = setup();
    const right = screen.getByRole("button", { name: copy.right });
    fireEvent.pointerDown(right);
    redraw(NEXT);
    fireEvent.pointerUp(right);
    await act(async () => { vi.advanceTimersByTime(VERDICT_CLICK_WAIT_MS + 1); });
    vi.useRealTimers();
    expect(screen.getByText("Sol Ring")).toBeTruthy();
  });

  it("gives a second tap during a save the reading in front of it then, not the first press's", async () => {
    let finish = () => {};
    const onVerdict = vi.fn((_r: Reading | null, _c: boolean) => new Promise<void>((r) => { finish = r; }));
    const view = render(<ScanControls reading={ZIRDA} keepFrame onKeepFrame={vi.fn()} onVerdict={onVerdict} />);
    const right = screen.getByRole("button", { name: copy.right });
    fireEvent.pointerDown(right);
    await act(async () => { fireEvent.click(right); });
    view.rerender(<ScanControls reading={NEXT} keepFrame onKeepFrame={vi.fn()} onVerdict={onVerdict} />);
    fireEvent.pointerDown(right);
    await act(async () => { fireEvent.click(right); });
    expect(onVerdict.mock.calls.map((c) => c[0])).toEqual([ZIRDA, NEXT]);
    await act(async () => { finish(); });
  });

  it("lets go when a press ends with no verdict", async () => {
    vi.useFakeTimers();
    const { redraw } = setup();
    const keep = screen.getByLabelText(copy.keepFrame);
    fireEvent.pointerDown(keep);
    redraw(NEXT);
    fireEvent.pointerUp(keep);
    await act(async () => { vi.runAllTimers(); });
    vi.useRealTimers();
    expect(screen.getByText("Sol Ring")).toBeTruthy();
  });

  it("records the live reading when nothing was held (a keyboard press)", async () => {
    const { onVerdict, redraw } = setup();
    redraw(NEXT);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: copy.right })); });
    expect(onVerdict).toHaveBeenCalledWith(NEXT, true);
  });
});
