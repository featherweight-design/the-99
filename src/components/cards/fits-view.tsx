"use client";

// FIND A DECK, AS A VIEW INSIDE CARD DETAILS (handoff R2; it follows swap tools). The door no
// longer stacks a picker over the card: the details pane gives way to this view, the art column
// stays on desktop, and `← {card}` in the ✕'s slot is the one way back (Escape too, one layer). The
// band offers the paid read first; the free list sits under it, folded once a read lands.
//
// The read's rows act on the reader's decks: Swap in is the stand-ins take with the read's cut, and
// Add only is the free list's add with nothing cut. What the reader did on each row is held by the
// provider (`memory`), so a card opened from the view and closed again comes back to the same rows.
//
// This is the SIGNED-IN half (landing demo split 5k): the reads, the state and the four writes. What it draws is
// `FitsViewDrawing` (`fits-view-drawing.tsx`), which takes props alone, so the demo can draw the same view.
import { useCallback, useEffect, useRef, useState } from "react";

import type { BrowseCard } from "../../lib/collection/browse";
import { swapToolsCopy } from "../../lib/copy/swap-tools";
import { addFromFits, swapFromReadAction, undoReadAddAction, undoReadSwapAction } from "../../lib/swaps/actions";
import { pressFitsReadAction, readFitsReadAction } from "../../lib/swaps/fits-read-actions";
import type { FitsReadPanel } from "../../lib/swaps/fits-read-run";
import { fitsCandidateKey, fitsCandidates, FitsViewDrawing } from "./fits-view-drawing";
import { useFitsList, type FitsListSnapshot } from "./fits-picker";
import type { RowAct } from "./read-row";

const copy = swapToolsCopy.fits;
const read = copy.read;

/**
 * What the reader did on the read's rows this visit, kept by the provider across a card opened over it.
 * Keyed on the read and the deck (`actKey`), so a newer read never inherits an older one's Swapped in.
 */
export type FitsViewMemory = {
  acts: Record<string, RowAct>;
  /** A write from this view is in flight. It outlives the view (a card opened over it), so the lock does too. */
  writing?: boolean;
  /** The decks a press was refused for as too many for one read (`tooBig`), while they still are. */
  tooBigFor?: string | null;
  /** The decks a running read was pressed for, so a reopened run keeps its count. */
  runCount?: number | null;
  /** When the read running now started, as this visit saw it: a return draws the run at once, even one this
   *  visit pressed before the server's panel knew of it. */
  runStart?: number | null;
  /** The panel as it stood when this visit pressed: a read that still shows exactly that (no pending row
   *  yet, the same stored read, the same failure) predates the press and confirms nothing about it. */
  runFrom?: { stored: string | null; failedAt: string | null } | null;
  /** What the view last drew: a return (a card opened over it, then Back) draws this at once, with no
   *  entrance, and reads both again behind it, keeping it on screen until the new reads land. */
  snapshot?: { panel: FitsReadPanel; list: FitsListSnapshot | null; fresh: string | null; foldOpen: boolean };
};

/** How often a read in flight is asked after while the view waits on it (lock 5: one run, polled). */
const POLL_MS = 3000;

