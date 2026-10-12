"use client";

// FIND A DECK, AS A VIEW INSIDE CARD DETAILS (handoff R2, `FIND_A_DECK_READ_ENABLED`). The door no
// longer stacks a picker over the card: the details pane gives way to this view, the art column
// stays on desktop, and `← {card}` in the ✕'s slot is the one way back (Escape too, one layer). The
// band offers the paid read first; the free list sits under it, folded once a read lands.
//
// The read's rows act on the reader's decks: Swap in is the stand-ins take with the read's cut, and
// Add only is the free list's add with nothing cut. What the reader did on each row is held by the
// provider (`memory`), so a card opened from the view and closed again comes back to the same rows.
import { useCallback, useEffect, useRef, useState } from "react";

import type { BrowseCard } from "../../lib/collection/browse";
import { colorWords } from "../../lib/copy/color-labels";
import { creditsCopy } from "../../lib/copy/credits";
import { swapToolsCopy } from "../../lib/copy/swap-tools";
import { addFromFits, swapFromReadAction, undoReadAddAction, undoReadSwapAction } from "../../lib/swaps/actions";
import { pressFitsReadAction, readFitsReadAction } from "../../lib/swaps/fits-read-actions";
import type { FitsReadPanel } from "../../lib/swaps/fits-read-run";
import { FitsHolds, FitsRows, FitsStapleNote, useFitsList } from "./fits-picker";
import { FailedBand, NoFitBox, OfferBand, RunningBand } from "./read-band";
import { ReadRow, type RowAct } from "./read-row";

const copy = swapToolsCopy.fits;
const read = copy.read;

/** What the reader did on the read's rows this visit, kept by the provider across a card opened over it. */
export type FitsViewMemory = Record<string, RowAct>;

/** How often a read in flight is asked after while the view waits on it (lock 5: one run, polled). */
const POLL_MS = 3000;

