"use client";

// *Built from your answers* (HANDOFF §6): the create page's one new block when a result's press
// brought the player here. One row per answer given, in the order the form asks them; colors and
// the words are never rows. Each row is a mono key, the value, and one line on what the answer does
// to the deck. The card is the results bar's own `CardValue`, so it reads, prices and opens the same.

import Link from "next/link";
import { useId, type ReactNode } from "react";
import { CardDetailProvider, CardDetailTrigger } from "../cards/card-detail-provider";
import { HoverPreviewProvider } from "../decks/hover-preview";
import { CardValue } from "./read-as-bar";
import { helpMeChooseCopy, orList } from "../../lib/copy/help-me-choose";
import { formatCents } from "../../lib/decks/price";
import { buysCard } from "../../lib/intake/buys-card";
import type { HandOffAnswers } from "../../lib/intake/hand-off-load";
import type { HandOffReach } from "../../lib/intake/hand-off-reach";
import type { CardChip } from "../../lib/intake/rows";

const copy = helpMeChooseCopy.handOff;
const reachCopy = copy.reach;

/** The Bracket row's reach, as `CreatePreFilled` read it (`handOffBracketReach`). Absent when no
 *  read was made (no bracket of 3 or more, or the switch off): today's ceiling line. */
export type BracketReachState =
  | { status: "pending" }
  | { status: "done"; reach: HandOffReach | null }
  | { status: "failed" };

/** The player's pick between the two rows; null until one is pressed. Nothing is pre-picked. */
export type BracketChoice = "mine" | "hit" | null;

/** Whether the deck falls short and buying reaches it: the two rows, and *Create deck* waits. */
export function needsBracketChoice(state: BracketReachState | undefined): boolean {
  return state?.status === "done" && state.reach !== null && state.reach.buy !== null
    && !state.reach.permits.includes(state.reach.target);
}

/** `1-2`, `3`, `4-5`: the results row's own range. */
const lands = (permits: readonly number[]) => helpMeChooseCopy.results.rowBracketValue(permits);
/** Whole dollars, as the results row's reach segment and the boards draw a buy (`about $32`). */
const dollars = (cents: number) => `$${Math.round(cents / 100).toLocaleString("en-US")}`;

/**
 * What the budget does, which turns on the card the fill pays for first. Null when that card's read
 * failed: the create still places and pays for it, so no line is true until the card can be named.
 */
export function budgetLine(card: HandOffAnswers["card"], cardUnread = false, ownOnly = false): string | null {
  if (cardUnread) return null;
  // Own-only: the fill buys nothing. A card it buys (unowned, or every copy held) is the one
  // purchase, and the budget charges it (audit 8).
  if (ownOnly) {
    if (card === null || !buysCard(card)) return copy.budgetOwn;
    return copy.budgetOwnCard(card.name, card.price.kind === "priced" ? formatCents(card.price.cents) : null);
  }
  // A card with a free copy costs the budget nothing, so it is not paid for first.
  if (card === null || !buysCard(card)) return copy.budgetAlone;
  return card.price.kind === "priced" ? copy.budgetFirst(card.name, formatCents(card.price.cents)) : copy.budgetUnknown(card.name);
}

/**
 * The Budget row with *Hit bracket N* picked: every card the budget pays for first, in the create's
 * order: the build-around card and the `?select=` picks when they are bought, then the set. Own-only,
 * or over the budget, those cards are the whole buy. A placed card to buy with no live price is still
 * a purchase: said, and left out of the total.
 */
export function budgetLineHit(card: HandOffAnswers["card"], buy: NonNullable<HandOffReach["buy"]>, ownOnly: boolean): string {
  const placed = [...(card !== null && buysCard(card) ? [card] : []), ...buy.selectedBuys]
    .filter((c, i, all) => all.findIndex((d) => d.oracleId === c.oracleId) === i);
  const priced = placed.filter((c) => c.price.kind === "priced");
  const unpriced = placed.filter((c) => c.price.kind !== "priced");
  const names = [...priced.map((c) => c.name), ...buy.cards.map((c) => c.name)];
  const cents = buy.cents + priced.reduce((n, c) => n + (c.price.kind === "priced" ? c.price.cents : 0), 0);
  const line = ownOnly || buy.overBudget
    ? reachCopy.budgetHitOnly(names, dollars(cents))
    : reachCopy.budgetHit(names, dollars(cents));
  return unpriced.length > 0 ? `${reachCopy.budgetHitUnknown(unpriced.map((c) => c.name))} ${line}` : line;
}

