import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { READ_TIMEOUT_MS, ReaderGone, startWorkerReader, type ReaderDeps, type WorkerLike } from "./read-worker-client";
import { isScanMarked, resetScanMarks } from "./marks";
import type { FromWorker, ToWorker } from "./read-worker-protocol";
import type { FrameRead, ModelBytesLoads, Source } from "./pipeline";

/** A worker stood in: what the page posted, and a hand to answer as the worker would. */
function fakeWorker() {
  const sent: ToWorker[] = [];
  const w: WorkerLike & { sent: ToWorker[]; say(m: FromWorker): void; crash(): void; terminated: boolean } = {
    sent,
    terminated: false,
    onmessage: null,
    onerror: null,
    onmessageerror: null,
    postMessage: (m) => void sent.push(m),
    terminate() {
      this.terminated = true;
    },
    say(m) {
      this.onmessage?.({ data: m } as MessageEvent);
    },
    crash() {
      this.onerror?.(new Event("error"));
    },
  };
  return w;
}

const ALL = { worker: true, offscreenCanvas: true, imageBitmap: true };
const bitmap = () => ({ close: vi.fn(), width: 1280, height: 720 }) as unknown as ImageBitmap;
const loaded = (): ModelBytesLoads => ({ detector: Promise.resolve(new Uint8Array(1)), embedder: Promise.resolve(new Uint8Array(2)) });
const video = { videoWidth: 1280, videoHeight: 720 } as unknown as Source;
const tick = () => new Promise((r) => setTimeout(r, 0));

function deps(w: ReturnType<typeof fakeWorker>, mainGpu = false): ReaderDeps {
  return { page: ALL, spawn: () => w, mainGpu: async () => mainGpu, capture: async () => bitmap() };
}

/** Starts a reader and walks the worker through caps and ready. */
async function started(w = fakeWorker(), onGone = vi.fn()) {
  const p = startWorkerReader(loaded(), { gpuMode: "at-open", onGone }, deps(w));
  w.say({ type: "caps", caps: { offscreen2d: true, gpu: false } });
  await vi.waitFor(() => expect(w.sent.some((m) => m.type === "init")).toBe(true));
  w.say({ type: "ready" });
  const reader = (await p)!;
  return { w, reader, onGone };
}

beforeEach(() => resetScanMarks());
afterEach(() => vi.useRealTimers());

