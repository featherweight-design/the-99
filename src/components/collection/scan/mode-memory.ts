import type { ScanMode } from "./scan-view";

/** Auto or Normal, remembered per device (handoff: "remembered per device"). Auto when nothing is kept, or the
 * storage cannot be read (a private window, blocked site data). */
export const MODE_KEY = "the99.scan.mode";

export function readScanMode(store: Pick<Storage, "getItem"> | null): ScanMode {
  try {
    return store?.getItem(MODE_KEY) === "normal" ? "normal" : "fast";
  } catch {
    return "fast";
  }
}

export function writeScanMode(store: Pick<Storage, "setItem"> | null, mode: ScanMode): void {
  try {
    store?.setItem(MODE_KEY, mode);
  } catch {
    // A device that keeps nothing starts at Auto next time; the scan itself is unaffected.
  }
}
