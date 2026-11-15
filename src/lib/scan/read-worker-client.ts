// The page's side of the scanner's read worker (card-scan speed lane, PR D). Each read on the main thread held the
// page's thread for the whole of it: the frame's draw and read-backs, and both WASM runs, which block the thread they
// run on. Here the page only captures the frame (`createImageBitmap`, scaled to the read's own size) and hands it over;
// the worker (`read-worker.ts`) reads it and answers the same `FrameRead`. Where a worker read is not possible or not
// worth it (`readPath`), or the worker fails to start, `startWorkerReader` answers null and the scanner reads on the
// main thread as before, marked `scan:reader` with the reason. A worker that dies, hangs or repeatedly cannot be handed
// a frame once reading is let go (`scan:reader-off`), and `onGone` sends the scanner back to the main thread for the
// rest of its session. `probeReader` is the same choice, made and let go, for the scan lab's start-up row.
import { MAX_FRAME_EDGE, sourceSize, type FrameRead, type ModelBytesLoads, type Source } from "./pipeline";
import type { GpuStartMode } from "./gpu-start";
import { scanMark, scanMeasure, whenScanMarked } from "./marks";
import { gpuAdapter } from "./webgpu";
import {
  captureSize, decodeFromWorker, outlineAt, pageCaps, readPath, type FromWorker, type ModelKey, type PageCaps, type ReaderReason,
  type ToWorker, type WorkerCaps,
} from "./read-worker-protocol";

/** The slice of a `Worker` the reader uses, so a test can stand one in. */
export type WorkerLike = {
  postMessage(m: ToWorker, transfer?: Transferable[]): void;
  terminate(): void;
  onmessage: ((e: MessageEvent) => void) | null;
  onerror: ((e: Event) => void) | null;
  onmessageerror: ((e: MessageEvent) => void) | null;
};

export type ReaderDeps = {
  page: PageCaps;
  spawn: () => WorkerLike;
  /** Whether the page's own thread has a WebGPU adapter. */
  mainGpu: () => Promise<boolean>;
  /** The frame as a bitmap of `size` (a browser that ignores the size hands it over whole; the worker scales it). */
  capture: (s: Source, size: { width: number; height: number }) => Promise<ImageBitmap>;
  /** Whether the page is in the background, where a read's limit does not run. */
  hidden: () => boolean;
};

/**
 * How long the worker may take to say what it can: the clock runs from the spawn, so it covers a cold fetch of the
 * worker's own script too, and missing it only costs reading on the main thread (cleared once it answers). Then how
 * long its start may take (both models' sessions, from bytes the page already has, and the runtime from the CDN) and
 * one read (a phone reads in under half a second), each counted only while the page is in view.
 */
export const CAPS_TIMEOUT_MS = 15_000;
export const READY_TIMEOUT_MS = 30_000;
export const READ_TIMEOUT_MS = 10_000;
/** Captures that fail in a row before the worker is let go: one failure is that frame's alone. */
export const CAPTURE_FAILURES = 3;
/** `HTMLMediaElement.HAVE_CURRENT_DATA`: a video with less has no frame to capture yet. */
const HAVE_CURRENT_DATA = 2;

/** A read that was in the worker when it went: never an error the player sees, only a frame with nothing read. */
export class ReaderGone extends Error {
  constructor() {
    super("the read worker is gone");
  }
}

export function browserReaderDeps(): ReaderDeps {
  return {
    page: pageCaps(),
    spawn: () => new Worker(new URL("./read-worker.ts", import.meta.url)) as unknown as WorkerLike,
    mainGpu: async () => (await gpuAdapter()).gpu,
    capture: (s, size) => createImageBitmap(s, { resizeWidth: size.width, resizeHeight: size.height }),
    hidden: () => typeof document !== "undefined" && document.hidden,
  };
}

export type WorkerReader = {
  read(source: Source, alive: () => boolean): Promise<FrameRead | null>;
  /** Terminates the worker: the scanner closed. */
  close(): void;
};

