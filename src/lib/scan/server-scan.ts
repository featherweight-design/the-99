// A scanner that matches on the server, frame by frame: every frame goes through the stable-card tracker
// (`stable-card.ts`), a card that settles is looked up once (`lookup.ts`, with its own retries), or twice when its early answer is not confident (below), after at most one frame-one lookup (below), and an empty frame
// that settles forgets the answer, so the next card is a new scan. The answer for the card in view is held and handed
// back on every frame until another card settles. Pure apart from the lookup it starts; the caller owns the clock.
//
// The card is asked about EARLY, once it has held for `EARLY_DWELL_MS` (its second agreeing frame on a phone), and an
// early answer is shown only when it is sure (`SURE_MARGIN`, `lookup.ts`). One that is not is a card still being put
// down, or a hard one: it is asked about again once the card has held the full `DWELL_MS`, and that answer is shown
// whatever it is (Not sure, with the guesses to pick from, when it is under the gate). Measured on the lab's phone runs (staging, 2026-10-16): the frames read while a card was
// being placed named the wrong card at margins under 0.07, and every frame at 0.10 or more named the run's own card.
//
// Before that, the card is asked about on its FIRST frame (the frame-one lookup), once per card brought into an empty
// view. Its answer is kept only when it is sure (`keepsFrameOne`): the card then settles at once, exactly as a sure
// early answer would settle it, and nothing more is asked. One that is not sure (or fails, or is refused) is dropped
// with nothing shown, and the early and full-dwell lookups follow as they would have. A frame that breaks the card's
// run (a blur, a flicker) never asks again: the next frame-one lookup waits for the tracked card to be gone (an empty
// view, or unseen for `LOSE_MS`), so a card that replaces another goes the early way alone. While the frame-one answer
// is still out when the card settles, the early lookup waits for it rather than abort it: a kept answer settles the
// card with one request, and one not kept sends the early lookup at once. Measured on two lab sessions on staging
// (2026-11-14, an Android and an iPhone, 92 tapped cards): every first frame at 0.10 or more named the right card (71
// of 71), and the worst wrong one read 0.034.
import { lookupCard, type LookupResult } from "./lookup";
import { nextStableScan, sameCard, startStableScan, type ScanFrame, type StableScan } from "./stable-card";
import { DWELL_MS } from "./track";

/** How long a card must hold before it is first asked about. */
export const EARLY_DWELL_MS = 300;

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

/** A frame-one lookup's answer is kept only when it is a sure match; anything else is dropped unseen. Pure. */
export function keepsFrameOne(r: LookupResult): r is Extract<LookupResult, { kind: "match" }> {
  return r.kind === "match" && r.sure;
}

/**
 * The tracker once a sure frame-one answer has come back for `asked` (the frame that was asked about): the card in its
 * run settles at once, as if it had held the dwell. Null when the run is no longer that card (it broke, or another
 * card is settling), so the answer is for nothing on screen. Pure.
 */
export function settleOnFrameOne(scan: StableScan, asked: ScanFrame, now: number): StableScan | null {
  const c = scan.candidate;
  if (!c || c.value.kind !== "card" || !sameCard(c.value, asked)) return null;
  return { value: c.value, changedAt: now, before: scan.value, candidate: null, seenAt: now };
}

type Deps = Pick<Parameters<typeof lookupCard>[2], "fetch" | "wait"> & { now: () => number };

/** One idle state, handed back on every frame that suppresses a match, so a caller storing it re-renders once. */
const IDLE: ServerState = Object.freeze({ kind: "idle" });

