"use client";

// Mana Balance's one door to help (Tuning hub handoff R3b, design table `ImproveDoor`, `ColorStep`,
// `HelpResult`; rulings 2026-10-11): `Improve my mana` opens a step listing the deck's colors
// tightest first (the engine's `colorOrder`, never re-sorted here), nothing preselected, and the
// player picks. A one-color deck skips the step. Help is read on that press, and again after the
// player's own trade or its Undo, and never judges a color: each move says what it does to every
// color's count.
//
// The result lasts the whole visit to the deck (Hugh, 2026-10-11): across tab switches, other
// tools and the deck's sub-pages, and gone once the player leaves the deck. It is kept in the
// visit store (`lib/decks/visit.ts`), keyed on the list it was read for, so an edit retires it; an
// edit that is the player's own trade or Undo re-reads that color instead. A trade applied from here
// is kept there too, for its Undo, until the player leaves the deck.

import { useEffect, useEffectEvent, useId, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";

import { applyManaTrade, readManaHelpFor, readManaHelpReview, undoManaTrade, type ManaTradeResult } from "../../app/decks/mana-actions";
import { useReviewRun } from "./review-run";
import { deckTuningCopy } from "../../lib/copy/deck-tuning";
import type { DeckMutationResult } from "../../lib/decks/mutation-result";
import { manaBalanceCopy as copy } from "../../lib/copy/mana-balance";
import type { PriceFact } from "../../lib/decks/price";
import { askInVisit, isNewestAsk, isVisit, setVisitValue, subscribeVisit, visitToken, visitValue } from "../../lib/decks/visit";
import { manapoolCardUrl } from "../../lib/manapool/links";
import type { BalanceColor, ColorEvidence, ColorOrderEntry } from "../../lib/tuning/mana-balance";
import type { ManaHelp, SourceChange, TradeMove } from "../../lib/tuning/mana-help";
import type { StapleCandidate, StapleFact } from "../../lib/tuning/mana-staples";
import { colorName, colorWord, type ClientManaBalance } from "../../lib/tuning/mana-view";
import { reveal } from "../../lib/ui/reveal";
import { useCardDetail, useCardIntent } from "../cards/card-detail-provider";
import { usePreviewRow } from "./hover-preview";
import { BuyTag } from "./buy-tag";
import { ColorDisc, NeedsExplainer } from "./mana-evidence";
import { FailureMark } from "./tuning-history";
import { AnsweredRow, Arrow } from "./suggestion-card";
import { MutationError } from "./mutation-error";
import { FadingImg } from "../ui/hydrated-art";

export type HelpRead = (deckId: string, color: string) => Promise<ManaHelp | null>;
export type TradeActions = {
  apply: (deckId: string, color: string, stapleOracleId: string, outId: string) => Promise<ManaTradeResult>;
  undo: (applyId: string) => Promise<DeckMutationResult>;
};

/** A trade applied this visit, kept for its Undo: the deck it changed outlives the help that offered it. */
type Applied = { applyId: string; color: BalanceColor; out: string; staple: string };
const TRADES: TradeActions = { apply: applyManaTrade, undo: undoManaTrade };
const NONE_APPLIED: Applied[] = [];

/** What the visit keeps: the help drawn, and the list it was read for. */
type Kept = { revision: string | undefined; help: ManaHelp };

type Door =
  | { at: "closed" }
  | { at: "step" }
  | { at: "result"; color: BalanceColor; help: { kind: "reading" } | { kind: "ok"; help: ManaHelp } | { kind: "failed" } };

const PANEL = "flex flex-col gap-[12px] rounded-[10px] border border-[color:var(--border)] bg-[var(--surface)] p-[14px]";
/** A live price dated at the newest instant, as the intake states one: `BuyTag` reads it as live. */
const NEWEST = new Date(0);
const priceOf = (cents: number | null): { price: PriceFact | null; newestAsOf: Date | null } =>
  cents === null ? { price: null, newestAsOf: null } : { price: { cents, foilCents: null, etchedCents: null, asOf: NEWEST }, newestAsOf: NEWEST };

export function ImproveDoor({
  deckId,
  balance,
  commander,
  revision,
  read: readLive = readManaHelpFor,
  readReview = readManaHelpReview,
  trades = TRADES,
}: {
  deckId: string;
  balance: ClientManaBalance;
  commander: string;
  /** The list (and locks) the count was read for: a kept result for any other is retired. */
  revision?: string;
  read?: HelpRead;
  /** A help read History reopened (re-review), by its id. */
  readReview?: (deckId: string, countId: string) => Promise<ManaHelp | null>;
  trades?: TradeActions;
}) {
  // A help read History reopened: its color opens on that read's trades, each re-checked against
  // today's help, until the reader makes a trade here (`leftReview`): from then on, and for every
  // other color throughout, the door reads today's help, as an ordinary open does.
  const review = useReviewRun("mana");
  const leftReview = useRef(false);
  const reviewColor = review?.runId && review.color ? (review.color as BalanceColor) : null;
  const isReviewRead = (c: BalanceColor) => reviewColor !== null && c === reviewColor && !leftReview.current;
  const read: HelpRead = (d, c) => (isReviewRead(c as BalanceColor) && review?.runId ? readReview(d, review.runId) : readLive(d, c));
  const order = balance.colorOrder;
  const evidence = new Map(balance.colors.map((c) => [c.color, c]));
  const [door, setDoor] = useState<Door>(() => {
    if (reviewColor !== null) return { at: "result", color: reviewColor, help: { kind: "reading" } };
    const kept = visitValue<Kept>(deckId, "mana-help");
    return kept && kept.revision === revision ? { at: "result", color: kept.help.color, help: { kind: "ok", help: kept.help } } : { at: "closed" };
  });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const firstRowRef = useRef<HTMLButtonElement>(null);
  const resultRef = useRef<HTMLHeadingElement>(null);
  // Where focus goes on the next door change, CONSUMED by the first one: a read landing later
  // re-renders the result and must not pull focus back from wherever the reader moved meanwhile.
  const wantFocus = useRef<"step" | "result" | "button" | null>(null);
  // Set when a result lands: the result is brought into view smoothly then (`reveal`), not while it reads,
  // when the page may still be too short to bring it up.
  const wantReveal = useRef(false);
  const setFocus = (target: "step" | "result" | "button") => { wantFocus.current = target; };
  const asked = useRef(0);
  // Read from the visit store as it stands, and redrawn whenever it changes: a trade settling in a mount the
  // hub has since replaced still reaches the door now on screen.
  const applied = useSyncExternalStore(
    subscribeVisit,
    () => visitValue<Applied[]>(deckId, "mana-trades") ?? NONE_APPLIED,
    () => NONE_APPLIED,
  );
  // Each change is made to the store's current list, never to a render's copy, so two settling presses
  // cannot drop or revive each other's receipt.
  const changeApplied = (change: (list: Applied[]) => Applied[]) => {
    setVisitValue(deckId, "mana-trades", change(visitValue<Applied[]>(deckId, "mana-trades") ?? []));
  };
  // A trade or its Undo changes the list, and the list moving retires the result drawn; after the player's own
  // change the result is read again for its color instead, so they see what the trade did. Kept in the visit
  // (`mana-follow`), so the mount on screen reads it even when a mount since replaced made the change.
  const [busy, setBusy] = useState<string | null>(null);
  const [refused, setRefused] = useState<{ key: string; message: string } | null>(null);


  useEffect(() => {
    if (wantReveal.current) {
      wantReveal.current = false;
      reveal(resultRef.current);
    }
    const target = wantFocus.current;
    if (target === null) return;
    wantFocus.current = null;
    if (target === "step") firstRowRef.current?.focus();
    else if (target === "result") resultRef.current?.focus({ preventScroll: true });
    else buttonRef.current?.focus();
  }, [door]);


  const run = async (color: BalanceColor, { quiet = false }: { quiet?: boolean } = {}) => {
    const mine = ++asked.current;
    // This press's place among every request in the visit, across mounts: a reply landing in a later
    // visit to the deck, or after a newer press from another mount, keeps nothing.
    const ask = askInVisit(deckId, "mana-help");
    setVisitValue(deckId, "mana-help", undefined);
    // A quiet re-read (after a trade) keeps the result drawn while it reads, and moves neither focus nor the page.
    if (!quiet) {
      setDoor({ at: "result", color, help: { kind: "reading" } });
      setFocus("result");
    }
    let help: ManaHelp | null = null;
    try {
      help = await read(deckId, color);
    } catch {
      help = null;
    }
    if (mine !== asked.current) return;
    if (help && !help.inIdentity) {
      // Never drawn: a color outside the commander's colors has nothing legal to offer.
      setDoor({ at: "step" });
      setFocus("step");
      return;
    }
    // A reopened past help is never kept as the visit's help: an ordinary open must read today's.
    if (help && !help.noLonger && isNewestAsk(deckId, "mana-help", ask)) setVisitValue(deckId, "mana-help", { revision, help } satisfies Kept);
    if (!quiet) wantReveal.current = true;
    setDoor({ at: "result", color, help: help ? { kind: "ok", help } : { kind: "failed" } });
  };

  /** Apply a trade offered for `color`: the server finds it again in a fresh read, so only the staple is named. */
  const applyTrade = async (color: BalanceColor, trade: TradeMove) => {
    const key = trade.staple.oracleId;
    // The visit this press belongs to: a reply settling after the player left the deck (even if they came
    // back) changes nothing here, since leaving discards every receipt.
    const at = visitToken(deckId);
    setBusy(key);
    setRefused(null);
    const result = await trades.apply(deckId, color, key, trade.out.id).catch((): ManaTradeResult => ({ ok: false, message: deckTuningCopy.card.applyRefused }));
    setBusy(null);
    if (!isVisit(at)) return;
    if (!result.ok) {
      setRefused({ key, message: result.message });
      return;
    }
    // A trade made from a reopened past help leaves the review: the re-read it asks for is today's
    // help, so the trade just made is not drawn as one that no longer applies.
    if (review && !leftReview.current) { leftReview.current = true; review.leave?.(); }
    setVisitValue(deckId, "mana-follow", color);
    changeApplied((list) => [...list, { applyId: result.applyId, color, out: trade.out.name, staple: trade.staple.name }]);
  };

  const undoTrade = async (a: Applied) => {
    const at = visitToken(deckId);
    setBusy(a.applyId);
    setRefused(null);
    const result = await trades.undo(a.applyId).catch((): DeckMutationResult => ({ ok: false, message: deckTuningCopy.card.undoRefused }));
    setBusy(null);
    if (!isVisit(at)) return;
    if (!result.ok) {
      setRefused({ key: a.applyId, message: result.message });
      return;
    }
    // Read the open result again, if the visit holds one (the store, not this mount's `door`, which a remount
    // since may have replaced); with none open, the door stays as it is.
    setVisitValue(deckId, "mana-follow", visitValue<Kept>(deckId, "mana-help")?.help.color);
    changeApplied((list) => list.filter((x) => x.applyId !== a.applyId));
  };

  // The read after our own trade or Undo, with this render's `run`: an effect event, so the list moving is the
  // only thing that fires the effect below.
  const reread = useEffectEvent((color: BalanceColor) => void run(color, { quiet: true }));
  // The list moved under a kept result: it described a deck that is gone.
  const seenRevision = useRef(revision);
  useEffect(() => {
    if (seenRevision.current === revision) return;
    seenRevision.current = revision;
    const again = visitValue<BalanceColor>(deckId, "mana-follow");
    setVisitValue(deckId, "mana-follow", undefined);
    if (again) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- the list moved (an external change): the re-read it asks for starts here
      reread(again);
      return;
    }
    asked.current += 1;
    setVisitValue(deckId, "mana-help", undefined);
    setDoor({ at: "closed" });
  }, [revision, deckId]);

  // Reopened from History: that color's help is read at once, with the trades it showed.
  const openReview = useEffectEvent((c: BalanceColor) => void run(c));
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading an external record on mount, as the panels do
    if (reviewColor !== null) openReview(reviewColor);
  }, [reviewColor]);

  const one = order.length === 1 ? order[0].color : null;
  const open = () => {
    if (one) return void run(one);
    asked.current += 1;
    setDoor({ at: "step" });
    setFocus("step");
  };


  if (order.length === 0) return null;
  return (
    <div data-mana-door className={PANEL}>
      <div className="flex flex-wrap items-center gap-x-[16px] gap-y-[10px]">
        <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-[4px]">
          <h3 className="text-[13.5px] font-semibold text-[color:var(--fg)]">{copy.door.title}</h3>
          <p className="text-[12.5px] leading-[1.5] text-[color:var(--fg-body)] [text-wrap:pretty]">
            {one ? copy.door.leadOne(commander, colorWord(one)) : copy.door.lead(commander)}
          </p>
        </div>
        {/* Only on the closed door (R3b): the step has its own close, the result its Change color. */}
        {door.at === "closed" ? <button
          ref={buttonRef}
          type="button"
          aria-expanded={one ? undefined : false}
          onClick={open}
          className="inline-flex h-[44px] flex-[1_1_100%] cursor-pointer items-center justify-center rounded-[8px] border border-[color:var(--accent)] px-[16px] text-[13px] font-semibold text-[color:var(--accent)] hover:bg-[color-mix(in_oklab,var(--accent)_10%,transparent)] md:h-[32px] md:flex-none"
        >
          {copy.door.button}
        </button> : null}
      </div>
      {/* Every trade applied this visit, with its Undo, whichever color is open (Suggested changes' receipt). */}
      {applied.length > 0 ? (
        <ul data-mana-applied className="flex flex-col gap-[8px]">
          {applied.map((a) => (
            <li key={a.applyId}>
              <AnsweredRow
                tone="applied"
                pair={<><span>{a.out}</span> <Arrow ink="var(--success)" /> <b className="font-semibold" style={{ color: "var(--fg)" }}>{a.staple}</b></>}
                action={{ label: deckTuningCopy.card.undo, onPress: () => void undoTrade(a), busy: busy !== null }}
                refused={refused?.key === a.applyId ? refused.message : null}
              />
            </li>
          ))}
        </ul>
      ) : null}
      {door.at === "step" ? (
        <ColorStep
          order={order}
          evidence={evidence}
          firstRowRef={firstRowRef}
          onPick={(c) => void run(c)}
          onClose={() => { setDoor({ at: "closed" }); setFocus("button"); }}
        />
      ) : null}
      {/* A color the newest count no longer offers (a commander changed under a kept result) is not drawn. */}
      {door.at === "result" && order.some((e) => e.color === door.color) ? (
        <HelpResult
          color={door.color}
          state={door.help}
          evidence={evidence.get(door.color)!}
          commander={commander}
          headRef={resultRef}
          onChange={one ? null : () => { asked.current += 1; setDoor({ at: "step" }); setFocus("step"); }}
          onRetry={() => void run(door.color)}
          onApply={(t) => void applyTrade(door.color, t)}
          busy={busy}
          refused={refused}
        />
      ) : null}
    </div>
  );
}

