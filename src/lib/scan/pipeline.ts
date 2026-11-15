// A camera frame to a card, on the device: the frame is drawn to a canvas, the detector finds the four corners, the
// card is warped to 320x448 and embedded. What happens to the embedding (the lab's index on the device, or the
// server's match) is the caller's. The scan lab reads its frames here, and the viewfinder (card-scan plan PR 3) is to
// read its own here too, so it never copies the lab's loop. The runtime and both models are fetched when a scanner starts (`models.ts`), never bundled.
import {
  DETECTOR_SIZE, EMBED_H, EMBED_W, cardBounds, cornersFromDetector, letterbox, quadArea, reusableBuffer, rgbaToTensor, warpToTensor,
  type Pt,
} from "./geometry";
import { normalise } from "./match";
import { DETECTOR_BYTES, DETECTOR_SHA256, DETECTOR_URL, EMBEDDER_BYTES, EMBEDDER_SHA256, EMBEDDER_URL, ORT_BASE, SHARPNESS_GATE } from "./models";
import { browserModelCacheDeps, filesCached, pinnedBytes, pinnedCache, type ModelCacheDeps, type ModelFile } from "./model-cache";
import { scanMark, scanMeasure } from "./marks";
import { trackModelFile } from "./model-progress";
import { isDark } from "./camera";
import { outlineOf, type Outline } from "./outline";
import { frameEmbedder, type EmbedRun } from "./webgpu";

/** The slice of onnxruntime-web a scanner uses; it is loaded from the CDN, so it has no types here. */
export type OrtTensor = { data: Float32Array };
export type OrtSession = {
  run(feeds: Record<string, unknown>): Promise<Record<string, OrtTensor>>;
  release(): Promise<void>;
  inputNames: string[];
};
export type Ort = {
  env: { wasm: { wasmPaths: string; numThreads: number; wasmBinary?: Uint8Array } };
  Tensor: new (type: "float32", data: Float32Array, dims: number[]) => unknown;
  InferenceSession: { create(model: Uint8Array, opts?: Record<string, unknown>): Promise<OrtSession> };
};

/** The longest edge a frame is read at: enough for the warp, and a phone's 1080p frame touches 44% of its pixels. */
export const MAX_FRAME_EDGE = 1280;
/** The share of the frame a card's corners must enclose before it is read: smaller is a card across the room. */
export const MIN_CARD_AREA = 0.05;

export type Run = <T>(fn: () => Promise<T>) => Promise<T>;

const DETECTOR: ModelFile = { url: DETECTOR_URL, sha256: DETECTOR_SHA256, size: DETECTOR_BYTES };
const EMBEDDER: ModelFile = { url: EMBEDDER_URL, sha256: EMBEDDER_SHA256, size: EMBEDDER_BYTES };

export async function loadOrt(): Promise<Ort> {
  const ort = (await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ `${ORT_BASE}ort.wasm.min.mjs`)) as Ort;
  ort.env.wasm.wasmPaths = ORT_BASE;
  ort.env.wasm.numThreads = 1;
  scanMark("scan:ort");
  return ort;
}

/** Each model's bytes, as its own load: a session is created the moment its own file is in, not when both are. */
export type ModelBytesLoads = { detector: Promise<Uint8Array>; embedder: Promise<Uint8Array> };
type ModelKey = keyof ModelBytesLoads;
const FILES: Record<ModelKey, ModelFile> = { detector: DETECTOR, embedder: EMBEDDER };
/** Each file's load under way, shared by every scanner on the page. */
const shared: Partial<ModelBytesLoads> = {};

/**
 * Both models' bytes, from Cache Storage when a scanner on this device already downloaded them (`model-cache.ts`).
 * Needs no runtime, so a scanner starts it beside the runtime's own download. Each file's load already under way is
 * shared, so a scanner mounted twice (React's development double mount, or closed and opened again mid-download) never
 * downloads a file twice side by side. A close never aborts it (READINESS item 3 of the loading addendum): a reopen
 * joins it. A file whose load failed is let go at once, so the next try starts it again straight away rather than
 * reusing the failure or waiting on the other file (READINESS 6); once neither is loading the bytes are let go.
 * `report` (the scanner's) feeds the loading panel (`model-progress.ts`); a load without it (the scan lab), or one handed
 * its own deps (a test), is nobody's progress.
 */
export function loadModelBytes(deps?: ModelCacheDeps, opts: { report?: boolean } = {}): ModelBytesLoads {
  if (deps) return downloadModelBytes(deps, ["detector", "embedder"], false) as ModelBytesLoads;
  const missing = (Object.keys(FILES) as ModelKey[]).filter((k) => !shared[k]);
  if (missing.length > 0) {
    const started = downloadModelBytes(browserModelCacheDeps(), missing, !!opts.report);
    for (const k of missing) {
      const load = started[k]!;
      shared[k] = load;
      running += 1;
      const end = (ok: boolean) => {
        running -= 1;
        if (!ok && shared[k] === load) delete shared[k];
        if (running === 0) for (const o of Object.keys(shared) as ModelKey[]) delete shared[o];
      };
      load.then(() => end(true), () => end(false));
    }
  }
  return { detector: shared.detector!, embedder: shared.embedder! };
}

