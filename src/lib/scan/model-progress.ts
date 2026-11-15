// The scanner's model load as the loading panel reads it (card-scan addendum "the scanner while it gets ready",
// READINESS items 1-3 and 8). One load is shared by every scanner on the page (`loadModelBytes`), so its progress lives
// here, beside it, not in a component: a scanner closed mid-download and opened again reads the same load's real
// progress. Only the two model files report here; the WebGPU runtime's download (`webgpu.ts`) never does.
import type { ModelProgress } from "./model-cache";

export type ModelName = "detector" | "embedder";

/** One file's load: `probe` until its cache lookup answers, then `cache` or `network`; `done` once its bytes are in and checked. */
export type FileLoad = { from: "probe" | "cache" | "network"; loaded: number; total: number | null; done: boolean };

/**
 * The shared load, as a snapshot. `cacheless`: the page has no Cache Storage (some private windows), so every open
 * downloads again and the panel's "After that it opens in a moment" would be untrue. `settled`: both files' loads
 * have finished, either way.
 */
export type ModelLoad = { id: number; files: Record<ModelName, FileLoad>; cacheless: boolean; settled: boolean };

/** How often byte counts reach the panel: a few times a second is enough for a bar, and spares the renders. */
export const PROGRESS_EVERY_MS = 250;

const PROBE: FileLoad = { from: "probe", loaded: 0, total: null, done: false };

let latest: ModelLoad | null = null;
let published: ModelLoad | null = null;
let lastAt = -Infinity;
let trailing: ReturnType<typeof setTimeout> | null = null;
let seq = 0;
const listeners = new Set<() => void>();

function publish() {
  if (trailing) clearTimeout(trailing);
  trailing = null;
  published = latest;
  lastAt = performance.now();
  for (const l of listeners) l();
}

/** A change of state (a file found cached, a download starting or finishing) is told at once; byte counts are throttled. */
function changed(urgent: boolean) {
  if (urgent || performance.now() - lastAt >= PROGRESS_EVERY_MS) return publish();
  trailing ??= setTimeout(publish, Math.max(0, lastAt + PROGRESS_EVERY_MS - performance.now()));
}

/** The shared load's progress, for `useSyncExternalStore`: null before any scanner on the page has loaded. */
export const scanModelLoad = {
  subscribe(fn: () => void): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  get(): ModelLoad | null {
    return published;
  },
};

/**
 * Starts tracking a new shared load, replacing the last one: `report(name)` is the file's `onProgress`, and
 * `settle(name, ok)` marks its end. Reports from a load that was since replaced are dropped.
 */
export function startModelLoad(cacheless: boolean) {
  const id = ++seq;
  latest = { id, files: { detector: PROBE, embedder: PROBE }, cacheless, settled: false };
  publish();
  const live = () => latest?.id === id;
  const update = (name: ModelName, file: Partial<FileLoad>, urgent: boolean) => {
    if (!latest || !live()) return;
    const files = { ...latest.files, [name]: { ...latest.files[name], ...file } };
    latest = { ...latest, files };
    changed(urgent);
  };
  let open = 2;
  return {
    report: (name: ModelName) => (p: ModelProgress) => {
      const was = latest?.files[name].from;
      if (p.from === "cache") update(name, { from: "cache" }, true);
      else update(name, { from: "network", loaded: p.loaded, total: p.total }, was !== "network");
    },
    settle(name: ModelName, ok: boolean) {
      if (!latest || !live()) return;
      open -= 1;
      if (ok) latest = { ...latest, files: { ...latest.files, [name]: { ...latest.files[name], done: true } } };
      if (open === 0) latest = { ...latest, settled: true };
      changed(true);
    },
  };
}

/** Test seam: forgets every load, as a fresh page. */
export function resetModelLoad() {
  if (trailing) clearTimeout(trailing);
  trailing = null;
  latest = published = null;
  lastAt = -Infinity;
}
