import { afterEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";

// One model loads and its sibling fails: the one that loaded must not be kept for a pipeline that never runs.
const released = vi.fn();
let attempts = 0;
let fail = true;
const loadOrt = vi.fn(async () => ({}));
const pipelineArgs: unknown[][] = [];
vi.mock("../../../lib/scan/pipeline", async (importOriginal) => ({
  sourceSize: (await importOriginal<typeof import("../../../lib/scan/pipeline")>()).sourceSize,
  loadOrt: () => loadOrt(),
  loadModelBytes: () => ({ detector: Promise.resolve(new Uint8Array()), embedder: Promise.resolve(new Uint8Array()) }),
  loadModels: async (_ort: unknown, hold: (s: { release(): void }) => unknown) => {
    attempts++;
    const n = attempts;
    const s = hold({ release: () => released(n) });
    if (fail) throw new Error("the embedder failed to load");
    return { detector: s, embedder: s };
  },
  framePipeline: (...args: unknown[]) => {
    pipelineArgs.push(args);
    return { read: async () => null };
  },
}));
// The WebGPU embedder as frame-reader starts it: the run it answers is what `framePipeline` must be handed.
const gpuRun = async () => new Float32Array(1);
// Whether the WebGPU runtime is in Cache Storage as the scanner opens: it decides when the embedder starts.
let runtimeCached = false;
const gpuStarts = vi.fn();
vi.mock("../../../lib/scan/webgpu", () => ({
  gpuAdapter: async () => ({ gpu: true, adapter: null }),
  gpuRuntimeCached: async () => runtimeCached,
  NotCached: class NotCached extends Error {},
  loadGpuEmbedder: async () => gpuRun,
  startGpuEmbedder: async () => {
    gpuStarts();
    return gpuRun;
  },
}));

const { useFrameReader } = await import("./frame-reader");
const { resetScanMarks, scanMark } = await import("../../../lib/scan/marks");

const sized = () => {
  const video = document.createElement("video");
  Object.defineProperty(video, "videoWidth", { value: 1280 });
  Object.defineProperty(video, "videoHeight", { value: 720 });
  return video;
};

describe("useFrameReader", () => {
  afterEach(() => {
    runtimeCached = false;
  });

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

  it("loads nothing for a read that lands after the scanner closed", async () => {
    loadOrt.mockClear();
    fail = false;
    const { result, unmount } = renderHook(() => useFrameReader());
    await vi.waitFor(() => expect(loadOrt).toHaveBeenCalledTimes(1));
    const read = result.current;
    unmount();
    await expect(read(sized())).rejects.toThrow("the scanner closed");
    expect(loadOrt).toHaveBeenCalledTimes(1);
  });

  it("with no runtime cached, starts the WebGPU embedder only once the first answer is drawn", async () => {
    resetScanMarks();
    pipelineArgs.length = 0;
    gpuStarts.mockClear();
    runtimeCached = false;
    fail = false;
    const onReady = vi.fn();
    renderHook(() => useFrameReader(undefined, onReady));
    await vi.waitFor(() => expect(pipelineArgs.length).toBe(1));
    const gpu = pipelineArgs[0][3] as Promise<unknown>;
    expect(gpu).toBeInstanceOf(Promise);
    // The models are loaded and the pipeline built: still no WebGPU load, as no answer is drawn.
    await new Promise((r) => setTimeout(r, 0));
    expect(gpuStarts).not.toHaveBeenCalled();
    scanMark("scan:answer-drawn");
    expect(await gpu).toBe(gpuRun);
    expect(gpuStarts).toHaveBeenCalledTimes(1);
  });

  it("with the runtime cached, starts the WebGPU embedder at open, before any answer", async () => {
    resetScanMarks();
    pipelineArgs.length = 0;
    gpuStarts.mockClear();
    runtimeCached = true;
    fail = false;
    renderHook(() => useFrameReader());
    await vi.waitFor(() => expect(pipelineArgs.length).toBe(1));
    expect(await (pipelineArgs[0][3] as Promise<unknown>)).toBe(gpuRun);
    expect(gpuStarts).toHaveBeenCalledTimes(1);
  });
});
