// The scanner's embedder on WebGPU, where the phone has it (staging lab, two phones, 2026-11-14: the embedder ran in
// 29ms against WASM's 82 on an iPhone and 85 against 236 on Android, with embeddings matching to a cosine of 0.9999995;
// the detector ran slower on WebGPU on both, so it stays on WASM). The detector, and the embedder until WebGPU is
// ready, run on the WASM runtime (`pipeline.ts`). WebGPU runs in onnxruntime-web's WebGPU build, a second runtime the
// scanner starts loading at open when it is already cached, else only once its first answer is drawn, so a device's
// first scan never shares the network with it (`gpu-start.ts`). Its 24.3MB WASM is kept in Cache Storage under a pinned SHA-256 (`model-cache.ts`), so only a
// device's first scanner downloads it. Any WebGPU failure (the runtime or session will not load, the warm-up or a
// later run throws, hangs past `GPU_RUN_TIMEOUT_MS` or answers an unusable embedding) leaves the embedder on WASM for
// the rest of the scanner's session, silently. A session on the WebGPU provider still has onnxruntime's CPU provider
// behind it, so a node WebGPU cannot run would run on the CPU inside that session, unseen by any mark here.
import { EMBED_DIM } from "../card-scan/match";
import { EMBED_H, EMBED_W } from "./geometry";
import { ORT_BASE, ORT_WEBGPU_WASM_SHA256, ORT_WEBGPU_WASM_URL } from "./models";
import { browserModelCacheDeps, filesCached, pinnedBytes, pinnedCache, RUNTIME_CACHE_PREFIX, type ModelCacheDeps, type ModelFile } from "./model-cache";
import { scanMark } from "./marks";
import type { Ort, OrtSession, Run } from "./pipeline";

/** One embedder inference: the warped crop in, the raw (not yet normalised) embedding out. */
export type EmbedRun = (crop: Float32Array) => Promise<Float32Array>;
/** Where the WebGPU embedder was let go, for the `scan:webgpu-off` mark. */
export type GpuOffStage = "load" | "run";

/** The longest a WebGPU run may take before it counts as failed (they take 29 to 92ms on the lab's phones). */
export const GPU_RUN_TIMEOUT_MS = 2_000;
/** The warm-up's own limit: a first run compiles the shaders, and took up to 759ms with the create on Android. */
export const GPU_WARMUP_TIMEOUT_MS = 10_000;

/** Thrown where the scanner closed mid-load: never a WebGPU failure, so nothing is marked for it. */
export class ScannerClosed extends Error {
  constructor() {
    super("the scanner closed");
  }
}

/** `p`, or a rejection once `ms` pass without it settling. The timer is cleared either way. */
export function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`no answer in ${ms}ms`)), ms);
  });
  return Promise.race([p, late]).finally(() => clearTimeout(timer));
}

/** `data` when it is a usable embedding (`EMBED_DIM` values, the fingerprint the match route takes, every one finite),
 * else a throw: a WebGPU answer that is not one is a run failure, so the frame is embedded again on WASM. Pure. */
export function usableEmbedding(data: Float32Array): Float32Array {
  if (data.length !== EMBED_DIM) throw new Error(`embedding of length ${data.length}`);
  for (let i = 0; i < data.length; i++) if (!Number.isFinite(data[i])) throw new Error("embedding not finite");
  return data;
}

/** An embedder session's first output for one crop, on its own runtime's tensors. */
export async function embedOutput(ort: Ort, s: OrtSession, crop: Float32Array, run: Run): Promise<Float32Array> {
  const out = await run(() => s.run({ [s.inputNames[0]]: new ort.Tensor("float32", crop, [1, 3, EMBED_H, EMBED_W]) }));
  return Object.values(out)[0].data;
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
 * onnxruntime-web's WebGPU build (it also runs WASM), single-threaded as the scanner's own runtime is. `wasmBinary` is
 * its WASM already in memory (from Cache Storage), so the runtime compiles it rather than fetching it; the small
 * `.mjs` that loads it still comes from `ORT_BASE`. The binary is read only by the first session the build creates in
 * this page (its WASM is initialised once), and onnxruntime's Emscripten loader keeps it for the page's life, so the
 * scanner and the scan lab both load the build through `gpuRuntime`, once per page. Its own ES module, so its
 * settings never touch the WASM build's.
 */
export async function loadOrtWebGpu(wasmBinary: Uint8Array): Promise<Ort> {
  const ort = (await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ `${ORT_BASE}ort.webgpu.min.mjs`)) as Ort;
  ort.env.wasm.wasmPaths = ORT_BASE;
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.wasmBinary = wasmBinary;
  return ort;
}

const RUNTIME: ModelFile = { url: ORT_WEBGPU_WASM_URL, sha256: ORT_WEBGPU_WASM_SHA256 };

/** The WebGPU build's WASM: from Cache Storage after a device's first download, checked against its pin either way. */
export function webGpuRuntimeBytes(deps: ModelCacheDeps = browserModelCacheDeps()): Promise<Uint8Array> {
  return pinnedBytes(RUNTIME, pinnedCache([RUNTIME], deps, RUNTIME_CACHE_PREFIX), deps, "scan:webgpu-runtime");
}