/** Whether this page can read in a worker at all, marking the main thread's reason when not. Synchronous, so a page
 * without one (every test DOM) starts the main thread's reader exactly as before. */
export function pageReadsInWorker(page: PageCaps = pageCaps()): boolean {
  const p = readPath(page);
  if (p.path === "main") scanMark("scan:reader", { path: "main", reason: p.reason });
  return p.path === "worker";
}

/** A timer that runs `fn` after `ms` of the page in view: one that comes due while it is hidden starts again. */
function visibleTimer(ms: number, hidden: () => boolean, fn: () => void) {
  let t: ReturnType<typeof setTimeout>;
  const arm = () => {
    t = setTimeout(() => (hidden() ? arm() : fn()), ms);
  };
  arm();
  return () => clearTimeout(t);
}

/**
 * Each model's bytes to the worker as it arrives, as a copy the worker owns (transferred): the page's own are its
 * shared load's (`loadModelBytes`), let go once that load ends, so they are never held twice for the session. Answers
 * true once both are sent, else the load's failure.
 */
function sendModels(w: WorkerLike, bytes: ModelBytesLoads, live: () => boolean): Promise<unknown> {
  const send = (key: ModelKey) => bytes[key].then(
    (b) => {
      if (!live()) return;
      const own = b.slice();
      w.postMessage({ type: "model", key, bytes: own }, [own.buffer]);
    },
    (e: unknown) => {
      if (live()) w.postMessage({ type: "model-failed", key });
      throw e;
    },
  );
  return Promise.all([send("detector"), send("embedder")]).then(() => true, (e: unknown) => e);
}

type Pending = { resolve: (r: FrameRead | null, at: number) => void; reject: (e: Error) => void; stop: () => void };

/**
 * A worker reader for one scanner open, ready to read (both models loaded and warmed in it), or null: the scanner reads
 * on the main thread. Rejects when a model's bytes did not load, the failure the main thread's load would have met too,
 * so the scanner's next frame tries again as it always did, and when `signal` (the scanner's close) aborts it: the
 * worker is terminated at once, at any stage. `measure` records each read's `scan:read-main` (the lab's, as on the
 * main thread).
 */