export function FitsView({
  card, onBack, onOpenCard, memory, setMemory, onReading, leaving = false,
}: {
  card: BrowseCard;
  onBack: () => void;
  /** A card the view names, opened over the dialog with the way back to this view. */
  onOpenCard: (oracleId: string) => void;
  memory: FitsViewMemory;
  setMemory: (update: (m: FitsViewMemory) => FitsViewMemory) => void;
  /** A read for this card is running or not: the door under details says so (P2b). */
  onReading: (running: boolean) => void;
  /** Going back to the details: the view plays its leave before it unmounts. */
  leaving?: boolean;
}) {
  // A return draws what the view last drew, at once, and with no entrance (the view was never gone for the reader).
  const [restored] = useState(() => memory.snapshot ?? null);
  const list = useFitsList(card, restored?.list ?? null);
  const { name, freeNow, owned, countsKnown } = list;
  const [panel, setPanel] = useState<FitsReadPanel | null>(() => restored?.panel ?? null);
  // The panel's first read has answered (or failed): until then and the list's, the body draws nothing, so the
  // band and the rows arrive with the list rather than after it.
  const [panelRead, setPanelRead] = useState(() => restored !== null);
  const pendingAtStart = restored?.panel.view.pending ?? null;
  const [running, setRunning] = useState<number | null>(() =>
    memory.runStart ?? (pendingAtStart ? Date.parse(pendingAtStart.startedAt) : null));
  useEffect(() => {
    setMemory((m) => ((m.runStart ?? null) === running ? m : { ...m, runStart: running }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);
  // The decks a press sent to be read, as it started: the list moving under a run never rewrites it.
  // Kept by the provider, with the refusal and the write lock below, so a round trip keeps them.
  const runCount = memory.runCount ?? null;
  const [pressFailed, setPressFailed] = useState(false);
  // The decks a press was refused for, before any credit, as too many for one read (`tooBig`). The
  // refusal holds only while those are still the decks: an add that changes them brings the offer back.
  const tooBigFor = memory.tooBigFor ?? null;
  const writing = memory.writing === true;
  // The read this visit's press produced: its sub reads `just now` rather than a date.
  const [fresh, setFresh] = useState<string | null>(() => restored?.fresh ?? null);
  const [now, setNow] = useState(() => Date.now());
  const [foldOpen, setFoldOpen] = useState(() => restored?.foldOpen ?? false);
  const [busy, setBusy] = useState(false);
  const [refused, setRefused] = useState<{ deckId: string; kind: "swap" | "add" | "undo" } | null>(null);
  const [announced, setAnnounced] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);
  // The provider's callback, read through a ref: a press that settles after the view has gone back
  // to the details still has to tell the door the read is done.
  const readingRef = useRef(onReading);
  useEffect(() => { readingRef.current = onReading; });
  // A press made this visit settles after the view has gone and clears the door's note itself. A run
  // only polled (reopened mid-run, P2a, or a press answered with a run already pending) stops being
  // watched when the view goes, so the note goes too rather than standing over a run nothing follows.
  const pressing = useRef(false);
  const mounted = useRef(true);
  useEffect(() => () => {
    mounted.current = false;
    if (!pressing.current) readingRef.current(false);
  }, []);

  // What the view draws, kept for a return. Written as it changes, so the provider holds the latest.
  useEffect(() => {
    if (!panel) return;
    const snap = list.read && list.opened ? { read: list.read, rows: list.opened, added: list.added, heldAlready: list.heldAlready } : null;
    setMemory((m) => ({ ...m, snapshot: { panel, list: snap, fresh, foldOpen } }));
    // `setMemory` is the provider's updater, rebuilt each render; the snapshot moves only with these.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panel, list.read, list.opened, list.added, list.heldAlready, fresh, foldOpen]);

  // Focus starts on the view's heading (D1).
  useEffect(() => headingRef.current?.focus(), []);

  // Read through a ref by the callbacks below, which outlive the render that made them (the poll, a press).
  const memoryRef = useRef(memory);
  useEffect(() => { memoryRef.current = memory; });
  /** The panel predates this visit's press: no pending row yet, and nothing has settled since. */
  const predatesPress = (p: FitsReadPanel) => {
    const from = memoryRef.current.runFrom;
    return !!from && !p.view.pending
      && (p.view.stored?.readId ?? null) === from.stored && (p.view.failed?.at ?? null) === from.failedAt;
  };

  const adopt = useCallback((p: FitsReadPanel | null) => {
    setPanel(p);
    const pending = p?.view.pending ?? null;
    setRunning(pending ? Date.parse(pending.startedAt) : null);
  }, []);

  useEffect(() => {
    let live = true;
    readFitsReadAction(card.oracleId)
      // A read that comes back empty keeps what is drawn: a return's snapshot stays rather than blanking.
      // A panel from before this visit's own press, still in flight, is drawn but does not end the run.
      .then((p) => {
        if (!live || !p) return;
        if (predatesPress(p)) setPanel(p);
        else adopt(p);
      })
      .catch(() => {})
      .finally(() => { if (live) setPanelRead(true); });
    return () => { live = false; };
  }, [card.oracleId, adopt]);

  // A run in flight (this visit's, or one reopened mid-run, P2a): the clock ticks, and the view asks
  // after it until it settles.
  useEffect(() => {
    readingRef.current(running !== null);
    if (running === null) return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [running]);
  const polling = running !== null && (panel?.view.pending != null || memory.runFrom != null);
  useEffect(() => {
    if (!polling) return;
    const t = setInterval(() => {
      readFitsReadAction(card.oracleId).then((p) => { if (p && !p.view.pending && !predatesPress(p)) settle(p, null); }).catch(() => {});
    }, POLL_MS);
    return () => clearInterval(t);
    // `settle` reads only setters and the card.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [polling, card.oracleId]);

  function settle(p: FitsReadPanel, before: string | null) {
    adopt(p);
    const stored = p.view.stored;
    const failed = p.view.failed !== null;
    setPressFailed(failed);
    setMemory((m) => (m.runCount == null && m.runFrom == null ? m : { ...m, runCount: null, runFrom: null }));
    // Announced only when it is drawn: a read that settled after its decks moved comes back out of date.
    if (stored && stored.readId !== before && !failed && stored.current) {
      setFresh(stored.readId);
      setAnnounced(stored.outcome === "noFit" ? read.announceNoFit : read.announceReady(stored.picks.length));
    } else if (failed) setAnnounced(read.announceFailed);
    void list.refresh();
  }

  async function press() {
    if (running !== null || !panel) return;
    const before = panel.view.stored?.readId ?? null;
    setRunning(Date.now());
    const from = { stored: before, failedAt: panel.view.failed?.at ?? null };
    setMemory((m) => ({ ...m, runCount: candidates, runFrom: from }));
    memoryRef.current = { ...memoryRef.current, runFrom: from };
    setNow(Date.now());
    setPressFailed(false);
    setAnnounced(read.announceStarted);
    pressing.current = true;
    try {
      const res = await pressFitsReadAction(card.oracleId);
      pressing.current = false;
      if (!(res.ok && res.panel.view.pending) || !mounted.current) readingRef.current(false);
      if (res.ok) {
        if (res.panel.view.pending) {
          // The server has the run now: its pending row is what a return or the poll follows from here.
          setMemory((m) => ({ ...m, runFrom: null }));
          adopt(res.panel);
        } else settle(res.panel, before);
        return;
      }
      setMemory((m) => ({ ...m, runFrom: null }));
      setRunning(null);
      // A refusal costs nothing: the panel is read again so the band says why (a current read, no
      // credit, the owner's share) rather than a failure the reader did not have.
      const again = await readFitsReadAction(card.oracleId).catch(() => null);
      if (again) adopt(again);
      if (res.reason === "tooBig") {
        setMemory((m) => ({ ...m, tooBigFor: candidateKey }));
        setAnnounced(read.announceTooBig);
      } else if (res.reason === "notFound" || res.reason === "noCandidates") setPressFailed(true);
    } catch {
      pressing.current = false;
      readingRef.current(false);
      setMemory((m) => ({ ...m, runFrom: null }));
      setRunning(null);
      setPressFailed(true);
      setAnnounced(read.announceFailed);
    }
  }

  const actKey = (deckId: string) => `${panel?.view.stored?.readId ?? ""}:${deckId}`;
  const actOf = (deckId: string) => memory.acts[actKey(deckId)] ?? null;
  const setAct = (deckId: string, act: RowAct) =>
    setMemory((m) => ({ ...m, acts: { ...m.acts, [actKey(deckId)]: act } }));
  // One write at a time, across the read's rows, the folded list and a round trip through a card
  // opened over the view: the provider's flag holds while a write this view started is in flight.
  const startWrite = () => {
    if (writing || !list.claim()) return false;
    setMemory((m) => ({ ...m, writing: true }));
    return true;
  };
  const endWrite = () => {
    list.release();
    setMemory((m) => ({ ...m, writing: false }));
  };
  // A view mounted while an earlier one's write was in flight reads the list again once it lands.
  const sawWriting = useRef(writing);
  useEffect(() => {
    if (sawWriting.current && !writing && !busy && list.busy === null) void list.refresh(true);
    sawWriting.current = writing;
  });
  async function addFree(deck: Parameters<typeof list.add>[0]) {
    if (writing) return;
    setMemory((m) => ({ ...m, writing: true }));
    try {
      await list.add(deck);
      // The deck may be one the stored read names: once it holds the card it is resolved, not changed, so the
      // panel is read again and the note and the row say so now rather than at the next open.
      const again = await readFitsReadAction(card.oracleId).catch(() => null);
      // Not over a press of this visit's still in flight: that press settles the band itself.
      if (again && mounted.current && !pressing.current) adopt(again);
    } finally { setMemory((m) => ({ ...m, writing: false })); }
  }

  async function onSwap(deckId: string, cut: string, cutName: string) {
    if (!startWrite()) return;
    const act = actOf(deckId);
    setBusy(true);
    setRefused(null);
    try {
      if (act?.kind === "swapped") {
        const r = await undoReadSwapAction(act.swapId);
        if (!r.ok) return setRefused({ deckId, kind: "undo" });
        setAct(deckId, null);
        setAnnounced(read.announceUndone(name, cutName));
      } else {
        const r = await swapFromReadAction(deckId, cut, card.oracleId);
        if (!r.ok) return setRefused({ deckId, kind: "swap" });
        setAct(deckId, { kind: "swapped", swapId: r.swapId });
        setAnnounced(read.announceSwapped(name, cutName));
      }
      await list.refresh(true);
    } catch {
      setRefused({ deckId, kind: act?.kind === "swapped" ? "undo" : "swap" });
    } finally {
      endWrite();
      setBusy(false);
    }
  }

  async function onAdd(deckId: string, deckName: string) {
    if (!startWrite()) return;
    const act = actOf(deckId);
    setBusy(true);
    setRefused(null);
    try {
      if (act?.kind === "added") {
        const r = await undoReadAddAction(deckId, card.oracleId);
        if (!r.ok) return setRefused({ deckId, kind: "undo" });
        setAct(deckId, null);
        setAnnounced(read.announceAddUndone(name, deckName));
      } else {
        const toBuy = freeNow === 0;
        const r = await addFromFits(deckId, card.oracleId);
        if (!r.ok) return setRefused({ deckId, kind: "add" });
        if (!r.held) {
          setAct(deckId, { kind: "added", toBuy });
          setAnnounced(read.announceAdded(name, deckName));
        }
      }
      await list.refresh(true);
    } catch {
      setRefused({ deckId, kind: act?.kind === "added" ? "undo" : "add" });
    } finally {
      endWrite();
      setBusy(false);
    }
  }
  // The decks a press would send to be read, as the list stands: the view's candidates and the refusal's key.
  const candidates = fitsCandidates(panel, list.read);
  const candidateKey = fitsCandidateKey(panel, list.read);

  // Latched: once drawn, a later read (a Try again, a refresh) keeps the body on screen until it lands.
  const [bodyReady, setBodyReady] = useState(() => restored !== null);
  if (!bodyReady && panelRead && list.load.state !== "loading") setBodyReady(true);

  return (
    <FitsViewDrawing
      card={card}
      name={name}
      owned={owned}
      freeNow={freeNow}
      countsKnown={countsKnown}
      panel={panel}
      list={{
        read: list.read, shown: list.shown, holds: list.holds, role: list.role, loadState: list.load.state,
        busy: list.busy, refused: list.refused, noteFor: list.noteFor,
      }}
      running={running}
      now={now}
      runCount={runCount}
      pressFailed={pressFailed}
      tooBigFor={tooBigFor}
      fresh={fresh}
      foldOpen={foldOpen}
      busy={busy}
      writing={writing}
      refused={refused}
      actFor={actOf}
      announced={announced}
      bodyReady={bodyReady}
      restored={restored !== null}
      leaving={leaving}
      headingRef={headingRef}
      onBack={onBack}
      onOpenCard={onOpenCard}
      onPress={() => void press()}
      onToggleFold={() => setFoldOpen((o) => !o)}
      onRetryList={list.retry}
      onSwap={(deckId, cut, cutName) => void onSwap(deckId, cut, cutName)}
      onAddRead={(deckId, deckName) => void onAdd(deckId, deckName)}
      onAddFree={(deck) => void addFree(deck)}
    />
  );
}
