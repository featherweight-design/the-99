import { fitsReadLive } from "../swaps/fits-read-stub";
import { intakeLive } from "../intake/stub";
import { synopsisLive } from "../synopsis/stub";
import { tuningStubDelayMs } from "../tuning/stub";

/**
 * WHICH MODEL CALLS THIS PROCESS WOULD REALLY MAKE, for a probe to check before it presses anything
 * that spends (`scripts/lib/model-stand-in.mjs`). Served only by a development server
 * (`/api/dev/model-stand-in`): a dev build alone does not prove a press is free, because Suggested
 * changes and Look deeper call the real model in development unless `TUNING_STUB_DELAY_MS` is set,
 * and each other path has its own `*_LIVE` opt-in. Read from the same rules the paths themselves
 * call, so the report cannot disagree with the call.
 *
 * `key` says whether a real call could even be made: `absent` and `dummy` (not an Anthropic key's
 * shape) cannot spend, unless `ANTHROPIC_BASE_URL` points the client somewhere that may not need one.
 */
export type StandInEnv = {
  NODE_ENV?: string;
  SYNOPSIS_LIVE?: string;
  INTAKE_LIVE?: string;
  FITS_READ_LIVE?: string;
  TUNING_STUB_DELAY_MS?: string;
  ANTHROPIC_API_KEY?: string;
  ANTHROPIC_BASE_URL?: string;
};

export type PathMode = "stand-in" | "live";
export type StandInReport = {
  synopsis: PathMode;
  intake: PathMode;
  fits: PathMode;
  /** Suggested changes and Proposed cuts' Look deeper: one held stand-in for both. */
  tuning: PathMode;
  key: "absent" | "dummy" | "real";
  baseUrl: boolean;
};

const mode = (live: boolean): PathMode => (live ? "live" : "stand-in");

export function standInReport(env: StandInEnv): StandInReport {
  const key = env.ANTHROPIC_API_KEY?.trim() ?? "";
  return {
    synopsis: mode(synopsisLive(env)),
    intake: mode(intakeLive(env)),
    fits: mode(fitsReadLive(env)),
    tuning: mode(tuningStubDelayMs(env) === null),
    key: key === "" ? "absent" : /^sk-ant-/.test(key) ? "real" : "dummy",
    baseUrl: !!env.ANTHROPIC_BASE_URL?.trim(),
  };
}
