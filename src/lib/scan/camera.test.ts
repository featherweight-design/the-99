import { describe, expect, it, vi } from "vitest";
import { DARK_LUMA, isDark, meanLuma, torchOf } from "./camera";

const frame = (v: number, px = 64) => new Uint8ClampedArray(px * 4).map((_, i) => (i % 4 === 3 ? 255 : v));

describe("torchOf", () => {
  it("offers the torch where the track reports one, and turns it on", async () => {
    const applyConstraints = vi.fn().mockResolvedValue(undefined);
    const torch = torchOf({ getCapabilities: () => ({ torch: true }), applyConstraints });
    expect(torch.available).toBe(true);
    expect(await torch.set(true)).toBe(true);
    expect(applyConstraints).toHaveBeenCalledWith({ advanced: [{ torch: true }] });
  });

  it("offers nothing on iOS Safari, which reports no torch or no capabilities, and never throws", async () => {
    const applyConstraints = vi.fn();
    for (const track of [{ getCapabilities: () => ({}), applyConstraints }, { applyConstraints }, null]) {
      const torch = torchOf(track);
      expect(torch.available).toBe(false);
      expect(await torch.set(true)).toBe(false);
    }
    expect(applyConstraints).not.toHaveBeenCalled();
  });

  it("answers false when the device refuses the torch, and when the capability read throws", async () => {
    expect(await torchOf({ getCapabilities: () => ({ torch: true }), applyConstraints: () => Promise.reject(new Error("no")) }).set(true)).toBe(false);
    expect(torchOf({ getCapabilities: () => { throw new Error("x"); }, applyConstraints: vi.fn() }).available).toBe(false);
  });
});

describe("the dark-frame detector", () => {
  it("reads a black frame as dark and a lit one as not", () => {
    expect(isDark(frame(5))).toBe(true);
    expect(isDark(frame(120))).toBe(false);
  });

  it("draws the line at DARK_LUMA", () => {
    expect(meanLuma(frame(DARK_LUMA))).toBeCloseTo(DARK_LUMA, 5);
    expect(isDark(frame(DARK_LUMA - 1))).toBe(true);
    expect(isDark(frame(DARK_LUMA))).toBe(false);
  });

  it("reads an empty frame as dark rather than dividing by nothing", () => {
    expect(isDark(new Uint8ClampedArray(0))).toBe(true);
  });
});
