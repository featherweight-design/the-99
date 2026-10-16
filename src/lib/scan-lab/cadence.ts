import { isUuid } from "../uuid";
import type { Reading } from "./reading";
import type { Display } from "./steady";

// The lab's cadence log: with "Log every frame" on, the lab records what each frame read, and what the screen showed,
// for `CADENCE_MS` without a tap, so low-light flicker and the dwell can be measured over time rather than at the one
// frame a player tapped (research report, Real photos, 2026-10-16). Readings only: no frame is ever kept in this mode.

/** How long one run logs. */
export const CADENCE_MS = 30_000;
/** At most one frame per this many ms, so a fast device logs at a fixed rate rather than as fast as it reads. */
export const CADENCE_GAP_MS = 200;
/** The most frames one run may hold: 30s at one per 200ms. */
export const MAX_CADENCE_FRAMES = CADENCE_MS / CADENCE_GAP_MS;
/** The request body cap: a frame is under 300 bytes of JSON. */
export const MAX_CADENCE_BODY = 160_000;

export type CadenceFrame = {
  /** ms since the run began. */
  t: number;
  /** The camera's own top 3 for this frame; empty when no card was in view. */
  top: { oracleId: string; score: number }[];
  /** Top-1 over the runner-up; null with no card. */
  margin: number | null;
  /** The card the screen showed at this frame (the steady display); null when it showed no card or was unsure. */
  shown: string | null;
  /** The screen said it was unsure. */
  unsure: boolean;
};

export type CadenceRun = { startedAt: number; lastAt: number; frames: CadenceFrame[] };

export function startCadence(now: number): CadenceRun {
  return { startedAt: now, lastAt: -Infinity, frames: [] };
}

/** Whether the run's time is up. */
export function cadenceDone(run: CadenceRun, now: number): boolean {
  return now - run.startedAt >= CADENCE_MS || run.frames.length >= MAX_CADENCE_FRAMES;
}

/** The run with this frame logged, or unchanged when it came sooner than `CADENCE_GAP_MS` after the last or the run is
 * done. Pure. */
export function logFrame(run: CadenceRun, r: Reading, d: Display, now: number): CadenceRun {
  if (cadenceDone(run, now) || now - run.lastAt < CADENCE_GAP_MS) return run;
  const card = r.kind === "card" ? r : null;
  const shown = d.reading?.kind === "card" ? (d.reading.guesses[0]?.oracleId ?? null) : null;
  const frame: CadenceFrame = {
    t: Math.round(now - run.startedAt),
    top: card ? card.guesses.slice(0, 3).map((g) => ({ oracleId: g.oracleId, score: round(g.score) })) : [],
    margin: card ? round(card.margin) : null,
    shown,
    unsure: d.reading === null,
  };
  return { ...run, lastAt: now, frames: [...run.frames, frame] };
}

const round = (v: number) => Math.round(v * 10_000) / 10_000;

export type CadenceLog = { indexVersion: string; frames: CadenceFrame[] };

const num = (v: unknown, lo: number, hi: number): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi;

/** One posted run, checked field by field; null when anything is off. */
export function parseCadence(raw: unknown): CadenceLog | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.indexVersion !== "string" || !/^[\w.-]{1,40}$/.test(r.indexVersion)) return null;
  if (!Array.isArray(r.frames) || r.frames.length === 0 || r.frames.length > MAX_CADENCE_FRAMES) return null;
  const frames: CadenceFrame[] = [];
  for (const f of r.frames as unknown[]) {
    if (!f || typeof f !== "object") return null;
    const x = f as Record<string, unknown>;
    if (!num(x.t, 0, CADENCE_MS + 60_000) || !Number.isInteger(x.t)) return null;
    if (!Array.isArray(x.top) || x.top.length > 3) return null;
    const top: CadenceFrame["top"] = [];
    for (const g of x.top as unknown[]) {
      const y = (g ?? {}) as Record<string, unknown>;
      if (typeof y.oracleId !== "string" || !isUuid(y.oracleId) || !num(y.score, -1, 1)) return null;
      top.push({ oracleId: y.oracleId, score: y.score });
    }
    if (x.margin !== null && !num(x.margin, -2, 2)) return null;
    if (x.shown !== null && !(typeof x.shown === "string" && isUuid(x.shown))) return null;
    if (typeof x.unsure !== "boolean") return null;
    frames.push({ t: x.t, top, margin: x.margin as number | null, shown: x.shown as string | null, unsure: x.unsure });
  }
  return { indexVersion: r.indexVersion, frames };
}
