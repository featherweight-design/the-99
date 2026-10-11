"use client";

// Mana Balance's one door to help (Tuning hub handoff R3b, design table `ImproveDoor`, `ColorStep`,
// `HelpResult`; rulings 2026-10-11): `Improve my mana` opens a step listing the deck's colors
// tightest first (the engine's `colorOrder`, never re-sorted here), nothing preselected, and the
// player picks. A one-color deck skips the step. Help is read only on that press, and never
// judges a color: each move says what it does to every color's count.
//
// The result lasts the whole visit to the deck (Hugh, 2026-10-11): across tab switches, other
// tools and the deck's sub-pages, and gone once the player leaves the deck. It is kept in the
// visit store (`lib/decks/visit.ts`), keyed on the list it was read for, so an edit retires it.

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

import { readManaHelpFor } from "../../app/decks/mana-actions";
import { manaBalanceCopy as copy } from "../../lib/copy/mana-balance";
import type { PriceFact } from "../../lib/decks/price";
import { setVisitValue, visitValue } from "../../lib/decks/visit";
import { manapoolCardUrl } from "../../lib/manapool/links";
import type { BalanceColor, ColorEvidence, ColorOrderEntry } from "../../lib/tuning/mana-balance";
import type { ManaHelp, SourceChange, TradeMove } from "../../lib/tuning/mana-help";
import type { StapleCandidate, StapleFact } from "../../lib/tuning/mana-staples";
import { colorName, colorWord, type ClientManaBalance } from "../../lib/tuning/mana-view";
import { useCardDetail } from "../cards/card-detail-provider";
import { BuyTag } from "./buy-tag";
import { ColorDisc, NeedsExplainer } from "./mana-evidence";
import { FailureMark } from "./tuning-history";

export type HelpRead = (deckId: string, color: string) => Promise<ManaHelp | null>;

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
  read = readManaHelpFor,
}: {
  deckId: string;
  balance: ClientManaBalance;
  commander: string;
  /** The list (and locks) the count was read for: a kept result for any other is retired. */
  revision?: string;
  read?: HelpRead;
}) {
  const order = balance.colorOrder;
  const evidence = new Map(balance.colors.map((c) => [c.color, c]));
  const [door, setDoor] = useState<Door>(() => {
    const kept = visitValue<Kept>(deckId, "mana-help");
    return kept && kept.revision === revision ? { at: "result", color: kept.help.color, help: { kind: "ok", help: kept.help } } : { at: "closed" };
  });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const firstRowRef = useRef<HTMLButtonElement>(null);
  const resultRef = useRef<HTMLHeadingElement>(null);
  const [focus, setFocus] = useState<"none" | "step" | "result" | "button">("none");
  const asked = useRef(0);

  // The list moved under a kept result: it described a deck that is gone.
  const seenRevision = useRef(revision);
  useEffect(() => {
    if (seenRevision.current === revision) return;
    seenRevision.current = revision;
    asked.current += 1;
    setVisitValue(deckId, "mana-help", undefined);
    setDoor({ at: "closed" });
  }, [revision, deckId]);

  useEffect(() => {
    if (focus === "step") firstRowRef.current?.focus();
    else if (focus === "result") resultRef.current?.focus();
    else if (focus === "button") buttonRef.current?.focus();
  }, [focus, door]);

  if (order.length === 0) return null;

  const run = async (color: BalanceColor) => {
    const mine = ++asked.current;
    setVisitValue(deckId, "mana-help", undefined);
    setDoor({ at: "result", color, help: { kind: "reading" } });
    setFocus("result");
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
    if (help) setVisitValue(deckId, "mana-help", { revision, help } satisfies Kept);
    setDoor({ at: "result", color, help: help ? { kind: "ok", help } : { kind: "failed" } });
  };

  const one = order.length === 1 ? order[0].color : null;
  const open = () => {
    if (one) return void run(one);
    asked.current += 1;
    setDoor({ at: "step" });
    setFocus("step");
  };

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
      {door.at === "step" ? (
        <ColorStep
          order={order}
          evidence={evidence}
          firstRowRef={firstRowRef}
          onPick={(c) => void run(c)}
          onClose={() => { setDoor({ at: "closed" }); setFocus("button"); }}
        />
      ) : null}
      {door.at === "result" ? (
        <HelpResult
          color={door.color}
          state={door.help}
          evidence={evidence.get(door.color)!}
          commander={commander}
          headRef={resultRef}
          onChange={one ? null : () => { asked.current += 1; setDoor({ at: "step" }); setFocus("step"); }}
          onRetry={() => void run(door.color)}
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

function HelpResult({ color, state, evidence, commander, headRef, onChange, onRetry }: {
  color: BalanceColor;
  state: Extract<Door, { at: "result" }>["help"];
  evidence: ColorEvidence;
  commander: string;
  headRef: React.RefObject<HTMLHeadingElement | null>;
  onChange: (() => void) | null;
  onRetry: () => void;
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
            <h3 ref={headRef} tabIndex={-1} className="text-[13.5px] font-semibold text-[color:var(--fg)] outline-none">{copy.help.head(word)}</h3>
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
                  <StapleRow key={s.oracleId} staple={s} siblings={state.help.staples.map((x) => x.oracleId)} trade={state.help.trades.find((t) => t.staple.oracleId === s.oracleId) ?? null} picked={color} commander={commander} />
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

function StapleRow({ staple, siblings, trade, picked, commander }: { staple: StapleCandidate; siblings: string[]; trade: TradeMove | null; picked: BalanceColor; commander: string }) {
  const { open } = useCardDetail();
  const owned = staple.free > 0;
  const rate = rateText(staple.fact, commander);
  return (
    <li data-mana-staple={staple.oracleId} className="flex flex-col gap-[7px] rounded-[9px] border border-[color:var(--border)] bg-[var(--surface-sunken)] p-[12px] md:px-[12px] md:py-[10px]">
      <div className="flex flex-wrap items-center gap-x-[10px] gap-y-[8px]">
        <span
          aria-hidden
          className={`h-[31px] w-[22px] flex-none overflow-hidden rounded-[3px] bg-[var(--surface)] ${owned ? "border border-[color:var(--border-strong)]" : "border border-dashed border-[color:var(--border-dashed)]"}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- Scryfall art is remote; next/image would need a loader per host for a 22px thumbnail */}
          {staple.imageUri ? <img src={staple.imageUri} alt="" loading="lazy" className="size-full object-cover" /> : null}
        </span>
        <button
          type="button"
          onClick={(e) => open(staple.oracleId, siblings, undefined, { opener: e.currentTarget, art: staple.imageUri ?? null })}
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
            <BuyTag variant="row" {...priceOf(staple.priceCents)} />
            {/* With no price there is nothing to buy at (R3b's priceless staple draws no link). */}
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
          <span className="font-mono text-[10.5px] leading-[1.55] text-[color:var(--fg-muted)]">{copy.help.trade(trade.basicOut, changesText(trade.changes, picked))}</span>
        </p>
      ) : (
        <p className="font-mono text-[10.5px] text-[color:var(--fg-faint)]">{copy.help.noTrade}</p>
      )}
    </li>
  );
}
