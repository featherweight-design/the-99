/**
 * What the scanner's screen shows, as data (card-scan PR 3, handoff V1–V9, D6, D7, R1–R2, W2, W3, W6). The hook that
 * composes the camera, the detector, the embedder and the server's answer (PR 3's wiring, on `src/lib/scan`) produces
 * one of these per frame; `ScannerView` draws it and holds no state of its own beyond the press.
 */

/** A card the server named, as the panel draws it. */
export type ScanGuess = { oracleId: string; name: string; typeLine: string; imageUri: string | null };

/** The result panel. A name never shows before three answers agree (`unsure`), and a sure answer the list already
 * holds says so: `duplicate` while the card never left the frame, `second` once it did. */
export type ScanPanel =
  | { kind: "looking" }
  | { kind: "unsure"; agreeing: 0 | 1 | 2 }
  | { kind: "sure"; guess: ScanGuess; held: boolean; again: null | { kind: "duplicate" | "second"; count: number } }
  | { kind: "added"; name: string }
  | { kind: "notSure"; guesses: ScanGuess[]; sleeves: boolean };

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
  if (p.kind === "sure" || torchOn) return "ok";
  // A dark frame is being read even before a card settles (V7, V8): the outline lights.
  if (screen.dark) return "lit";
  if (p.kind === "unsure") return p.agreeing === 0 ? "dash" : "lit";
  if (p.kind === "notSure") return "lit";
  return "dash";
}
