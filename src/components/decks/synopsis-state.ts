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
  // SETTLED IS A FACT ABOUT THE LATEST READ, never about an answer on hand. Every read the effect
  // below starts (the tab opening, the key moving, the deck changing) is numbered here, during
  // render, and `settled` holds only once THAT read has answered or failed: an answer kept from a
  // last visit, or from a key the list has since returned to, may differ from what the new read
  // says, and until it says it the credit notes are unpriced. A failure settles as an answer
  // would, so a failed read never holds the tab's loader up.
  const [asked, setAsked] = useState({ active, deckId, refreshKey, n: 0 });
  if (asked.active !== active || asked.deckId !== deckId || asked.refreshKey !== refreshKey) {
    setAsked({ active, deckId, refreshKey, n: asked.n + 1 });
  }
  const [answeredRead, setAnsweredRead] = useState(-1);
  // The latest read's number, readable from a press's continuation.
  const latestRead = useRef(asked.n);
  useEffect(() => {
    latestRead.current = asked.n;
  }, [asked.n]);
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
    if (mine !== generation.current) return;
    if (got && "synopsis" in got) setAnswer({ state: got, key, deckId });
    // It superseded any read still out, so it answers for the latest one as well, and does so on a
    // failure too: a superseded read never settles, so leaving this unsettled would hold the tab.
    setAnsweredRead(latestRead.current);
  }, [deckId]);

  const readNumber = asked.n;
  useEffect(() => {
    if (!active) return;
    // The read settles in a continuation rather than through `load`, so no state is set
    // synchronously inside the effect.
    const mine = ++generation.current;
    fetchSynopsis(deckId).then(
      (got) => {
        if (mine !== generation.current) return;
        if ("synopsis" in got) setAnswer({ state: got, key: refreshKey, deckId });
        setAnsweredRead(readNumber);
      },
      // A failed read keeps what is on screen, never a stale `current`; the next key asks again.
      () => {
        if (mine === generation.current) setAnsweredRead(readNumber);
      },
    );
  }, [active, refreshKey, deckId, readNumber]);

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
    /** The latest read (this visit, this key, this deck) has answered or failed. */
    settled: answeredRead === asked.n,
    write,
    retry,
  };
}
