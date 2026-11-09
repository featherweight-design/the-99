"use client";

// WHICH DECK, DRAWN FROM PROPS (landing demo split 5k). Everything Find a deck's view draws, with no server action, no
// session and no per-user module: the header, the read's band (offer, running, refused, failed, no fit, stale), the read's
// rows, the free list and the decks that already hold the card. `fits-view.tsx` is the signed-in half: it reads the list
// and the panel, keeps the state and the four writes, and hands this what to draw and what each press does. The demo
// draws this with a fixture and a callback that writes nothing.
import { Chevron } from "../ui/chevron";
import type { RefObject } from "react";

import type { BrowseCard } from "../../lib/collection/browse";
import { colorWords } from "../../lib/copy/color-labels";
import { creditsCopy } from "../../lib/copy/credits";
import { swapToolsCopy } from "../../lib/copy/swap-tools";
import type { FitDeck, FitsRead } from "../../lib/swaps/fits";
import type { FitsReadPanel } from "../../lib/swaps/fits-read-run";
import { HoverPreviewProvider } from "../decks/hover-preview";
import { FitsHolds, FitsRows, FitsStapleNote } from "./fits-rows";
import { CreditButton } from "../ui/credit-button";
import { CreditsText } from "../ui/credits-text";
import { FailedBand, NoFitBox, OfferBand, RefusedBand, RunningBand } from "./read-band";
import { ReadRow, type RowAct } from "./read-row";
import { hasCredit } from "../../lib/model/allowance-rule";
import { creditCount, creditFirst, creditLineKind, creditSpent, creditStanding, welcomeNext } from "../../lib/model/credit-line";

const copy = swapToolsCopy.fits;
const read = copy.read;

const clock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
const when = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

/** The free list as the view draws it: what `useFitsList` holds, without its writes. */
export type FitsViewList = {
  /** The list as last read, null until the first read lands (or when it failed). */
  read: FitsRead | null;
  /** The rows in the order they opened in, minus the decks an add found already holding the card. */
  shown: FitDeck[];
  /** The decks that already hold the card, minus the ones this visit added to. */
  holds: FitsRead["holds"];
  /** The card's role (`"other"` until read), which words the staple note. */
  role: string;
  loadState: "loading" | "failed" | "ready";
  /** The deck an add is in flight for: every Add waits for it. */
  busy: string | null;
  /** The deck whose add was refused. */
  refused: string | null;
  /** The note stamped on a deck this visit added to, else null. */
  noteFor: (deckId: string) => string | null;
};

/** Who can take the card is the list as last read, never the panel's opening count: an add from the
 *  free list leaves fewer decks to read. The panel's zero (no deck, or not Commander-legal) stands. */
export const fitsCandidates = (panel: FitsReadPanel | null, listRead: FitsRead | null) =>
  !panel || panel.candidates === 0 ? 0 : listRead ? listRead.fits.length : panel.candidates;
/** The decks a read would be for, as one key: a refusal for too many holds only while these are still the decks. */
export const fitsCandidateKey = (panel: FitsReadPanel | null, listRead: FitsRead | null) =>
  ((listRead ?? panel?.fits)?.fits ?? []).map((d) => d.id).join(",");

