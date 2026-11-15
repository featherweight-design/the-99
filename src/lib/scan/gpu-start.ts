// When the scanner's WebGPU embedder starts loading (Hugh, 2026-11-15). A device whose WebGPU runtime is already in
// Cache Storage starts it as the scanner opens, beside the camera and the WASM models: nothing is downloaded, so the
// first scan shares only the main thread with it. A device's first-ever open (nothing cached) still starts it once the
// first answer is drawn, so the 24.3MB runtime never competes with the 17.9MB of models. Frames embed on WASM until it
// is ready either way (`switchingEmbedder`), and it never feeds the loading bar. The scan lab runs this same path with
// a mode of its own choosing (`/lab/scan`), to measure whether starting at open is in fact faster.
import { whenScanMarked } from "./marks";
import { gpuAdapter, gpuRuntimeCached, loadGpuEmbedder, startGpuEmbedder, type EmbedRun } from "./webgpu";
import type { OrtSession, Run } from "./pipeline";

/**
 * - `after-answer`: once the first answer is drawn, cached or not (the scanner as built before this ruling).
 * - `at-open`: at open when the runtime is cached, else after the first answer. The scanner's own mode.
 * - `frontload`: at open always, downloading the runtime beside the models on a first-ever open. The lab's only.
 */
export const GPU_START_MODES = ["after-answer", "at-open", "frontload"] as const;
export type GpuStartMode = (typeof GPU_START_MODES)[number];

/** The scanner's mode: the lab's other modes exist only to be measured against it. */
export const SCANNER_GPU_START: GpuStartMode = "at-open";

/** Whether the WebGPU embedder starts as the scanner opens, rather than after its first answer. Pure. */
export function gpuStartsAtOpen(mode: GpuStartMode, runtimeCached: boolean): boolean {
  return mode === "frontload" || (mode === "at-open" && runtimeCached);
}

export type GpuScheduleDeps = {
  mode: GpuStartMode;
  /** Whether the runtime was in Cache Storage as the scanner opened; a check that fails reads as not cached. */
  runtimeCached: Promise<boolean>;
  /** Settles once the scanner's first answer is drawn. */
  firstAnswer: () => Promise<void>;
  /** The load itself (`startGpuEmbedder`): never rejects. */
  start: () => Promise<EmbedRun | null>;
};

/** The WebGPU embedder, its load started when `mode` says (`gpuStartsAtOpen`), never before. Never rejects. */
export async function scheduleGpuEmbedder(d: GpuScheduleDeps): Promise<EmbedRun | null> {
  const cached = await d.runtimeCached.catch(() => false);
  if (!gpuStartsAtOpen(d.mode, cached)) await d.firstAnswer();
  return d.start();
}

/**
 * The scanner's WebGPU embedder, the production scanner's (`frame-reader.ts`) and the scan lab's alike: started as
 * `mode` says, from the embedder's bytes `model` answers at that moment (null once the scanner let them go), with every
 * fallback `startGpuEmbedder` keeps (no adapter, a load that fails or times out, a scanner closed mid-load).
 */
export function scannerGpuEmbedder(opts: {
  mode: GpuStartMode;
  runtimeCached?: Promise<boolean>;
  model: () => Promise<Uint8Array> | null;
  hold: (s: OrtSession) => OrtSession;
  infer: Run;
  alive: () => boolean;
}): Promise<EmbedRun | null> {
  const adapter = gpuAdapter();
  return scheduleGpuEmbedder({
    mode: opts.mode,
    runtimeCached: opts.runtimeCached ?? gpuRuntimeCached(),
    firstAnswer: () => whenScanMarked("scan:answer-drawn"),
    start: async () => {
      const model = opts.model();
      if (!model || !opts.alive()) return null;
      return startGpuEmbedder({
        adapter: async () => (await adapter).gpu,
        load: () => loadGpuEmbedder(model, opts.hold, opts.infer, opts.alive),
        alive: opts.alive,
      });
    },
  });
}
