// The scanner's start-up marks (lane 58, 2026-11-13): `performance.mark`s from the scanner opening to its first answer
// drawn, so a DevTools performance trace or `performance.getEntriesByType("mark")` shows where the first scan's wait
// goes. Each is marked once per scanner open; `resetScanMarks` clears them as a scanner opens.

export const SCAN_MARKS = [
  "scan:open",
  "scan:camera",
  "scan:ort",
  "scan:detector-model",
  "scan:embedder-model",
  "scan:detector-session",
  "scan:embedder-session",
  "scan:ready",
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

export function resetScanMarks(): void {
  marked.clear();
  const p = perf();
  if (!p) return;
  for (const m of SCAN_MARKS) p.clearMarks(m);
}

/** Marks `name` unless this scanner open already did; `detail` rides on the mark (a model's source and size). */
export function scanMark(name: ScanMark, detail?: Record<string, unknown>): void {
  if (marked.has(name)) return;
  marked.add(name);
  const p = perf();
  if (!p) return;
  try {
    p.mark(name, detail ? { detail } : undefined);
  } catch {
    // a test DOM without user timing
  }
}