export function serverScanner(model: string, deps: Deps, onState: (s: ServerState) => void) {
  let scan = startStableScan(deps.now());
  let inFlight: AbortController | null = null;
  let state: ServerState = { kind: "idle" };
  // The card's run from the moment its early lookup is asked: if that answer is not confident, the card is asked about
  // again once it has held, UNBROKEN, for the full dwell. `since` is when its current unbroken run began, null while a
  // frame breaks it (an empty frame, another card), counted while the early answer is still on its way too; `asked` is
  // false until that answer has come back not confident.
  let confirm: { since: number | null; asked: boolean } | null = null;
  // The frame-one lookup is open until a card frame uses it, and opens again only when the tracked card is gone (the
  // view emptied, or the card went unseen for `LOSE_MS`): one per card brought in, never one per run a blurred frame
  // starts.
  let frameOneOpen = true;
  // The frame-one lookup in flight, and the card it asked about.
  let frameOne: { ctl: AbortController; frame: ScanFrame } | null = null;
  // The early lookup, held back while the same card's frame-one lookup is still out: sent at once if that answer is
  // not kept, dropped if it is.
  let heldEarly: { embedding: Float32Array; origin: number } | null = null;
  const set = (s: ServerState) => {
    state = s;
    onState(s);
  };
  const forget = () => {
    inFlight?.abort();
    inFlight = null;
    confirm = null;
    frameOne = null;
    heldEarly = null;
  };
  const ask = (embedding: Float32Array, origin: number, early: boolean) => {
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
      if (r.kind === "match" && early && confirm && !r.sure) {
        // Not sure enough yet: the screen keeps looking, and the card is asked about again once its run has held the
        // full dwell.
        confirm.asked = true;
        set({ kind: "looking" });
        return;
      }
      confirm = null;
      if (r.kind === "match") set({ kind: "match", result: r, ms: Math.round(end - t0), totalMs: Math.round(end - origin) });
      else if (r.kind === "refused") set({ kind: "refused", reason: r.reason });
      else set({ kind: "failed" });
    });
  };
  // The frame-one lookup: nothing is shown while it is out, and only a sure answer is kept. A retry is not waited
  // for: the first failure drops it, so the reads (paused while it is out) go on.
  const askFrameOne = (f: Extract<ScanFrame, { kind: "card" }>, origin: number) => {
    const mine = new AbortController();
    inFlight = mine;
    frameOne = { ctl: mine, frame: f };
    const t0 = deps.now();
    // Not kept (unsure, failed, refused, or its card's run broke): the early lookup it held back goes now, since its
    // dwell has already passed.
    const drop = () => {
      frameOne = null;
      if (inFlight === mine) inFlight = null;
      const early = heldEarly;
      heldEarly = null;
      if (early) ask(early.embedding, early.origin, true);
    };
    void lookupCard(f.embedding, model, {
      fetch: deps.fetch, wait: deps.wait, signal: mine.signal,
      onRetry: () => {
        if (frameOne?.ctl !== mine) return;
        mine.abort();
        drop();
      },
    }).then((r) => {
      if (frameOne?.ctl !== mine) return;
      if (!keepsFrameOne(r)) return drop();
      const end = deps.now();
      // The card may have settled while the answer was out (its early lookup is then held back): it is already the card.
      const settled = scan.value?.kind === "card" && sameCard(scan.value, f) ? scan : settleOnFrameOne(scan, f, end);
      if (!settled) return drop();
      frameOne = null;
      inFlight = null;
      heldEarly = null;
      scan = settled;
      confirm = null;
      set({ kind: "match", result: r, ms: Math.round(end - t0), totalMs: Math.round(end - origin) });
    });
  };
  return {
    /** One more frame at `now`; answers what the scanner knows about the card in view. `origin` is when this frame's
     * work began (the camera read), so an answer it asks for is timed from there. */
    frame(f: ScanFrame, now: number, origin: number = now): ServerState {
      // When the run that settles on this frame began: its candidate's start, before the tracker forgets it.
      const runStart = scan.candidate?.since ?? now;
      const wasCard = scan.value?.kind === "card";
      const out = nextStableScan(scan, f, now, EARLY_DWELL_MS);
      scan = out.scan;
      // The tracked card is gone by any path (an empty view, or unseen for LOSE_MS): the next card gets a frame-one
      // lookup. Any card frame then closes it, whether or not this one asks.
      if (wasCard && scan.value?.kind !== "card") frameOneOpen = true;
      const firstFrame = frameOneOpen && out.event === null;
      if (f.kind === "card") frameOneOpen = false;
      if (out.event?.kind === "empty") {
        forget();
        frameOneOpen = true;
        set({ kind: "idle" });
      } else if (firstFrame && f.kind === "card") {
        // The first card frame since the view emptied: asked about now, unless a lookup is already out.
        if (inFlight === null) askFrameOne(f, origin);
      } else if (out.event?.kind === "lookup") {
        const held = frameOne !== null && sameCard(frameOne.frame, { kind: "card", embedding: out.event.embedding });
        if (!held) forget();
        confirm = { since: runStart, asked: false };
        // The same card's frame-one answer is still out: wait for it rather than abort it and ask twice.
        if (held) heldEarly = { embedding: out.event.embedding, origin };
        else ask(out.event.embedding, origin, true);
      } else if (confirm !== null) {
        if (f.kind !== "card" || !scan.value || !sameCard(scan.value, f)) confirm.since = null;
        else if (confirm.since === null) confirm.since = now;
        else if (confirm.asked && now - confirm.since >= DWELL_MS) {
          // The card has held the full dwell: this frame's own reading is asked about, and its answer is shown.
          confirm = null;
          ask(f.embedding, origin, false);
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
