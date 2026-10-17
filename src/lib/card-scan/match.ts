/**
 * Server matching for card scanning (plan `2026-10-16-card-scan.md`), the pure half. The phone sends the embedder's
 * fingerprint of a card; the server answers with up to three guesses, one per CARD (oracle), each scored by the
 * best row of that card (a row is one printing's face). These are the rules `POST /api/card-scan/match` and the
 * ingest share: the fingerprint's shape, how it is decoded, and how rows become guesses and a margin. Client-safe:
 * the scanner imports `SCAN_MODEL` and `EMBED_DIM` from here rather than restating them.
 */

/** The embedder build every row of the index was made by, exactly as `export_index.py` stamps `meta.model`. */
export const SCAN_MODEL = "dhvazquez/mtg_card_identification_embeddings@653d88d fp32";
/** Values per fingerprint. */
export const EMBED_DIM = 256;
/** Guesses per answer. */
export const MAX_GUESSES = 3;
/** Scored printings carried per guess: enough for the scanner's short list, and a small answer. */
export const MAX_PRINTINGS = 6;
/** How far from unit length a fingerprint may be: the client normalises, so more is a different input. */
export const NORM_TOLERANCE = 0.01;

/**
 * The fingerprint from its base64 (256 little-endian float32), or null when it is not one: the wrong length, a
 * non-finite value, or a norm outside 1 ± `NORM_TOLERANCE`.
 */
export function decodeEmbedding(b64: unknown): Float32Array | null {
  if (typeof b64 !== "string" || b64.length > 2048) return null;
  let bin: string;
  try {
    bin = atob(b64);
  } catch {
    return null;
  }
  if (bin.length !== EMBED_DIM * 4) return null;
  const view = new DataView(Uint8Array.from(bin, (c) => c.charCodeAt(0)).buffer);
  const v = new Float32Array(EMBED_DIM);
  let norm = 0;
  for (let i = 0; i < EMBED_DIM; i++) {
    const x = view.getFloat32(i * 4, true);
    if (!Number.isFinite(x)) return null;
    v[i] = x;
    norm += x * x;
  }
  return Math.abs(Math.sqrt(norm) - 1) <= NORM_TOLERANCE ? v : null;
}

/** pgvector's text form of a vector, for a parameter cast to `halfvec`. */
export function vectorLiteral(v: Float32Array): string {
  return `[${Array.from(v).join(",")}]`;
}

/**
 * One nearest row, as the query returns it: the row's card, printing and cosine DISTANCE (pgvector's `<=>`), with
 * what the scanner draws for it: the card's type line and that printing's image (the card's own when the printing
 * has none).
 */
export type NearRow = { oracleId: string; name: string; scryfallId: string; typeLine: string; imageUri: string | null; distance: number };

/** One printing of a guess's card, scored by its nearest face. */
export type ScoredPrinting = { scryfallId: string; score: number };

/**
 * A guess: its card, the best row's printing and image, the card's score, and `printings`, the card's printings the
 * index found near the fingerprint, best first, each once, at most `MAX_PRINTINGS`.
 */
export type Guess = {
  oracleId: string; name: string; scryfallId: string; typeLine: string; imageUri: string | null; score: number;
  printings: ScoredPrinting[];
};

export type MatchAnswer = { guesses: Guess[]; margin: number | null };

/**
 * Rows to guesses: one per card, its best row, best first, at most `MAX_GUESSES`. The score is cosine similarity
 * (1 minus the distance), clamped to [-1, 1] as the lab clamps it, since a halfvec row is not exactly unit length.
 * `margin` is the first score minus the second, null with fewer than two guesses.
 */
export function poolGuesses(rows: NearRow[], near: ReadonlyMap<string, readonly PrintingRow[]> = new Map()): MatchAnswer {
  const best = new Map<string, Guess>();
  for (const r of rows) {
    const score = similarity(r.distance);
    const prev = best.get(r.oracleId);
    if (!prev || score > prev.score) {
      best.set(r.oracleId, { oracleId: r.oracleId, name: r.name, scryfallId: r.scryfallId, typeLine: r.typeLine, imageUri: r.imageUri, score, printings: [] });
    }
  }
  for (const g of best.values()) g.printings = scorePrintings(g, near.get(g.oracleId) ?? []);
  const guesses = [...best.values()].sort((a, b) => b.score - a.score).slice(0, MAX_GUESSES);
  return { guesses, margin: guesses.length >= 2 ? guesses[0].score - guesses[1].score : null };
}

/** One of a card's rows near the fingerprint: a printing's face and its cosine distance. */
export type PrintingRow = { scryfallId: string; distance: number };

/** Cosine similarity from pgvector's distance, clamped as the guesses are. */
function similarity(distance: number): number {
  return Math.min(1, Math.max(-1, 1 - distance));
}

/**
 * A guess's printings: its own printing and every printing among `rows`, each scored by its nearest face, best first,
 * at most `MAX_PRINTINGS`.
 */
export function scorePrintings(guess: { scryfallId: string; score: number }, rows: readonly PrintingRow[]): ScoredPrinting[] {
  const byId = new Map<string, number>([[guess.scryfallId, guess.score]]);
  for (const r of rows) {
    const score = similarity(r.distance);
    if (score > (byId.get(r.scryfallId) ?? -Infinity)) byId.set(r.scryfallId, score);
  }
  return [...byId].map(([scryfallId, score]) => ({ scryfallId, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_PRINTINGS);
}
