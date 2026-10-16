// A scanner that matches on the server, frame by frame: every frame goes through the stable-card tracker
// (`stable-card.ts`), a card that settles is looked up ONCE (`lookup.ts`, with its own retries), and an empty frame
// that settles forgets the answer, so the next card is a new scan. The answer for the card in view is held and handed
// back on every frame until another card settles. Pure apart from the lookup it starts; the caller owns the clock.
import { lookupCard, type LookupResult } from "./lookup";
import { nextStableScan, startStableScan, type ScanFrame } from "./stable-card";

export type ServerState =
  | { kind: "idle" }
  | { kind: "looking" }
  | { kind: "retrying" }
  | { kind: "match"; result: Extract<LookupResult, { kind: "match" }>; ms: number }
  | { kind: "refused"; reason: Extract<LookupResult, { kind: "refused" }>["reason"] }
  | { kind: "failed" };

type Deps = Pick<Parameters<typeof lookupCard>[2], "fetch" | "wait"> & { now: () => number };

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
    /** One more frame at `now`; answers what the scanner knows about the card in view. */
    frame(f: ScanFrame, now: number): ServerState {
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
          if (r.kind === "match") set({ kind: "match", result: r, ms: Math.round(deps.now() - t0) });
          else if (r.kind === "refused") set({ kind: "refused", reason: r.reason });
          else set({ kind: "failed" });
        });
      }
      return state;
    },
    /** Abandon any lookup in flight (the toggle went off, or the page was left). */
    stop: forget,
  };
}
