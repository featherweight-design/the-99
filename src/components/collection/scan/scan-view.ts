import type { ScoredPrinting } from "../../../lib/card-scan/match";
/**
 * What the scanner's screen shows, as data (card-scan PR 3, handoff V1–V9, D6, D7, R1–R2, W2, W3, W6). The hook that
 * composes the camera, the detector, the embedder and the server's answer (PR 3's wiring, on `src/lib/scan`) produces
 * one of these per frame; `ScannerView` draws it and holds no state of its own beyond the press.
 */

import type { PrintingChoice } from "../../../lib/collection/catalog-read";

/** A card the server named, as the panel draws it. */
/** `printings`: the card's printings the server scored near the scan, best first (`Guess.printings`); empty from a
 * server built before it, or a guess that did not come from the camera. */
export type ScanGuess = { oracleId: string; name: string; typeLine: string; imageUri: string | null; printings?: readonly ScoredPrinting[] };

/** The result panel. A name never shows before three answers agree (`unsure`), and a sure answer the list already
 * holds says so: `duplicate` while the card never left the frame, `second` once it did. */
export type ScanPanel =
  | { kind: "looking" }
  | { kind: "unsure"; agreeing: 0 | 1 | 2 }
  | { kind: "sure"; guess: ScanGuess; held: boolean; again: null | { kind: "duplicate" | "second"; count: number } }
  | { kind: "added"; name: string }
  | { kind: "notSure"; guesses: ScanGuess[]; sleeves: boolean }
  /**
   * Normal mode's printing step, in the camera (Hugh, 2026-10-16): the card read, and its printings once they load
   * (`null` while they do). Picking one puts the card on the list at that printing.
   */
  | { kind: "choose"; guess: ScanGuess; choices: PrintingChoice[] | null };

export type ScanScreen =
  | { kind: "blocked" }
  | { kind: "scanning"; panel: ScanPanel; dark: boolean };

export type ScanMode = "fast" | "normal";

/** The phone's light: `available` false where the camera offers no torch (iOS), and then no control is drawn. */
export type ScanTorch = { available: boolean; on: boolean };

/**
 * Which of the three looks the card's outline takes: dashed while the card is only being looked at (seen, not yet
 * steady), lit while answers agree, and ok on a read. With no card in view there is no outline at all.
 */
export function outlineLook(screen: ScanScreen, torchOn = false): "dash" | "lit" | "ok" {
  if (screen.kind !== "scanning") return "dash";
  const p = screen.panel;
  // The light on (V9) reads green, as a sure answer does.
  if (p.kind === "sure" || p.kind === "choose" || torchOn) return "ok";
  // A dark frame is being read even before a card settles (V7, V8): the outline lights.
  if (screen.dark) return "lit";
  if (p.kind === "unsure") return p.agreeing === 0 ? "dash" : "lit";
  if (p.kind === "notSure") return "lit";
  return "dash";
}

/** The printing step's tile picture: Scryfall's small image, enough for a tile at a fraction of the bytes. */
export function scanThumb(src: string): string {
  return src.replace("/normal/", "/small/");
}
