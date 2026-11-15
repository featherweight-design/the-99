// The page's side of the scanner's read worker (card-scan speed lane, PR D). Each read on the main thread held the
// page's thread for the whole of it: the frame's draw and read-backs, and both WASM runs, which block the thread they
// run on. Here the page only captures the frame (`createImageBitmap`) and hands it over; the worker (`read-worker.ts`)
// reads it and answers the same `FrameRead`. Where a worker read is not possible or not worth it (`readPath`), or the
// worker fails to start, `startWorkerReader` answers null and the scanner reads on the main thread as before, marked
// `scan:reader` with the reason. A worker that dies, hangs or cannot be handed a frame once reading is let go
// (`scan:reader-off`), and `onGone` sends the scanner back to the main thread for the rest of its session.
import type { FrameRead, ModelBytesLoads, Source } from "./pipeline";
import type { GpuStartMode } from "./gpu-start";
import { scanMark, scanMeasure, whenScanMarked } from "./marks";
import { gpuAdapter } from "./webgpu";
import {
  decodeFromWorker, pageCaps, readPath, type FromWorker, type ModelKey, type PageCaps, type ToWorker, type WorkerCaps,
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
  capture: (s: Source) => Promise<ImageBitmap>;
};

/** How long the worker may take to say what it can, and to answer one read, before it counts as gone. */
export const CAPS_TIMEOUT_MS = 5_000;
export const READ_TIMEOUT_MS = 10_000;

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
    capture: (s) => createImageBitmap(s),
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

type Pending = { resolve: (r: FrameRead | null) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> };

/**
 * A worker reader for one scanner open, ready to read (both models loaded and warmed in it), or null: the scanner reads
 * on the main thread. Rejects only when a model's bytes did not load, the failure the main thread's load would have
 * met too, so the scanner's next frame tries again as it always did.
 */
export async function startWorkerReader(
  bytes: ModelBytesLoads,
  opts: { gpuMode: GpuStartMode; onGone: () => void },
  deps: ReaderDeps = browserReaderDeps(),
): Promise<WorkerReader | null> {
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
  let caps: (c: WorkerCaps | null) => void = () => {};
  let started: (ok: boolean) => void = () => {};
  const gone = (stage: string) => {
    if (state === "gone") return;
    const was = state;
    state = "gone";
    w.terminate();
    for (const p of pending.values()) {
      clearTimeout(p.timer);
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
    const m: FromWorker | null = decodeFromWorker(e.data);
    if (!m || state === "gone") return;
    if (m.type === "caps") caps(m.caps);
    else if (m.type === "mark") scanMark(m.name, m.detail);
    else if (m.type === "ready") started(true);
    else if (m.type === "init-failed") started(false);
    else {
      const p = pending.get(m.id);
      if (!p) return;
      pending.delete(m.id);
      clearTimeout(p.timer);
      if (m.type === "read") p.resolve(m.read);
      else p.reject(new Error(m.message));
    }
  };
  const fallBack = (reason: string) => {
    gone("closed");
    scanMark("scan:reader", { path: "main", reason });
    return null;
  };

  const told = await Promise.race([
    new Promise<WorkerCaps | null>((r) => (caps = r)),
    new Promise<null>((r) => setTimeout(() => r(null), CAPS_TIMEOUT_MS)),
  ]);
  if (!told) return fallBack("init");
  const path = readPath(deps.page, told, await deps.mainGpu().catch(() => false));
  if (path.path === "main") return fallBack(path.reason);
  if ((state as string) === "gone") return fallBack("init");

  // Each model's bytes as it arrives, copied (the page's load is shared by every scanner, so it is never detached).
  for (const key of ["detector", "embedder"] as ModelKey[]) {
    bytes[key].then(
      (b) => state !== "gone" && w.postMessage({ type: "model", key, bytes: b }),
      () => state !== "gone" && w.postMessage({ type: "model-failed", key }),
    );
  }
  const ready = new Promise<boolean>((r) => (started = r));
  w.postMessage({ type: "init", gpuMode: opts.gpuMode });
  if (!(await ready)) {
    // A model whose bytes never came is the load's failure, on any thread: the next frame tries again.
    const loaded = await Promise.all([bytes.detector, bytes.embedder]).then(() => true, (e: unknown) => e);
    if (loaded !== true) {
      gone("closed");
      throw loaded;
    }
    return fallBack("init");
  }
  state = "reading";
  scanMark("scan:reader", { path: "worker" });
  // The worker's WebGPU embedder may wait for the first answer drawn (`gpu-start.ts`), which is drawn here.
  void whenScanMarked("scan:answer-drawn").then(() => state === "reading" && w.postMessage({ type: "answer-drawn" }));

  let next = 0;
  return {
    async read(source, alive) {
      if (state !== "reading") throw new ReaderGone();
      const a = performance.now();
      const capture = deps.capture(source);
      const b = performance.now();
      let frame: ImageBitmap;
      try {
        frame = await capture;
      } catch {
        // A browser that will not make a bitmap of this frame: the main thread reads it from here on.
        gone("capture");
        throw new ReaderGone();
      }
      if ((state as string) !== "reading") {
        frame.close();
        throw new ReaderGone();
      }
      const c = performance.now();
      const id = ++next;
      const answer = new Promise<FrameRead | null>((resolve, reject) => {
        pending.set(id, { resolve, reject, timer: setTimeout(() => gone("hang"), READ_TIMEOUT_MS) });
      });
      w.postMessage({ type: "read", id, frame }, [frame]);
      const d = performance.now();
      const r = await answer;
      const held = b - a + (d - c);
      scanMeasure("scan:read-main", a, a + held, { path: "worker", captureMs: b - a, postMs: d - c, wallMs: performance.now() - a });
      return alive() ? r : null;
    },
    close: () => gone("closed"),
  };
}
