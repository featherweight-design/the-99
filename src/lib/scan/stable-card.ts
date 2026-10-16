// When a scanner that matches on the server asks the server: once per STABLE card, never per frame. Stability is the
// card's own embedding agreeing with itself frame to frame (`sameCard`) for the shared dwell (`track.ts`); the
// server is asked when the settled reading becomes a card, and not again while that card stays. A frame with no card
// is a reading like any other: when "no card" settles the frame is EMPTY, and the next card to settle is a new scan,
// even the same card again (a second copy). A card that replaces another without the frame emptying is a new scan
// too (a re-scan of a different card).
import { nextTrack, startTrack, type Tracked } from "./track";

/** The cosine two embeddings of one physical card clear frame to frame. A different card scores well under it. */
export const SAME_CARD_COSINE = 0.85;

export type ScanFrame = { kind: "card"; embedding: Float32Array } | { kind: "none" };

export function cosine(a: Float32Array, b: Float32Array): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

/** Two frames read the same: both empty, or both a card whose (L2-normalised) embeddings agree. */
export function sameCard(a: ScanFrame, b: ScanFrame): boolean {
  if (a.kind === "none" || b.kind === "none") return a.kind === b.kind;
  return cosine(a.embedding, b.embedding) >= SAME_CARD_COSINE;
}

export type StableScan = Tracked<ScanFrame>;
export type ScanEvent = { kind: "lookup"; embedding: Float32Array } | { kind: "empty" } | null;

export const startStableScan = (now: number): StableScan => startTrack<ScanFrame>(now);

/**
 * The scan after one more frame, and what it asks for: `lookup` once when a card settles (with that frame's
 * embedding), `empty` once when "no card" settles. Every other frame asks nothing. Pure.
 */
export function nextStableScan(s: StableScan, f: ScanFrame, now: number): { scan: StableScan; event: ScanEvent } {
  const scan = nextTrack(s, f, now, sameCard);
  if (scan.changedAt === s.changedAt || scan.value === null) return { scan, event: null };
  return { scan, event: scan.value.kind === "card" ? { kind: "lookup", embedding: scan.value.embedding } : { kind: "empty" } };
}