export async function startWorkerReader(
  bytes: ModelBytesLoads,
  opts: { gpuMode: GpuStartMode; onGone: () => void; signal?: AbortSignal; measure?: boolean },
  deps: ReaderDeps = browserReaderDeps(),
): Promise<WorkerReader | null> {
  if (opts.signal?.aborted) throw new Error("the scanner closed");
  if (!pageReadsInWorker(deps.page)) return null;
  let w: WorkerLike;
  try {
    w = deps.spawn();
  } catch {
    scanMark("scan:reader", { path: "main", reason: "spawn" });
    return null;
  }
  const pending = new Map<number, Pending>();
  let state: "starting" | "reading" | "gone" = "starting";
  let why: ReaderReason = "init";
  let caps: (c: WorkerCaps | null) => void = () => {};
  let started: (ok: boolean) => void = () => {};
  const gone = (stage: ReaderReason | "closed") => {
    if (state === "gone") return;
    const was = state;
    state = "gone";
    if (stage !== "closed") why = stage;
    w.terminate();
    for (const p of pending.values()) {
      p.stop();
      p.reject(new ReaderGone());
    }
    pending.clear();
    caps(null);
    started(false);
    if (was === "reading" && stage !== "closed") {
      scanMark("scan:reader-off", { stage });
      opts.onGone();
    }
  };
  w.onerror = (e) => {
    e.preventDefault?.();
    gone("crash");
  };
  w.onmessageerror = () => gone("crash");
  w.onmessage = (e) => {
    const at = performance.now();
    const m: FromWorker | null = decodeFromWorker(e.data);
    if (!m || state === "gone") return;
    if (m.type === "caps") caps(m.caps);
    // Only an accepted worker's marks are the open's (the worker holds them until then; this drops any that slip by).
    else if (m.type === "mark") {
      if (state === "reading") scanMark(m.name, m.detail);
    } else if (m.type === "ready") started(true);
    else if (m.type === "init-failed") started(false);
    else if (m.type === "read" || m.type === "read-failed") {
      const p = pending.get(m.id);
      if (!p) return;
      pending.delete(m.id);
      p.stop();
      if (m.type === "read") p.resolve(m.read, at);
      else p.reject(new Error(m.message));
    }
  };
  const fallBack = (reason: ReaderReason) => {
    gone("closed");
    scanMark("scan:reader", { path: "main", reason });
    return null;
  };
  // The scanner's close terminates the worker whatever stage its start has reached.
  opts.signal?.addEventListener("abort", () => gone("closed"), { once: true });
  const aborted = () => !!opts.signal?.aborted;
  /** `p`, or `late` once `ms` of the page in view pass without it. */
  const within = <T,>(p: Promise<T>, ms: number, late: T) => {
    let stop = () => {};
    return Promise.race([p, new Promise<T>((r) => (stop = visibleTimer(ms, deps.hidden, () => r(late))))]).finally(() => stop());
  };

  const told = await within(new Promise<WorkerCaps | null | "late">((r) => (caps = r)), CAPS_TIMEOUT_MS, "late");
  if (aborted()) throw new Error("the scanner closed");
  if (told === "late") return fallBack("caps-timeout");
  if (!told) return fallBack(why);
  const path = readPath(deps.page, told, await deps.mainGpu().catch(() => false));
  if (aborted()) throw new Error("the scanner closed");
  if (path.path === "main") return fallBack(path.reason);
  if ((state as string) === "gone") return fallBack(why);

  const sent = sendModels(w, bytes, () => state !== "gone");
  const ready = new Promise<boolean | "late">((r) => (started = r));
  w.postMessage({ type: "init", gpuMode: opts.gpuMode });
  const ok = await within(ready, READY_TIMEOUT_MS, "late");
  if (aborted()) throw new Error("the scanner closed");
  if (ok === "late") return fallBack("ready-timeout");
  if (!ok) {
    // A model whose bytes never came is the load's failure, on any thread: the next frame tries again.
    const loaded = await sent;
    if (loaded !== true) {
      gone("closed");
      throw loaded;
    }
    return fallBack(why);
  }
  state = "reading";
  // Accepted: the worker now hands over the marks it held (its runtime, sessions, WebGPU), and every one after.
  w.postMessage({ type: "accept" });
  scanMark("scan:reader", { path: "worker" });
  // The worker's WebGPU embedder may wait for the first answer drawn (`gpu-start.ts`), which is drawn here.
  void whenScanMarked("scan:answer-drawn").then(() => state === "reading" && w.postMessage({ type: "answer-drawn" }));

  let next = 0;
  let failures = 0;
  return {
    async read(source, alive) {
      if (state !== "reading") throw new ReaderGone();
      // A camera with no frame yet has nothing to capture: no card, as on the main thread.
      if ("readyState" in source && (source as HTMLVideoElement).readyState < HAVE_CURRENT_DATA) return null;
      const size = sourceSize(source);
      const a = performance.now();
      let frame: ImageBitmap;
      try {
        frame = await deps.capture(source, captureSize(size.width, size.height, MAX_FRAME_EDGE));
        failures = 0;
      } catch {
        // One frame the browser would not capture reads as no card; several in a row, and the main thread reads.
        if (++failures < CAPTURE_FAILURES) return null;
        gone("capture");
        throw new ReaderGone();
      }
      if ((state as string) !== "reading") {
        frame.close();
        throw new ReaderGone();
      }
      const c = performance.now();
      const id = ++next;
      let at = 0;
      const answer = new Promise<FrameRead | null>((resolve, reject) => {
        const stop = visibleTimer(READ_TIMEOUT_MS, deps.hidden, () => gone("hang"));
        pending.set(id, { resolve: (r, t) => ((at = t), resolve(r)), reject, stop });
      });
      try {
        w.postMessage({ type: "read", id, frame }, [frame]);
      } catch (e) {
        pending.get(id)?.stop();
        pending.delete(id);
        frame.close();
        throw e;
      }
      const d = performance.now();
      const r = await answer;
      const out = r?.kind === "card" ? { ...r, outline: outlineAt(r.outline, size) } : r;
      if (opts.measure) {
        const end = performance.now();
        // The capture as awaited (an upper bound: the copy may run off the thread), the hand-off, and the answer's
        // handling from its arrival.
        const held = d - a + (end - at);
        scanMeasure("scan:read-main", a, a + held, { path: "worker", captureMs: c - a, postMs: d - c, replyMs: end - at, wallMs: end - a });
      }
      return alive() ? out : null;
    },
    close: () => gone("closed"),
  };
}

