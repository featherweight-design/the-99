"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { fetchDeckProfile, type ProfileFetch } from "../../app/decks/profile-actions";
import type { DeckProfile } from "../../lib/profile/types";

export type ProfileState =
  /** The tab has never been opened. No request has been made and none should be. */
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
 * The deck profile, fetched the FIRST time the Analysis tab is opened and held for the visit.
 *
 * THIS HOOK LIVES IN THE SHELL, not in the panel, and that is the whole design. `BuilderTabs`
 * renders one panel at a time — switching away unmounts the Analysis panel — so a fetch-on-mount
 * inside the panel would re-request a 630ms build every time the reader came back to the tab.
 * The shell stays mounted across tab switches, so the cache placed there survives them.
 *
 * A CACHE LIVES FOR ONE VISIT, per the convention this codebase already holds. Leaving
 * `/decks/<id>` unmounts the shell and the entry with it, so a change made elsewhere needs no
 * invalidation — there is nothing left to invalidate by the time the reader returns.
 *
 * `active` rather than an imperative call, because the reader's press is what should cause the
 * request and the shell already knows which tab is showing. The request fires once: `asked`
 * guards the effect rather than the state, since `failed` must not re-fire on every render
 * while still being retryable on purpose.
 */
export function useDeckProfile(deckId: string, active: boolean): {
  state: ProfileState;
  retry: () => void;
} {
  const [state, setState] = useState<ProfileState>({ kind: "idle" });
  const asked = useRef(false);
  // The deck id a request was made for, so a commander swap or a route change to another deck
  // within the same mounted shell cannot leave one deck's profile showing under another's name.
  const askedFor = useRef<string | null>(null);

  const run = useCallback(async () => {
    asked.current = true;
    askedFor.current = deckId;
    setState({ kind: "loading" });
    let result: ProfileFetch;
    try {
      result = await fetchDeckProfile(deckId);
    } catch {
      // A THROW IS `failed`, NEVER `missing`. The action answers a missing deck in its return
      // value, so an exception here is the request itself — a network drop, a serialisation
      // error — and telling the reader their deck is gone would be a lie with a retry hidden
      // behind it.
      setState({ kind: "failed" });
      return;
    }
    // Late reply for a deck we are no longer showing: dropped rather than rendered.
    if (askedFor.current !== deckId) return;
    if (result.ok) setState({ kind: "ready", profile: result.profile });
    else setState({ kind: result.reason === "disabled" ? "disabled" : "missing" });
  }, [deckId]);

  useEffect(() => {
    if (!active || asked.current) return;
    void run();
  }, [active, run]);

  // A DELIBERATE RE-ASK, which is why it does not consult `asked`. The failed reading offers a
  // retry and this is it; nothing else calls this.
  const retry = useCallback(() => {
    void run();
  }, [run]);

  return { state, retry };
}
