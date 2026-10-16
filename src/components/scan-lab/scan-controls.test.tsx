// A verdict records the reading the player was looking at when the press began, never one that arrived between the
// finger coming down and the click (Hugh, 2026-10-15: a Zirda verdict landed on the next frame's guess).
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ScanControls, VERDICT_CLICK_WAIT_MS } from "./scan-controls";
import { scanLabCopy as copy } from "../../lib/copy/scan-lab";
import type { Reading } from "../../lib/scan/reading";
import type { Display } from "../../lib/scan/steady";

const card = (name: string): Reading => ({
  kind: "card", crop: new Float32Array(3), margin: 0.2, agreed: 5, committed: true, detMs: 1, embMs: 2, matchMs: 3, totalMs: 6,
  guesses: [{ oracleId: `00000000-0000-4000-8000-${name.length.toString().padStart(12, "0")}`, name, score: 0.9 }],
} as Reading);
const ZIRDA = card("Zirda, the Dawnwalker");
const NEXT = card("Sol Ring");
// On screen long before any press here, so no press falls inside the change grace unless a test says so.
const at = (reading: Reading | null, changedAt = -1e9, before: Reading | null = null): Display => ({ reading, changedAt, before });
const tap = (reading: Reading | null) => expect.objectContaining({ reading });

afterEach(cleanup);