export function HandOffAnswersBlock({
  answers, changeHref, reach, choice = null, onChoose,
}: {
  answers: HandOffAnswers;
  changeHref: string;
  reach?: BracketReachState;
  choice?: BracketChoice;
  onChoose?: (choice: Exclude<BracketChoice, null>) => void;
}) {
  const { themes, themeJoin, sets, pool, card, cardUnread, budgetDollars, bracket } = answers;
  const done = reach?.status === "done" ? reach.reach : null;
  const hitBuy = choice === "hit" && needsBracketChoice(reach) ? done?.buy ?? null : null;
  // Any of is one row, its line the figure of the theme the results row ranked by.
  const best = themes.find((t) => t.best) ?? null;
  return (
    <CardDetailProvider>
      <HoverPreviewProvider>
      <section
        data-testid="hand-off-answers"
        aria-labelledby="hand-off-answers-head"
        className="mb-[24px] flex flex-col gap-[12px] rounded-[11px] border border-solid border-[color:var(--border)] bg-[color:var(--surface-rail)] p-[14px] md:p-[16px_18px]"
      >
        <div className="flex items-baseline gap-[10px]">
          <h2 id="hand-off-answers-head" className="m-0 font-mono text-[10px] font-normal uppercase tracking-[0.14em] text-[color:var(--fg-faint)]">
            {copy.block}
          </h2>
          <Link
            href={changeHref}
            aria-label={copy.changeAria}
            className={[
              "relative ml-auto font-mono text-[11px] text-[color:var(--accent-text)] no-underline",
              // An 11px word is the whole control, so its tap area is widened to 44px around it.
              "after:absolute after:left-1/2 after:top-1/2 after:h-[44px] after:min-w-[44px] after:w-full",
              "after:-translate-x-1/2 after:-translate-y-1/2 after:content-['']",
            ].join(" ")}
          >
            {copy.change}
          </Link>
        </div>
        {themeJoin === "any" ? (
          <Row k={copy.keys.anyOf} line={best?.pct == null ? null : copy.themeFig(best.pct, best.label)}>
            <span>{orList(themes.map((t) => t.label))}</span>
          </Row>
        ) : themes.map((t) => (
          <Row key={`t:${t.slug}`} k={copy.keys.theme} line={t.pct === null ? null : copy.themeFig(t.pct, t.label)}>
            <span>{t.label}</span>
          </Row>
        ))}
        {sets.length > 0 && (
          <Row k={copy.keys.sets} line={null}>
            <span>{sets.map((s) => s.name).join(" or ")}</span>
          </Row>
        )}
        {pool === "own" && (
          <Row k={copy.keys.pool} line={copy.poolLine}>
            <span>{copy.poolValue}</span>
          </Row>
        )}
        {card && (
          <Row k={copy.keys.card} line={card.pct === null ? copy.placed : `${copy.placed} ${copy.cardFig(card.pct)}`}>
            <span className="flex min-w-0 items-center gap-[8px]">
              <CardValue card={card} size="row" />
            </span>
          </Row>
        )}
        {budgetDollars !== null && (
          <Row
            k={copy.keys.budget}
            line={hitBuy && !cardUnread ? budgetLineHit(card, hitBuy, pool === "own") : budgetLine(card, cardUnread, pool === "own")}
          >
            {/* Picked over the budget, the budget is the raised one the deck will store (G1). */}
            <span className="tabular-nums">
              {hitBuy?.raisedBudgetCents != null
                ? `$${(hitBuy.raisedBudgetCents / 100).toLocaleString("en-US")}`
                : `$${budgetDollars.toLocaleString("en-US")}`}
            </span>
          </Row>
        )}
        {bracket !== null && (
          <Row
            k={copy.keys.bracket}
            line={reach?.status === "done" && done ? null : reach?.status === "pending" ? null : copy.bracket(bracket)}
            below={reach?.status === "pending"
              ? <PendingLine />
              : done ? <ReachLine reach={done} ownOnly={pool === "own"} budgetDollars={budgetDollars} choice={choice} onChoose={onChoose} /> : null}
          >
            <span>{copy.bracketValue(bracket)}</span>
          </Row>
        )}
      </section>
      </HoverPreviewProvider>
    </CardDetailProvider>
  );
}

