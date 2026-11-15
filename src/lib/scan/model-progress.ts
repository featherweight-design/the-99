// The scanner's model load as the loading panel reads it (card-scan addendum "the scanner while it gets ready",
// READINESS items 1-3, 6 and 8). The model files are shared by every scanner on the page (`loadModelBytes`), so their
// progress lives here, beside them, not in a component: a scanner closed mid-download and opened again reads the same
// download's real progress. Only the two model files report here, and only for a load that asks to (the scanner's);
// the WebGPU runtime's download (`webgpu.ts`) and the scan lab's loads never do.
import type { ModelProgress } from "./model-cache";

export type ModelName = "detector" | "embedder";

/**
 * One file's load: `probe` until its cache lookup answers, then `cache` or `network`; `done` once its bytes are in and
 * checked, `failed` once its load gave up (the next frame starts it again). `keeps`: false when the download cannot be
 * kept in Cache Storage (none, or it would not open), so the next open downloads it again.
 */
export type FileLoad = { from: "probe" | "cache" | "network"; loaded: number; total: number | null; done: boolean; failed: boolean; keeps: boolean };

/** The files' loads, as a snapshot. `cacheless`: a download this time can't be kept, so "After that it opens in a moment" would be untrue. */
export type ModelLoad = { files: Record<ModelName, FileLoad>; cacheless: boolean };

/** How often byte counts reach the panel: a few times a second is enough for a bar, and spares the renders. */
export const PROGRESS_EVERY_MS = 250;

const PROBE: FileLoad = { from: "probe", loaded: 0, total: null, done: false, failed: false, keeps: true };

let latest: ModelLoad | null = null;
let published: ModelLoad | null = null;
let lastAt = -Infinity;
let trailing: ReturnType<typeof setTimeout> | null = null;
let holders = 0;
const generation: Record<ModelName, number> = { detector: 0, embedder: 0 };
const listeners = new Set<() => void>();

function publish() {
  if (trailing) clearTimeout(trailing);
  trailing = null;
  published = latest;
  lastAt = performance.now();
  for (const l of listeners) l();
}

/** A change of state (a file found cached, a download starting, ending or failing) is told at once; byte counts are throttled. */
function changed(urgent: boolean) {
  if (urgent || performance.now() - lastAt >= PROGRESS_EVERY_MS) return publish();
  trailing ??= setTimeout(publish, Math.max(0, lastAt + PROGRESS_EVERY_MS - performance.now()));
}

const pending = (l: ModelLoad) => Object.values(l.files).some((f) => !f.done && !f.failed);

/** With no scanner reading it and nothing still loading, the snapshot is let go: the next open starts from nothing. */
function dropIfIdle() {
  if (holders > 0 || !latest || pending(latest)) return;
  latest = null;
  publish();
}

function setFile(name: ModelName, file: FileLoad, urgent: boolean) {
  const files = { ...(latest?.files ?? { detector: PROBE, embedder: PROBE }), [name]: file };
  latest = { files, cacheless: Object.values(files).some((f) => f.from === "network" && !f.keeps) };
  changed(urgent);
}

/** The files' progress, for `useSyncExternalStore`: null when no file is loading and no scanner holds the last load. */
export const scanModelLoad = {
  subscribe(fn: () => void): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  get(): ModelLoad | null {
    return published;
  },
};

/** A scanner reading the load holds it, so a load that finished stays in view (loading L2) until the scanner closes. */
export function holdModelLoad(): () => void {
  holders += 1;
  let held = true;
  return () => {
    if (!held) return;
    held = false;
    holders -= 1;
    dropIfIdle();
  };
}

/**
 * Starts tracking a new load of one file, replacing its last: `report` is the file's `onProgress`, and `settle(ok)`
 * marks its end. Reports from a load since replaced are dropped. A file that was downloading starts again as a
 * download at 0 (READINESS 6: a retry stays loading L1 with its fresh progress, never a flash of loading L4).
 */
export function trackModelFile(name: ModelName) {
  const id = ++generation[name];
  const live = () => generation[name] === id;
  const was = latest?.files[name];
  setFile(name, was?.from === "network" ? { ...PROBE, from: "network", total: was.total, keeps: was.keeps } : PROBE, true);
  return {
    report(p: ModelProgress) {
      if (!live() || !latest) return;
      const file = latest.files[name];
      if (p.from === "cache") return setFile(name, { ...file, from: "cache" }, true);
      setFile(name, { ...file, from: "network", loaded: p.loaded, total: p.total, keeps: p.keeps }, file.from !== "network" || p.loaded === 0);
    },
    settle(ok: boolean) {
      if (!live() || !latest) return;
      setFile(name, { ...latest.files[name], done: ok, failed: !ok }, true);
      dropIfIdle();
    },
  };
}

/** Test seam: forgets every load and holder, as a fresh page. */
export function resetModelLoad() {
  if (trailing) clearTimeout(trailing);
  trailing = null;
  latest = published = null;
  lastAt = -Infinity;
  holders = 0;
}