function setup() {
  const onVerdict = vi.fn(async () => {});
  const view = render(<ScanControls display={at(ZIRDA)} keepFrame onKeepFrame={vi.fn()} onVerdict={onVerdict} />);
  const redraw = (r: Reading) => view.rerender(<ScanControls display={at(r)} keepFrame onKeepFrame={vi.fn()} onVerdict={onVerdict} />);
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
    expect(onVerdict).toHaveBeenCalledWith(tap(ZIRDA), true);
  });

  it("holds from a press anywhere in the controls, Keep this frame included", async () => {
    const { onVerdict, redraw } = setup();
    fireEvent.pointerDown(screen.getByLabelText(copy.keepFrame));
    redraw(NEXT);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: copy.wrong })); });
    expect(onVerdict).toHaveBeenCalledWith(tap(ZIRDA), false);
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
    expect(onVerdict).toHaveBeenCalledWith(tap(ZIRDA), true);
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

  it("records what a second tap during a save SEES: the held reading still on screen", async () => {
    const pending: (() => void)[] = [];
    const onVerdict = vi.fn((_t: unknown, _c: boolean) => new Promise<void>((r) => { pending.push(r); }));
    const view = render(<ScanControls display={at(ZIRDA)} keepFrame onKeepFrame={vi.fn()} onVerdict={onVerdict} />);
    const right = screen.getByRole("button", { name: copy.right });
    fireEvent.pointerDown(right);
    await act(async () => { fireEvent.click(right); });
    view.rerender(<ScanControls display={at(NEXT)} keepFrame onKeepFrame={vi.fn()} onVerdict={onVerdict} />);
    // The first verdict is still saving, so its reading is what the player sees.
    expect(screen.getByText("Zirda, the Dawnwalker")).toBeTruthy();
    fireEvent.pointerDown(right);
    await act(async () => { fireEvent.click(right); });
    expect(onVerdict.mock.calls.map((c) => (c[0] as { reading: Reading | null }).reading)).toEqual([ZIRDA, ZIRDA]);
    await act(async () => { pending.forEach((done) => done()); });
    // Both saved: the live reading is back.
    expect(screen.getByText("Sol Ring")).toBeTruthy();
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

  it("gives a new press a fresh hold that an abandoned press's timer cannot clear", async () => {
    vi.useFakeTimers();
    const { onVerdict, redraw } = setup();
    const right = screen.getByRole("button", { name: copy.right });
    const wrong = screen.getByRole("button", { name: copy.wrong });
    fireEvent.pointerDown(right);
    redraw(NEXT);
    // Dragged from ✓ to ✗ and let go: no click, so the hold waits out its timer.
    fireEvent.pointerUp(wrong);
    await act(async () => { vi.advanceTimersByTime(VERDICT_CLICK_WAIT_MS - 500); });
    fireEvent.pointerDown(right);
    await act(async () => { vi.advanceTimersByTime(600); });
    // The old timer has fired; the new press's hold stands.
    expect(screen.getByText("Zirda, the Dawnwalker")).toBeTruthy();
    fireEvent.pointerUp(right);
    await act(async () => { fireEvent.click(right); });
    vi.useRealTimers();
    expect(onVerdict).toHaveBeenCalledWith(tap(ZIRDA), true);
  });

  it("lets go when the press is released outside the controls", async () => {
    vi.useFakeTimers();
    const { onVerdict, redraw } = setup();
    fireEvent.pointerDown(screen.getByRole("button", { name: copy.right }));
    redraw(NEXT);
    fireEvent.pointerUp(document.body);
    await act(async () => { vi.advanceTimersByTime(1); });
    vi.useRealTimers();
    expect(screen.getByText("Sol Ring")).toBeTruthy();
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: copy.wrong })); });
    expect(onVerdict).toHaveBeenCalledWith(tap(NEXT), false);
  });

  it("records the live reading when nothing was held (a keyboard press)", async () => {
    const { onVerdict, redraw } = setup();
    redraw(NEXT);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: copy.right })); });
    expect(onVerdict).toHaveBeenCalledWith(tap(NEXT), true);
  });

  it("records a press that came within the change grace against the guess shown before the change, and flags it", async () => {
    // Zirda shown, then Sol Ring took the screen 300ms before the finger landed on Right (the Grizzled Angler case).
    const now = vi.spyOn(performance, "now").mockReturnValue(10_000);
    const onVerdict = vi.fn(async () => {});
    render(<ScanControls display={at(NEXT, 9_700, ZIRDA)} keepFrame onKeepFrame={vi.fn()} onVerdict={onVerdict} />);
    const right = screen.getByRole("button", { name: copy.right });
    fireEvent.pointerDown(right);
    await act(async () => { fireEvent.click(right); });
    now.mockRestore();
    expect(onVerdict).toHaveBeenCalledWith({ reading: ZIRDA, shown: NEXT, changedMsBeforeTap: 300, pressedAt: 10_000 }, true);
  });

  it("records the guess on screen when it changed longer ago than the grace", async () => {
    const now = vi.spyOn(performance, "now").mockReturnValue(10_000);
    const onVerdict = vi.fn(async () => {});
    render(<ScanControls display={at(NEXT, 9_000, ZIRDA)} keepFrame onKeepFrame={vi.fn()} onVerdict={onVerdict} />);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: copy.right })); });
    now.mockRestore();
    expect(onVerdict).toHaveBeenCalledWith({ reading: NEXT, shown: NEXT, changedMsBeforeTap: 1000, pressedAt: 10_000 }, true);
  });

  it("says it is unsure while nothing holds", () => {
    render(<ScanControls display={at(null)} keepFrame onKeepFrame={vi.fn()} onVerdict={vi.fn(async () => {})} />);
    expect(screen.getByText(copy.unsure)).toBeTruthy();
  });

  it("times a change the camera made behind a hold from when the hold let go and showed it", async () => {
    const now = vi.spyOn(performance, "now").mockReturnValue(10_000);
    const pending: (() => void)[] = [];
    const onVerdict = vi.fn((_t: unknown, _c: boolean) => new Promise<void>((r) => { pending.push(r); }));
    const view = render(<ScanControls display={at(ZIRDA)} keepFrame onKeepFrame={vi.fn()} onVerdict={onVerdict} />);
    const right = screen.getByRole("button", { name: copy.right });
    fireEvent.pointerDown(right);
    // Behind the hold, Sol Ring settled at 10,100: the player never saw that change.
    view.rerender(<ScanControls display={at(NEXT, 10_100, ZIRDA)} keepFrame onKeepFrame={vi.fn()} onVerdict={onVerdict} />);
    fireEvent.pointerUp(right);
    await act(async () => { fireEvent.click(right); });
    // The save lands at 11,000 and the screen shows Sol Ring then; a press 200ms later came too soon to react to it.
    now.mockReturnValue(11_000);
    await act(async () => { pending.forEach((done) => done()); });
    expect(screen.getByText("Sol Ring")).toBeTruthy();
    now.mockReturnValue(11_200);
    fireEvent.pointerDown(right);
    await act(async () => { fireEvent.click(right); });
    now.mockRestore();
    expect(onVerdict.mock.calls[1][0]).toEqual({ reading: ZIRDA, shown: NEXT, changedMsBeforeTap: 200, pressedAt: 11_200 });
  });

  it("judges a second press during a save at its own time, on the display still held", async () => {
    const now = vi.spyOn(performance, "now").mockReturnValue(10_000);
    const onVerdict = vi.fn((_t: unknown, _c: boolean) => new Promise<void>(() => {}));
    render(<ScanControls display={at(NEXT, 9_700, ZIRDA)} keepFrame onKeepFrame={vi.fn()} onVerdict={onVerdict} />);
    const right = screen.getByRole("button", { name: copy.right });
    fireEvent.pointerDown(right);
    fireEvent.pointerUp(right);
    await act(async () => { fireEvent.click(right); });
    // The first save never lands; a second press a second later sees Sol Ring that has been up for 1,300ms.
    now.mockReturnValue(11_000);
    fireEvent.pointerDown(right);
    await act(async () => { fireEvent.click(right); });
    now.mockRestore();
    expect(onVerdict.mock.calls.map((c) => c[0])).toEqual([
      { reading: ZIRDA, shown: NEXT, changedMsBeforeTap: 300, pressedAt: 10_000 },
      { reading: NEXT, shown: NEXT, changedMsBeforeTap: 1300, pressedAt: 11_000 },
    ]);
  });

  it("tells the page what the screen holds while a press holds it, and when it lets go", async () => {
    const onHold = vi.fn();
    render(<ScanControls display={at(ZIRDA)} keepFrame onKeepFrame={vi.fn()} onVerdict={vi.fn(async () => {})} onHold={onHold} />);
    const right = screen.getByRole("button", { name: copy.right });
    fireEvent.pointerDown(right);
    expect(onHold).toHaveBeenLastCalledWith(expect.objectContaining({ reading: ZIRDA }));
    await act(async () => { fireEvent.click(right); });
    expect(onHold).toHaveBeenLastCalledWith(null);
  });
});
