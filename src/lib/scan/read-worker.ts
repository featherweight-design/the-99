// The scanner's read worker (card-scan speed lane, PR D): the whole read of a frame, off the page's thread. The page
// hands it each frame as an `ImageBitmap` (`read-worker-client.ts`); here it is drawn, letterboxed and read back on
// `OffscreenCanvas`es, and the detector and embedder run, through the very `framePipeline` the main thread uses, so
// the answer is the same `FrameRead`. The runtime loads here from the CDN, the embedder moves to WebGPU here when this
// worker has an adapter (`gpu-start.ts`, its runtime read from Cache Storage, which a worker has), and the models'
// bytes come from the page, which loads them as it always did so the loading bar reads their progress unchanged.
// Every mark made here is handed to the page, once the page has chosen this worker. Closing the scanner terminates
// the worker, which lets go of every session and byte with it.
import { framePipeline, loadModels, loadOrt, type Canvas2d, type Ctx2d, type ModelBytesLoads, type OrtSession, type Run } from "./pipeline";
import { scannerGpuEmbedder } from "./gpu-start";
import { gpuAdapter } from "./webgpu";
import { relayScanMarks, scanMark, type ScanMark } from "./marks";
import { encodeRead, type FromWorker, type ModelKey, type ToWorker } from "./read-worker-protocol";

type Scope = { postMessage(m: FromWorker, transfer?: Transferable[]): void; onmessage: ((e: MessageEvent<ToWorker>) => void) | null };
const scope = globalThis as unknown as Scope;
const post = (m: FromWorker, transfer: Transferable[] = []) => scope.postMessage(m, transfer);
const messageOf = (e: unknown) => (e instanceof Error ? e.message : String(e)).slice(0, 300);

// Marks wait for `accept`, sent once the page has adopted this worker as ready: a worker the page turns down (before or
// after `init`) never marks the page's open, so its runtime and WebGPU marks never pre-empt the main thread's own.
let queued: [ScanMark, Record<string, unknown> | undefined][] | null = [];
relayScanMarks((name, detail) => (queued ? queued.push([name, detail]) : post({ type: "mark", name, detail })));

function offscreenCanvas(): Canvas2d {
  const canvas = new OffscreenCanvas(1, 1);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  return ctx ? { canvas, ctx: ctx as unknown as Ctx2d } : null;
}

function has2d(): boolean {
  try {
    return typeof OffscreenCanvas === "function" && offscreenCanvas() !== null;
  } catch {
    return false;
  }
}

// The runtime starts loading as the worker boots, beside the page's choice.
const ort = loadOrt();
ort.catch(() => {});
void gpuAdapter().then(({ gpu }) => post({ type: "caps", caps: { offscreen2d: has2d(), gpu } }));

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

// Each model's bytes as the page sends them; let go once the sessions hold the models.
let files: Record<ModelKey, ReturnType<typeof deferred>> | null = { detector: deferred(), embedder: deferred() };
let pipe: Promise<ReturnType<typeof framePipeline>> | null = null;

async function start(gpuMode: Extract<ToWorker, { type: "init" }>["gpuMode"]) {
  const bytes: ModelBytesLoads = { detector: files!.detector.promise, embedder: files!.embedder.promise };
  // Nothing to release by hand: the scanner's close terminates the worker, sessions and all.
  const hold = (s: OrtSession) => s;
  const infer: Run = (fn) => fn();
  // The embedder's bytes stay only until the WebGPU embedder settles (it may read them again after the first answer).
  let embedderBytes: Promise<Uint8Array> | null = bytes.embedder;
  const gpu = scannerGpuEmbedder({ mode: gpuMode, model: () => embedderBytes, hold, infer, alive: () => true });
  void gpu.then(() => {
    embedderBytes = null;
  });
  const runtime = await ort;
  const models = await loadModels(runtime, hold, { bytes, infer });
  files = null;
  return framePipeline(runtime, models, infer, gpu, { canvas: offscreenCanvas });
}

async function read(id: number, frame: ImageBitmap) {
  try {
    if (!pipe) throw new Error("the reader has not started");
    const { msg, transfer } = encodeRead(id, await (await pipe).read(frame));
    post(msg, transfer);
  } catch (e) {
    post({ type: "read-failed", id, message: messageOf(e) });
  } finally {
    frame.close();
  }
}

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
