// The scan lab's WebGPU side (`spike.ts`): onnxruntime-web's WebGPU build, loaded only with "Compare WebGPU" on,
// running the same two models from the same cached bytes as the WASM the lab always runs, so each frame can be run
// on both and compared. Never used by the scanner itself: WebGPU ships only once a phone's numbers show parity.
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

export type GpuModels = { ort: Ort; detector: OrtSession; embedder: OrtSession; times: BackendTimes };

/** Both models on WebGPU, each timed from its bytes to its session and through one blank run. */
export async function loadGpuModels(bytes: ModelBytesLoads, hold: (s: OrtSession) => OrtSession): Promise<GpuModels> {
  const ort = (await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ `${ORT_BASE}ort.webgpu.min.mjs`)) as Ort;
  ort.env.wasm.wasmPaths = ORT_BASE;
  const one = async (model: Uint8Array, dims: number[]) => {
    const t0 = performance.now();
    const s = hold(await ort.InferenceSession.create(model, { executionProviders: ["webgpu"] }));
    const t1 = performance.now();
    await s.run({ [s.inputNames[0]]: new ort.Tensor("float32", new Float32Array(dims.reduce((a, b) => a * b, 1)), dims) });
    return { s, create: Math.round(t1 - t0), warm: Math.round(performance.now() - t1) };
  };
  // One after the other, as WebGPU queues its work on one device anyway; each timed alone.
  const d = await one(await bytes.detector, [1, 3, DETECTOR_SIZE, DETECTOR_SIZE]);
  const e = await one(await bytes.embedder, [1, 3, EMBED_H, EMBED_W]);
  return { ort, detector: d.s, embedder: e.s, times: { create: [d.create, e.create], warm: [d.warm, e.warm] } };
}

type Frame = Extract<SpikeRow, { kind: "frames" }>["frames"][number];

/** One frame on WebGPU, on exactly the inputs WASM had, against WASM's own outputs and timings. */
export async function compareFrame(
  gpu: GpuModels,
  wasm: { raw: DetectorRaw; detMs: number; crop: Float32Array | null; embedding: Float32Array | null; embMs: number | null },
): Promise<Frame> {
  const t0 = performance.now();
  const det = await gpu.detector.run({ [gpu.detector.inputNames[0]]: new gpu.ort.Tensor("float32", wasm.raw.detIn, [1, 3, DETECTOR_SIZE, DETECTOR_SIZE]) });
  const gd = Math.round(performance.now() - t0);
  const corner = maxAbsDiff(det.corners.data, wasm.raw.corners);
  if (!wasm.crop || !wasm.embedding) return { wd: wasm.detMs, we: null, gd, ge: null, cos: null, corner };
  const t1 = performance.now();
  const out = await gpu.embedder.run({ [gpu.embedder.inputNames[0]]: new gpu.ort.Tensor("float32", wasm.crop, [1, 3, EMBED_H, EMBED_W]) });
  const ge = Math.round(performance.now() - t1);
  const cos = cosine(normalise(Object.values(out)[0].data), wasm.embedding);
  return { wd: wasm.detMs, we: wasm.embMs, gd, ge, cos: cos === null ? null : Math.round(cos * 1e6) / 1e6, corner: Math.round(corner * 1e6) / 1e6 };
}
