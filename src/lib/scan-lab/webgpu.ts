// The scan lab's WebGPU side (`spike.ts`): onnxruntime-web's WebGPU build, loaded only with "Compare WebGPU" on,
// running the same two models from the same cached bytes on WebGPU and (as its own timed pair) on WASM, so each frame
// can be run on both and compared like for like. Never used by the scanner itself: WebGPU ships only once a phone's numbers show parity.
import { DETECTOR_SIZE, EMBED_H, EMBED_W } from "../scan/geometry";
import { ORT_BASE } from "../scan/models";
import type { DetectorRaw, ModelBytesLoads, Ort, OrtSession } from "../scan/pipeline";
import { cosine, maxAbsDiff, type BackendTimes, type SpikeRow } from "./spike";
import { normalise } from "../scan/match";

type Gpu = { requestAdapter(): Promise<{ info?: { vendor?: string; architecture?: string } } | null> };

/** Whether this browser offers WebGPU, and its adapter as it names it. */
export async function gpuAdapter(): Promise<{ gpu: boolean; adapter: string | null }> {
  const gpu = (globalThis.navigator as { gpu?: Gpu } | undefined)?.gpu;
  if (!gpu) return { gpu: false, adapter: null };
  try {
    const a = await gpu.requestAdapter();
    if (!a) return { gpu: false, adapter: null };
    const name = [a.info?.vendor, a.info?.architecture].filter(Boolean).join(" ").slice(0, 120);
    return { gpu: true, adapter: name || null };
  } catch {
    return { gpu: false, adapter: null };
  }
}

/** One backend's two sessions and how long each took to create and first run. */
export type TimedModels = { ort: Ort; detector: OrtSession; embedder: OrtSession; times: BackendTimes };

/** onnxruntime-web's WebGPU build (it also runs WASM), loaded only for the comparison. */
export async function loadOrtWebGpu(): Promise<Ort> {
  const ort = (await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ `${ORT_BASE}ort.webgpu.min.mjs`)) as Ort;
  ort.env.wasm.wasmPaths = ORT_BASE;
  // Single-threaded, as the scanner's own runtime is (`loadOrt`), so the WASM pair is the scanner's baseline.
  ort.env.wasm.numThreads = 1;
  return ort;
}

/**
 * Both models on one backend from bytes already in memory, each session created and first run alone, one after the
 * other, so the two backends' times are measured the same way (the scanner's own WASM sessions load side by side,
 * beside a download, and their times say nothing about the backend).
 */
export async function loadTimedModels(ort: Ort, ep: "wasm" | "webgpu", bytes: ModelBytesLoads, hold: (s: OrtSession) => OrtSession): Promise<TimedModels> {
  const one = async (model: Uint8Array, dims: number[]) => {
    const t0 = performance.now();
    const s = hold(await ort.InferenceSession.create(model, { executionProviders: [ep] }));
    const t1 = performance.now();
    await s.run({ [s.inputNames[0]]: new ort.Tensor("float32", new Float32Array(dims.reduce((a, b) => a * b, 1)), dims) });
    return { s, create: Math.round(t1 - t0), warm: Math.round(performance.now() - t1) };
  };
  const [d, e] = [await bytes.detector, await bytes.embedder];
  const det = await one(d, [1, 3, DETECTOR_SIZE, DETECTOR_SIZE]);
  const emb = await one(e, [1, 3, EMBED_H, EMBED_W]);
  return { ort, detector: det.s, embedder: emb.s, times: { create: [det.create, emb.create], warm: [det.warm, emb.warm] } };
}

type Frame = Extract<SpikeRow, { kind: "frames" }>["frames"][number];

/** A session run on `input`, timed alone: the inference only, never the frame capture or the tensor building. */
async function timedRun(m: TimedModels, which: "detector" | "embedder", input: Float32Array, dims: number[]) {
  const s = m[which];
  const t0 = performance.now();
  const out = await s.run({ [s.inputNames[0]]: new m.ort.Tensor("float32", input, dims) });
  return { out, ms: Math.round(performance.now() - t0) };
}

/** One frame on both backends, on exactly the same input tensors, each inference timed alone. */
export async function compareFrame(wasm: TimedModels, gpu: TimedModels, raw: DetectorRaw, crop: Float32Array | null): Promise<Frame> {
  const detDims = [1, 3, DETECTOR_SIZE, DETECTOR_SIZE];
  const wDet = await timedRun(wasm, "detector", raw.detIn, detDims);
  const gDet = await timedRun(gpu, "detector", raw.detIn, detDims);
  const corner = maxAbsDiff(gDet.out.corners.data, wDet.out.corners.data);
  if (!crop) return { wd: wDet.ms, we: null, gd: gDet.ms, ge: null, cos: null, corner };
  const embDims = [1, 3, EMBED_H, EMBED_W];
  const wEmb = await timedRun(wasm, "embedder", crop, embDims);
  const gEmb = await timedRun(gpu, "embedder", crop, embDims);
  const c = cosine(normalise(Object.values(gEmb.out)[0].data), normalise(Object.values(wEmb.out)[0].data));
  const cos = c === null || !Number.isFinite(c) ? null : Math.max(-1, Math.min(1, Math.round(c * 1e6) / 1e6));
  return { wd: wDet.ms, we: wEmb.ms, gd: gDet.ms, ge: gEmb.ms, cos, corner: Math.round(corner * 1e6) / 1e6 };
}