/** What the scanner's own choice would be on this device (`probeReader`), for the scan lab's start-up row. */
export type ReaderProbe = {
  reader: "worker" | "main";
  /** Where the embedder would run in that reader: WebGPU when its thread has an adapter. */
  readerEmbedder: "webgpu" | "wasm";
  readerReason: ReaderReason | null;
  /** Whether the worker's import of the runtime from the CDN worked; null when no worker was asked. */
  readerOrt: "ok" | "failed" | "timeout" | null;
};

/**
 * The scanner's reader choice on this device, made as production makes it (the page's check, a worker spawned and
 * asked what it can, the page's own adapter) and then let go: the lab reads on the main thread, so this is how its
 * start-up row says what the scanner would do. It also waits for the worker's runtime import, which the scanner's start
 * needs, so a CDN import that fails in a worker reads as `init`. Never rejects.
 */
export async function probeReader(deps: ReaderDeps = browserReaderDeps()): Promise<ReaderProbe> {
  const mainGpu = await deps.mainGpu().catch(() => false);
  const main = (reason: ReaderReason, readerOrt: ReaderProbe["readerOrt"] = null): ReaderProbe =>
    ({ reader: "main", readerEmbedder: mainGpu ? "webgpu" : "wasm", readerReason: reason, readerOrt });
  const first = readPath(deps.page);
  if (first.path === "main") return main(first.reason);
  let w: WorkerLike;
  try {
    w = deps.spawn();
  } catch {
    return main("spawn");
  }
  let caps: (c: WorkerCaps | "crash" | "late") => void = () => {};
  let ort: (ok: boolean | "late") => void = () => {};
  const told = new Promise<WorkerCaps | "crash" | "late">((r) => (caps = r));
  const ortTold = new Promise<boolean | "late">((r) => (ort = r));
  w.onerror = (e) => {
    e.preventDefault?.();
    caps("crash");
    ort(false);
  };
  w.onmessageerror = () => caps("crash");
  w.onmessage = (e) => {
    const m = decodeFromWorker(e.data);
    if (m?.type === "caps") caps(m.caps);
    else if (m?.type === "ort") ort(m.ok);
  };
  const t1 = setTimeout(() => caps("late"), CAPS_TIMEOUT_MS);
  const t2 = setTimeout(() => ort("late"), READY_TIMEOUT_MS);
  try {
    const c = await told;
    if (c === "crash") return main("crash");
    if (c === "late") return main("caps-timeout");
    const o = await ortTold;
    const readerOrt = o === "late" ? "timeout" : o ? "ok" : "failed";
    const path = readPath(deps.page, c, mainGpu);
    if (path.path === "main") return main(path.reason, readerOrt);
    if (readerOrt !== "ok") return main("init", readerOrt);
    return { reader: "worker", readerEmbedder: c.gpu ? "webgpu" : "wasm", readerReason: null, readerOrt };
  } finally {
    clearTimeout(t1);
    clearTimeout(t2);
    w.terminate();
  }
}
