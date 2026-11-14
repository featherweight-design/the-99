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

export function resetScanMarks(): void {
  const p = perf();
  if (!p) return;
  for (const m of SCAN_MARKS) p.clearMarks(m);
}

/** Marks `name` unless this scanner open already did; `detail` rides on the mark (a model's source and size). */
export function scanMark(name: ScanMark, detail?: Record<string, unknown>): void {
  const p = perf();
  if (!p) return;
  try {
    if (p.getEntriesByName(name, "mark").length) return;
    p.mark(name, detail ? { detail } : undefined);
  } catch {
    // a test DOM without user timing
  }
}
