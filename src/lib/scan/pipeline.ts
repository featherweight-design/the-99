// A camera frame to a card, on the device: the frame is drawn to a canvas, the detector finds the four corners, the
// card is warped to 320x448 and embedded. What happens to the embedding (the lab's index on the device, or the
// server's match) is the caller's. The scan lab reads its frames here, and the viewfinder (card-scan plan PR 3) is to
// read its own here too, so it never copies the lab's loop. The runtime and both models are fetched when a scanner starts (`models.ts`), never bundled.
import {
  DETECTOR_SIZE, EMBED_H, EMBED_W, cornersFromDetector, letterbox, quadArea, rgbaToTensor, warpToTensor, type Pt,
} from "./geometry";
import { normalise } from "./match";
import { DETECTOR_SHA256, DETECTOR_URL, EMBEDDER_SHA256, EMBEDDER_URL, ORT_BASE, SHARPNESS_GATE } from "./models";
import { browserModelCacheDeps, evictOtherModelCaches, modelBytes, modelCacheName, type ModelCacheDeps, type ModelFile } from "./model-cache";
import { scanMark } from "./marks";
import { isDark } from "./camera";
import { outlineOf, type Outline } from "./outline";

/** The slice of onnxruntime-web a scanner uses; it is loaded from the CDN, so it has no types here. */
export type OrtTensor = { data: Float32Array };
export type OrtSession = {
  run(feeds: Record<string, unknown>): Promise<Record<string, OrtTensor>>;
  release(): Promise<void>;
  inputNames: string[];
};
export type Ort = {
  env: { wasm: { wasmPaths: string; numThreads: number } };
  Tensor: new (type: "float32", data: Float32Array, dims: number[]) => unknown;
  InferenceSession: { create(model: Uint8Array, opts?: Record<string, unknown>): Promise<OrtSession> };
};

/** The longest edge a frame is read at: enough for the warp, and a phone's 1080p frame touches 44% of its pixels. */
export const MAX_FRAME_EDGE = 1280;
/** The share of the frame a card's corners must enclose before it is read: smaller is a card across the room. */
export const MIN_CARD_AREA = 0.05;

type Run = <T>(fn: () => Promise<T>) => Promise<T>;

const DETECTOR: ModelFile = { url: DETECTOR_URL, sha256: DETECTOR_SHA256 };
const EMBEDDER: ModelFile = { url: EMBEDDER_URL, sha256: EMBEDDER_SHA256 };

export async function loadOrt(): Promise<Ort> {
  const ort = (await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ `${ORT_BASE}ort.wasm.min.mjs`)) as Ort;
  ort.env.wasm.wasmPaths = ORT_BASE;
  ort.env.wasm.numThreads = 1;
  scanMark("scan:ort");
  return ort;
}

type ModelBytesPair = { detector: Uint8Array; embedder: Uint8Array };
let inFlight: Promise<ModelBytesPair> | null = null;

/**
 * Both models' bytes, from Cache Storage when a scanner on this device already downloaded them (`model-cache.ts`).
 * Needs no runtime, so a scanner starts it beside the runtime's own download. A load already under way is shared, so
 * a scanner mounted twice (React's development double mount, or closed and opened again mid-download) never downloads
 * the files twice side by side; once it settles the bytes are let go.
 */
export function loadModelBytes(deps?: ModelCacheDeps): Promise<ModelBytesPair> {
  if (inFlight && !deps) return inFlight;
  const load = downloadModelBytes(deps ?? browserModelCacheDeps());
  if (deps) return load;
  inFlight = load;
  const clear = () => {
    if (inFlight === load) inFlight = null;
  };
  load.then(clear, clear);
  return load;
}

function downloadModelBytes(deps: ModelCacheDeps): Promise<ModelBytesPair> {
  const name = modelCacheName([DETECTOR, EMBEDDER]);
  void evictOtherModelCaches(name, deps.caches);
  const one = (file: ModelFile, mark: "scan:detector-model" | "scan:embedder-model") =>
    modelBytes(file, name, deps).then((m) => {
      scanMark(mark, { from: m.from, bytes: m.bytes.byteLength });
      return m.bytes;
    });
  return Promise.all([one(DETECTOR, "scan:detector-model"), one(EMBEDDER, "scan:embedder-model")]).then(([detector, embedder]) => ({ detector, embedder }));
}

/**
 * Both models' sessions, each handed to `hold` as it is created (so a caller can release one whose sibling failed),
 * and each run once on a blank input before it is answered: onnxruntime-web's first run of a session plans its memory
 * and is several times a later one, and that run is better spent while the camera starts than on the first card.
 */