/** How many shared file loads are still running: the bytes are let go once none is. */
let running = 0;

function downloadModelBytes(deps: ModelCacheDeps, keys: ModelKey[], report: boolean): Partial<ModelBytesLoads> {
  const name = pinnedCache([DETECTOR, EMBEDDER], deps);
  const out: Partial<ModelBytesLoads> = {};
  for (const key of keys) {
    const progress = report ? trackModelFile(key) : null;
    const load = pinnedBytes(FILES[key], name, deps, `scan:${key}-model`, progress ? (p) => progress.report(p) : undefined);
    load.then(() => progress?.settle(true), () => progress?.settle(false));
    // A failure is the caller's to see; the shared load itself never reports an unhandled rejection.
    load.catch(() => {});
    out[key] = load;
  }
  return out;
}

/** Whether both model files are already in Cache Storage, read without downloading (`filesCached`), for the scan lab. */
export function modelFilesCached(deps: ModelCacheDeps = browserModelCacheDeps()): Promise<boolean> {
  return filesCached([DETECTOR, EMBEDDER], deps);
}

/**
 * Both models' sessions, each created as soon as its own file is in and handed to `hold` (so a caller can release one
 * whose sibling failed), and each run once on a blank input before it is answered: onnxruntime-web's first run of a
 * session plans its memory and is several times a later one, and that run is better spent while the camera starts
 * than on the first card. Creating the small detector first also starts the runtime's own WASM download (the first
 * session fetches it), so on a cold device it arrives while the embedder is still downloading, not after it
 * (lane 58, 2026-11-13: the WASM began only once both models were in, 7.8s into a 20Mbps open).
 */
export async function loadModels(
  ort: Ort,
  hold: (s: OrtSession) => OrtSession,
  opts: { bytes?: ModelBytesLoads; infer?: Run } = {},
): Promise<{ detector: OrtSession; embedder: OrtSession }> {
  const bytes = opts.bytes ?? loadModelBytes();
  const infer: Run = opts.infer ?? ((fn) => fn());
  const load = async (model: Promise<Uint8Array>, dims: number[], mark: "scan:detector-session" | "scan:embedder-session") => {
    const s = hold(await ort.InferenceSession.create(await model, { executionProviders: ["wasm"] }));
    const blank = new ort.Tensor("float32", new Float32Array(dims.reduce((a, b) => a * b, 1)), dims);
    // Only a head start: a warm-up that fails leaves the first real read to plan the memory, as it did before.
    await infer(() => s.run({ [s.inputNames[0]]: blank })).catch(() => {});
    scanMark(mark);
    return s;
  };
  const [detector, embedder] = await Promise.all([
    load(bytes.detector, [1, 3, DETECTOR_SIZE, DETECTOR_SIZE], "scan:detector-session"),
    load(bytes.embedder, [1, 3, EMBED_H, EMBED_W], "scan:embedder-session"),
  ]);
  scanMark("scan:ready");
  return { detector, embedder };
}

/** Whether the detector found a card worth reading: sharp enough, and big enough in the frame. Pure. */
export function cardInView(sharpness: number, corners: Pt[], width: number, height: number): boolean {
  return sharpness >= SHARPNESS_GATE && quadArea(corners) > MIN_CARD_AREA * width * height;
}

/**
 * The detector's own input and its raw corners output, for the scan lab to run another backend on the same frame.
 * `detIn` is the pipeline's reused input array (`reusableBuffer`): it holds this frame's input until the pipeline's next
 * read starts, which the lab never does before it is done with it.
 */
export type DetectorRaw = { detIn: Float32Array; corners: Float32Array };

export type FrameRead =
  | { kind: "none"; dark: boolean; detMs: number; raw?: DetectorRaw }
  | {
      kind: "card"; dark: boolean; crop: Float32Array; embedding: Float32Array; outline: Outline; detMs: number; embMs: number; raw: DetectorRaw;
      /** The runtime that embedded this frame (`switchingEmbedder`), for the scan lab's start-up rows. */
      backend: "wasm" | "webgpu";
    };

/** What `read` takes: the camera's `<video>`, or a still (a chosen photo's `ImageBitmap`). */
export type Source = CanvasImageSource & ({ videoWidth: number; videoHeight: number } | { width: number; height: number });

/** A source's picture size: a video's frame (its element's `width` is the box, not the picture), else its own. */
export function sourceSize(s: Source): { width: number; height: number } {
  return "videoWidth" in s ? { width: s.videoWidth, height: s.videoHeight } : { width: s.width, height: s.height };
}

/** What a pipeline is asked to do beyond reading: `measure` records each read's main-thread steps (`scanMeasure`). */
export type PipelineOpts = { measure?: boolean };

