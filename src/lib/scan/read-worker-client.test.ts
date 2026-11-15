import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CAPS_TIMEOUT_MS, CAPTURE_FAILURES, probeReader, READ_TIMEOUT_MS, READY_TIMEOUT_MS, ReaderGone, startWorkerReader, type ReaderDeps, type WorkerLike,
} from "./read-worker-client";
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
    // the worker's half of each hand-off is a test's own to answer
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

function deps(w: ReturnType<typeof fakeWorker>, mainGpu = false, over: Partial<ReaderDeps> = {}): ReaderDeps {
  return { page: ALL, spawn: () => w, mainGpu: async () => mainGpu, capture: async () => bitmap(), hidden: () => false, ...over };
}

/** Starts a reader and walks the worker through caps and ready. */
async function started(w = fakeWorker(), onGone = vi.fn(), over: Partial<ReaderDeps> = {}, measure = false) {
  const p = startWorkerReader(loaded(), { gpuMode: "at-open", onGone, measure }, deps(w, false, over));
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

  it("one frame the browser will not capture reads as nothing; only several in a row let the worker go", async () => {
    let fail = true;
    const capture = vi.fn(async () => {
      if (fail) throw new Error("no bitmap");
      return bitmap();
    });
    const { w, reader, onGone } = await started(undefined, undefined, { capture });
    expect(await reader.read(video, () => true)).toBeNull();
    // a good capture between resets the count
    fail = false;
    const r = reader.read(video, () => true);
    await vi.waitFor(() => expect(w.sent.some((m) => m.type === "read")).toBe(true));
    const sent = w.sent.find((m) => m.type === "read") as Extract<ToWorker, { type: "read" }>;
    w.say({ type: "read", id: sent.id, read: null });
    await r;
    fail = true;
    for (let i = 1; i < CAPTURE_FAILURES; i++) expect(await reader.read(video, () => true)).toBeNull();
    expect(onGone).not.toHaveBeenCalled();
    await expect(reader.read(video, () => true)).rejects.toBeInstanceOf(ReaderGone);
    expect(onGone).toHaveBeenCalledTimes(1);
    expect(w.terminated).toBe(true);
    expect(isScanMarked("scan:reader-off")).toBe(true);
  });

  it("captures nothing from a camera with no frame yet", async () => {
    const capture = vi.fn(async () => bitmap());
    const { reader } = await started(undefined, undefined, { capture });
    expect(await reader.read({ videoWidth: 1280, videoHeight: 720, readyState: 1 } as unknown as Source, () => true)).toBeNull();
    expect(capture).not.toHaveBeenCalled();
  });

  it("hands the frame over at the read's own size, and tells the outline in the camera's", async () => {
    const capture = vi.fn(async () => bitmap());
    const { w, reader } = await started(undefined, undefined, { capture });
    const big = { videoWidth: 1920, videoHeight: 1080 } as unknown as Source;
    const r = reader.read(big, () => true);
    await vi.waitFor(() => expect(w.sent.some((m) => m.type === "read")).toBe(true));
    expect(capture).toHaveBeenCalledWith(big, { width: 1280, height: 720 });
    const sent = w.sent.find((m) => m.type === "read") as Extract<ToWorker, { type: "read" }>;
    const outline = { corners: [{ x: 0.5, y: 0.5 }], width: 1280, height: 720 };
    w.say({ type: "read", id: sent.id, read: {
      kind: "card", dark: false, crop: new Float32Array(1), embedding: new Float32Array(1), outline, detMs: 1, embMs: 1, backend: "wasm",
    } });
    expect(await r).toMatchObject({ outline: { corners: [{ x: 0.5, y: 0.5 }], width: 1920, height: 1080 } });
  });

  it("a hand-off that throws leaves nothing waiting and closes the frame", async () => {
    vi.useFakeTimers();
    const frame = bitmap();
    const { w, reader, onGone } = await started(undefined, undefined, { capture: async () => frame });
    w.postMessage = (m) => {
      if (m.type === "read") throw new Error("could not clone");
    };
    await expect(reader.read(video, () => true)).rejects.toThrow("could not clone");
    expect(frame.close).toHaveBeenCalled();
    // no read limit left running to let the worker go later
    await vi.advanceTimersByTimeAsync(READ_TIMEOUT_MS * 2);
    expect(onGone).not.toHaveBeenCalled();
  });

  it("counts a read's limit only while the page is in view", async () => {
    let hidden = true;
    const { w, reader, onGone } = await started(undefined, undefined, { hidden: () => hidden });
    vi.useFakeTimers();
    const r = reader.read(video, () => true);
    const gone = expect(r).rejects.toBeInstanceOf(ReaderGone);
    await vi.advanceTimersByTimeAsync(READ_TIMEOUT_MS * 3);
    expect(onGone).not.toHaveBeenCalled();
    hidden = false;
    await vi.advanceTimersByTimeAsync(READ_TIMEOUT_MS);
    await gone;
    expect(onGone).toHaveBeenCalledTimes(1);
    expect(w.terminated).toBe(true);
  });

  it("reads on the main thread when the worker never says what it can, or never gets ready", async () => {
    vi.useFakeTimers();
    const silent = fakeWorker();
    const p = startWorkerReader(loaded(), { gpuMode: "at-open", onGone: vi.fn() }, deps(silent));
    await vi.advanceTimersByTimeAsync(CAPS_TIMEOUT_MS + 1_000);
    expect(await p).toBeNull();
    expect(silent.terminated).toBe(true);

    const slow = fakeWorker();
    const q = startWorkerReader(loaded(), { gpuMode: "at-open", onGone: vi.fn() }, deps(slow));
    slow.say({ type: "caps", caps: { offscreen2d: true, gpu: false } });
    await vi.advanceTimersByTimeAsync(READY_TIMEOUT_MS + 1_000);
    expect(await q).toBeNull();
    expect(slow.terminated).toBe(true);
    expect(slow.sent.some((m) => m.type === "accept")).toBe(false);
  });

  it("hands each model over as a copy the worker owns, transferred", async () => {
    const w = fakeWorker();
    const transfers: Transferable[][] = [];
    const post = w.postMessage;
    w.postMessage = (m, t) => {
      if (m.type === "model") transfers.push(t ?? []);
      post(m, t);
    };
    const bytes = loaded();
    const page = await bytes.detector;
    const p = startWorkerReader(bytes, { gpuMode: "at-open", onGone: vi.fn() }, deps(w));
    w.say({ type: "caps", caps: { offscreen2d: true, gpu: false } });
    await vi.waitFor(() => expect(transfers).toHaveLength(2));
    const sent = w.sent.find((m) => m.type === "model" && m.key === "detector") as Extract<ToWorker, { type: "model" }>;
    expect(sent.bytes).not.toBe(page);
    expect(transfers[0]).toEqual([expect.any(ArrayBuffer)]);
    w.say({ type: "ready" });
    await p;
  });

  it("records each read's main-thread time only when asked to measure", async () => {
    const measured: string[] = [];
    const real = performance;
    vi.stubGlobal("performance", {
      now: () => real.now(), mark: () => {}, clearMarks: () => {}, clearMeasures: () => {},
      measure: (name: string) => void measured.push(name),
    });
    try {
      for (const measure of [false, true]) {
        const { w, reader } = await started(undefined, undefined, {}, measure);
        const r = reader.read(video, () => true);
        await vi.waitFor(() => expect(w.sent.some((m) => m.type === "read")).toBe(true));
        const sent = w.sent.find((m) => m.type === "read") as Extract<ToWorker, { type: "read" }>;
        w.say({ type: "read", id: sent.id, read: null });
        await r;
        expect(measured).toEqual(measure ? ["scan:read-main"] : []);
      }
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("probeReader", () => {
  it("answers the page's own reason without spawning a worker", async () => {
    const spawn = vi.fn();
    expect(await probeReader({ ...deps(fakeWorker(), true), page: { ...ALL, offscreenCanvas: false }, spawn })).toEqual({
      reader: "main", readerEmbedder: "webgpu", readerReason: "no-offscreen", readerOrt: null,
    });
    expect(spawn).not.toHaveBeenCalled();
  });

  it("asks a worker what it can and whether its runtime loaded, then lets it go", async () => {
    const w = fakeWorker();
    const p = probeReader(deps(w, true));
    await tick();
    w.say({ type: "caps", caps: { offscreen2d: true, gpu: true } });
    w.say({ type: "ort", ok: true });
    expect(await p).toEqual({ reader: "worker", readerEmbedder: "webgpu", readerReason: null, readerOrt: "ok" });
    expect(w.terminated).toBe(true);
  });

  it("reads on the main thread where the worker has no WebGPU the page has, or its runtime import failed", async () => {
    const a = fakeWorker();
    const p = probeReader(deps(a, true));
    await tick();
    a.say({ type: "caps", caps: { offscreen2d: true, gpu: false } });
    a.say({ type: "ort", ok: true });
    expect(await p).toEqual({ reader: "main", readerEmbedder: "webgpu", readerReason: "no-worker-gpu", readerOrt: "ok" });
    const b = fakeWorker();
    const q = probeReader(deps(b, false));
    await tick();
    b.say({ type: "caps", caps: { offscreen2d: true, gpu: false } });
    b.say({ type: "ort", ok: false });
    expect(await q).toEqual({ reader: "main", readerEmbedder: "wasm", readerReason: "init", readerOrt: "failed" });
  });

  it("a worker that crashes reads as crash", async () => {
    const w = fakeWorker();
    const p = probeReader(deps(w));
    await tick();
    w.crash();
    expect(await p).toMatchObject({ reader: "main", readerReason: "crash" });
    expect(w.terminated).toBe(true);
  });
});