export async function loadModels(
  ort: Ort,
  hold: (s: OrtSession) => OrtSession,
  opts: { bytes?: Promise<ModelBytesPair>; infer?: Run } = {},
): Promise<{ detector: OrtSession; embedder: OrtSession }> {
  const { detector: d, embedder: e } = await (opts.bytes ?? loadModelBytes());
  const infer: Run = opts.infer ?? ((fn) => fn());
  const load = async (model: Uint8Array, dims: number[], mark: "scan:detector-session" | "scan:embedder-session") => {
    const s = hold(await ort.InferenceSession.create(model, { executionProviders: ["wasm"] }));
    const blank = new ort.Tensor("float32", new Float32Array(dims.reduce((a, b) => a * b, 1)), dims);
    // Only a head start: a warm-up that fails leaves the first real read to plan the memory, as it did before.
    await infer(() => s.run({ [s.inputNames[0]]: blank })).catch(() => {});
    scanMark(mark);
    return s;
  };
  const [detector, embedder] = await Promise.all([
    load(d, [1, 3, DETECTOR_SIZE, DETECTOR_SIZE], "scan:detector-session"),
    load(e, [1, 3, EMBED_H, EMBED_W], "scan:embedder-session"),
  ]);
  scanMark("scan:ready");
  return { detector, embedder };
}

/** Whether the detector found a card worth reading: sharp enough, and big enough in the frame. Pure. */
export function cardInView(sharpness: number, corners: Pt[], width: number, height: number): boolean {
  return sharpness >= SHARPNESS_GATE && quadArea(corners) > MIN_CARD_AREA * width * height;
}

export type FrameRead =
  | { kind: "none"; dark: boolean; detMs: number }
  | { kind: "card"; dark: boolean; crop: Float32Array; embedding: Float32Array; outline: Outline; detMs: number; embMs: number };

/** What `read` takes: the camera's `<video>`, or a still (a chosen photo's `ImageBitmap`). */
export type Source = CanvasImageSource & ({ videoWidth: number; videoHeight: number } | { width: number; height: number });

/** A source's picture size: a video's frame (its element's `width` is the box, not the picture), else its own. */
export function sourceSize(s: Source): { width: number; height: number } {
  return "videoWidth" in s ? { width: s.videoWidth, height: s.videoHeight } : { width: s.width, height: s.height };
}

/**
 * The reader for one camera: `read` takes the frame in view (or a chosen photo) and answers what it holds, or null while the camera has
 * no size yet or once `alive` says the scanner stopped mid-read. `infer` runs each inference (a session holder's, so
 * a release waits for it). The embedding is L2-normalised; the crop is the embedder's own input, for a "your scan".
 */
export function framePipeline(ort: Ort, models: { detector: OrtSession; embedder: OrtSession }, infer: Run) {
  const frame = document.createElement("canvas");
  const square = document.createElement("canvas");
  square.width = square.height = DETECTOR_SIZE;
  const fctx = frame.getContext("2d", { willReadFrequently: true });
  const sctx = square.getContext("2d", { willReadFrequently: true });
  if (!fctx || !sctx) throw new Error("no 2d canvas");
  const { detector, embedder } = models;
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
      const detIn = new ort.Tensor("float32", rgbaToTensor(sq, DETECTOR_SIZE, DETECTOR_SIZE), [1, 3, DETECTOR_SIZE, DETECTOR_SIZE]);
      const det = await infer(() => detector.run({ [detector.inputNames[0]]: detIn }));
      scanMark("scan:first-detect");
      if (!alive()) return null;
      const t1 = performance.now();
      const detMs = Math.round(t1 - t0);
      const corners = cornersFromDetector(det.corners.data, frame.width, frame.height);
      if (!cardInView(det.sharpness.data[0], corners, frame.width, frame.height)) return { kind: "none", dark, detMs };
      const px = fctx.getImageData(0, 0, frame.width, frame.height).data;
      const crop = warpToTensor(px, frame.width, frame.height, corners);
      if (!crop) return { kind: "none", dark, detMs };
      const embIn = new ort.Tensor("float32", crop, [1, 3, EMBED_H, EMBED_W]);
      const out = await infer(() => embedder.run({ [embedder.inputNames[0]]: embIn }));
      if (!alive()) return null;
      const embedding = normalise(Object.values(out)[0].data);
      return { kind: "card", dark, crop, embedding, outline: outlineOf(corners, frame.width, frame.height, vw, vh), detMs, embMs: Math.round(performance.now() - t1) };
    },
  };
}
