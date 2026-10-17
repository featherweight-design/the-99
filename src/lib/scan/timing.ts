/**
 * The scanner's timing row (card-scan speed work, 2026-10-16): one per scan session, what the scanner made the player
 * wait for, posted when the scanner closes and logged by `POST /api/card-scan/timing` as one `[scan-timing]` line,
 * behind the scan lab's plumbing switch `SCAN_LAB_ENABLED` (staging only). Shared by the recorder that builds it and the route
 * that checks it, field by field: a closed enum, bounded integers and bounded lists of them. No id and no card name.
 *
 * - `guess`: from the first frame that held a card to the scanner's answer for it (the frame's own read included).
 * - `add`: from an add starting (by itself, or a press) to the card being on the list.
 * - `mode`: from a Fast/Normal press to the next frame the scanner read.
 * - `review`: from the Review press to the frame after the sheet's list was drawn.
 * - `read`: one frame's detector and embedder, the median of the session's frames.
 */

/** The largest body the route reads. A full row is about 1KB. */
export const MAX_TIMING_BYTES = 4_096;
/** Samples kept per list: a session longer than this keeps its first ones. */
export const MAX_SAMPLES = 40;
/** The longest wait recorded; anything past it is a scanner left open, not a wait. */
export const MAX_MS = 60_000;
const MAX_FRAMES = 100_000;

export const LAYOUTS = ["phone", "desk"] as const;

export type ScanTimingRow = {
  layout: (typeof LAYOUTS)[number];
  frames: number;
  read: number | null;
  guess: number[];
  add: number[];
  mode: number[];
  review: number | null;
};

const isMs = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= MAX_MS;
const isList = (v: unknown): v is number[] => Array.isArray(v) && v.length <= MAX_SAMPLES && v.every(isMs);

/** The row the route logs, or null when any field is not what the recorder writes. Pure. */
export function parseScanTiming(raw: unknown): ScanTimingRow | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (Object.keys(r).length !== 7) return null;
  if (!LAYOUTS.includes(r.layout as ScanTimingRow["layout"])) return null;
  if (!Number.isInteger(r.frames) || (r.frames as number) < 0 || (r.frames as number) > MAX_FRAMES) return null;
  if (r.read !== null && !isMs(r.read)) return null;
  if (r.review !== null && !isMs(r.review)) return null;
  if (!isList(r.guess) || !isList(r.add) || !isList(r.mode)) return null;
  return {
    layout: r.layout as ScanTimingRow["layout"], frames: r.frames as number, read: r.read as number | null,
    guess: r.guess, add: r.add, mode: r.mode, review: r.review as number | null,
  };
}

const list = (v: number[]) => (v.length ? v.join(",") : "-");

/** `[scan-timing] layout=phone frames=84 read=410 guess=2900,3100 add=1900 mode=- review=950`. Pure. */
export function scanTimingLine(r: ScanTimingRow): string {
  return `[scan-timing] layout=${r.layout} frames=${r.frames} read=${r.read ?? "-"} guess=${list(r.guess)} add=${list(r.add)} mode=${list(r.mode)} review=${r.review ?? "-"}`;
}

export function median(v: number[]): number | null {
  if (!v.length) return null;
  const s = [...v].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

/**
 * One session's recorder. The scanner calls it as things happen; `row` is the session so far, null when the scanner
 * read no frame (it never got a camera). Each mark is a `performance.now()` time from the caller's own clock.
 */
/** The read median is kept as a histogram of `READ_BUCKET_MS` buckets, the last one taking every slower read, so a
 * session of any length is counted whole in fixed memory. */
export const READ_BUCKET_MS = 10;
const READ_BUCKETS = 500;

export function scanTimer(layout: ScanTimingRow["layout"]) {
  const reads = new Array<number>(READ_BUCKETS).fill(0);
  const guess: number[] = [];
  const add: number[] = [];
  const mode: number[] = [];
  let frames = 0;
  let review: number | null = null;
  let cardSince: number | null = null;
  let guessed = false;
  let modeAt: number | null = null;
  const keep = (into: number[], ms: number) => {
    if (into.length < MAX_SAMPLES) into.push(Math.min(MAX_MS, Math.max(0, Math.round(ms))));
  };
  return {
    /** A frame was read: it began at `start`, ended at `end`, and held a card or did not. */
    frame(start: number, end: number, card: boolean) {
      frames++;
      reads[Math.min(READ_BUCKETS - 1, Math.max(0, Math.floor((end - start) / READ_BUCKET_MS)))]++;
      if (modeAt !== null) {
        keep(mode, end - modeAt);
        modeAt = null;
      }
      if (card && cardSince === null && !guessed) cardSince = start;
    },
    /** The scanner settled on an empty frame (its own tracker's empty event, never one missed frame): the next card in
     * is a new wait. */
    emptied() {
      cardSince = null;
      guessed = false;
    },
    /** The scanner's answer for the card in view is on screen. Counted once per card in view: a card that replaces
     * another without the frame emptying is not timed, since nothing marks when it came in. */
    answered(at: number) {
      if (cardSince === null || guessed) return;
      guessed = true;
      keep(guess, at - cardSince);
    },
    added(startedAt: number, at: number) {
      keep(add, at - startedAt);
    },
    modePressed(at: number) {
      modeAt = at;
    },
    reviewed(ms: number) {
      review = Math.min(MAX_MS, Math.max(0, Math.round(ms)));
    },
    row(): ScanTimingRow | null {
      if (frames === 0) return null;
      return { layout, frames, read: histogramMedian(reads), guess: [...guess], add: [...add], mode: [...mode], review };
    },
  };
}

export type ScanTimer = ReturnType<typeof scanTimer>;

/** The median of a read histogram, as the middle of its bucket. */
function histogramMedian(counts: number[]): number | null {
  const total = counts.reduce((a, b) => a + b, 0);
  if (!total) return null;
  let seen = 0;
  for (let i = 0; i < counts.length; i++) {
    seen += counts[i];
    if (seen * 2 >= total) return Math.min(MAX_MS, i * READ_BUCKET_MS + READ_BUCKET_MS / 2);
  }
  return null;
}