function Row({ k, line, below, children }: { k: string; line: string | null; below?: ReactNode; children: React.ReactNode }) {
  return (
    <div data-testid="hand-off-row" className="flex flex-col items-baseline gap-[4px] md:flex-row md:gap-[12px]">
      <span className="flex-none font-mono text-[10px] uppercase tracking-[0.1em] text-[color:var(--fg-locked)] md:w-[104px]">{k}</span>
      <div className="flex min-w-0 flex-1 flex-col gap-[2px] self-stretch">
        <div className="text-[13.5px] font-semibold text-[color:var(--fg)]">{children}</div>
        {line && <p className="m-0 text-[12px] leading-[1.5] text-[color:var(--fg-muted)]">{line}</p>}
        {below}
      </div>
    </div>
  );
}

/** While the fill is read: the results row's own pending shape. */
function PendingLine() {
  return (
    <p data-testid="hand-off-reach-pending" aria-busy="true" className="m-0 inline-flex items-center gap-[9px] text-[12px] leading-[1.5] text-[color:var(--fg-faint)]">
      <span aria-hidden className="anim-skeleton block h-[8px] w-[120px] rounded-[4px] bg-[color:var(--elevated)]" />
      {reachCopy.pending}
    </p>
  );
}

const LINE = "m-0 text-[12px] leading-[1.5] text-[color:var(--fg-muted)] [text-wrap:pretty]";

/**
 * The reach line, and with a choice the two radio rows (board C). Reached: the owned cards that get
 * there, each opening like any card. Nothing reaches: a statement. Short with a set to buy: the lead
 * line and two rows, neither picked.
 */
function ReachLine({
  reach, ownOnly, budgetDollars, choice, onChoose,
}: {
  reach: HandOffReach;
  ownOnly: boolean;
  budgetDollars: number | null;
  choice: BracketChoice;
  onChoose?: (choice: Exclude<BracketChoice, null>) => void;
}) {
  const name = useId();
  const { target, permits, placed, buy } = reach;
  if (permits.includes(target)) {
    const text = placed.length === 1 && placed[0].gameChanger
      ? reachCopy.reachedOne(placed[0].name, target)
      : reachCopy.reachedMany(placed.map((c) => c.name), target);
    return <p data-testid="hand-off-reach" className={LINE}><WithCards text={text} cards={placed} /></p>;
  }
  if (!buy) return <p data-testid="hand-off-reach" className={LINE}>{reachCopy.none(target, lands(permits))}</p>;
  const price = dollars(buy.cents);
  const names = buy.cards.map((c) => c.name);
  // Over budget, the figures are the raised budget's whole dollars, so "over" and "raises to" agree.
  const raised = buy.raisedBudgetCents;
  const hitText = buy.overBudget && budgetDollars !== null && raised !== null
    ? reachCopy.hitLineOver(
      names, price, dollars(raised - budgetDollars * 100), `$${budgetDollars.toLocaleString("en-US")}`, dollars(raised),
      // A placed card took part of the budget: say how far past what is LEFT the set goes.
      buy.budgetLeftCents !== null && buy.budgetLeftCents < budgetDollars * 100 ? dollars(buy.budgetLeftCents) : null,
    )
    : ownOnly ? reachCopy.hitLineOwn(names, price) : reachCopy.hitLine(names, price);
  return (
    <div data-testid="hand-off-reach">
      <p className={LINE}>{reachCopy.shortLead(lands(permits))}</p>
      <div role="radiogroup" aria-label={reachCopy.shortLead(lands(permits))} className="mt-[8px] flex flex-col gap-[6px]">
        <ChoiceRow
          name={name} value="mine" picked={choice === "mine"} onPick={onChoose}
          title={reachCopy.fromMine}
          line={ownOnly ? reachCopy.fromMineLineOwn(lands(permits)) : reachCopy.fromMineLine(lands(permits))}
        />
        <ChoiceRow
          name={name} value="hit" picked={choice === "hit"} onPick={onChoose}
          title={reachCopy.hit(target)}
          tag={buy.overBudget ? reachCopy.overTag : null}
          line={<WithCards text={hitText} cards={buy.cards} />}
        />
      </div>
    </div>
  );
}

