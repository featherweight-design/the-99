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
  const [answer, setAnswer] = useState<{ state: SynopsisState; key: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const generation = useRef(0);

  // The key a read was asked under, readable from its continuation.
  const askedKey = useRef(refreshKey);
  useEffect(() => {
    askedKey.current = refreshKey;
  }, [refreshKey]);

  const load = useCallback(async () => {
    const mine = ++generation.current;
    const key = askedKey.current;
    const got = await fetchSynopsis(deckId);
    if (mine !== generation.current) return;
    if ("synopsis" in got) setAnswer({ state: got, key });
  }, [deckId]);

  useEffect(() => {
    if (!active) return;
    // The read settles in a continuation rather than through `load`, so no state is set
    // synchronously inside the effect.
    const mine = ++generation.current;
    void fetchSynopsis(deckId).then((got) => {
      if (mine === generation.current && "synopsis" in got) setAnswer({ state: got, key: refreshKey });
    });
  }, [active, refreshKey, deckId]);

  const press = useCallback(async (run: () => Promise<WriteResult | { kind: string }>) => {
    setBusy(true);
    try {
      await run();
    } finally {
      setBusy(false);
      // Whatever the press returned, the stored state is the truth the tab draws.
      await load();
    }
  }, [load]);

  const write = useCallback(() => press(() => writeSynopsis(deckId)), [press, deckId]);
  const retry = useCallback((synopsisId: string) => press(() => retrySynopsisSections(deckId, synopsisId)), [press, deckId]);

  const view: SynopsisView = answer
    ? { kind: "ready", state: answer.state, busy, current: answer.key === refreshKey }
    : { kind: "idle" };
  return {
    view,
    write,
    retry,
  };
}
