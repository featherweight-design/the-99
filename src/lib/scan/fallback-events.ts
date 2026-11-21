// Production telemetry for the card scanner's fallbacks (lane 9b, 2026-11-21): until now only the scan lab's row saw
// them. A fallback is already a start-up mark, made once per scanner open (`marks.ts`), so this reads the marks rather
// than touching the code that makes them. Three marks are fallbacks:
//   scan:reader       with `path: "main"`: the read worker was never used (`reason`: why, a `ReaderReason`)
//   scan:reader-off   the worker was let go mid-session (`stage`: a `ReaderReason`)
//   scan:webgpu-off   the WebGPU embedder was let go (`stage`: load or run), so frames embed on WASM
// `scan:webgpu-none` (no adapter) is a device without WebGPU, not a fallback, and is not sent.
// Each event carries the kind, the two paths and a reason class from a closed set: relayed worker details are checked
// against it, so no free text can ride along. At most one event per kind per page session.

import { READER_REASONS } from "./read-worker-protocol";
import type { ScanMark } from "./marks";

export type ScanFallback = {
  kind: "reader" | "webgpu";
  from: "worker" | "webgpu";
  to: "main" | "wasm";
  reason: string;
};

const GPU_STAGES: readonly string[] = ["load", "run"];

/** The fallback a mark is, or null for any other mark (or a detail outside the closed set). Pure. */
export function fallbackOf(name: ScanMark, detail?: Record<string, unknown>): ScanFallback | null {
  const reasons: readonly string[] = READER_REASONS;
  if (name === "scan:reader" && detail?.path === "main") {
    return typeof detail.reason === "string" && reasons.includes(detail.reason)
      ? { kind: "reader", from: "worker", to: "main", reason: detail.reason }
      : null;
  }
  if (name === "scan:reader-off") {
    return typeof detail?.stage === "string" && reasons.includes(detail.stage)
      ? { kind: "reader", from: "worker", to: "main", reason: detail.stage }
      : null;
  }
  if (name === "scan:webgpu-off") {
    return typeof detail?.stage === "string" && GPU_STAGES.includes(detail.stage)
      ? { kind: "webgpu", from: "webgpu", to: "wasm", reason: detail.stage }
      : null;
  }
  return null;
}

/** A mark listener that sends each fallback kind once for as long as it lives (one page session). */
export function fallbackReporter(send: (e: ScanFallback) => void) {
  const sent = new Set<ScanFallback["kind"]>();
  return (name: ScanMark, detail?: Record<string, unknown>) => {
    const e = fallbackOf(name, detail);
    if (!e || sent.has(e.kind)) return;
    sent.add(e.kind);
    send(e);
  };
}
