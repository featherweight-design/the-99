"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  fetchDeckProfile,
  fetchStoredDeckProfile,
  type ProfileFetch,
  type StoredProfileFetch,
} from "../../app/decks/profile-actions";
import type { BenchmarksWire } from "../../lib/benchmarks/wire";
import type { DeckProfile } from "../../lib/profile/types";

/** A reading the tab can draw: current, or HELD while stale, re-reading or refused. */
export type Reading = {
  profile: DeckProfile;
  /** An ISO instant, drawn as the bracket box's `analyzed {when}`. */
  analyzedAt: string;
  /** The list analyzed is the deck's, and no edit since. False draws the 2i banner. */
  fresh: boolean;
  /** The version the reading is pinned to, for `analyzed with version n`. */
  versionNumber: number | null;
  /** Its evidence benchmarks, or null (switch off, or the read failed). Held with the reading. */
  benchmarks?: BenchmarksWire | null;
};

export type ProfileState =
  /** Never asked for. No request has been made and none should be until the reader asks. */
  | { kind: "idle" }
  /** A press in flight. `held` is the reading on screen when it was made, which stays (2i). */
  | { kind: "loading"; held: Reading | null; retry?: boolean }
  | ({ kind: "ready" } & Reading)
  /** The flag is off. Nothing is wrong, and no surface may say otherwise. */
  | { kind: "disabled" }
  /** The deck is absent or not this reader's. */
  | { kind: "missing" }
  /** The request itself failed. Distinct from `missing`: retrying is worth offering. Over a held
   *  reading this is 2d, and the reading stays whole. */
  | { kind: "failed"; held: Reading | null }
  /** The body is not a whole deck (ruling 1). A reading held from before stays. */
  | { kind: "illegal"; built: number; size: number; held: Reading | null };

/** The reading the tab draws in any state, held or current. */
export function shownReading(state: ProfileState): Reading | null {
  if (state.kind === "ready") return state;
  if (state.kind === "loading" || state.kind === "failed" || state.kind === "illegal") return state.held;
  return null;
}

const readingOf = (r: { profile: DeckProfile; analyzedAt: string; fresh: boolean; versionNumber: number | null; benchmarks?: BenchmarksWire | null }): Reading =>
  ({ profile: r.profile, analyzedAt: r.analyzedAt, fresh: r.fresh, versionNumber: r.versionNumber, benchmarks: r.benchmarks ?? null });

/**
 * The deck profile, fetched when the reader ASKS for it and held for the visit.
 *
 * ON A PRESS, NEVER ON TAB OPEN. Round 4's ruling 7 is explicit — *"The verdict fires on analyse
 * or commit, and nowhere else. No per-add, no per-edit, no auto-run on tab open."* An earlier
 * draft of this hook fetched when the Analysis tab became active, which is the shape the Tier B
 * plan chose before that amendment landed; the amendment is newer, more specific and about the
 * same act, so it wins.
 *
 * That also settles STALENESS, which an automatic fetch could not. The shell holds the card list
 * across edits without leaving the route, so a once-per-visit automatic fetch would keep showing
 * a pre-edit profile for the rest of the visit while the server's fingerprint keying sat unused.
 * With the reader asking, an edited deck is re-asked about deliberately: an edit in the visit
 * marks the held reading STALE (see `listKey`), and the tab's banner offers Re-analyze (2i).
 *
 * WHAT TAB OPEN MAY DO is `peek`: ask whether an analysis the reader ALREADY pressed for is
 * stored, and show it if so. That computes nothing — a head read and a keyed lookup, and a miss
 * answers "none" rather than falling through to a build — so ruling 7's cost argument does not
 * reach it, and without it a reload threw away an analysis the reader had just paid for. A peek
 * leaves the state `idle` while it runs and on a miss, so the press stays exactly where it was;
 * a press made during a peek outranks it, because the press bumps the generation the peek's
 * reply is checked against.
 *
 * THE CACHE LIVES IN THE SHELL, not the panel. One tab panel renders at a time, so the Analysis
 * panel unmounts on every tab switch — a hook owned by the panel would lose its answer each
 * time, and a 630ms build is not something to pay twice for the same question. Leaving the route
 * unmounts the shell and the entry with it, so a change made elsewhere needs no invalidation.
 *
 * KEYED ON THE DECK ID. `asked` alone would leave deck B rendering deck A's profile with no
 * request made, in a shell that outlives a route change between decks.
 */