describe("startWorkerReader", () => {
  it("never spawns a worker on a page that cannot read in one", async () => {
    const spawn = vi.fn();
    expect(await startWorkerReader(loaded(), { gpuMode: "at-open", onGone: vi.fn() }, { ...deps(fakeWorker()), page: { ...ALL, worker: false }, spawn })).toBeNull();
    expect(spawn).not.toHaveBeenCalled();
    expect(isScanMarked("scan:reader")).toBe(true);
  });

  it("lets the worker go when it has no WebGPU the page has, keeping the embedder's WebGPU win on the main thread", async () => {
    const w = fakeWorker();
    const p = startWorkerReader(loaded(), { gpuMode: "at-open", onGone: vi.fn() }, deps(w, true));
    w.say({ type: "caps", caps: { offscreen2d: true, gpu: false } });
    expect(await p).toBeNull();
    expect(w.terminated).toBe(true);
    expect(w.sent).toEqual([]);
  });

  it("hands each model's bytes over, then reads a frame through the worker and answers its FrameRead", async () => {
    const { w, reader } = await started();
    expect(w.sent.filter((m) => m.type === "model").map((m) => m.type === "model" && m.key).sort()).toEqual(["detector", "embedder"]);
    const r = reader.read(video, () => true);
    await vi.waitFor(() => expect(w.sent.some((m) => m.type === "read")).toBe(true));
    const sent = w.sent.find((m) => m.type === "read") as Extract<ToWorker, { type: "read" }>;
    const answer: FrameRead = { kind: "none", dark: true, detMs: 4 };
    w.say({ type: "read", id: sent.id, read: answer });
    expect(await r).toEqual(answer);
    expect(isScanMarked("scan:reader")).toBe(true);
  });

  it("passes a run that threw on as an error, as the main thread's read does", async () => {
    const { w, reader } = await started();
    const r = reader.read(video, () => true);
    await vi.waitFor(() => expect(w.sent.some((m) => m.type === "read")).toBe(true));
    const sent = w.sent.find((m) => m.type === "read") as Extract<ToWorker, { type: "read" }>;
    w.say({ type: "read-failed", id: sent.id, message: "the detector threw" });
    await expect(r).rejects.toThrow("the detector threw");
  });

  it("answers null when the worker fails to start, so the main thread reads", async () => {
    const w = fakeWorker();
    const p = startWorkerReader(loaded(), { gpuMode: "at-open", onGone: vi.fn() }, deps(w));
    w.say({ type: "caps", caps: { offscreen2d: true, gpu: true } });
    await vi.waitFor(() => expect(w.sent.some((m) => m.type === "init")).toBe(true));
    w.say({ type: "init-failed", message: "no runtime" });
    expect(await p).toBeNull();
    expect(w.terminated).toBe(true);
  });

  it("rejects when a model's bytes failed, so the next frame tries the load again", async () => {
    const w = fakeWorker();
    const bytes = { detector: Promise.reject(new Error("offline")), embedder: Promise.resolve(new Uint8Array(1)) };
    bytes.detector.catch(() => {});
    const p = startWorkerReader(bytes, { gpuMode: "at-open", onGone: vi.fn() }, deps(w));
    w.say({ type: "caps", caps: { offscreen2d: true, gpu: false } });
    await vi.waitFor(() => expect(w.sent.some((m) => m.type === "model-failed")).toBe(true));
    w.say({ type: "init-failed", message: "the detector model did not load" });
    await expect(p).rejects.toThrow("offline");
  });

  it("a worker that crashes mid-session: the frame in it reads as gone, and the scanner goes back to the main thread", async () => {
    const { w, reader, onGone } = await started();
    const r = reader.read(video, () => true);
    await vi.waitFor(() => expect(w.sent.some((m) => m.type === "read")).toBe(true));
    w.crash();
    await expect(r).rejects.toBeInstanceOf(ReaderGone);
    expect(onGone).toHaveBeenCalledTimes(1);
    expect(isScanMarked("scan:reader-off")).toBe(true);
    expect(w.terminated).toBe(true);
    await expect(reader.read(video, () => true)).rejects.toBeInstanceOf(ReaderGone);
  });

  it("a close is not a failure: no mark, and the main thread is not asked to take over", async () => {
    const { w, reader, onGone } = await started();
    reader.close();
    await tick();
    expect(w.terminated).toBe(true);
    expect(onGone).not.toHaveBeenCalled();
    expect(isScanMarked("scan:reader-off")).toBe(false);
  });

  it("a close while the worker is still starting terminates it at once, and a ready after is never adopted", async () => {
    const w = fakeWorker();
    const abort = new AbortController();
    const p = startWorkerReader(loaded(), { gpuMode: "at-open", onGone: vi.fn(), signal: abort.signal }, deps(w));
    w.say({ type: "caps", caps: { offscreen2d: true, gpu: false } });
    await vi.waitFor(() => expect(w.sent.some((m) => m.type === "init")).toBe(true));
    abort.abort();
    expect(w.terminated).toBe(true);
    w.say({ type: "ready" });
    await expect(p).rejects.toThrow("the scanner closed");
    expect(w.sent.some((m) => m.type === "accept")).toBe(false);
    expect(isScanMarked("scan:reader")).toBe(false);
  });

  it("a close before the worker answered at all terminates it too", async () => {
    const w = fakeWorker();
    const abort = new AbortController();
    const p = startWorkerReader(loaded(), { gpuMode: "at-open", onGone: vi.fn(), signal: abort.signal }, deps(w));
    abort.abort();
    expect(w.terminated).toBe(true);
    await expect(p).rejects.toThrow("the scanner closed");
  });

  it("takes the worker's marks only once it accepted the worker, and never from one it turned down", async () => {
    const turnedDown = fakeWorker();
    const p = startWorkerReader(loaded(), { gpuMode: "at-open", onGone: vi.fn() }, deps(turnedDown));
    turnedDown.say({ type: "caps", caps: { offscreen2d: true, gpu: true } });
    await vi.waitFor(() => expect(turnedDown.sent.some((m) => m.type === "init")).toBe(true));
    turnedDown.say({ type: "mark", name: "scan:ort" });
    turnedDown.say({ type: "init-failed", message: "no runtime" });
    expect(await p).toBeNull();
    expect(isScanMarked("scan:ort")).toBe(false);
    expect(turnedDown.sent.some((m) => m.type === "accept")).toBe(false);

    resetScanMarks();
    const w = fakeWorker();
    const q = startWorkerReader(loaded(), { gpuMode: "at-open", onGone: vi.fn() }, deps(w));
    w.say({ type: "caps", caps: { offscreen2d: true, gpu: false } });
    await vi.waitFor(() => expect(w.sent.some((m) => m.type === "init")).toBe(true));
    w.say({ type: "mark", name: "scan:detector-session" });
    expect(isScanMarked("scan:detector-session")).toBe(false);
    expect(w.sent.some((m) => m.type === "accept")).toBe(false);
    w.say({ type: "ready" });
    await q;
    expect(w.sent.at(-1)).toEqual({ type: "accept" });
    // What the worker held, it sends after the accept; those are the open's.
    w.say({ type: "mark", name: "scan:detector-session" });
    expect(isScanMarked("scan:detector-session")).toBe(true);
  });

  it("a read the worker never answers: let go after the read limit, that frame gone, the main thread takes over", async () => {
    const { w, reader, onGone } = await started();
    vi.useFakeTimers();
    const r = reader.read(video, () => true);
    const gone = expect(r).rejects.toBeInstanceOf(ReaderGone);
    await vi.advanceTimersByTimeAsync(READ_TIMEOUT_MS - 1);
    expect(onGone).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    await gone;
    expect(onGone).toHaveBeenCalledTimes(1);
    expect(w.terminated).toBe(true);
    expect(isScanMarked("scan:reader-off")).toBe(true);
  });

  it("a frame the browser will not capture: the worker is let go and the main thread reads from then on", async () => {
    const w = fakeWorker();
    const onGone = vi.fn();
    const p = startWorkerReader(loaded(), { gpuMode: "at-open", onGone }, { ...deps(w), capture: async () => { throw new Error("no bitmap"); } });
    w.say({ type: "caps", caps: { offscreen2d: true, gpu: false } });
    await vi.waitFor(() => expect(w.sent.some((m) => m.type === "init")).toBe(true));
    w.say({ type: "ready" });
    const reader = (await p)!;
    await expect(reader.read(video, () => true)).rejects.toBeInstanceOf(ReaderGone);
    expect(onGone).toHaveBeenCalledTimes(1);
    expect(w.terminated).toBe(true);
    expect(w.sent.some((m) => m.type === "read")).toBe(false);
    expect(isScanMarked("scan:reader-off")).toBe(true);
  });
});
