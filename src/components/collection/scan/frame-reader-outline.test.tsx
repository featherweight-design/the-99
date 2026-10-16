import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { OUTLINE_HOLD_MS, createOutlineStore, outlineOf } from "../../../lib/scan/outline";

// The pipeline answers what the test says it saw; the reader hands a live frame's outline to the store.
let seen: unknown = null;
let failNext = false;
vi.mock("../../../lib/scan/pipeline", async (importOriginal) => ({
  sourceSize: (await importOriginal<typeof import("../../../lib/scan/pipeline")>()).sourceSize,
  loadOrt: async () => ({}),
  loadModels: async (_o: unknown, hold: (s: { release(): void }) => unknown) => ({ detector: hold({ release() {} }), embedder: hold({ release() {} }) }),
  framePipeline: () => ({ read: async () => { if (failNext) { failNext = false; throw new Error("the detector fell over"); } return seen; } }),
}));
const { useFrameReader } = await import("./frame-reader");

const OUTLINE = outlineOf([{ x: 400, y: 300 }, { x: 600, y: 300 }, { x: 600, y: 700 }, { x: 400, y: 700 }], 1000, 1000, 1280, 720);
const card = { kind: "card", dark: false, crop: new Float32Array(), embedding: new Float32Array(), outline: OUTLINE, detMs: 1, embMs: 1 };
const video = () => {
  const v = document.createElement("video");
  Object.defineProperty(v, "videoWidth", { value: 1280 });
  Object.defineProperty(v, "videoHeight", { value: 720 });
  return v;
};

describe("useFrameReader's outline", () => {
  it("shows a live card's outline, and drops it a moment after the card goes", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const store = createOutlineStore();
    const { result } = renderHook(() => useFrameReader(store));
    seen = card;
    await result.current(video());
    expect(store.get()).toBe(OUTLINE);
    seen = { kind: "none", dark: false, detMs: 1 };
    await result.current(video());
    expect(store.get()).toBe(OUTLINE);
    vi.advanceTimersByTime(1000);
    expect(store.get()).toBeNull();
    vi.useRealTimers();
  });

  it("hides it when a live read fails or the camera loses its picture, and rethrows the failure", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const store = createOutlineStore();
    const { result } = renderHook(() => useFrameReader(store));
    seen = card;
    await result.current(video());
    expect(store.get()).toBe(OUTLINE);
    // The camera loses its size: nothing is read, and the old polygon must not stay.
    const blank = document.createElement("video");
    await result.current(blank);
    vi.advanceTimersByTime(OUTLINE_HOLD_MS);
    expect(store.get()).toBeNull();
    // A read that throws does the same, and the error still reaches the caller.
    store.show(OUTLINE);
    failNext = true;
    await expect(result.current(video())).rejects.toThrow("the detector fell over");
    vi.advanceTimersByTime(OUTLINE_HOLD_MS);
    expect(store.get()).toBeNull();
    vi.useRealTimers();
  });

  it("never draws a chosen photo's outline: a photo has no viewfinder", async () => {
    const store = createOutlineStore();
    const { result } = renderHook(() => useFrameReader(store));
    seen = card;
    const photo = Object.assign(document.createElement("canvas"), { width: 800, height: 600 });
    await result.current(photo as unknown as Parameters<typeof result.current>[0]);
    expect(store.get()).toBeNull();
  });

  it("clears the outline when the scanner closes", async () => {
    const store = createOutlineStore();
    const { result, unmount } = renderHook(() => useFrameReader(store));
    seen = card;
    await result.current(video());
    unmount();
    expect(store.get()).toBeNull();
  });
});
