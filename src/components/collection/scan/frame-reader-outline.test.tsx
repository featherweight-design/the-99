import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { createOutlineStore, outlineOf } from "../../../lib/scan/outline";

// The pipeline answers what the test says it saw; the reader hands a live frame's outline to the store.
let seen: unknown = null;
vi.mock("../../../lib/scan/pipeline", async (importOriginal) => ({
  sourceSize: (await importOriginal<typeof import("../../../lib/scan/pipeline")>()).sourceSize,
  loadOrt: async () => ({}),
  loadModels: async (_o: unknown, hold: (s: { release(): void }) => unknown) => ({ detector: hold({ release() {} }), embedder: hold({ release() {} }) }),
  framePipeline: () => ({ read: async () => seen }),
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