export type FitsViewDrawingProps = {
  card: Pick<BrowseCard, "oracleId" | "colorIdentity">;
  /** The card's name as drawn (the printed name when it has one). */
  name: string;
  owned: number;
  freeNow: number;
  /** Whether the copies line is known yet (`useFitsList`'s `countsKnown`). */
  countsKnown: boolean;
  panel: FitsReadPanel | null;
  list: FitsViewList;
  /** When the read running now started (ms), or null when none runs. */
  running: number | null;
  /** The clock's now (ms): the running band's elapsed time is this minus `running`. */
  now: number;
  /** The decks a running read was pressed for. */
  runCount: number | null;
  pressFailed: boolean;
  tooBigFor: string | null;
  /** The read this visit's press produced: its sub reads `just now` rather than a date. */
  fresh: string | null;
  foldOpen: boolean;
  /** A write from a read row is in flight (this view's). */
  busy: boolean;
  /** A write from this view is in flight, across a card opened over it. */
  writing: boolean;
  refused: { deckId: string; kind: "swap" | "add" | "undo" } | null;
  /** What the reader did on a row of the read this visit. */
  actFor: (deckId: string) => RowAct;
  /** The screen-reader line (`role=status`). */
  announced: string;
  /** Nothing draws under the header until the list and the panel have both answered. */
  bodyReady: boolean;
  /** A return draws what the view last drew, with no entrance. */
  restored: boolean;
  leaving: boolean;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onBack: () => void;
  onOpenCard: (oracleId: string) => void;
  /** Read (or Read again, or Try again): the paid read's press. */
  onPress: () => void;
  onToggleFold: () => void;
  onRetryList: () => void;
  /** A read row's Swap in (or its undo): the deck, the card cut, the cut's name. */
  onSwap: (deckId: string, cut: string, cutName: string) => void;
  /** A read row's Add only (or its undo). */
  onAddRead: (deckId: string, deckName: string) => void;
  /** The free list's Add. */
  onAddFree: (deck: FitDeck) => void;
};