export function useDeckProfile(
  deckId: string,
  /**
   * The list the shell is drawing, as a stable string of its cards. A reading held for the visit
   * describes the list it was made from, so when this moves the reading turns STALE, the same
   * thing a reload shows: the stored row's `dirty` is set by the edit, and the peek answers it as
   * stale. It is never withdrawn (the lifecycle rulings, 2026-09-23).
   */
  listKey?: string,
  /**
   * Called once when a PRESS lands a fresh reading over the very list it asked about, and never
   * otherwise: not for a peek (a stored reading painted on open writes nothing), not for a reply an
   * edit overtook (that reading is already stale), not for a failure or a refusal. The shell hangs
   * the overview's write on it (synopsis plan, decision 1), which is how an Analyze also writes.
   */
  onFresh?: (deckId: string) => void,
): {
  state: ProfileState;
  /** Ask, or ask again. Safe to call repeatedly — a request in flight is not duplicated. */
  request: () => void;
  /** Show a stored analysis if one matches the deck as it is. Once per deck; never computes. */
  peek: () => void;
  /**
   * Whether this deck's peek has answered, whatever it answered (a reading, a miss, a failure).
   * Until it has, an `idle` tab does not yet know it is unanalyzed, so it must not say so: the
   * shell draws the opening loader (8a) instead of the empty state.
   */
  peekSettled: boolean;
} {
  const [state, setState] = useState<ProfileState>({ kind: "idle" });
  /** Decks whose peek has answered in this mount. State, since the tab reads it during render. */
  const [settled, setSettled] = useState<ReadonlySet<string>>(() => new Set());
  /**
   * The deck the state currently describes. STATE rather than a ref, because it is compared
   * during render and reading a ref there is forbidden — `react-hooks` catches it, and the rule
   * exists because a ref read during render is not tracked and can tear under concurrent
   * rendering.
   */
  const [shownFor, setShownFor] = useState<string | null>(null);
  /**
   * The deck a request is in flight FOR, rather than a boolean.
   *
   * A boolean had to be cleared when the deck changed, and the only place to notice that was
   * during render — which is the ref read above, forbidden. Holding the deck instead makes the
   * question local to the handler: a second press for the SAME deck is a duplicate, a press
   * for a different one is not, and nothing has to be reset from anywhere.
   */
  const inFlightFor = useRef<string | null>(null);
  /**
   * Which REQUEST, not merely which deck.
   *
   * `inFlightFor` holds a deck id, so it cannot tell two generations of the same deck apart: A
   * loads, the reader moves to B and back to A, and the first A reply would be indistinguishable
   * from the second's. The counter makes each request identifiable, and a reply that is not the
   * newest is dropped.
   */
  const generation = useRef(0);
  /**
   * Every deck a peek has been made for in this mount, so reopening the tab does not look again.
   * A SET rather than the last deck: A, then B, then A again would otherwise look for A twice.
   */
  const peeked = useRef(new Set<string>());
  /**
   * The deck currently on screen, readable from an async continuation.
   *
   * Written in an EFFECT, which is where a ref may be written — a reply has to ask "is this
   * still the deck being shown", and the closure only knows the deck it was made for.
   */
  const current = useRef(deckId);
  useEffect(() => {
    current.current = deckId;
  }, [deckId]);
  // The list as of the latest render, read when a request starts; and the list the reading on
  // screen was asked about. See `listKey`.
  const latestKey = useRef(listKey);
  useEffect(() => {
    latestKey.current = listKey;
  }, [listKey]);
  const [readyKey, setReadyKey] = useState<string | undefined>(undefined);

  // Read from the reply's continuation, so a new callback each render neither re-creates `request`
  // nor is missed by a press already in flight.
  const onFreshRef = useRef(onFresh);
  useEffect(() => {
    onFreshRef.current = onFresh;
  }, [onFresh]);

  const request = useCallback(() => {
    if (inFlightFor.current === deckId) return;
    inFlightFor.current = deckId;
    const mine = ++generation.current;
    const askedAbout = latestKey.current;
    // THE READING ON SCREEN STAYS while the press runs, and through a failure or a refusal.
    const held = shownFor === deckId ? shownReading(state) : null;
    setShownFor(deckId);
    // A press from 2d is a RETRY: the banner keeps saying the re-read failed, with its own
    // button, while this one runs — it disables in place rather than changing what it says.
    setState({ kind: "loading", held, retry: state.kind === "failed" });
    void (async () => {
      let result: ProfileFetch;
      try {
        result = await fetchDeckProfile(deckId);
      } catch {
        // A THROW IS `failed`, NEVER `missing`. The action answers a missing deck in its return
        // value, so an exception here is the request itself — a network drop, a serialisation
        // error — and telling the reader their deck is gone would be a lie with a retry hidden
        // behind it.
        // THE IN-FLIGHT SLOT IS CLEARED ONLY BY ITS OWN DECK'S REPLY. An older reply clearing
        // it would unlock a second request for the deck now showing while that deck's first is
        // still in flight — the duplicate the slot exists to prevent, by a longer road.
        if (mine === generation.current) inFlightFor.current = null;
        // And a reply that is not the newest, or is for a deck we are no longer showing,
        // neither renders nor unlocks.
        if (mine !== generation.current || current.current !== deckId) return;
        setState({ kind: "failed", held });
        return;
      }
      if (mine === generation.current) inFlightFor.current = null;
      if (mine !== generation.current || current.current !== deckId) return;
      // AN EDIT LANDED WHILE THE PRESS RAN. The server stores a reading only over the list it
      // was asked about, so this answer may be one no reload will ever draw again; the header's
      // chip ignores it for that reason (use-header-bracket.ts). The reading already on screen
      // stays instead, stale, and the banner offers the press over the list as it now is.
      if (result.ok && askedAbout !== latestKey.current && held) {
        setReadyKey(latestKey.current);
        setState({ kind: "ready", ...held, fresh: false });
      }
      else if (result.ok) {
        setReadyKey(askedAbout);
        const reading = readingOf(result);
        setState({ kind: "ready", ...reading });
        if (reading.fresh && askedAbout === latestKey.current) onFreshRef.current?.(deckId);
      }
      else if (result.reason === "illegal") {
        setState({ kind: "illegal", built: result.built, size: result.size, held });
      }
      else setState({ kind: result.reason === "disabled" ? "disabled" : "missing" });
    })();
  }, [deckId, shownFor, state]);

  const peek = useCallback(() => {
    // A press for this deck still in flight outranks any stored copy: a reader who left and came
    // back before it resolved would otherwise see the stored one painted over the pending press.
    if (peeked.current.has(deckId) || state.kind !== "idle" || inFlightFor.current === deckId) return;
    peeked.current.add(deckId);
    const mine = generation.current;
    const askedAbout = latestKey.current;
    const settle = () => setSettled((s) => (s.has(deckId) ? s : new Set(s).add(deckId)));
    void (async () => {
      let result: StoredProfileFetch;
      try {
        result = await fetchStoredDeckProfile(deckId);
      } catch {
        // A failed peek is a miss. The press is still there, and it is the recovery.
        settle();
        return;
      }
      settle();
      // Any request made since — a press, or a peek for another deck — owns the state now.
      if (mine !== generation.current || current.current !== deckId) return;
      // Only `none` is a miss. `disabled` and `not-found` are answers the panel draws — the
      // flag switched off mid-visit, or the deck is gone — and the press would lie about both.
      if (!result.ok && result.reason === "none") return;
      setShownFor(deckId);
      if (result.ok) {
        setReadyKey(askedAbout);
        setState({ kind: "ready", ...readingOf(result) });
      }
      else setState({ kind: result.reason === "disabled" ? "disabled" : "missing" });
    })();
  }, [deckId, state.kind]);

  // THE DECK CHANGED UNDER A MOUNTED SHELL. The answer we hold is about another deck, so it is
  // dropped rather than shown under this one's name. Adjusted during render — React's own
  // pattern for deriving state from a changed prop — so the previous deck's profile never paints
  // once before being corrected.
  if (shownFor !== null && shownFor !== deckId && state.kind !== "idle") {
    setShownFor(null);
    setState({ kind: "idle" });
  }

  // THE LIST CHANGED UNDER A READING. A reading carries the key captured when its request STARTED,
  // so a reply for a list edited while it was in flight turns stale as surely as a reading edited
  // after it landed. Stale, never dropped: the banner says so and offers Re-analyze (2i).
  // Adjusted during render for the same reason as the deck change above.
  if (state.kind === "ready" && listKey !== undefined && readyKey !== listKey) {
    setReadyKey(listKey);
    if (state.fresh) setState({ ...state, fresh: false });
  }

  return { state, request, peek, peekSettled: settled.has(deckId) };
}
