// A camera frame to a card, on the device: the frame is drawn to a canvas, the detector finds the four corners, the
// card is warped to 320x448 and embedded. What happens to the embedding (the lab's index on the device, or the
// server's match) is the caller's. The scan lab reads its frames here, and the viewfinder (card-scan plan PR 3) is to
// read its own here too, so it never copies the lab's loop. The runtime and both models are fetched when a scanner starts (`models.ts`), never bundled.
import {
  DETECTOR_SIZE, EMBED_H, EMBED_W, cornersFromDetector, letterbox, quadArea, rgbaToTensor, warpToTensor, type Pt,
} from "./geometry";
import { normalise } from "./match";
import { DETECTOR_URL, EMBEDDER_URL, ORT_BASE, SHARPNESS_GATE } from "./models";
import { isDark } from "./camera";

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
  InferenceSession: { create(url: string, opts?: Record<string, unknown>): Promise<OrtSession> };
};

/** The longest edge a frame is read at: enough for the warp, and a phone's 1080p frame touches 44% of its pixels. */
export const MAX_FRAME_EDGE = 1280;
/** The share of the frame a card's corners must enclose before it is read: smaller is a card across the room. */
export const MIN_CARD_AREA = 0.05;

export async function loadOrt(): Promise<Ort> {
  const ort = (await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ `${ORT_BASE}ort.wasm.min.mjs`)) as Ort;
  ort.env.wasm.wasmPaths = ORT_BASE;
  ort.env.wasm.numThreads = 1;
  return ort;
}

/** Both models, each handed to `hold` as it loads (so a caller can release one whose sibling failed). */
export async function loadModels(ort: Ort, hold: (s: OrtSession) => OrtSession): Promise<{ detector: OrtSession; embedder: OrtSession }> {
  const load = (url: string) => ort.InferenceSession.create(url, { executionProviders: ["wasm"] }).then(hold);
  const [detector, embedder] = await Promise.all([load(DETECTOR_URL), load(EMBEDDER_URL)]);
  return { detector, embedder };
}

/** Whether the detector found a card worth reading: sharp enough, and big enough in the frame. Pure. */
export function cardInView(sharpness: number, corners: Pt[], width: number, height: number): boolean {
  return sharpness >= SHARPNESS_GATE && quadArea(corners) > MIN_CARD_AREA * width * height;
}

export type FrameRead =
  | { kind: "none"; dark: boolean; detMs: number }
  | { kind: "card"; dark: boolean; crop: Float32Array; embedding: Float32Array; detMs: number; embMs: number };

/** What `read` takes: the camera's `<video>`, or a still (a chosen photo's `ImageBitmap`). */
export type Source = CanvasImageSource & ({ videoWidth: number; videoHeight: number } | { width: number; height: number });

/** A source's picture size: a video's frame (its element's `width` is the box, not the picture), else its own. */
export function sourceSize(s: Source): { width: number; height: number } {
  return "videoWidth" in s ? { width: s.videoWidth, height: s.videoHeight } : { width: s.width, height: s.height };
}
type Run = <T>(fn: () => Promise<T>) => Promise<T>;

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
      return { kind: "card", dark, crop, embedding, detMs, embMs: Math.round(performance.now() - t1) };
    },
  };
}
