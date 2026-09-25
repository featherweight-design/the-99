"use client";

// *Built from your answers* (HANDOFF §6): the create page's one new block when a result's press
// brought the player here. One row per answer given, in the order the form asks them; colors and
// the words are never rows. Each row is a mono key, the value, and one line on what the answer does
// to the deck. The card is the results bar's own `CardValue`, so it reads, prices and opens the same.

import Link from "next/link";
import { CardDetailProvider } from "../cards/card-detail-provider";
import { CardValue } from "./read-as-bar";
import { helpMeChooseCopy } from "../../lib/copy/help-me-choose";
import { formatCents } from "../../lib/decks/price";
import type { HandOffAnswers } from "../../lib/intake/hand-off-load";

const copy = helpMeChooseCopy.handOff;

/** What the budget does, which turns on the card the fill pays for first. */
export function budgetLine(card: HandOffAnswers["card"]): string {
  // An owned card costs the budget nothing, so it is not paid for first.
  if (card === null || card.owned) return copy.budgetAlone;
  return card.price.kind === "priced" ? copy.budgetFirst(card.name, formatCents(card.price.cents)) : copy.budgetUnknown(card.name);
}

export function HandOffAnswersBlock({ answers, changeHref }: { answers: HandOffAnswers; changeHref: string }) {
  const { themes, card, budgetDollars, bracket } = answers;
  return (
    <CardDetailProvider>
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
        {themes.map((t) => (
          <Row key={`t:${t.slug}`} k={copy.keys.theme} line={t.pct === null ? null : copy.themeFig(t.pct, t.label)}>
            <span>{t.label}</span>
          </Row>
        ))}
        {card && (
          <Row k={copy.keys.card} line={card.pct === null ? copy.placed : `${copy.placed} ${copy.cardFig(card.pct)}`}>
            <span className="flex min-w-0 items-center gap-[8px]">
              <CardValue card={card} size="row" />
            </span>
          </Row>
        )}
        {budgetDollars !== null && (
          <Row k={copy.keys.budget} line={budgetLine(card)}>
            <span className="tabular-nums">${budgetDollars.toLocaleString("en-US")}</span>
          </Row>
        )}
        {bracket !== null && (
          <Row k={copy.keys.bracket} line={copy.bracket(bracket)}>
            <span>{copy.bracketValue(bracket)}</span>
          </Row>
        )}
      </section>
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
