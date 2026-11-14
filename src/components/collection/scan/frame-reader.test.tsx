import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";

// One model loads and its sibling fails: the one that loaded must not be kept for a pipeline that never runs.
const released = vi.fn();
let attempts = 0;
let fail = true;
const loadOrt = vi.fn(async () => ({}));
vi.mock("../../../lib/scan/pipeline", async (importOriginal) => ({
  sourceSize: (await importOriginal<typeof import("../../../lib/scan/pipeline")>()).sourceSize,
  loadOrt: () => loadOrt(),
  loadModelBytes: async () => ({ detector: new Uint8Array(), embedder: new Uint8Array() }),
  loadModels: async (_ort: unknown, hold: (s: { release(): void }) => unknown) => {
    attempts++;
    const n = attempts;
    const s = hold({ release: () => released(n) });
    if (fail) throw new Error("the embedder failed to load");
    return { detector: s, embedder: s };
  },
  framePipeline: () => ({ read: async () => null }),
}));

const { useFrameReader } = await import("./frame-reader");

const sized = () => {
  const video = document.createElement("video");
  Object.defineProperty(video, "videoWidth", { value: 1280 });
  Object.defineProperty(video, "videoHeight", { value: 720 });
  return video;
};

describe("useFrameReader", () => {
  it("releases every session a failed load attempt kept, and tries again with its own", async () => {
    attempts = 0;
    released.mockClear();
    fail = true;
    const { result } = renderHook(() => useFrameReader());
    // The load the mount started fails and releases what it kept; each read then tries again with its own holder.
    await vi.waitFor(() => expect(released).toHaveBeenCalledWith(1));
    await expect(result.current(sized())).rejects.toThrow();
    await vi.waitFor(() => expect(released).toHaveBeenCalledWith(2));
    await expect(result.current(sized())).rejects.toThrow();
    await vi.waitFor(() => expect(released).toHaveBeenCalledWith(3));
  });

  it("starts loading as the scanner mounts, before the camera gives a picture, and says once when it is ready", async () => {
    loadOrt.mockClear();
    fail = false;
    const onReady = vi.fn();
    const { result } = renderHook(() => useFrameReader(undefined, onReady));
    await vi.waitFor(() => expect(onReady).toHaveBeenCalledTimes(1));
    expect(loadOrt).toHaveBeenCalledTimes(1);
    // A frame with no picture yet reads as no card; a sized frame reuses the load the mount started.
    expect(await result.current(document.createElement("video"))).toEqual({ frame: { kind: "none" }, cardInView: false, dark: false });
    await result.current(sized());
    expect(loadOrt).toHaveBeenCalledTimes(1);
    expect(onReady).toHaveBeenCalledTimes(1);
  });
});
