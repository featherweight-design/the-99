// A scanner that matches on the server, frame by frame: every frame goes through the stable-card tracker
// (`stable-card.ts`), a card that settles is looked up once (`lookup.ts`, with its own retries), or twice when its early answer is not confident (below), and an empty frame
// that settles forgets the answer, so the next card is a new scan. The answer for the card in view is held and handed
// back on every frame until another card settles. Pure apart from the lookup it starts; the caller owns the clock.
//
// The card is asked about EARLY, once it has held for `EARLY_DWELL_MS` (its second agreeing frame on a phone), and an
// early answer is shown only when it is CONFIDENT (`CONFIDENT_MARGIN`). One that is not is a card still being put
// down, or a hard one: it is asked about again once the card has held the full `DWELL_MS`, and that answer is shown
// as an answer always was. Measured on the lab's phone runs (staging, 2026-10-16): the frames read while a card was
// being placed named the wrong card at margins under 0.07, and every frame at 0.10 or more named the run's own card.
import { lookupCard, type LookupResult } from "./lookup";
import { nextStableScan, sameCard, startStableScan, type ScanFrame } from "./stable-card";
import { DWELL_MS } from "./track";

/** How long a card must hold before it is first asked about. */
export const EARLY_DWELL_MS = 300;
/** The margin an early answer must clear to be shown; under it the card is asked about again at the full dwell. */
export const CONFIDENT_MARGIN = 0.1;

export type ServerState =
  | { kind: "idle" }
  | { kind: "looking" }
  | { kind: "retrying" }
  | {
      kind: "match";
      result: Extract<LookupResult, { kind: "match" }>;
      /** The lookup's own round trip. */
      ms: number;
      /** From the start of the frame that asked to the answer: what the scanner made the player wait. */
      totalMs: number;
    }
  | { kind: "refused"; reason: Extract<LookupResult, { kind: "refused" }>["reason"] }
  | { kind: "failed" };

type Deps = Pick<Parameters<typeof lookupCard>[2], "fetch" | "wait"> & { now: () => number };

/** One idle state, handed back on every frame that suppresses a match, so a caller storing it re-renders once. */
const IDLE: ServerState = Object.freeze({ kind: "idle" });

export function serverScanner(model: string, deps: Deps, onState: (s: ServerState) => void) {
  let scan = startStableScan(deps.now());
  let inFlight: AbortController | null = null;
  let state: ServerState = { kind: "idle" };
  // An early answer that was not confident: the card is asked about again once it has held, UNBROKEN, for the full
  // dwell. `since` is when its current unbroken run began, null while a frame breaks it (an empty frame, another card).
  let confirm: { since: number | null } | null = null;
  const set = (s: ServerState) => {
    state = s;
    onState(s);
  };
  const forget = () => {
    inFlight?.abort();
    inFlight = null;
    confirm = null;
  };
  const ask = (embedding: Float32Array, origin: number, early: boolean, runStart: number) => {
    const mine = new AbortController();
    inFlight = mine;
    const t0 = deps.now();
    set({ kind: "looking" });
    void lookupCard(embedding, model, {
      fetch: deps.fetch, wait: deps.wait, signal: mine.signal,
      onRetry: () => { if (inFlight === mine) set({ kind: "retrying" }); },
    }).then((r) => {
      // a later card, an empty frame or a stop replaced this lookup: its answer is for nothing on screen
      if (inFlight !== mine) return;
      inFlight = null;
      const end = deps.now();
      if (r.kind === "match" && early && r.margin !== null && r.margin < CONFIDENT_MARGIN) {
        // Not sure enough yet: the screen keeps looking, and the card is asked about again once it has held the full
        // dwell from the start of its run.
        confirm = { since: runStart };
        set({ kind: "looking" });
        return;
      }
      if (r.kind === "match") set({ kind: "match", result: r, ms: Math.round(end - t0), totalMs: Math.round(end - origin) });
      else if (r.kind === "refused") set({ kind: "refused", reason: r.reason });
      else set({ kind: "failed" });
    });
  };
  return {
    /** One more frame at `now`; answers what the scanner knows about the card in view. `origin` is when this frame's
     * work began (the camera read), so an answer it asks for is timed from there. */
    frame(f: ScanFrame, now: number, origin: number = now): ServerState {
      // When the run that settles on this frame began: its candidate's start, before the tracker forgets it.
      const runStart = scan.candidate?.since ?? now;
      const out = nextStableScan(scan, f, now, EARLY_DWELL_MS);
      scan = out.scan;
      if (out.event?.kind === "empty") {
        forget();
        set({ kind: "idle" });
      } else if (out.event?.kind === "lookup") {
        forget();
        ask(out.event.embedding, origin, true, runStart);
      } else if (confirm !== null) {
        if (f.kind !== "card" || !scan.value || !sameCard(scan.value, f)) confirm.since = null;
        else if (confirm.since === null) confirm.since = now;
        else if (now - confirm.since >= DWELL_MS) {
          // The card has held the full dwell: this frame's own reading is asked about, and its answer is shown.
          confirm = null;
          ask(f.embedding, origin, false, now);
        }
      }
      // A match answers for the card that settled, as the tracker still holds it (it follows the card's own slow
      // drift frame to frame). While another card is settling in its place, or nothing holds, this frame is not that
      // card, so the match is not handed back with it.
      if (state.kind === "match" && !(scan.value && sameCard(scan.value, f))) return IDLE;
      return state;
    },
    /** A lookup is in flight (its retries included). */
    waiting: () => inFlight !== null,
    /** Abandon any lookup in flight (the toggle went off, or the page was left). */
    stop: forget,
  };
}