export function FitsViewDrawing({
  card, name, owned, freeNow, countsKnown, panel, list, running, now, runCount, pressFailed, tooBigFor, fresh, foldOpen,
  busy, writing, refused, actFor, announced, bodyReady, restored, leaving, headingRef,
  onBack, onOpenCard, onPress, onToggleFold, onRetryList, onSwap, onAddRead, onAddFree,
}: FitsViewDrawingProps) {
  const deckOf = (deckId: string) => {
    const row = list.read?.fits.find((d) => d.id === deckId) ?? panel?.fits.fits.find((d) => d.id === deckId);
    if (row) return { name: row.name, commanders: row.commanders };
    const held = list.read?.holds.find((h) => h.id === deckId) ?? panel?.fits.holds.find((h) => h.id === deckId);
    return { name: held?.name ?? "", commanders: held?.commanders ?? [] };
  };

  // ── What the band draws ────────────────────────────────────────────
  const allowance = panel?.allowance;
  const spent = allowance ? !hasCredit(allowance) : false;
  // Paused (the model-call switch is off) closes the band exactly as the owner's share does, with its own line.
  const closed = allowance?.ownerShare === true || allowance?.paused === true;
  const blocked = !allowance || spent || closed || running !== null;
  const standing = !allowance ? "" : allowance.paused
    ? creditsCopy.paused
    : allowance.ownerShare
    ? creditsCopy.ownerShare(new Date())
    : spent
      ? creditSpent(allowance)
      : creditStanding(allowance);
  // The footers under a finished read state where the credits stand, never what the NEXT run will spend
  // (`creditStanding`'s L3 form says "this run uses 1 of N paid"): the count alone.
  const footStanding = !allowance ? "" : closed || spent ? standing : creditCount(allowance);
  const stored = panel?.view.stored ?? null;
  // A stored read that has gone out of date is drawn marked so, never as current (lock 6): a note
  // names what moved and offers Read again, and a changed deck's row is dimmed with its actions off.
  const stale = stored && !stored.current ? stored : null;
  const failed = pressFailed || (panel?.view.failed != null && running === null);
  // Who can take the card is the list as last read, never the panel's opening count: an add from the
  // free list leaves fewer decks to read. The panel's zero (no deck, or not Commander-legal) stands.
  const candidates = fitsCandidates(panel, list.read);
  // The list as last read, never the rows it opened with: an add to the last deck that could take the
  // card leaves nothing to read for, and the offer goes (P1b).
  const noList = list.read !== null && list.read.fits.length === 0;
  const candidateKey = fitsCandidateKey(panel, list.read);
  const tooBig = tooBigFor !== null && tooBigFor === candidateKey;
  const oneDeck = candidates === 1 ? (list.read ?? panel?.fits)?.fits[0]?.name ?? null : null;
  const showsBand = panel !== null && candidates > 0 && !noList;
  // Not gated on the band: once every candidate has taken the card (resolved, F2) there is no band,
  // and the read still reopens with its rows settled.
  // A run in flight does not take what was drawn away: a Read again keeps the old read on screen, under the
  // running band and with its actions held, until the new one lands (only a first read draws still rows).
  const result = panel !== null && !failed && stored?.outcome === "picks" ? stored : null;
  const noFit = showsBand && !failed && stored?.outcome === "noFit" ? stored : null;
  // A change in which decks can take the card is the set's (P10a): it names no deck and tags no row,
  // even when a candidate's own inputs moved in the same span.
  const changedOf = new Map((stale && !stale.setChanged ? stale.changed : []).map((c) => [c.deckId, c.reason]));
  // A deck that is no longer a candidate drops from the read (P10b); one that took the card stays,
  // resolved, whether before this visit, through the free list, or through the row's own press.
  const fitsNow = list.read ?? panel?.fits ?? null;
  const keptIds = new Set([...(fitsNow?.fits ?? []), ...(fitsNow?.holds ?? [])].map((d) => d.id));
  // A pick naming a card the panel has no name for (its catalog read failed) is left out rather than drawn
  // under another card's name, which would open the wrong card.
  const named = (id: string) => id === card.oracleId || id in (panel?.names ?? {});
  const nameable = (p: NonNullable<typeof result>["picks"][number]) =>
    (p.cut === null || named(p.cut)) && p.parts.every((part) => !("card" in part) || named(part.card));
  const rowsShown = result?.picks.filter((p) => nameable(p) && (keptIds.has(p.deckId) || result.resolved.includes(p.deckId) || !!actFor(p.deckId))) ?? [];
  const staleText = !stale ? null
    : stale.setChanged ? read.staleSet(when(stale.at))
    : stale.changed.length > 1 ? read.staleMany(stale.changed.length, when(stale.at))
    : stale.outcome === "noFit" ? read.noFitChanged(deckOf(stale.changed[0]?.deckId ?? "").name, when(stale.at))
    : stale.changed[0]?.reason === "overview" ? read.staleOverview(deckOf(stale.changed[0].deckId).name, when(stale.at))
    : stale.changed.length === 1 ? read.staleOne(deckOf(stale.changed[0].deckId).name, when(stale.at))
    : read.staleSet(when(stale.at));
  const staleLine = blocked
    ? standing
    : stale?.outcome === "noFit"
      ? creditFirst(allowance!)
      : (creditLineKind(allowance!) !== "paidNext" ? read.again : welcomeNext(allowance!) ? read.againWelcome : read.againPaid)(creditCount(allowance!));
  const staleNote = stale && staleText ? (
    <section data-testid="read-stale" className="flex flex-col gap-[10px] rounded-[10px] px-[14px] py-[12px] border border-dashed border-[color:var(--border-dashed)]">
      <p className="m-0 text-[12.5px] leading-[1.5] text-[color:var(--fg-body)] [text-wrap:pretty]">{staleText}</p>
      <div className="flex">
        <CreditButton
          label={read.readAgain}
          credit={read.credit}
          filled={false}
          blocked={blocked}
          spent={spent || closed}
          onPress={onPress}
          // The owner's share used, no credit is out: the press is named alone, never `No credits left`.
          ariaLabel={closed && !spent ? read.readAgain : undefined}
        />
      </div>
      <p className="m-0 font-mono text-[10.5px] text-[color:var(--fg-faint)]"><CreditsText text={staleLine} /></p>
    </section>
  ) : null;
  const isFresh = (s: { readId: string }) => s.readId === fresh;


  let band = null;
  const noFitBox = noFit ? <NoFitBox
    body={isFresh(noFit) ? (oneDeck ? read.noFitBodyOne(oneDeck, name) : read.noFitBody(noFit.candidates, name)) : read.noFitBodyStored(noFit.candidates, name)}
    foot={isFresh(noFit) ? read.noFitFootNow : read.noFitFootStored(when(noFit.at))}
  /> : null;
  if (showsBand) {
    if (running !== null) {
      band = <>
        <RunningBand title={read.running(panel?.view.pending?.candidates ?? runCount ?? candidates, name)} elapsed={clock(now - running)} still={!result && !noFit} />
        {noFitBox ? <div className="opacity-[0.72]">{noFitBox}</div> : null}
      </>;
    } else if (tooBig && !failed) band = <RefusedBand head={read.tooBigHead} body={read.tooBigBody} standing={footStanding} />;
    else if (failed) band = <FailedBand blocked={blocked} spent={spent} closed={closed} standing={standing} onRetry={onPress} />;
    else if (noFit) {
      // P6c: the old no fit stays on screen, faded, under the note that re-offers the read.
      band = stale ? <>{staleNote}<div className="opacity-[0.72]">{noFitBox}</div></> : noFitBox;
    } else if (result && stale) {
      band = staleNote;
    } else if (!result) {
      band = <OfferBand
        lead={oneDeck ? read.offerLeadOne(oneDeck, name) : read.offerLead(candidates, name)}
        cardName={name}
        blocked={blocked}
        spent={spent}
        closed={closed}
        standing={standing}
        onPress={onPress}
      />;
    }
  }

  // The decks holding the card as the list was last read: a deck the read's row just swapped or added
  // into, or one another tab got to, leaves the free list and turns its read row's actions off.
  // Every row action waits on any write in flight, the folded list's included, and on a count the
  // view does not have yet: the list's first read, a Try again in flight, or a re-read that failed
  // after a write, which leaves the opening count spent.
  const rowsLocked = busy || writing || running !== null || list.busy !== null || list.loadState !== "ready";
  const heldNow = new Set(list.read?.holds.map((h) => h.id) ?? []);
  // The free list as last read, in the order it opened: a deck still listed is drawn as it reads now,
  // one that left (took the card, or no longer fits) stays only while it carries this visit's Add
  // stamp, and a deck newly listed (another tab took the card out) joins at the end.
  const liveFits = (list.read?.fits ?? []).filter((d) => !heldNow.has(d.id));
  const liveById = new Map(liveFits.map((d) => [d.id, d]));
  const openedIds = new Set(list.shown.map((r) => r.id));
  const freeRows = [
    ...list.shown.flatMap((r) => liveById.get(r.id) ?? (list.noteFor(r.id) !== null ? r : [])),
    ...liveFits.filter((d) => !openedIds.has(d.id)),
  ];
  const freeList = list.read && freeRows.length > 0 ? (
    <FitsRows
      rows={freeRows}
      staple={list.read.staple}
      cardName={name}
      freeNow={freeNow}
      // A read row's write holds the folded list too: one mutation at a time across the view.
      busy={list.busy ?? (busy || writing ? "read" : null)}
      refused={list.refused}
      noteFor={list.noteFor}
      onAdd={onAddFree}
      onOpenCard={onOpenCard}
    />
  ) : null;



  return (
    <div data-testid="fits-view" className={`${leaving ? "anim-view-out" : restored ? "" : "anim-view-in"} relative flex flex-col h-full min-h-0 bg-[color:var(--surface-sunken)] md:bg-[color:var(--surface-rail)]`}>
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

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-[16px] pt-[16px] pb-[28px] md:px-[30px] md:pt-[18px] md:pb-[30px]">
        {/* Every card the view names previews on hover (a row's marks, the free list's reasons). */}
        <HoverPreviewProvider waitForMove className="flex flex-col gap-[16px]">
        {/* Nothing until the list and the panel have both answered: the band and the read's rows arrive with
            the list, never after it, so nothing shifts in under the reader. */}
        {bodyReady ? <>
        {band}

        {result ? (
          <section aria-label={read.resultHead} className="flex flex-col gap-[10px]">
            <div className="flex flex-wrap items-baseline gap-x-[10px] gap-y-[2px]">
              <h3 className="m-0 text-[14px] font-semibold text-[color:var(--fg)]">{read.resultHead}</h3>
              <span className="font-mono text-[10.5px] text-[color:var(--fg-faint)]">
                {stale
                  ? read.resultSubStale(when(result.at))
                  : isFresh(result)
                    ? (result.candidates === 1 ? read.resultSubNowOne : read.resultSubNow(result.picks.length, result.candidates))
                    : read.resultSubStored(when(result.at), result.picks.length, result.candidates)}
              </span>
            </div>
            {rowsShown.map((p) => {
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
                  images={panel?.images ?? {}}
                  commanderIds={panel?.commanderIds?.[p.deckId] ?? []}
                  readCard={card.oracleId}
                  cardName={name}
                  freeNow={freeNow}
                  act={actFor(p.deckId)}
                  // Took the card some other way since the read (the free list, another visit): resolved,
                  // not changed (READINESS-audit F2), and nothing left to press on this row.
                  settled={!actFor(p.deckId) && (result.resolved.includes(p.deckId) || heldNow.has(p.deckId))}
                  changed={changedOf.get(p.deckId) ?? null}
                  busy={rowsLocked}
                  refused={refused?.deckId === p.deckId ? refused.kind : null}
                  onSwap={() => p.cut && onSwap(p.deckId, p.cut, panel?.names[p.cut] ?? "")}
                  onAdd={() => onAddRead(p.deckId, deck.name)}
                  onOpenCard={onOpenCard}
                />
              );
            })}
            {stale ? null : result.refunded ? (
              <div data-testid="read-thin" className="flex flex-col gap-[4px] rounded-[9px] px-[14px] py-[11px] border border-dashed border-[color:var(--border-dashed)]">
                <p className="m-0 text-[12.5px] text-[color:var(--fg-body)]">{read.thin(result.picks.length)}</p>
                <p className="m-0 font-mono text-[10.5px] text-[color:var(--fg-faint)]"><CreditsText text={`${read.thinSub} · ${footStanding}`} /></p>
              </div>
            ) : (
              <p className="m-0 font-mono text-[10.5px] text-[color:var(--fg-faint)]">
                <CreditsText text={!isFresh(result)
                  ? read.resultFootStored
                  : oneDeck
                    ? `${read.onlyOne(oneDeck, name)} · ${read.resultFootSpent} · ${footStanding}`
                    : `${read.resultFootSpent} · ${footStanding}`} />
              </p>
            )}
          </section>
        ) : null}

        {list.read?.staple ? <FitsStapleNote name={name} role={list.role} /> : null}

        {list.loadState === "failed" ? (
          <div role="alert" className="flex flex-col items-start gap-[8px]">
            <p className="m-0 text-[13px] text-[color:var(--fg-body)]">{copy.failed.body}</p>
            <button type="button" onClick={onRetryList} className="bg-transparent border-0 p-0 cursor-pointer text-[13px] font-semibold text-[color:var(--accent-text)]">
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
              onClick={onToggleFold}
              className={`flex items-center justify-between gap-[10px] min-h-[44px] md:min-h-[38px] bg-transparent cursor-pointer border-0 border-t border-solid border-t-[color:var(--border)] text-left ${foldOpen ? "" : "border-b-[1px] border-b-[color:var(--border)]"}`}
            >
              <span className="text-[13px] text-[color:var(--fg-body)]">{read.fold}</span>
              <span className="flex items-center gap-[8px]">
                <span className="font-mono text-[11px] text-[color:var(--fg-muted)]">{freeRows.length}</span>
                <Chevron kind="disclosure" open={foldOpen} className="text-[color:var(--fg-muted)]" />
              </span>
            </button>
            {foldOpen ? <div className="pt-[10px]">{freeList}</div> : null}
          </div>
        ) : freeList}

        {list.holds.length > 0 && (!result || foldOpen) ? <FitsHolds holds={list.holds} /> : null}
        </> : null}
        </HoverPreviewProvider>
      </div>
      {/* Desktop: the body fades to the rail at its foot (design table, Body). */}
      <div aria-hidden className="hidden md:block pointer-events-none absolute inset-x-0 bottom-0 h-[56px] bg-[linear-gradient(to_bottom,transparent,var(--surface-rail))]" />
      <p role="status" className="sr-only">{announced}</p>
    </div>
  );
}