function ColorStep({ order, evidence, firstRowRef, onPick, onClose }: {
  order: readonly ColorOrderEntry[];
  evidence: ReadonlyMap<BalanceColor, ColorEvidence>;
  firstRowRef: React.RefObject<HTMLButtonElement | null>;
  onPick: (c: BalanceColor) => void;
  onClose: () => void;
}) {
  const rows = useRef<(HTMLButtonElement | null)[]>([]);
  // Nothing is checked, so the arrow keys move focus only; Enter or Space picks.
  const onKey = (e: KeyboardEvent, i: number) => {
    const step = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    rows.current[(i + step + order.length) % order.length]?.focus();
  };
  return (
    <div data-mana-step className="flex flex-col gap-[8px] border-t border-t-[color:var(--border)] pt-[12px]">
      <div className="flex items-center justify-between gap-[10px]">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--fg-faint)]">{copy.step.head}</p>
        <button
          type="button"
          aria-label={copy.step.close}
          onClick={onClose}
          className="inline-flex size-[44px] cursor-pointer items-center justify-end font-sans text-[13px] text-[color:var(--fg-muted)] hover:text-[color:var(--fg)] md:size-[32px]"
        >
          ✕
        </button>
      </div>
      <p className="text-[12.5px] leading-[1.55] text-[color:var(--fg-body)] [text-wrap:pretty]">{copy.step.order}</p>
      <NeedsExplainer />
      <div role="radiogroup" aria-label={copy.step.group} className="flex flex-col gap-[6px]">
        {order.map((entry, i) => {
          const e = evidence.get(entry.color)!;
          const cost = entry.kind === "ranked" ? copy.step.cost(entry.needed!.pattern, entry.needed!.cards.length)
            : entry.kind === "noPublished" ? copy.step.noPublished : null;
          const figure = entry.kind === "ranked" ? copy.patterns.haveNeeds(e.sources.total, entry.needed!.requires)
            : entry.kind === "noPublished" ? copy.step.have(e.sources.total) : copy.step.noPips(e.sources.total);
          return (
            <button
              key={entry.color}
              ref={(el) => { rows.current[i] = el; if (i === 0) firstRowRef.current = el; }}
              type="button"
              role="radio"
              aria-checked={false}
              tabIndex={i === 0 ? 0 : -1}
              data-mana-step-row={entry.color}
              onClick={() => onPick(entry.color)}
              onKeyDown={(ev) => onKey(ev, i)}
              className="grid min-h-[56px] cursor-pointer grid-cols-[18px_minmax(0,1fr)_auto] items-center gap-x-[12px] gap-y-[2px] rounded-[9px] border border-[color:var(--border-strong)] bg-[var(--surface-sunken)] px-[12px] py-[8px] text-left hover:border-[color:var(--fg-faint)] md:min-h-[44px] md:grid-cols-[18px_120px_minmax(0,1fr)_auto] md:px-[12px] md:py-[8px]"
            >
              <span aria-hidden className="row-span-2 size-[18px] rounded-full border border-[color:var(--fg-faint)] md:row-span-1" />
              <span className="flex items-center gap-[8px]">
                <ColorDisc c={entry.color} size={14} />
                <span className="text-[13px] font-medium text-[color:var(--fg)]">{colorName(entry.color)}</span>
              </span>
              <span className="col-[2/-1] row-start-2 font-mono text-[11px] text-[color:var(--fg-muted)] md:col-auto md:row-start-auto">{cost}</span>
              <span className={`col-start-3 row-start-1 whitespace-nowrap text-right font-mono text-[11.5px] md:col-start-auto md:row-start-auto ${entry.kind === "noPips" ? "text-[color:var(--fg-muted)]" : "text-[color:var(--fg)]"}`}>
                {figure}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** `green 28 → 29 · blue 1 → 2`: the picked color first, then every other color that moves. */
function changesText(changes: readonly SourceChange[], picked: BalanceColor) {
  const moved = changes.filter((c) => c.before !== c.after);
  return [...moved.filter((c) => c.color === picked), ...moved.filter((c) => c.color !== picked)]
    .map((c) => copy.help.change_(colorWord(c.color), c.before, c.after))
    .join(" · ");
}

function bucketLabel(condition: string): string {
  const count = /^count:(\d+)$/.exec(condition);
  return count ? copy.help.rate.countBucket(Number(count[1])) : condition;
}

function rateText(fact: StapleFact, commander: string): string | null {
  if (fact.kind === "identity") return copy.help.rate.identity(Math.round(fact.avgInclusion), bucketLabel(fact.condition));
  if (fact.inclusion === null) return null;
  return fact.kind === "commander" ? copy.help.rate.commander(Math.round(fact.inclusion), commander) : copy.help.rate.pair(Math.round(fact.inclusion));
}

function HelpResult({ color, state, evidence, commander, headRef, onChange, onRetry, onApply, busy, refused }: {
  color: BalanceColor;
  state: Extract<Door, { at: "result" }>["help"];
  evidence: ColorEvidence;
  commander: string;
  headRef: React.RefObject<HTMLHeadingElement | null>;
  onChange: (() => void) | null;
  onRetry: () => void;
  onApply: (trade: TradeMove) => void;
  /** The staple whose trade is being applied, or an applied trade being undone. */
  busy: string | null;
  refused: { key: string; message: string } | null;
}) {
  const [how, setHow] = useState(false);
  const howId = useId();
  const word = colorWord(color);
  const have = evidence.needed ? copy.patterns.haveNeeds(evidence.sources.total, evidence.needed.requires) : copy.step.have(evidence.sources.total);
  return (
    <div data-mana-help={color} aria-busy={state.kind === "reading" || undefined} className="flex flex-col gap-[12px] border-t border-t-[color:var(--border)] pt-[12px]">
      <div className="flex flex-wrap items-baseline justify-between gap-x-[10px] gap-y-[4px]">
        <div className="flex flex-wrap items-baseline gap-x-[10px] gap-y-[2px]">
          <span className="flex items-center gap-[8px] self-center">
            <ColorDisc c={color} size={14} />
            <h3 ref={headRef} tabIndex={-1} className="scroll-mt-[16px] text-[13.5px] font-semibold text-[color:var(--fg)] outline-none">{copy.help.head(word)}</h3>
          </span>
          {state.kind === "failed" ? null : <span className="font-mono text-[10.5px] text-[color:var(--fg-faint)]">{have}</span>}
        </div>
        {onChange ? (
          <button type="button" onClick={onChange} className="inline-flex min-h-[44px] cursor-pointer items-center font-mono text-[11px] text-[color:var(--accent)] md:min-h-[32px]">
            {copy.help.change}
          </button>
        ) : null}
      </div>
      {state.kind === "failed" ? (
        <div className="flex flex-col gap-[10px]">
          <div className="flex items-start gap-[10px]">
            <span className="mt-[1px] text-[color:var(--danger)]"><FailureMark size={18} label={copy.help.failedMark} /></span>
            <p className="min-w-0 flex-1 text-[12.5px] leading-[1.55] text-[color:var(--fg-body)]">{copy.help.failed(word)}</p>
          </div>
          <button type="button" onClick={onRetry} className="inline-flex h-[44px] w-full cursor-pointer items-center justify-center rounded-[8px] border border-[color:var(--accent)] px-[14px] text-[13px] font-semibold text-[color:var(--accent)] md:h-[32px] md:w-auto md:self-start">
            {copy.help.retry}
          </button>
        </div>
      ) : state.kind === "ok" ? (
        <>
          <section aria-label={copy.help.swaps} className="flex flex-col gap-[8px]">
            <div className="flex items-center gap-[10px]">
              <h4 className="font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--fg-faint)]">{copy.help.swaps}</h4>
              <button
                type="button"
                aria-label={copy.help.howLabel}
                aria-expanded={how}
                aria-describedby={how ? howId : undefined}
                onClick={() => setHow((v) => !v)}
                className={`inline-flex size-[18px] cursor-pointer items-center justify-center rounded-full border font-sans text-[10.5px] font-semibold ${how ? "border-[color:var(--accent)] text-[color:var(--accent)]" : "border-[color:var(--fg-faint)] text-[color:var(--fg-faint)] hover:text-[color:var(--fg)]"}`}
              >
                i
              </button>
              <span aria-hidden className="h-px flex-1 bg-[var(--border)]" />
            </div>
            {how ? (
              <p id={howId} role="tooltip" className="max-w-[420px] rounded-[8px] border border-[color:var(--border-strong)] bg-[var(--elevated)] px-[14px] py-[12px] text-[12.5px] leading-[1.55] text-[color:var(--fg-body)] shadow-[0_8px_24px_rgba(0,0,0,0.45)]">
                {copy.help.how(word)}
              </p>
            ) : null}
            {state.help.rebalance.length === 0 ? (
              <None text={copy.help.noSwap(word)} />
            ) : (
              <ul className="flex flex-col gap-[6px]">
                {state.help.rebalance.map((m) => (
                  <li key={`${m.basicOut}-${m.basicIn}`} data-mana-swap className="flex flex-wrap items-baseline gap-x-[14px] gap-y-[4px] rounded-[9px] border border-[color:var(--border)] bg-[var(--surface-sunken)] px-[12px] py-[10px]">
                    <span className="text-[13px] text-[color:var(--fg)]">{copy.help.swap(m.maxCopies, m.basicOut, m.basicIn)}</span>
                    <span className="font-mono text-[10.5px] text-[color:var(--fg-muted)]">{changesText(m.changes, color)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section aria-label={copy.help.staples(commander)} className="flex flex-col gap-[8px]">
            <div className="flex items-center gap-[10px]">
              <h4 className="font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--fg-faint)]">{copy.help.staples(commander)}</h4>
              <span aria-hidden className="h-px min-w-[16px] flex-1 bg-[var(--border)]" />
            </div>
            {state.help.staples.length === 0 ? (
              <None text={copy.help.noStaples(word)} />
            ) : (
              <ul className="flex flex-col gap-[6px]">
                {state.help.staples.map((s) => (
                  <StapleRow key={s.oracleId} staple={s} siblings={state.help.staples.map((x) => x.oracleId)} trade={state.help.trades.find((t) => t.staple.oracleId === s.oracleId) ?? null} stale={state.help.noLonger?.includes(s.oracleId) ?? false} picked={color} commander={commander} onApply={onApply} busy={busy} refused={refused?.key === s.oracleId ? refused.message : null} />
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}

function None({ text }: { text: string }) {
  return (
    <p className="flex min-h-[40px] items-center gap-[10px] rounded-[9px] border border-dashed border-[color:var(--border-dashed)] px-[12px] py-[8px] text-[12.5px] text-[color:var(--fg-faint)]">
      <span aria-hidden className="font-mono text-[12px] text-[color:var(--fg-locked)]">–</span>
      {text}
    </p>
  );
}

function StapleRow({ staple, siblings, trade, stale = false, picked, commander, onApply, busy, refused }: {
  staple: StapleCandidate;
  siblings: string[];
  trade: TradeMove | null;
  /** A reopened past help's trade that today's help no longer offers: drawn, never offered. */
  stale?: boolean;
  picked: BalanceColor;
  commander: string;
  onApply: (trade: TradeMove) => void;
  busy: string | null;
  refused: string | null;
}) {
  const { open } = useCardDetail();
  // The decklist's preview and intent prefetch, so a hover or a tap-and-hold acts as it does on a list row.
  const preview = usePreviewRow(staple.imageUri);
  const intent = useCardIntent(staple.oracleId, staple.imageUri);
  const owned = staple.free > 0;
  const rate = rateText(staple.fact, commander);
  return (
    <li data-mana-staple={staple.oracleId} className="flex flex-col gap-[7px] rounded-[9px] border border-[color:var(--border)] bg-[var(--surface-sunken)] p-[12px] md:px-[12px] md:py-[10px]">
      <div className="flex flex-wrap items-center gap-x-[10px] gap-y-[8px]">
        <span
          aria-hidden
          className={`h-[31px] w-[22px] flex-none overflow-hidden rounded-[3px] ${staple.imageUri ? "bg-[var(--surface)]" : "bg-[repeating-linear-gradient(135deg,var(--surface)_0_3px,var(--surface-sunken)_3px_6px)]"} ${owned ? "border border-[color:var(--border-strong)]" : "border border-dashed border-[color:var(--border-dashed)]"}`}
        >
          {staple.imageUri ? <FadingImg src={staple.imageUri} alt="" loading="lazy" className="size-full object-cover" /> : null}
        </span>
        <button
          type="button"
          onClick={(e) => open(staple.oracleId, siblings, undefined, { opener: e.currentTarget, art: staple.imageUri ?? null })}
          {...preview}
          {...intent}
          className="cursor-pointer border-b border-dotted border-b-[color:var(--accent)] text-left text-[13px] font-semibold text-[color:var(--fg)]"
        >
          {staple.name}
        </button>
        {owned ? (
          <span className="flex items-center gap-[6px] font-mono text-[10.5px] text-[color:var(--fg-muted)]">
            <span aria-hidden className="size-[7px] rounded-full border border-[color:var(--success)] bg-[var(--success)]" />
            {copy.help.owned(staple.free)}
          </span>
        ) : (
          <span className="flex flex-wrap items-center gap-[6px] font-mono text-[10.5px] text-[color:var(--fg-muted)]">
            <span aria-hidden className="size-[7px] rounded-full border border-dashed border-[color:var(--fg-faint)]" />
            {copy.help.toBuy}
            {/* With no price there is nothing to buy at: R3b's priceless staple draws no tag and no link. */}
            {staple.priceCents === null ? null : <BuyTag variant="row" {...priceOf(staple.priceCents)} />}
            {staple.priceCents === null ? null : <a
              href={manapoolCardUrl(staple.name)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={copy.help.buyAria(staple.name)}
              className="text-[color:var(--accent)] hover:text-[color:var(--accent-hover)]"
            >
              {copy.help.buyLink}
            </a>}
          </span>
        )}
      </div>
      <p className="flex flex-wrap items-center gap-x-[8px] gap-y-[5px] font-mono text-[10.5px] text-[color:var(--fg-faint)]">
        {rate ? <span>{rate} ·</span> : null}
        <span>{copy.help.adds}</span>
        <span className="inline-flex gap-[3px]">
          {staple.produces.map((c) => (
            <span key={c} role="img" aria-label={c === "C" ? "colorless" : colorWord(c)} className="inline-flex"><ColorDisc c={c} size={12} /></span>
          ))}
        </span>
      </p>
      {trade ? (
        <p className="flex flex-wrap items-start gap-[8px] rounded-[7px] border border-[color:var(--border)] bg-[var(--bg)] px-[9px] py-[7px]">
          <span className="rounded-full border border-[color:var(--border-strong)] px-[7px] py-[1px] font-mono text-[9px] uppercase tracking-[0.12em] text-[color:var(--fg-body)]">{copy.help.tradeTag}</span>
          <span className="font-mono text-[10.5px] leading-[1.55] text-[color:var(--fg-muted)]">{copy.help.trade(trade.out.name, changesText(trade.changes, picked))}</span>
        </p>
      ) : null}
      {trade && stale ? (
        <p data-mana-trade-stale="" className="flex flex-wrap items-baseline gap-[9px]">
          <span className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-[color:var(--fg-locked)]">{deckTuningCopy.lists.noLongerApplies}</span>
        </p>
      ) : trade ? (
        <div className="flex flex-col gap-[6px]">
          {/* Suggested changes' Apply, as drawn there: the full-width 44px press on a phone, a compact one on desktop. */}
          <button
            type="button"
            onClick={() => onApply(trade)}
            aria-disabled={busy !== null || undefined}
            disabled={busy !== null}
            className="h-[44px] w-full rounded-[8px] text-[13px] font-semibold md:h-auto md:w-auto md:self-start md:rounded-[7px] md:px-[13px] md:py-[7px] md:text-[12.5px] text-[color:var(--accent)] [border:1px_solid_var(--accent)] hover:bg-[color:color-mix(in_oklab,var(--accent)_10%,transparent)]"
          >
            {busy === staple.oracleId ? deckTuningCopy.card.applying : copy.help.tradeApply(trade.out.name)}
          </button>
          {refused ? <MutationError message={refused} /> : null}
        </div>
      ) : (
        <p className="font-mono text-[10.5px] text-[color:var(--fg-faint)]">{copy.help.noTrade}</p>
      )}
    </li>
  );
}
