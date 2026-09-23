"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  fetchDeckProfile,
  fetchStoredDeckProfile,
  type ProfileFetch,
  type StoredProfileFetch,
} from "../../app/decks/profile-actions";
import type { DeckProfile } from "../../lib/profile/types";

export type ProfileState =
  /** Never asked for. No request has been made and none should be until the reader asks. */
  | { kind: "idle" }
  | { kind: "loading" }
  /** `analyzedAt` is an ISO instant, drawn as the bracket box's `analyzed {when}`. */
  | { kind: "ready"; profile: DeckProfile; analyzedAt: string }
  /** The flag is off. Nothing is wrong, and no surface may say otherwise. */
  | { kind: "disabled" }
  /** The deck is absent or not this reader's. */
  | { kind: "missing" }
  /** The request itself failed. Distinct from `missing`: retrying is worth offering. */
  | { kind: "failed" };

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
 * With the reader asking, an edited deck is re-asked about deliberately — which is Round 4's
 * model, where a determined verdict goes stale and the control invites another pass.
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
   * describes the list it was made from, so when this moves the reading is dropped back to `idle`
   * and the tab offers Analyze again — the same thing a reload shows, because the stored row is
   * refused for a list it was not made from. The consolidated tab has no re-analyze control on a
   * reading (the banner that offers one is the lifecycle round's), so without this an edit made
   * in the same visit would leave the pre-edit bracket on screen with no way to ask again.
   */
  listKey?: string,
): {
  state: ProfileState;
  /** Ask, or ask again. Safe to call repeatedly — a request in flight is not duplicated. */
  request: () => void;
  /** Show a stored analysis if one matches the deck as it is. Once per deck; never computes. */
  peek: () => void;
} {
  const [state, setState] = useState<ProfileState>({ kind: "idle" });
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

  const request = useCallback(() => {
    if (inFlightFor.current === deckId) return;
    inFlightFor.current = deckId;
    const mine = ++generation.current;
    setShownFor(deckId);
    setState({ kind: "loading" });
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
        setState({ kind: "failed" });
        return;
      }
      if (mine === generation.current) inFlightFor.current = null;
      if (mine !== generation.current || current.current !== deckId) return;
      if (result.ok) setState({ kind: "ready", profile: result.profile, analyzedAt: result.analyzedAt });
      else setState({ kind: result.reason === "disabled" ? "disabled" : "missing" });
    })();
  }, [deckId]);

  const peek = useCallback(() => {
    // A press for this deck still in flight outranks any stored copy: a reader who left and came
    // back before it resolved would otherwise see the stored one painted over the pending press.
    if (peeked.current.has(deckId) || state.kind !== "idle" || inFlightFor.current === deckId) return;
    peeked.current.add(deckId);
    const mine = generation.current;
    void (async () => {
      let result: StoredProfileFetch;
      try {
        result = await fetchStoredDeckProfile(deckId);
      } catch {
        // A failed peek is a miss. The press is still there, and it is the recovery.
        return;
      }
      // Any request made since — a press, or a peek for another deck — owns the state now.
      if (mine !== generation.current || current.current !== deckId) return;
      // Only `none` is a miss. `disabled` and `not-found` are answers the panel draws — the
      // flag switched off mid-visit, or the deck is gone — and the press would lie about both.
      if (!result.ok && result.reason === "none") return;
      setShownFor(deckId);
      if (result.ok) setState({ kind: "ready", profile: result.profile, analyzedAt: result.analyzedAt });
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

  // THE LIST CHANGED UNDER A READING. The key a reading was first drawn against is held, and a
  // different key drops it. Adjusted during render for the same reason as the deck change above.
  const [readKey, setReadKey] = useState<string | null>(null);
  if (state.kind === "ready" && listKey !== undefined) {
    if (readKey === null) setReadKey(listKey);
    else if (readKey !== listKey) {
      setReadKey(null);
      setState({ kind: "idle" });
    }
  } else if (state.kind !== "ready" && readKey !== null) {
    setReadKey(null);
  }

  return { state, request, peek };
}
