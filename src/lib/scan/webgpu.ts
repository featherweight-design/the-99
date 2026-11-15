// The scanner's embedder on WebGPU, where the phone has it (staging lab, two phones, 2026-11-14: the embedder ran in
// 29ms against WASM's 82 on an iPhone and 85 against 236 on Android, with embeddings matching to a cosine of 0.9999995;
// the detector ran slower on WebGPU on both, so it stays on WASM). The detector, and the embedder until WebGPU is
// ready, run on the WASM runtime (`pipeline.ts`). WebGPU runs in onnxruntime-web's WebGPU build, a second runtime
// loaded beside the first only once both WASM models are warm, so nothing the first read waits for shares the network
// or the main thread with it. Its 24.3MB WASM is kept in Cache Storage under a pinned SHA-256 (`model-cache.ts`), so
// only a device's first scanner downloads it. Any WebGPU failure (no adapter, the runtime or session will not load,
// the warm-up or a later run throws or answers an unusable embedding) leaves the embedder on WASM for the rest of the
// scanner's session, silently. "webgpu" means a session on the WebGPU provider: onnxruntime keeps its CPU provider
// registered behind it, so a node WebGPU cannot run would run on the CPU inside that session.
import { EMBED_H, EMBED_W } from "./geometry";
import { ORT_BASE, ORT_WEBGPU_WASM_SHA256, ORT_WEBGPU_WASM_URL } from "./models";
import {
  browserModelCacheDeps, evictOtherModelCaches, modelBytes, modelCacheName, RUNTIME_CACHE_PREFIX, type ModelCacheDeps, type ModelFile,
} from "./model-cache";
import { scanMark } from "./marks";
import type { Ort, OrtSession, Run } from "./pipeline";

export type EmbedderBackend = "wasm" | "webgpu";
/** One embedder inference: the warped crop in, the raw (not yet normalised) embedding out. */
export type EmbedRun = (crop: Float32Array) => Promise<Float32Array>;
/** Where the WebGPU embedder was let go, for the `scan:webgpu-off` mark. */
export type GpuOffStage = "adapter" | "load" | "run";
/** The embedder's output: one 256-d vector (`models.ts`). */
export const EMBEDDING_LENGTH = 256;

/** `data` when it is a usable embedding (the right length, every value finite), else a throw: a WebGPU answer that is
 * not one is a run failure, so the frame is embedded again on WASM. Pure. */
export function usableEmbedding(data: Float32Array): Float32Array {
  if (data.length !== EMBEDDING_LENGTH) throw new Error(`embedding of length ${data.length}`);
  for (let i = 0; i < data.length; i++) if (!Number.isFinite(data[i])) throw new Error("embedding not finite");
  return data;
}

type Gpu = { requestAdapter(): Promise<{ info?: { vendor?: string; architecture?: string } } | null> };

/** Whether this browser offers WebGPU, and its adapter as it names it. Never rejects. */
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

/**
 * onnxruntime-web's WebGPU build (it also runs WASM), single-threaded as the scanner's own runtime is. `wasmBinary`,
 * when given, is its WASM already in memory (from Cache Storage), so the runtime compiles it rather than fetching it;
 * the small `.mjs` that loads it still comes from `ORT_BASE`. The binary is read only by the first session the build
 * creates in this page (its WASM is initialised once), so the scanner loads it through `gpuRuntime`, once per page.
 * Its own ES module, so its settings never touch the WASM build's.
 */
export async function loadOrtWebGpu(wasmBinary?: Uint8Array): Promise<Ort> {
  const ort = (await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ `${ORT_BASE}ort.webgpu.min.mjs`)) as Ort;
  ort.env.wasm.wasmPaths = ORT_BASE;
  ort.env.wasm.numThreads = 1;
  if (wasmBinary) ort.env.wasm.wasmBinary = wasmBinary;
  return ort;
}

/** `load`, run once: every later call shares its answer, and a load that fails is tried afresh by the next call. */
export function once<T>(load: () => Promise<T>): () => Promise<T> {
  let p: Promise<T> | null = null;
  return () => {
    if (!p) {
      const mine = load();
      p = mine;
      mine.catch(() => {
        if (p === mine) p = null;
      });
    }
    return p;
  };
}

const RUNTIME: ModelFile = { url: ORT_WEBGPU_WASM_URL, sha256: ORT_WEBGPU_WASM_SHA256 };

/** The WebGPU build's WASM: from Cache Storage after a device's first download, checked against its pin either way. */
export async function webGpuRuntimeBytes(deps: ModelCacheDeps = browserModelCacheDeps()): Promise<Uint8Array> {
  const name = modelCacheName([RUNTIME], RUNTIME_CACHE_PREFIX);
  void evictOtherModelCaches(name, deps.caches, RUNTIME_CACHE_PREFIX);
  const m = await modelBytes(RUNTIME, name, deps);
  scanMark("scan:webgpu-runtime", { from: m.from, bytes: m.bytes.byteLength, hashMs: Math.round(m.hashMs) });
  return m.bytes;
}