const clock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
const when = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

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
  const list = useFitsList(card);
  const { name, freeNow, owned, countsKnown } = list;
  const [panel, setPanel] = useState<FitsReadPanel | null>(null);
  const [running, setRunning] = useState<number | null>(null);
  const [pressFailed, setPressFailed] = useState(false);
  // The read this visit's press produced: its sub reads `just now` rather than a date.
  const [fresh, setFresh] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [foldOpen, setFoldOpen] = useState(false);
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

  // Focus starts on the view's heading (D1).
  useEffect(() => headingRef.current?.focus(), []);

  const adopt = useCallback((p: FitsReadPanel | null) => {
    setPanel(p);
    const pending = p?.view.pending ?? null;
    setRunning(pending ? Date.parse(pending.startedAt) : null);
  }, []);

  useEffect(() => {
    let live = true;
    readFitsReadAction(card.oracleId).then((p) => { if (live) adopt(p); }).catch(() => {});
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
  const polling = running !== null && panel?.view.pending != null;
  useEffect(() => {
    if (!polling) return;
    const t = setInterval(() => {
      readFitsReadAction(card.oracleId).then((p) => { if (p && !p.view.pending) settle(p, null); }).catch(() => {});
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
    setNow(Date.now());
    setPressFailed(false);
    setAnnounced(read.announceStarted);
    pressing.current = true;
    try {
      const res = await pressFitsReadAction(card.oracleId);
      pressing.current = false;
      if (!(res.ok && res.panel.view.pending) || !mounted.current) readingRef.current(false);
      if (res.ok) {
        if (res.panel.view.pending) adopt(res.panel);
        else settle(res.panel, before);
        return;
      }
      setRunning(null);
      // A refusal costs nothing: the panel is read again so the band says why (a current read, no
      // credit, the pause) rather than a failure the reader did not have.
      const again = await readFitsReadAction(card.oracleId).catch(() => null);
      if (again) adopt(again);
      if (res.reason === "notFound" || res.reason === "noCandidates" || res.reason === "tooBig") setPressFailed(true);
    } catch {
      pressing.current = false;
      readingRef.current(false);
      setRunning(null);
      setPressFailed(true);
      setAnnounced(read.announceFailed);
    }
  }

  const deckOf = (deckId: string) => {
    const row = list.read?.fits.find((d) => d.id === deckId) ?? panel?.fits.fits.find((d) => d.id === deckId);
    if (row) return { name: row.name, commanders: row.commanders };
    const held = list.read?.holds.find((h) => h.id === deckId) ?? panel?.fits.holds.find((h) => h.id === deckId);
    return { name: held?.name ?? "", commanders: held?.commanders ?? [] };
  };

  async function onSwap(deckId: string, cut: string, cutName: string) {
    if (!list.claim()) return;
    const act = memory[deckId];
    setBusy(true);
    setRefused(null);
    try {
      if (act?.kind === "swapped") {
        const r = await undoReadSwapAction(act.swapId);
        if (!r.ok) return setRefused({ deckId, kind: "undo" });
        setMemory((m) => ({ ...m, [deckId]: null }));
        setAnnounced(read.announceUndone(name, cutName));
      } else {
        const r = await swapFromReadAction(deckId, cut, card.oracleId);
        if (!r.ok) return setRefused({ deckId, kind: "swap" });
        setMemory((m) => ({ ...m, [deckId]: { kind: "swapped", swapId: r.swapId } }));
        setAnnounced(read.announceSwapped(name, cutName));
      }
      await list.refresh(true);
    } catch {
      setRefused({ deckId, kind: act?.kind === "swapped" ? "undo" : "swap" });
    } finally {
      list.release();
      setBusy(false);
    }
  }

  async function onAdd(deckId: string, deckName: string) {
    if (!list.claim()) return;
    const act = memory[deckId];
    setBusy(true);
    setRefused(null);
    try {
      if (act?.kind === "added") {
        const r = await undoReadAddAction(deckId, card.oracleId);
        if (!r.ok) return setRefused({ deckId, kind: "undo" });
        setMemory((m) => ({ ...m, [deckId]: null }));
        setAnnounced(read.announceAddUndone(name, deckName));
      } else {
        const toBuy = freeNow === 0;
        const r = await addFromFits(deckId, card.oracleId);
        if (!r.ok) return setRefused({ deckId, kind: "add" });
        if (!r.held) {
          setMemory((m) => ({ ...m, [deckId]: { kind: "added", toBuy } }));
          setAnnounced(read.announceAdded(name, deckName));
        }
      }
      await list.refresh(true);
    } catch {
      setRefused({ deckId, kind: act?.kind === "added" ? "undo" : "add" });
    } finally {
      list.release();
      setBusy(false);
    }
  }

  // ── What the band draws ────────────────────────────────────────────
  const allowance = panel?.allowance;
  const left = allowance ? Math.max(0, allowance.limit - allowance.used) : 0;
  const spent = allowance ? allowance.used >= allowance.limit : false;
  const closed = !!allowance?.paused || allowance?.ownerShare === true;
  const blocked = !allowance || spent || closed || running !== null;
  const standing = !allowance ? "" : allowance.paused
    ? creditsCopy.paused(allowance.paused.until)
    : allowance.ownerShare
      ? creditsCopy.ownerShare(new Date())
      : spent
        ? creditsCopy.spent(allowance.limit, allowance.reopensAt ?? allowance.nextAt)
        : creditsCopy.standing(left, allowance.limit, allowance.nextAt);
  const stored = panel?.view.stored ?? null;
  // Shown only while CURRENT (lock 6). A read that has gone out of date offers the press again,
  // and never draws as if it still held.
  const current = stored?.current ? stored : null;
  const failed = pressFailed || (panel?.view.failed != null && running === null);
  const candidates = panel?.candidates ?? 0;
  const noList = list.read !== null && list.shown.length === 0;
  const oneDeck = candidates === 1 ? list.shown[0]?.name ?? null : null;
  const showsBand = panel !== null && candidates > 0 && !noList;
  // Not gated on the band: once every candidate has taken the card (resolved, F2) there is no band,
  // and the read still reopens with its rows settled.
  const result = panel !== null && running === null && !failed && current?.outcome === "picks" ? current : null;
  const noFit = showsBand && running === null && !failed && current?.outcome === "noFit" ? current : null;
  const isFresh = (s: { readId: string }) => s.readId === fresh;

  let band = null;
  if (showsBand) {
    if (running !== null) band = <RunningBand title={read.running(candidates, name)} elapsed={clock(now - running)} />;
    else if (failed) band = <FailedBand blocked={blocked} spent={spent} closed={closed} standing={standing} onRetry={() => void press()} />;
    else if (noFit) {
      band = <NoFitBox
        body={isFresh(noFit) ? (oneDeck ? read.noFitBodyOne(oneDeck, name) : read.noFitBody(noFit.candidates, name)) : read.noFitBodyStored(noFit.candidates, name)}
        foot={isFresh(noFit) ? read.noFitFootNow : read.noFitFootStored(when(noFit.at))}
      />;
    } else if (!result) {
      band = <OfferBand
        lead={oneDeck ? read.offerLeadOne(oneDeck, name) : read.offerLead(candidates, name)}
        cardName={name}
        blocked={blocked}
        spent={spent}
        closed={closed}
        standing={standing}
        onPress={() => void press()}
      />;
    }
  }

  // The decks holding the card as the list was last read: a deck the read's row just swapped or added
  // into, or one another tab got to, leaves the free list and turns its read row's actions off.
  // Every row action waits on any write in flight, the folded list's included, and on a count the
  // view no longer has: a re-read that failed after a write leaves the opening count spent.
  const rowsLocked = busy || list.busy !== null || list.load.state === "failed";
  const heldNow = new Set(list.read?.holds.map((h) => h.id) ?? []);
  const freeRows = list.shown.filter((r) => !heldNow.has(r.id) || list.noteFor(r.id) !== null);
  const freeList = list.read && freeRows.length > 0 ? (
    <FitsRows
      rows={freeRows}
      staple={list.read.staple}
      cardName={name}
      freeNow={freeNow}
      // A read row's write holds the folded list too: one mutation at a time across the view.
      busy={list.busy ?? (busy ? "read" : null)}
      refused={list.refused}
      noteFor={list.noteFor}
      onAdd={(deck) => void list.add(deck)}
      onOpenCard={onOpenCard}
    />
  ) : null;

  return (
    <div data-testid="fits-view" className={`${leaving ? "anim-view-out" : "anim-view-in"} relative flex flex-col h-full min-h-0 bg-[color:var(--surface-sunken)] md:bg-[color:var(--surface-rail)]`}>
      <header className="flex-none px-[16px] pt-[12px] pb-[14px] md:pl-[30px] md:pr-[22px] md:pt-[22px] md:pb-[16px] border-b border-b-[color:var(--border)] border-[color:var(--border)]">
        <div className="flex items-center justify-between gap-[12px] min-h-[44px]">
          <h2 ref={headingRef} tabIndex={-1} className="m-0 flex-none whitespace-nowrap font-display text-[19px] leading-[1.2] md:text-[22px] text-[color:var(--fg)] outline-none">
            {copy.pickerTitle}
          </h2>
          <button
            type="button"
            data-testid="fits-view-back"
            onClick={onBack}
            aria-label={read.backAria(name)}
            className="min-w-0 inline-flex items-center gap-[6px] h-[44px] md:h-[36px] max-w-[200px] md:max-w-[260px] px-[14px] rounded-full cursor-pointer text-[12.5px] font-semibold text-[color:var(--fg)] bg-[color:var(--elevated)] border border-solid border-[color:var(--border-strong)]"
          >
            <span aria-hidden>←</span>
            <span className="min-w-0 truncate">{name}</span>
          </button>
        </div>
        <p className="m-0 mt-[4px] font-mono text-[10.5px] text-[color:var(--fg-muted)]">
          {copy.identity(card.colorIdentity.length === 0 ? "colorless" : colorWords(card.colorIdentity))}
          {countsKnown ? (
            <>
              {" · "}
              <span data-testid="fits-copies" style={{ color: freeNow > 0 ? "var(--fg-body)" : "var(--fg-muted)" }}>{copy.copies(owned, freeNow)}</span>
            </>
          ) : null}
        </p>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain flex flex-col gap-[16px] px-[16px] pt-[16px] pb-[28px] md:px-[30px] md:pt-[18px] md:pb-[30px]">
        {band}

        {result ? (
          <section aria-label={read.resultHead} className="flex flex-col gap-[10px]">
            <div className="flex flex-wrap items-baseline gap-x-[10px] gap-y-[2px]">
              <h3 className="m-0 text-[14px] font-semibold text-[color:var(--fg)]">{read.resultHead}</h3>
              <span className="font-mono text-[10.5px] text-[color:var(--fg-faint)]">
                {isFresh(result)
                  ? (result.candidates === 1 ? read.resultSubNowOne : read.resultSubNow(result.picks.length, result.candidates))
                  : read.resultSubStored(when(result.at), result.picks.length, result.candidates)}
              </span>
            </div>
            {result.picks.map((p) => {
              const deck = deckOf(p.deckId);
              return (
                <ReadRow
                  key={p.deckId}
                  deckId={p.deckId}
                  deckName={deck.name}
                  commanders={deck.commanders}
                  planSource={p.planSource}
                  parts={p.parts}
                  cut={p.cut}
                  names={panel?.names ?? {}}
                  cardName={name}
                  freeNow={freeNow}
                  act={memory[p.deckId] ?? null}
                  // Took the card some other way since the read (the free list, another visit): resolved,
                  // not changed (READINESS-audit F2), and nothing left to press on this row.
                  settled={!memory[p.deckId] && (result.resolved.includes(p.deckId) || heldNow.has(p.deckId))}
                  busy={rowsLocked}
                  refused={refused?.deckId === p.deckId ? refused.kind : null}
                  onSwap={() => p.cut && void onSwap(p.deckId, p.cut, panel?.names[p.cut] ?? "")}
                  onAdd={() => void onAdd(p.deckId, deck.name)}
                  onOpenCard={onOpenCard}
                />
              );
            })}
            {result.refunded ? (
              <div data-testid="read-thin" className="flex flex-col gap-[4px] rounded-[9px] px-[14px] py-[11px] border border-dashed border-[color:var(--border-dashed)]">
                <p className="m-0 text-[12.5px] text-[color:var(--fg-body)]">{read.thin(result.picks.length)}</p>
                <p className="m-0 font-mono text-[10.5px] text-[color:var(--fg-faint)]">{`${read.thinSub} · ${standing}`}</p>
              </div>
            ) : (
              <p className="m-0 font-mono text-[10.5px] text-[color:var(--fg-faint)]">
                {!isFresh(result)
                  ? read.resultFootStored
                  : oneDeck
                    ? `${read.onlyOne(oneDeck, name)} · ${read.resultFootSpent} · ${standing}`
                    : `${read.resultFootSpent} · ${standing}`}
              </p>
            )}
          </section>
        ) : null}

        {list.read?.staple ? <FitsStapleNote name={name} role={list.role} /> : null}

        {list.load.state === "failed" ? (
          <div role="alert" className="flex flex-col items-start gap-[8px]">
            <p className="m-0 text-[13px] text-[color:var(--fg-body)]">{copy.failed.body}</p>
            <button type="button" onClick={list.retry} className="bg-transparent border-0 p-0 cursor-pointer text-[13px] font-semibold text-[color:var(--accent)]">
              {swapToolsCopy.sheet.retry}
            </button>
          </div>
        ) : null}
        {list.read && list.shown.length === 0 && list.read.holds.length > 0 ? (
          <p className="m-0 text-[13px] leading-[1.55] text-[color:var(--fg-body)]">{copy.allHold(name)}</p>
        ) : null}
        {list.read && list.shown.length === 0 && list.read.holds.length === 0 ? (
          <p className="m-0 text-[13px] leading-[1.55] text-[color:var(--fg-body)]">
            {list.read.card.colorIdentity.length === 1
              ? copy.noneByColorsOne(name, colorWords(list.read.card.colorIdentity))
              : copy.noneByColors(name, colorWords(list.read.card.colorIdentity), list.read.card.colorIdentity.length)}
          </p>
        ) : null}

        {freeList && result ? (
          <div className="flex flex-col">
            <button
              type="button"
              data-testid="fits-fold"
              aria-expanded={foldOpen}
              aria-label={read.foldAria(freeRows.length, foldOpen)}
              onClick={() => setFoldOpen((o) => !o)}
              className={`flex items-center justify-between gap-[10px] min-h-[44px] md:min-h-[38px] bg-transparent cursor-pointer border-0 border-t border-solid border-t-[color:var(--border)] text-left ${foldOpen ? "" : "border-b-[1px] border-b-[color:var(--border)]"}`}
            >
              <span className="text-[13px] text-[color:var(--fg-body)]">{read.fold}</span>
              <span className="flex items-center gap-[8px]">
                <span className="font-mono text-[11px] text-[color:var(--fg-muted)]">{freeRows.length}</span>
                <span aria-hidden className="text-[10px] text-[color:var(--fg-muted)]">{foldOpen ? "▾" : "▸"}</span>
              </span>
            </button>
            {foldOpen ? <div className="pt-[10px]">{freeList}</div> : null}
          </div>
        ) : freeList}

        {list.holds.length > 0 && (!result || foldOpen) ? <FitsHolds holds={list.holds} /> : null}
      </div>
      {/* Desktop: the body fades to the rail at its foot (design table, Body). */}
      <div aria-hidden className="hidden md:block pointer-events-none absolute inset-x-0 bottom-0 h-[56px] bg-[linear-gradient(to_bottom,transparent,var(--surface-rail))]" />
      <p role="status" className="sr-only">{announced}</p>
    </div>
  );
}
