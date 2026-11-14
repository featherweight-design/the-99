import { isUuid } from "../uuid";

// The scan lab's WebGPU spike (lane 58, round 2, 2026-11-13): with "Compare WebGPU" on, the lab runs both models on
// WebGPU beside the WASM it always runs, on the same frames, and records what each costs and whether they agree. It
// also records, for every card the player taps, the server's answer for that card's FIRST frame (its guess and
// margin), so a first-frame lookup's margin can be set against the answer the player confirmed. Rows go to
// `POST /api/scan-lab/spike` (staging only, behind `SCAN_LAB_ENABLED`). Readings and timings only: never an image.

/** A frame batch's cap, and the request body's. */
export const MAX_SPIKE_FRAMES = 40;
export const MAX_SPIKE_BODY = 8_000;
const MAX_MS = 120_000;

export type BackendTimes = {
  /** Per model (detector, embedder): from its bytes in to its session created, and its first (blank) run. */
  create: [number, number];
  warm: [number, number];
};

export type SpikeRow =
  | {
      kind: "backends";
      /** The browser offers WebGPU and an adapter. */
      gpu: boolean;
      /** The adapter's vendor and architecture, as the browser reports them. */
      adapter: string | null;
      ua: string;
      wasm: BackendTimes;
      webgpu: BackendTimes | null;
      /** Why WebGPU did not load, when it did not. */
      error: string | null;
    }
  | {
      kind: "frames";
      frames: {
        /** WASM's detector and embedder ms on this frame (the embedder null when no card was read). */
        wd: number; we: number | null;
        /** WebGPU's, on the very same inputs. */
        gd: number; ge: number | null;
        /** Cosine of WebGPU's embedding to WASM's (the index was built by fp32 WASM-equivalent runs). */
        cos: number | null;
        /** The largest absolute difference between the two detectors' raw corner outputs. */
        corner: number;
      }[];
    }
  | {
      kind: "run";
      /** The tap's own `scan_lab_results` row: its guess, verdict and (after a ✗) the card it really was. */
      resultId: string;
      /** The server's answer for the run's first card frame: its top card and margin, and how long it took. */
      first: { oracleId: string | null; margin: number | null; ms: number };
      /** Card frames read in the run before the tap. */
      frames: number;
    };

const isMs = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= MAX_MS;
const isNum = (v: unknown, lo: number, hi: number): v is number => typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi;
const isText = (v: unknown, max: number): v is string => typeof v === "string" && v.length <= max;
const keysAre = (o: Record<string, unknown>, keys: string[]) => {
  const k = Object.keys(o);
  return k.length === keys.length && keys.every((x) => x in o);
};
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const isPair = (v: unknown): v is [number, number] => Array.isArray(v) && v.length === 2 && v.every(isMs);
const isTimes = (v: unknown): v is BackendTimes => isObj(v) && keysAre(v, ["create", "warm"]) && isPair(v.create) && isPair(v.warm);

function isFrame(v: unknown): boolean {
  if (!isObj(v) || !keysAre(v, ["wd", "we", "gd", "ge", "cos", "corner"])) return false;
  return isMs(v.wd) && (v.we === null || isMs(v.we)) && isMs(v.gd) && (v.ge === null || isMs(v.ge))
    && (v.cos === null || isNum(v.cos, -1.0001, 1.0001)) && isNum(v.corner, 0, 1e6);
}

/** The row the route stores, or null when any field is not what the lab writes. Pure. */
export function parseSpike(raw: unknown): SpikeRow | null {
  if (!isObj(raw)) return null;
  if (raw.kind === "backends") {
    if (!keysAre(raw, ["kind", "gpu", "adapter", "ua", "wasm", "webgpu", "error"])) return null;
    if (typeof raw.gpu !== "boolean" || !(raw.adapter === null || isText(raw.adapter, 120)) || !isText(raw.ua, 300)) return null;
    if (!isTimes(raw.wasm) || !(raw.webgpu === null || isTimes(raw.webgpu)) || !(raw.error === null || isText(raw.error, 300))) return null;
    return raw as SpikeRow;
  }
  if (raw.kind === "frames") {
    if (!keysAre(raw, ["kind", "frames"]) || !Array.isArray(raw.frames)) return null;
    if (raw.frames.length === 0 || raw.frames.length > MAX_SPIKE_FRAMES || !raw.frames.every(isFrame)) return null;
    return raw as SpikeRow;
  }
  if (raw.kind === "run") {
    if (!keysAre(raw, ["kind", "resultId", "first", "frames"]) || !isUuid(raw.resultId)) return null;
    const f = raw.first;
    if (!isObj(f) || !keysAre(f, ["oracleId", "margin", "ms"])) return null;
    if (!(f.oracleId === null || isUuid(f.oracleId)) || !(f.margin === null || isNum(f.margin, -2, 2)) || !isMs(f.ms)) return null;
    if (!Number.isInteger(raw.frames) || (raw.frames as number) < 0 || (raw.frames as number) > 100_000) return null;
    return raw as SpikeRow;
  }
  return null;
}

/** Cosine of two equal-length vectors; null when either is all zeros. Pure. */
export function cosine(a: ArrayLike<number>, b: ArrayLike<number>): number | null {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / Math.sqrt(na * nb) : null;
}

/** The largest absolute difference between two equal-length arrays. Pure. */
export function maxAbsDiff(a: ArrayLike<number>, b: ArrayLike<number>): number {
  let m = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) m = Math.max(m, Math.abs(a[i] - b[i]));
  return m;
}
