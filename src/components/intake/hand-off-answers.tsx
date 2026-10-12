"use client";

// *Built from your answers* (HANDOFF §6): the create page's one new block when a result's press
// brought the player here. One row per answer given, in the order the form asks them; colors and
// the words are never rows. Each row is a mono key, the value, and one line on what the answer does
// to the deck. The card is the results bar's own `CardValue`, so it reads, prices and opens the same.

import Link from "next/link";
import { CardDetailProvider } from "../cards/card-detail-provider";
import { HoverPreviewProvider } from "../decks/hover-preview";
import { CardValue } from "./read-as-bar";
import { helpMeChooseCopy, orList } from "../../lib/copy/help-me-choose";
import { formatCents } from "../../lib/decks/price";
import { buysCard } from "../../lib/intake/buys-card";
import type { HandOffAnswers } from "../../lib/intake/hand-off-load";

const copy = helpMeChooseCopy.handOff;

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

export function HandOffAnswersBlock({ answers, changeHref }: { answers: HandOffAnswers; changeHref: string }) {
  const { themes, themeJoin, sets, pool, card, cardUnread, budgetDollars, bracket } = answers;
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
              "relative ml-auto font-mono text-[11px] text-[color:var(--accent)] no-underline",
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
          <Row k={copy.keys.budget} line={budgetLine(card, cardUnread, pool === "own")}>
            <span className="tabular-nums">${budgetDollars.toLocaleString("en-US")}</span>
          </Row>
        )}
        {bracket !== null && (
          <Row k={copy.keys.bracket} line={copy.bracket(bracket)}>
            <span>{copy.bracketValue(bracket)}</span>
          </Row>
        )}
      </section>
      </HoverPreviewProvider>
    </CardDetailProvider>
  );
}

function Row({ k, line, children }: { k: string; line: string | null; children: React.ReactNode }) {
  return (
    <div data-testid="hand-off-row" className="flex flex-col items-baseline gap-[4px] md:flex-row md:gap-[12px]">
      <span className="flex-none font-mono text-[10px] uppercase tracking-[0.1em] text-[color:var(--fg-locked)] md:w-[104px]">{k}</span>
      <div className="flex min-w-0 flex-1 flex-col gap-[2px] self-stretch">
        <div className="text-[13.5px] font-semibold text-[color:var(--fg)]">{children}</div>
        {line && <p className="m-0 text-[12px] leading-[1.5] text-[color:var(--fg-muted)]">{line}</p>}
      </div>
    </div>
  );
}