/**
 * The reader for one camera: `read` takes the frame in view (or a chosen photo) and answers what it holds, or null while the camera has
 * no size yet or once `alive` says the scanner stopped mid-read. `infer` runs each inference (a session holder's, so
 * a release waits for it). The embedding is L2-normalised; the crop is the embedder's own input, for a "your scan".
 * `gpu`, when given, is the WebGPU embedder on its way (`startGpuEmbedder`): frames embed on WASM until it arrives,
 * then on WebGPU, and back on WASM for good if a WebGPU run ever throws (that frame is run again on WASM).
 *
 * Two main-thread savings per read (scan client wins, 2026-11-14). The card's pixels are read back from its bounding
 * box (`cardBounds`), not the whole frame, and warped from there to the same pixels as before. The detector's input is
 * one array reused across reads (`reusableBuffer`), lent to one read at a time, from before its run to after the run
 * settles, so a read that overlaps another (a chosen photo during the live loop) fills an array of its own. The
 * embedder's crop is NOT reused: it leaves the read (the scanner keeps the last one for "Your scan", the lab keeps each
 * reading's), and a WebGPU run that timed out may still hold it after the frame answered from WASM.
 */
export function framePipeline(
  ort: Ort, models: { detector: OrtSession; embedder: OrtSession }, infer: Run, gpu?: Promise<EmbedRun | null>, opts: PipelineOpts = {},
) {
  const frame = document.createElement("canvas");
  const square = document.createElement("canvas");
  square.width = square.height = DETECTOR_SIZE;
  const fctx = frame.getContext("2d", { willReadFrequently: true });
  const sctx = square.getContext("2d", { willReadFrequently: true });
  if (!fctx || !sctx) throw new Error("no 2d canvas");
  const { detector, embedder } = models;
  const embed = frameEmbedder(ort, embedder, infer, gpu);
  const detBuf = reusableBuffer(3 * DETECTOR_SIZE * DETECTOR_SIZE);
  const measure = opts.measure ? scanMeasure : () => {};
  return {
    async read(video: Source, alive: () => boolean = () => true): Promise<FrameRead | null> {
      const { width: vw, height: vh } = sourceSize(video);
      if (!vw || !vh) return null;
      const t0 = performance.now();
      const s = Math.min(1, MAX_FRAME_EDGE / Math.max(vw, vh));
      frame.width = Math.round(vw * s);
      frame.height = Math.round(vh * s);
      fctx.drawImage(video, 0, 0, frame.width, frame.height);
      const lb = letterbox(frame.width, frame.height);
      sctx.fillStyle = "#000";
      sctx.fillRect(0, 0, DETECTOR_SIZE, DETECTOR_SIZE);
      sctx.drawImage(frame, lb.dx, lb.dy, lb.dw, lb.dh);
      const sq = sctx.getImageData(0, 0, DETECTOR_SIZE, DETECTOR_SIZE).data;
      // Darkness is read off the middle of the picture, never the letterbox's black bars.
      const mid = sctx.getImageData(
        Math.round(lb.dx + lb.dw / 4), Math.round(lb.dy + lb.dh / 4), Math.max(1, Math.round(lb.dw / 2)), Math.max(1, Math.round(lb.dh / 2)),
      ).data;
      const dark = isDark(mid);
      const detData = rgbaToTensor(sq, DETECTOR_SIZE, DETECTOR_SIZE, detBuf.take());
      measure("scan:read-capture", t0, performance.now());
      let det: Record<string, OrtTensor>;
      try {
        const detIn = new ort.Tensor("float32", detData, [1, 3, DETECTOR_SIZE, DETECTOR_SIZE]);
        det = await infer(() => detector.run({ [detector.inputNames[0]]: detIn }));
      } finally {
        // The run has settled (`infer` awaits it), so the runtime is done with the array; `raw.detIn` still shows it
        // until the next read fills it.
        detBuf.give(detData);
      }
      scanMark("scan:first-detect");
      if (!alive()) return null;
      const t1 = performance.now();
      const detMs = Math.round(t1 - t0);
      const raw = { detIn: detData, corners: det.corners.data };
      const corners = cornersFromDetector(det.corners.data, frame.width, frame.height);
      if (!cardInView(det.sharpness.data[0], corners, frame.width, frame.height)) return { kind: "none", dark, detMs, raw };
      // Only the card's box is read back (the whole frame when its corners are no box to warp from: `cardBounds`).
      const box = cardBounds(corners, frame.width, frame.height) ?? { x: 0, y: 0, w: frame.width, h: frame.height };
      const px = fctx.getImageData(box.x, box.y, box.w, box.h).data;
      const t2 = performance.now();
      measure("scan:read-readback", t1, t2, { bytes: px.length, frameBytes: frame.width * frame.height * 4 });
      const crop = warpToTensor(px, frame.width, frame.height, corners, EMBED_W, EMBED_H, box);
      measure("scan:read-warp", t2, performance.now());
      if (!crop) return { kind: "none", dark, detMs, raw };
      const out = await embed.run(crop, alive);
      if (!alive()) return null;
      const embedding = normalise(out.data);
      return { kind: "card", dark, crop, embedding, outline: outlineOf(corners, frame.width, frame.height, vw, vh), detMs, embMs: Math.round(performance.now() - t1), raw, backend: out.backend };
    },
  };
}
