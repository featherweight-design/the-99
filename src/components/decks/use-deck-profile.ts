"use client";

import { useCallback, useRef, useState } from "react";

import { fetchDeckProfile, type ProfileFetch } from "../../app/decks/profile-actions";
import type { DeckProfile } from "../../lib/profile/types";

export type ProfileState =
  /** Never asked for. No request has been made and none should be until the reader asks. */
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; profile: DeckProfile }
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
 * THE CACHE LIVES IN THE SHELL, not the panel. One tab panel renders at a time, so the Analysis
 * panel unmounts on every tab switch — a hook owned by the panel would lose its answer each
 * time, and a 630ms build is not something to pay twice for the same question. Leaving the route
 * unmounts the shell and the entry with it, so a change made elsewhere needs no invalidation.
 *
 * KEYED ON THE DECK ID. `asked` alone would leave deck B rendering deck A's profile with no
 * request made, in a shell that outlives a route change between decks.
 */
export function useDeckProfile(deckId: string): {
  state: ProfileState;
  /** Ask, or ask again. Safe to call repeatedly — a request in flight is not duplicated. */
  request: () => void;
} {
  const [state, setState] = useState<ProfileState>({ kind: "idle" });
  /** The deck a request is in flight or settled for. Null means nothing has been asked. */
  const asked = useRef<string | null>(null);
  const inFlight = useRef(false);

  const request = useCallback(() => {
    if (inFlight.current) return;
    inFlight.current = true;
    asked.current = deckId;
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
        //
        // THE FLAG IS CLEARED ONLY BY THE CURRENT DECK'S REPLY. An older reply clearing it would
        // unlock a second request for the deck now showing while that deck's first is still in
        // flight — which is the duplicate the flag exists to prevent, arriving by a longer road.
        if (asked.current !== deckId) return;
        inFlight.current = false;
        setState({ kind: "failed" });
        return;
      }
      // Same rule as the catch above: a reply for a deck we are no longer showing neither
      // renders nor unlocks.
      if (asked.current !== deckId) return;
      inFlight.current = false;
      if (result.ok) setState({ kind: "ready", profile: result.profile });
      else setState({ kind: result.reason === "disabled" ? "disabled" : "missing" });
    })();
  }, [deckId]);

  // The deck changed under a mounted shell: the answer we hold is about another deck, so it is
  // dropped rather than shown under this one's name. Adjusted during render rather than in an
  // effect, so the previous deck's profile never paints once before being corrected.
  if (asked.current !== null && asked.current !== deckId && state.kind !== "idle") {
    asked.current = null;
    inFlight.current = false;
    setState({ kind: "idle" });
  }

  return { state, request };
}
