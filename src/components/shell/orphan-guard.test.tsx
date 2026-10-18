import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useOrphanGuard } from "./orphan-guard";

const beacon = vi.fn(() => true);
beforeEach(() => {
  beacon.mockClear();
  Object.defineProperty(navigator, "sendBeacon", { value: beacon, configurable: true });
});
afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
});

async function body(call = 0) {
  return JSON.parse(await (beacon.mock.calls[call] as unknown as [string, Blob])[1].text());
}

describe("useOrphanGuard", () => {
  it("does nothing while the screen has a run", () => {
    const onOrphan = vi.fn();
    renderHook(() => useOrphanGuard(false, "/credits", { deployment: null }, onOrphan));
    expect(onOrphan).not.toHaveBeenCalled();
    expect(beacon).not.toHaveBeenCalled();
  });

  it("takes an orphaned screen down and reports it once, as an orphan, with the switch on", async () => {
    window.history.replaceState(null, "", "/credits");
    const onOrphan = vi.fn();
    const { rerender } = renderHook(({ orphaned }) => useOrphanGuard(orphaned, "/credits", { deployment: "dpl_a" }, onOrphan), {
      initialProps: { orphaned: false },
    });
    rerender({ orphaned: true });
    expect(onOrphan).toHaveBeenCalledTimes(1);
    expect(beacon).toHaveBeenCalledTimes(1);
    expect(await body()).toMatchObject({ kind: "orphan", from: "/credits", to: "/credits", at: "/credits", moved: true });
    // It is down now (the caller flips `orphaned` back), and a second sighting on the same page is not a second report.
    rerender({ orphaned: false });
    rerender({ orphaned: true });
    expect(onOrphan).toHaveBeenCalledTimes(2);
    expect(beacon).toHaveBeenCalledTimes(1);
  });

  it("takes the screen down and reports nothing while the switch is off", () => {
    const onOrphan = vi.fn();
    renderHook(() => useOrphanGuard(true, "/credits", null, onOrphan));
    expect(onOrphan).toHaveBeenCalledTimes(1);
    expect(beacon).not.toHaveBeenCalled();
  });
});
