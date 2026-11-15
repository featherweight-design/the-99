import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";

// The scanner on a browser that reads in a worker (`read-worker-client.ts`), the worker stood in.
const loadOrt = vi.fn(async () => ({}));
const mainReads = vi.fn(async () => ({ kind: "none", dark: true, detMs: 1 }));
vi.mock("../../../lib/scan/pipeline", async (importOriginal) => ({
  sourceSize: (await importOriginal<typeof import("../../../lib/scan/pipeline")>()).sourceSize,
  loadOrt: () => loadOrt(),
  loadModelBytes: () => ({ detector: Promise.resolve(new Uint8Array()), embedder: Promise.resolve(new Uint8Array()) }),
  loadModels: async (_ort: unknown, hold: (s: { release(): void }) => unknown) => {
    const s = hold({ release: () => {} });
    return { detector: s, embedder: s };
  },
  framePipeline: () => ({ read: mainReads }),
}));
vi.mock("../../../lib/scan/webgpu", () => ({
  gpuAdapter: async () => ({ gpu: false, adapter: null }),
  gpuRuntimeCached: async () => false,
  NotCached: class NotCached extends Error {},
  loadGpuEmbedder: async () => null,
  startGpuEmbedder: async () => null,
}));
class ReaderGone extends Error {}
let onGone: () => void = () => {};
const workerRead = vi.fn();
const closed = vi.fn();
let workerStarts = 0;
// When set, a start that waits until the test settles it, with the signal the scanner's close aborts.
let hold: { signal?: AbortSignal; settle: () => void } | null = null;
let holdNext = false;
vi.mock("../../../lib/scan/read-worker-client", () => ({
  ReaderGone,
  pageReadsInWorker: () => true,
  startWorkerReader: async (_bytes: unknown, opts: { onGone: () => void; signal?: AbortSignal }) => {
    workerStarts++;
    onGone = opts.onGone;
    if (holdNext) await new Promise<void>((settle) => (hold = { signal: opts.signal, settle }));
    return { read: workerRead, close: closed };
  },
}));

const { useFrameReader } = await import("./frame-reader");

const sized = () => {
  const video = document.createElement("video");
  Object.defineProperty(video, "videoWidth", { value: 1280 });
  Object.defineProperty(video, "videoHeight", { value: 720 });
  return video;
};

describe("useFrameReader with a read worker", () => {
  it("reads through the worker, loading no runtime on the main thread, and goes back to the main thread when it dies", async () => {
    const onReady = vi.fn();
    const { result, unmount } = renderHook(() => useFrameReader(undefined, onReady));
    await vi.waitFor(() => expect(onReady).toHaveBeenCalledTimes(1));
    workerRead.mockResolvedValueOnce({
      kind: "card", dark: false, crop: new Float32Array(1), embedding: new Float32Array([1]),
      outline: { corners: [], width: 1, height: 1 }, detMs: 1, embMs: 1, backend: "wasm",
    });
    expect((await result.current(sized())).frame.kind).toBe("card");
    expect(loadOrt).not.toHaveBeenCalled();
    // The worker crashes with a frame in it: that frame reads as no card, never an error.
    workerRead.mockImplementationOnce(async () => {
      onGone();
      throw new ReaderGone();
    });
    expect(await result.current(sized())).toEqual({ frame: { kind: "none" }, cardInView: false, dark: false });
    // The next frame loads the main thread's reader and reads there; no second worker is started.
    expect(await result.current(sized())).toEqual({ frame: { kind: "none" }, cardInView: false, dark: true });
    expect(loadOrt).toHaveBeenCalledTimes(1);
    expect(mainReads).toHaveBeenCalledTimes(1);
    expect(workerStarts).toBe(1);
    unmount();
  });

  it("reads a chosen photo again on the main thread when the worker dies with it, rather than losing it", async () => {
    mainReads.mockClear();
    const onReady = vi.fn();
    const { result, unmount } = renderHook(() => useFrameReader(undefined, onReady));
    await vi.waitFor(() => expect(onReady).toHaveBeenCalledTimes(1));
    workerRead.mockImplementationOnce(async () => {
      onGone();
      throw new ReaderGone();
    });
    const photo = { width: 1000, height: 1400 } as unknown as ImageBitmap;
    expect(await result.current(photo)).toEqual({ frame: { kind: "none" }, cardInView: false, dark: true });
    expect(mainReads).toHaveBeenCalledTimes(1);
    unmount();
  });

  it("terminates the worker as the scanner closes", async () => {
    closed.mockClear();
    const onReady = vi.fn();
    const { unmount } = renderHook(() => useFrameReader(undefined, onReady));
    await vi.waitFor(() => expect(onReady).toHaveBeenCalledTimes(1));
    unmount();
    expect(closed).toHaveBeenCalledTimes(1);
  });

  it("a close while the worker is still starting aborts its start, and a reader it answers late is closed, never adopted", async () => {
    closed.mockClear();
    holdNext = true;
    const onReady = vi.fn();
    const { unmount } = renderHook(() => useFrameReader(undefined, onReady));
    await vi.waitFor(() => expect(hold).not.toBeNull());
    expect(hold!.signal!.aborted).toBe(false);
    unmount();
    expect(hold!.signal!.aborted).toBe(true);
    hold!.settle();
    await vi.waitFor(() => expect(closed).toHaveBeenCalledTimes(1));
    expect(onReady).not.toHaveBeenCalled();
    holdNext = false;
  });
});
