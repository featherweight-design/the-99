// What the scanner's read worker does (`read-worker.ts` is its entry), its runtime and pipeline injected so it is tested
// without a worker. It boots by loading the runtime and saying what it can (`caps`, always posted, a failed check
// reading as no); takes each model's bytes as the page sends them; starts the reader on `init`; reads each frame it is
// handed, closing the bitmap whatever happens; and holds its marks until the page accepts it, so a worker the page turns
// down never marks the page's open.
import { framePipeline, loadModels, type Canvas2d, type Ctx2d, type FrameRead, type ModelBytesLoads, type Ort, type OrtSession, type Run } from "./pipeline";
import { scannerGpuEmbedder, type GpuStartMode } from "./gpu-start";
import { relayScanMarks, scanMark, type ScanMark } from "./marks";
import { encodeRead, type FromWorker, type ModelKey, type ToWorker } from "./read-worker-protocol";

export type WorkerScope = { postMessage(m: FromWorker, transfer?: Transferable[]): void; onmessage: ((e: MessageEvent<ToWorker>) => void) | null };
export type Reader = { read(frame: ImageBitmap): Promise<FrameRead | null> };

export type ServeDeps = {
  loadOrt: () => Promise<Ort>;
  /** Whether this worker has a WebGPU adapter. */
  gpu: () => Promise<boolean>;
  /** Whether this worker has a 2D `OffscreenCanvas`. */
  has2d: () => boolean;
  start: (ort: Ort, bytes: ModelBytesLoads, gpuMode: GpuStartMode) => Promise<Reader>;
};

const messageOf = (e: unknown) => (e instanceof Error ? e.message : String(e)).slice(0, 300);

function deferred() {
  let resolve!: (b: Uint8Array) => void;
  let reject!: (e: Error) => void;
  const promise = new Promise<Uint8Array>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  promise.catch(() => {});
  return { promise, resolve, reject };
}

export function serveReads(scope: WorkerScope, deps: ServeDeps) {
  const post = (m: FromWorker, transfer: Transferable[] = []) => scope.postMessage(m, transfer);
  let queued: [ScanMark, Record<string, unknown> | undefined][] | null = [];
  relayScanMarks((name, detail) => (queued ? queued.push([name, detail]) : post({ type: "mark", name, detail })));

  const ort = deps.loadOrt();
  ort.then(() => post({ type: "ort", ok: true }), () => post({ type: "ort", ok: false }));
  const has2d = () => {
    try {
      return deps.has2d();
    } catch {
      return false;
    }
  };
  void deps.gpu().catch(() => false).then((gpu) => post({ type: "caps", caps: { offscreen2d: has2d(), gpu } }));

  // Each model's bytes as the page sends them; let go once the reader holds the models.
  let files: Record<ModelKey, ReturnType<typeof deferred>> | null = { detector: deferred(), embedder: deferred() };
  let pipe: Promise<Reader> | null = null;

  const start = async (gpuMode: GpuStartMode) => {
    const reader = await deps.start(await ort, { detector: files!.detector.promise, embedder: files!.embedder.promise }, gpuMode);
    files = null;
    return reader;
  };

  const read = async (id: number, frame: ImageBitmap) => {
    try {
      if (!pipe) throw new Error("the reader has not started");
      const { msg, transfer } = encodeRead(id, await (await pipe).read(frame));
      post(msg, transfer);
    } catch (e) {
      post({ type: "read-failed", id, message: messageOf(e) });
    } finally {
      frame.close();
    }
  };

  scope.onmessage = (e) => {
    const m = e.data;
    if (m.type === "model") files?.[m.key].resolve(m.bytes);
    else if (m.type === "model-failed") files?.[m.key].reject(new Error(`the ${m.key} model did not load`));
    else if (m.type === "accept") {
      for (const [name, detail] of queued ?? []) post({ type: "mark", name, detail });
      queued = null;
    } else if (m.type === "init") {
      pipe ??= start(m.gpuMode);
      pipe.then(() => post({ type: "ready" }), (err: unknown) => post({ type: "init-failed", message: messageOf(err) }));
    } else if (m.type === "answer-drawn") scanMark("scan:answer-drawn");
    else if (m.type === "read") void read(m.id, m.frame);
  };
  return { holdsBytes: () => files !== null };
}

/** A 2D `OffscreenCanvas`, or null where the worker has none. */
export function offscreenCanvas(): Canvas2d {
  const canvas = new OffscreenCanvas(1, 1);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  return ctx ? { canvas, ctx: ctx as unknown as Ctx2d } : null;
}

/**
 * The worker's reader: both sessions (`loadModels`), the embedder moving to WebGPU when this worker has an adapter
 * (`gpu-start.ts`; its runtime read from Cache Storage, which a worker has), and `framePipeline` on `OffscreenCanvas`es.
 * Nothing is released by hand: the scanner's close terminates the worker, sessions and all.
 */
export async function workerReader(ort: Ort, bytes: ModelBytesLoads, gpuMode: GpuStartMode): Promise<Reader> {
  const hold = (s: OrtSession) => s;
  const infer: Run = (fn) => fn();
  // The embedder's bytes stay only until the WebGPU embedder settles (it may read them again after the first answer).
  let embedderBytes: Promise<Uint8Array> | null = bytes.embedder;
  const gpu = scannerGpuEmbedder({ mode: gpuMode, model: () => embedderBytes, hold, infer, alive: () => true });
  void gpu.then(() => {
    embedderBytes = null;
  });
  const models = await loadModels(ort, hold, { bytes, infer });
  return framePipeline(ort, models, infer, gpu, { canvas: offscreenCanvas });
}