/** Whether the WebGPU build's WASM is already in Cache Storage (`filesCached`: nothing read, nothing downloaded). */
export function gpuRuntimeCached(deps: ModelCacheDeps = browserModelCacheDeps()): Promise<boolean> {
  return filesCached([RUNTIME], deps, RUNTIME_CACHE_PREFIX);
}

/**
 * A runtime loaded once per page from its bytes: a later call shares the first's runtime and never reads or hashes the
 * bytes again, a load that fails is tried afresh by the next call, and a call whose scanner closed while the bytes
 * came in stops there (`ScannerClosed`) rather than compiling them for nothing.
 */
export function runtimeLoader(bytes: () => Promise<Uint8Array>, load: (b: Uint8Array) => Promise<Ort>) {
  let runtime: Promise<Ort> | null = null;
  return async (alive: () => boolean = () => true): Promise<Ort> => {
    if (runtime) return runtime;
    const b = await bytes();
    if (!alive()) throw new ScannerClosed();
    if (!runtime) {
      const mine = load(b);
      runtime = mine;
      mine.catch(() => {
        if (runtime === mine) runtime = null;
      });
    }
    return runtime;
  };
}

/** The WebGPU build with its cached WASM, once per page, for the scanner and the scan lab alike. */
export const gpuRuntime = runtimeLoader(() => webGpuRuntimeBytes(), loadOrtWebGpu);

/**
 * The embedder on WebGPU: the runtime (`gpuRuntime`), the session created with the `webgpu` provider as the only one
 * asked for (a WebGPU backend that will not start makes the create throw: "no available backend found"; the CPU
 * provider onnxruntime always keeps behind it may still take a node WebGPU lacks), and run once on a blank crop. Each
 * run is limited in time and its output checked (`usableEmbedding`), the warm-up's included; the limit is inside
 * `infer`, so a run that never settles still lets the session holder close. Any throw is the caller's fallback, and
 * `alive` is checked between the stages, so a scanner closed mid-load stops it (`ScannerClosed`). The crop is copied
 * into the runtime's heap, never transferred (no proxy worker), so the same array can be run again on WASM.
 */
export async function loadGpuEmbedder(
  model: Promise<Uint8Array>,
  hold: (s: OrtSession) => OrtSession,
  infer: Run,
  alive: () => boolean,
  runtime: (alive: () => boolean) => Promise<Ort> = gpuRuntime,
): Promise<EmbedRun> {
  const ort = await runtime(alive);
  if (!alive()) throw new ScannerClosed();
  const s = hold(await ort.InferenceSession.create(await model, { executionProviders: ["webgpu"] }));
  if (!alive()) throw new ScannerClosed();
  const timed = (ms: number): EmbedRun => async (crop) =>
    usableEmbedding(await embedOutput(ort, s, crop, <T,>(go: () => Promise<T>) => infer(() => withTimeout(go(), ms))));
  await timed(GPU_WARMUP_TIMEOUT_MS)(new Float32Array(3 * EMBED_H * EMBED_W));
  scanMark("scan:webgpu-embedder");
  return timed(GPU_RUN_TIMEOUT_MS);
}

/** What `startGpuEmbedder` needs, injected so the fallback order is tested without a GPU. */
export type GpuEmbedderDeps = {
  /** Whether a WebGPU adapter is present. */
  adapter: () => Promise<boolean>;
  /** The runtime, the session and its warm-up: a throw anywhere is a fallback. */
  load: () => Promise<EmbedRun>;
  /** False once the scanner closed: what fails after that is the close, not WebGPU, and is never marked. */
  alive: () => boolean;
};

/**
 * The WebGPU embedder, or null (the scanner stays on WASM) when there is no adapter (`scan:webgpu-none`), anything in
 * its load fails (`scan:webgpu-off`), or the scanner closed first (no mark). Never rejects.
 */
export async function startGpuEmbedder(deps: GpuEmbedderDeps): Promise<EmbedRun | null> {
  let present = false;
  try {
    present = await deps.adapter();
  } catch {
    present = false;
  }
  if (!present) {
    scanMark("scan:webgpu-none");
    return null;
  }
  if (!deps.alive()) return null;
  try {
    return await deps.load();
  } catch (e) {
    if (!(e instanceof ScannerClosed) && deps.alive()) scanMark("scan:webgpu-off", { stage: "load" });
    return null;
  }
}

/**
 * The scanner's embedder: WASM until `adopt` hands it the WebGPU one, then WebGPU, until a WebGPU run throws (or times
 * out, or answers an unusable embedding). That frame is run again on WASM and answered from there, and WASM keeps the
 * embedder for the rest of the session: the player never sees a WebGPU failure. A WebGPU embedder that arrives after
 * one failed is not taken back. A run that throws because the scanner closed under it (`alive` false) is not a WebGPU
 * failure: it is passed on, as WASM's is.
 */
export function switchingEmbedder(wasm: EmbedRun, off: (stage: GpuOffStage) => void = () => {}) {
  let gpu: EmbedRun | null = null;
  let failed = false;
  return {
    adopt(run: EmbedRun) {
      if (!failed) gpu = run;
    },
    async run(crop: Float32Array, alive: () => boolean = () => true): Promise<{ data: Float32Array; backend: "wasm" | "webgpu" }> {
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
  const embed = switchingEmbedder((crop) => embedOutput(ort, embedder, crop, infer), (stage) => scanMark("scan:webgpu-off", { stage }));
  void gpu?.then((run) => {
    if (run) embed.adopt(run);
  });
  return embed;
}
