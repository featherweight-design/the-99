"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { fetchSynopsis, retrySynopsisSections, writeSynopsis } from "../../app/decks/synopsis-actions";
import type { WriteResult } from "../../lib/synopsis/generate";
import type { SynopsisState } from "../../lib/synopsis/read";

/**
 * The deck's overview, held by the shell beside the profile (plan, PR 3): the Analysis tab
 * unmounts on every tab switch, and a panel-owned read would repaint the Overview late on each
 * return. A cache for one visit, per the repository's rule: leaving the route unmounts it.
 *
 * `refreshKey` is what makes the state go stale under it: the shell passes the profile's reading
 * key, so an analysis settling, or an edit moving the list, refetches `stale` and `wouldSpend`
 * (plan, decision 9). The read never writes an overview and never analyzes.
 *
 * WRITES ARE PRESSES, and nothing else: `write` and `retry` are the Overview's own controls
 * (ruling A). The Analyze press writing too is PR 4, with the credit note Design is drawing.
 */
export type SynopsisView =
  | { kind: "idle" }
  /** `current`: the state answers for the key on screen now. Until it does, what it says about
   *  a write (its cost, whether one is due) is about the list or reading before, so the tab offers
   *  no press over it. */
  | { kind: "ready"; state: SynopsisState; busy: boolean; current: boolean };

export function useDeckSynopsis(deckId: string, active: boolean, refreshKey: string) {
  // The deck an answer is for rides with it: the shell survives a client navigation between
  // decks, and the previous deck's overview must never draw on the next one's tab.
  const [answer, setAnswer] = useState<{ state: SynopsisState; key: string; deckId: string } | null>(null);
  const [busy, setBusy] = useState(false);
  // A READ THAT FAILED, by deck and key: it settles the tab's opening as an answer would, so a
  // failed overview read never holds the tab's loader up (its slot then draws nothing, as today).
  const [failedFor, setFailedFor] = useState<string | null>(null);
  // A VISIT'S OWN READ. Each time the tab opens, the effect below reads again; until that read
  // answers, an answer from the last visit does not settle this one's opening, since what the
  // re-read says may differ (an overview written in another tab). Set during render on the visit
  // opening, cleared by the read settling.
  const [awaiting, setAwaiting] = useState(active);
  const [wasActive, setWasActive] = useState(active);
  if (wasActive !== active) {
    setWasActive(active);
    if (active) setAwaiting(true);
  }
  const generation = useRef(0);

  // The key a read was asked under, and the deck on screen, readable from a continuation.
  const askedKey = useRef(refreshKey);
  const shownDeck = useRef(deckId);
  useEffect(() => {
    askedKey.current = refreshKey;
    shownDeck.current = deckId;
  }, [refreshKey, deckId]);

  const load = useCallback(async () => {
    // A press on a deck the reader has since left re-reads nothing: taking a generation here would
    // cancel the read the new deck's effect already has in flight, and leave its tab idle.
    if (shownDeck.current !== deckId) return;
    const mine = ++generation.current;
    const key = askedKey.current;
    // A failed read keeps the answer on screen; the next key or press asks again.
    const got = await fetchSynopsis(deckId).catch(() => null);
    if (mine !== generation.current || !got) return;
    if ("synopsis" in got) setAnswer({ state: got, key, deckId });
    // It superseded any read still out, so it answers for the visit as well.
    setAwaiting(false);
  }, [deckId]);

  useEffect(() => {
    if (!active) return;
    // The read settles in a continuation rather than through `load`, so no state is set
    // synchronously inside the effect.
    const mine = ++generation.current;
    fetchSynopsis(deckId).then(
      (got) => {
        if (mine !== generation.current) return;
        if ("synopsis" in got) setAnswer({ state: got, key: refreshKey, deckId });
        else setFailedFor(`${deckId}|${refreshKey}`);
        setAwaiting(false);
      },
      // A failed read keeps what is on screen, never a stale `current`; the next key asks again.
      () => {
        if (mine !== generation.current) return;
        setFailedFor(`${deckId}|${refreshKey}`);
        setAwaiting(false);
      },
    );
  }, [active, refreshKey, deckId]);

  const press = useCallback(async (run: () => Promise<WriteResult | { kind: string }>) => {
    setBusy(true);
    try {
      await run().catch(() => null);
      // Whatever the press returned, the stored state is the truth the tab draws. BUSY HOLDS
      // THROUGH THE RE-READ: cleared first, the answer from before the press would draw a live
      // write over a run that has already landed, and a second press would spend again.
      await load();
    } finally {
      setBusy(false);
    }
  }, [load]);

  const write = useCallback(() => press(() => writeSynopsis(deckId)), [press, deckId]);
  const retry = useCallback((synopsisId: string) => press(() => retrySynopsisSections(deckId, synopsisId)), [press, deckId]);

  const view: SynopsisView = answer && answer.deckId === deckId
    ? { kind: "ready", state: answer.state, busy, current: answer.key === refreshKey }
    : { kind: "idle" };
  return {
    view,
    /**
     * The read for the key ON SCREEN has answered, or failed: the tab's opening need not wait on
     * it. An answer for an older key does not count: the reading that just landed changed the
     * key, and until the re-read answers, what a write would cost (the credit notes) is unpriced.
     */
    settled: !awaiting && ((view.kind === "ready" && view.current) || failedFor === `${deckId}|${refreshKey}`),
    write,
    retry,
  };
}