/**
 * One radio row. A native radio (visually hidden) carries the state and the keyboard; the row around
 * it takes a press anywhere but on a card name, which opens that card rather than picking the row
 * (one press is one decision). The line sits outside the label, so a card's button is never inside it.
 */
function ChoiceRow({
  name, value, picked, onPick, title, tag = null, line,
}: {
  name: string;
  value: Exclude<BracketChoice, null>;
  picked: boolean;
  onPick?: (choice: Exclude<BracketChoice, null>) => void;
  title: string;
  tag?: string | null;
  line: ReactNode;
}) {
  const id = `${name}-${value}`;
  return (
    <div
      data-testid={`bracket-choice-${value}`}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("button")) return;
        onPick?.(value);
      }}
      className={[
        "flex min-h-[52px] cursor-pointer items-start gap-[11px] rounded-[9px] border border-solid p-[11px_12px]",
        "has-[input:focus-visible]:outline has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-[color:var(--accent)]",
        picked
          ? "border-[color:var(--accent)] bg-[color:var(--elevated)]"
          : "border-[color:var(--border-strong)] bg-[color:var(--surface-sunken)]",
      ].join(" ")}
    >
      <input
        type="radio" id={id} name={name} value={value} checked={picked}
        onChange={() => onPick?.(value)}
        aria-describedby={`${id}-line`}
        className="sr-only"
      />
      <span
        aria-hidden
        className={`relative mt-[1px] block h-[18px] w-[18px] flex-none rounded-full border-[1.5px] border-solid ${
          picked ? "border-[color:var(--accent)]" : "border-[color:var(--fg-faint)]"
        }`}
      >
        {picked && <span className="absolute inset-[3px] rounded-full bg-[color:var(--accent)]" />}
      </span>
      <span className="flex min-w-0 flex-col gap-[3px]">
        <label htmlFor={id} className="flex cursor-pointer flex-wrap items-center gap-[8px] text-[13.5px] font-semibold text-[color:var(--fg)]">
          {title}
          {tag && (
            <span className="rounded-[4px] border border-solid border-[color:color-mix(in_oklab,var(--warning)_45%,transparent)] px-[5px] font-mono text-[9.5px] font-normal text-[color:var(--warning)]">
              {tag}
            </span>
          )}
        </label>
        <span id={`${id}-line`} className="text-[12px] leading-[1.5] text-[color:var(--fg-muted)] [text-wrap:pretty]">{line}</span>
      </span>
    </div>
  );
}

/** A sentence with each card's name drawn as a press that opens the card, as `CardValue`'s name is. */
function WithCards({ text, cards }: { text: string; cards: readonly CardChip[] }) {
  const named = [...cards].filter((c) => c.name.length > 0).sort((a, b) => b.name.length - a.name.length);
  const parts: ReactNode[] = [];
  let rest = text;
  let key = 0;
  while (rest.length > 0) {
    let at = -1;
    let hit: CardChip | null = null;
    for (const c of named) {
      const i = rest.indexOf(c.name);
      if (i !== -1 && (at === -1 || i < at)) { at = i; hit = c; }
    }
    if (!hit) { parts.push(rest); break; }
    if (at > 0) parts.push(rest.slice(0, at));
    parts.push(
      <CardDetailTrigger
        key={`c${key++}`}
        oracleId={hit.oracleId}
        name={hit.name}
        imageUri={hit.imageUri}
        preview
        testId="hand-off-reach-card"
        className="cursor-pointer font-semibold text-[color:var(--fg)] underline decoration-dotted decoration-[color:var(--accent)] underline-offset-[3px]"
      >
        {hit.name}
      </CardDetailTrigger>,
    );
    rest = rest.slice(at + hit.name.length);
  }
  return <>{parts}</>;
}
