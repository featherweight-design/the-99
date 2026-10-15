import { isUuid } from "../uuid";

/**
 * One ✓/✗ tap on the card-scan lab, checked field by field before it is stored. The frame is
 * optional and present only when the player pressed "keep this frame": a base64 JPEG of the warped
 * card, capped so a lab tap can never carry more than one small image.
 */
export const MAX_FRAME_BYTES = 400_000;
/** The request body: the frame as base64 (4/3 of its bytes) plus the fields. */
export const MAX_RESULT_BODY = Math.ceil((MAX_FRAME_BYTES * 4) / 3) + 4_000;

export type ScanLabResult = {
  guessOracleId: string | null;
  correct: boolean;
  score: number | null;
  margin: number | null;
  latencyMs: number;
  detectorMs: number | null;
  embedMs: number | null;
  matchMs: number | null;
  agreedFrames: number;
  indexVersion: string;
  frame: Buffer | null;
  changedMsBeforeTap: number | null;
  shownOracleId: string | null;
};

const ms = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 && v < 600_000 ? Math.round(v) : null;
const unit = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) && v >= -1 && v <= 1 ? v : null;

export function parseResult(raw: unknown): ScanLabResult | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const guess = r.guessOracleId;
  if (guess !== null && !(typeof guess === "string" && isUuid(guess))) return null;
  if (typeof r.correct !== "boolean") return null;
  const latencyMs = ms(r.latencyMs);
  if (latencyMs === null) return null;
  if (typeof r.indexVersion !== "string" || !/^[\w.-]{1,40}$/.test(r.indexVersion)) return null;
  const agreed = r.agreedFrames;
  if (typeof agreed !== "number" || !Number.isInteger(agreed) || agreed < 0 || agreed > 100) return null;
  // Both optional, so a tap from a page loaded before they existed still saves (as a row with neither).
  const shown = r.shownOracleId ?? null;
  if (shown !== null && !(typeof shown === "string" && isUuid(shown))) return null;
  let frame: Buffer | null = null;
  if (r.frame !== undefined && r.frame !== null) {
    if (typeof r.frame !== "string" || !/^[A-Za-z0-9+/]+={0,2}$/.test(r.frame)) return null;
    frame = Buffer.from(r.frame, "base64");
    // a JPEG and nothing else: SOI marker first, and under the cap
    if (frame.length > MAX_FRAME_BYTES || frame.length < 4 || frame[0] !== 0xff || frame[1] !== 0xd8) return null;
  }
  return {
    guessOracleId: guess as string | null,
    correct: r.correct,
    score: unit(r.score),
    margin: unit(r.margin),
    latencyMs,
    detectorMs: ms(r.detectorMs),
    embedMs: ms(r.embedMs),
    matchMs: ms(r.matchMs),
    agreedFrames: agreed,
    indexVersion: r.indexVersion,
    frame,
    changedMsBeforeTap: ms(r.changedMsBeforeTap),
    shownOracleId: shown as string | null,
  };
}
