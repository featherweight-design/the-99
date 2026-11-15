// The scanner's read worker (card-scan speed lane, PR D): where a frame is read, and the messages between the page and
// the worker (`read-worker.ts`, `read-worker-client.ts`). Pure, so the choice and the messages are tested without a
// worker.
import type { FrameRead } from "./pipeline";
import type { Outline } from "./outline";
import type { GpuStartMode } from "./gpu-start";
import type { ScanMark } from "./marks";

/** What the page offers a worker read: a `Worker`, `OffscreenCanvas`, and `createImageBitmap` to hand it a frame. */
export type PageCaps = { worker: boolean; offscreenCanvas: boolean; imageBitmap: boolean };
/** What the worker found in itself: a 2D `OffscreenCanvas`, and a WebGPU adapter. */
export type WorkerCaps = { offscreen2d: boolean; gpu: boolean };

export type MainReason = "no-worker" | "no-offscreen" | "no-bitmap" | "no-2d-in-worker" | "no-worker-gpu";
export type ReadPath = { path: "worker" } | { path: "main"; reason: MainReason };

/** Every reason reads go to the main thread: the page's and worker's checks (`readPath`), the worker's start (spawn,
 * capabilities or ready too late, `init` failed), and mid-session (`crash`, `hang`, repeated `capture` failures). The
 * `scan:reader` / `scan:reader-off` marks and the lab's start-up row (`spike.ts`) carry one. */
export const READER_REASONS = [
  "no-worker", "no-offscreen", "no-bitmap", "no-2d-in-worker", "no-worker-gpu", "spawn", "caps-timeout", "init", "ready-timeout",
  "crash", "hang", "capture",
] as const;
export type ReaderReason = (typeof READER_REASONS)[number];

/** This page's capabilities, read off its global scope. */
export function pageCaps(g: object = globalThis): PageCaps {
  const has = (k: string) => typeof (g as Record<string, unknown>)[k] === "function";
  return { worker: has("Worker"), offscreenCanvas: has("OffscreenCanvas"), imageBitmap: has("createImageBitmap") };
}

/**
 * Where reads run. The page decides first (`worker` not yet asked: undefined), and a worker's own answer settles it.
 * A worker read needs all three of the page's capabilities and a 2D `OffscreenCanvas` inside the worker. The embedder
 * runs on WebGPU wherever the thread reading has an adapter (`webgpu.ts`), so a page with WebGPU whose worker has none
 * reads on the main thread: the worker would cost the embedder its WebGPU run (29ms against WASM's 82 on an iPhone,
 * 85 against 236 on Android), more than the worker saves. Pure.
 */
export function readPath(page: PageCaps, worker?: WorkerCaps, mainGpu = false): ReadPath {
  if (!page.worker) return { path: "main", reason: "no-worker" };
  if (!page.offscreenCanvas) return { path: "main", reason: "no-offscreen" };
  if (!page.imageBitmap) return { path: "main", reason: "no-bitmap" };
  if (worker && !worker.offscreen2d) return { path: "main", reason: "no-2d-in-worker" };
  if (worker && mainGpu && !worker.gpu) return { path: "main", reason: "no-worker-gpu" };
  return { path: "worker" };
}

export type ModelKey = "detector" | "embedder";

/** The page to the worker. A model's bytes go as each arrives, so its session starts then (`loadModels`). */
export type ToWorker =
  | { type: "model"; key: ModelKey; bytes: Uint8Array }
  | { type: "model-failed"; key: ModelKey }
  | { type: "init"; gpuMode: GpuStartMode }
  | { type: "read"; id: number; frame: ImageBitmap }
  | { type: "answer-drawn" }
  /** The page took this worker: its marks are the open's from here (held until then, and lost with a worker turned down). */
  | { type: "accept" };

/** The worker to the page. */
export type FromWorker =
  | { type: "caps"; caps: WorkerCaps }
  /** The runtime's import from the CDN settled in the worker (the lab's probe waits for it; the reader does not). */
  | { type: "ort"; ok: boolean }
  | { type: "mark"; name: ScanMark; detail?: Record<string, unknown> }
  | { type: "ready" }
  | { type: "init-failed"; message: string }
  | { type: "read"; id: number; read: FrameRead | null }
  | { type: "read-failed"; id: number; message: string };

/**
 * A read's answer for `postMessage`, with what it transfers. The crop and embedding cross as copies of their own,
 * transferred: the worker's crop may still be held by a WebGPU run that timed out (`webgpu.ts`), so it is never
 * detached, and the copy is made on the worker's thread, not the page's. The lab's `raw` never crosses.
 */
export function encodeRead(id: number, r: FrameRead | null): { msg: FromWorker; transfer: Transferable[] } {
  if (!r) return { msg: { type: "read", id, read: null }, transfer: [] };
  if (r.kind === "none") return { msg: { type: "read", id, read: { kind: "none", dark: r.dark, detMs: r.detMs } }, transfer: [] };
  const crop = r.crop.slice();
  const embedding = r.embedding.slice();
  const read: FrameRead = { kind: "card", dark: r.dark, crop, embedding, outline: r.outline, detMs: r.detMs, embMs: r.embMs, backend: r.backend };
  return { msg: { type: "read", id, read }, transfer: [crop.buffer, embedding.buffer] };
}

const FROM_WORKER = new Set<FromWorker["type"]>(["caps", "ort", "mark", "ready", "init-failed", "read", "read-failed"]);

/** A message from the worker, or null for anything that is not one. */
export function decodeFromWorker(data: unknown): FromWorker | null {
  if (!data || typeof data !== "object") return null;
  const type = (data as { type?: unknown }).type;
  return typeof type === "string" && FROM_WORKER.has(type as FromWorker["type"]) ? (data as FromWorker) : null;
}

/** `o`, read off a bitmap captured smaller for the hand-off, told in the source's own size (its corners are shares of
 * the picture, so only the size changes). Pure. */
export function outlineAt(o: Outline, size: { width: number; height: number }): Outline {
  return { ...o, width: size.width, height: size.height };
}

/** The bitmap size a frame is handed over at: its longest edge at most `max`, its aspect kept. Pure. */
export function captureSize(width: number, height: number, max: number): { width: number; height: number } {
  const s = Math.min(1, max / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * s)), height: Math.max(1, Math.round(height * s)) };
}
