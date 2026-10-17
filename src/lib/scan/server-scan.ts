// A scanner that matches on the server, frame by frame: every frame goes through the stable-card tracker
// (`stable-card.ts`), a card that settles is looked up ONCE (`lookup.ts`, with its own retries), and an empty frame
// that settles forgets the answer, so the next card is a new scan. The answer for the card in view is held and handed
// back on every frame until another card settles. Pure apart from the lookup it starts; the caller owns the clock.
import { lookupCard, type LookupResult } from "./lookup";
import { nextStableScan, sameCard, startStableScan, type ScanFrame } from "./stable-card";

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
  const set = (s: ServerState) => {
    state = s;
    onState(s);
  };
  const forget = () => {
    inFlight?.abort();
    inFlight = null;
  };
  return {
    /** One more frame at `now`; answers what the scanner knows about the card in view. `origin` is when this frame's
     * work began (the camera read), so an answer it asks for is timed from there. */
    frame(f: ScanFrame, now: number, origin: number = now): ServerState {
      const out = nextStableScan(scan, f, now);
      scan = out.scan;
      if (out.event?.kind === "empty") {
        forget();
        set({ kind: "idle" });
      } else if (out.event?.kind === "lookup") {
        forget();
        const mine = new AbortController();
        inFlight = mine;
        const t0 = deps.now();
        set({ kind: "looking" });
        void lookupCard(out.event.embedding, model, {
          fetch: deps.fetch, wait: deps.wait, signal: mine.signal,
          onRetry: () => { if (inFlight === mine) set({ kind: "retrying" }); },
        }).then((r) => {
          // a later card, an empty frame or a stop replaced this lookup: its answer is for nothing on screen
          if (inFlight !== mine) return;
          inFlight = null;
          const end = deps.now();
          if (r.kind === "match") set({ kind: "match", result: r, ms: Math.round(end - t0), totalMs: Math.round(end - origin) });
          else if (r.kind === "refused") set({ kind: "refused", reason: r.reason });
          else set({ kind: "failed" });
        });
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
