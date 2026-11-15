// The scanner's start-up marks (lane 58, 2026-11-13): `performance.mark`s from the scanner opening to its first answer
// drawn, so a DevTools performance trace or `performance.getEntriesByType("mark")` shows where the first scan's wait
// goes. Each is marked once per scanner open (or scan lab start); `resetScanMarks` clears them as one begins.

export const SCAN_MARKS = [
  "scan:open",
  "scan:camera",
  "scan:ort",
  "scan:detector-model",
  "scan:embedder-model",
  "scan:detector-session",
  "scan:embedder-session",
  "scan:ready",
  // The WebGPU embedder (`webgpu.ts`): its runtime's bytes in, the embedder switched over, or WebGPU let go (`stage`).
  // `webgpu-none` is a device with no adapter, so `webgpu-off` only ever marks a real fallback.
  "scan:webgpu-runtime",
  "scan:webgpu-embedder",
  "scan:webgpu-none",
  "scan:webgpu-off",
  "scan:first-detect",
  "scan:lookup-sent",
  "scan:lookup-answered",
  "scan:answer-drawn",
] as const;

export type ScanMark = (typeof SCAN_MARKS)[number];

function perf(): Performance | null {
  return typeof performance !== "undefined" && typeof performance.mark === "function" ? performance : null;
}

// What this open already marked, so a mark called on every frame costs a Set lookup, not a timeline query.
const marked = new Set<ScanMark>();
// Who waits on a mark (`whenScanMarked`), answered as it is made.
const waiting = new Map<ScanMark, (() => void)[]>();

export function resetScanMarks(): void {
  marked.clear();
  // A wait left by the last open (its scanner closed before the mark) is dropped, never answered by this open's mark.
  waiting.clear();
  const p = perf();
  if (!p) return;
  for (const m of SCAN_MARKS) p.clearMarks(m);
}

/** Marks `name` unless this scanner open already did; `detail` rides on the mark (a model's source and size). */
export function scanMark(name: ScanMark, detail?: Record<string, unknown>): void {
  if (marked.has(name)) return;
  marked.add(name);
  const waiters = waiting.get(name);
  waiting.delete(name);
  waiters?.forEach((w) => w());
  const p = perf();
  if (!p) return;
  try {
    p.mark(name, detail ? { detail } : undefined);
  } catch {
    // a test DOM without user timing
  }
}

/** Whether this scanner open already marked `name`. */
export function isScanMarked(name: ScanMark): boolean {
  return marked.has(name);
}

/** Settles once `name` is marked in this scanner open, at once when it already is. */
export function whenScanMarked(name: ScanMark): Promise<void> {
  if (marked.has(name)) return Promise.resolve();
  return new Promise((resolve) => waiting.set(name, [...(waiting.get(name) ?? []), resolve]));
}