/**
 * The WebGPU build with its cached WASM, once per page: a later scanner open in the same page finds the runtime
 * initialised and never reads or hashes the 24MB again. The bytes stay in memory for the page's life once loaded:
 * onnxruntime's Emscripten loader keeps the `wasmBinary` it was handed in a variable of its own, so clearing `env`
 * would free nothing.
 */
const gpuRuntime = once(async () => loadOrtWebGpu(await webGpuRuntimeBytes()));

/**
 * The embedder on WebGPU: the runtime from its cached bytes, the session created with the `webgpu` provider as the
 * only one asked for (a WebGPU backend that will not start makes the create throw: "no available backend found"; the
 * CPU provider onnxruntime always keeps behind it may still take a node WebGPU lacks), and run once on a blank crop.
 * Each run's output is checked (`usableEmbedding`), the warm-up's included. Any throw is the caller's fallback.
 * `hold` keeps the session for the scanner's release; `infer` runs each inference. The crop is copied into the
 * runtime's heap, never transferred (no proxy worker), so the same array can be run again on WASM.
 */
export async function loadGpuEmbedder(
  model: Promise<Uint8Array>, hold: (s: OrtSession) => OrtSession, infer: Run, runtime: () => Promise<Ort> = gpuRuntime,
): Promise<EmbedRun> {
  const ort = await runtime();
  const s = hold(await ort.InferenceSession.create(await model, { executionProviders: ["webgpu"] }));
  const dims = [1, 3, EMBED_H, EMBED_W];
  const run: EmbedRun = async (crop) =>
    usableEmbedding(Object.values(await infer(() => s.run({ [s.inputNames[0]]: new ort.Tensor("float32", crop, dims) })))[0].data);
  await run(new Float32Array(3 * EMBED_H * EMBED_W));
  scanMark("scan:webgpu-embedder");
  return run;
}

/** What `startGpuEmbedder` needs, injected so the fallback order is tested without a GPU. */
export type GpuEmbedderDeps = {
  /** Whether a WebGPU adapter is present. */
  adapter: () => Promise<boolean>;
  /** The runtime, the session and its warm-up: a throw anywhere is a fallback. */
  load: () => Promise<EmbedRun>;
};

/** The WebGPU embedder, or null (the scanner stays on WASM) when there is no adapter or anything in its load fails. Never rejects. */
export async function startGpuEmbedder(deps: GpuEmbedderDeps, off: (stage: GpuOffStage) => void = () => {}): Promise<EmbedRun | null> {
  let present = false;
  try {
    present = await deps.adapter();
  } catch {
    present = false;
  }
  if (!present) {
    off("adapter");
    return null;
  }
  try {
    return await deps.load();
  } catch {
    off("load");
    return null;
  }
}

/**
 * The scanner's embedder: WASM until `adopt` hands it the WebGPU one, then WebGPU, until a WebGPU run throws. That
 * frame is run again on WASM and answered from there, and WASM keeps the embedder for the rest of the session: the
 * player never sees a WebGPU failure. A WebGPU embedder that arrives after one failed is not taken back. A run that
 * throws because the scanner closed under it (`alive` false) is not a WebGPU failure: it is passed on, as WASM's is.
 */
export function switchingEmbedder(wasm: EmbedRun, off: (stage: GpuOffStage) => void = () => {}) {
  let gpu: EmbedRun | null = null;
  let failed = false;
  return {
    adopt(run: EmbedRun) {
      if (!failed) gpu = run;
    },
    backend(): EmbedderBackend {
      return gpu ? "webgpu" : "wasm";
    },
    async run(crop: Float32Array, alive: () => boolean = () => true): Promise<{ data: Float32Array; backend: EmbedderBackend }> {
      const g = gpu;
      if (g) {
        try {
          return { data: await g(crop), backend: "webgpu" };
        } catch (e) {
          if (!alive()) throw e;
          if (gpu === g) {
            gpu = null;
            failed = true;
            off("run");
          }
        }
      }
      return { data: await wasm(crop), backend: "wasm" };
    },
  };
}

/**
 * The scanner's embedder for one pipeline: `embedder` on the WASM runtime `ort`, switching to WebGPU when `gpu` answers
 * one. `framePipeline`'s, apart from its canvases so the switch is tested without a browser.
 */
export function frameEmbedder(ort: Ort, embedder: OrtSession, infer: Run, gpu?: Promise<EmbedRun | null>) {
  const dims = [1, 3, EMBED_H, EMBED_W];
  const onWasm: EmbedRun = async (crop) =>
    Object.values(await infer(() => embedder.run({ [embedder.inputNames[0]]: new ort.Tensor("float32", crop, dims) })))[0].data;
  const embed = switchingEmbedder(onWasm, (stage) => scanMark("scan:webgpu-off", { stage }));
  void gpu?.then((run) => {
    if (run) embed.adopt(run);
  });
  return embed;
}
