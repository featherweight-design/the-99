"use client";

// Good to know (About visual build, plan `2026-10-27-about-visual.md`, PR 4; handoff
// `design/design_handoff_the99_about_visual/`, call 2 and R3, boards Decks-Phone, Decks-Desktop, Other-Pages; the
// boards' `.gk-h`, `.gk-row`, `.gk-grid`, `.gk` and `.dots`).
//
// A section's rules the reader is drawn, each a card: its diagram on a plate at least 150px tall (a diagram whose
// switched parts wrap grows the plate rather than being clipped), then the rule's words, which are the VISIBLE text
// (`visibleSections` has already cut every sentence whose switch is off). The heading carries a ruled line above it,
// the release banner's mark, "Good to know" in the display face at 18 and a muted sub-line (R3). On a phone the cards
// are a swipe row with dots; from `md` a grid of three, as the 1300 boards draw it, once `xl` gives each card the plate
// its diagram needs (a 250px diagram clips in a third of a 768px page), and of two below that. A section with no rules
// for this reader draws nothing at all, not even the heading (call 8).

import { useState } from "react";
import { ABOUT_PAGE_STRINGS, type AboutRuleDiagram } from "../../../lib/copy/about-pages";
import { Mark } from "../../home/banner-mark";
import { RuleDiagram } from "./rule-diagrams";

/** A rule as the page hands it over: its key, its visible text and its switch-resolved diagram. */
export interface RuleCardModel {
  key: string;
  text: string;
  diagram: AboutRuleDiagram;
}

/** The phone card's width and the row's gap (`.gk`, `.gk-row`): one swipe moves one card. */
const CARD_W = 292;
const GAP = 12;

/**
 * The card a swipe row has reached. Snapping puts each card at the row's start, except the last ones: a row wider than
 * one card stops scrolling before the last card can reach the start, so the end of the scroll IS the last card.
 */
export function currentCard(row: { scrollLeft: number; scrollWidth: number; clientWidth: number }, count: number): number {
  if (count <= 1) return 0;
  if (row.scrollLeft >= row.scrollWidth - row.clientWidth - 1) return count - 1;
  return Math.min(count - 1, Math.round(row.scrollLeft / (CARD_W + GAP)));
}

export function RuleCard({ rule }: { rule: RuleCardModel }) {
  return (
    <article
      data-rule={rule.key}
      className="flex h-full flex-col overflow-hidden rounded-[14px] border border-[color:var(--border)] bg-[color:var(--surface)]"
    >
      <div
        aria-hidden="true"
        className="relative flex min-h-[150px] flex-none items-center justify-center overflow-hidden border-b border-b-[color:var(--border)] bg-[color:var(--bg)] p-[12px]"
      >
        <RuleDiagram diagram={rule.diagram} />
      </div>
      <p className="m-0 px-[14px] pb-[15px] pt-[13px] text-[13.5px] leading-[1.55] text-[color:var(--fg-body)] [text-wrap:pretty]">
        {rule.text}
      </p>
    </article>
  );
}

export function GoodToKnow({ sectionId, rules }: { sectionId: string; rules: readonly RuleCardModel[] }) {
  const [current, setCurrent] = useState(0);
  if (rules.length === 0) return null;
  const headingId = `${sectionId}-good-to-know`;
  return (
    <div data-good-to-know={sectionId} className="flex flex-col gap-[16px] md:gap-[14px]">
      <div className="flex items-center gap-[10px] border-t border-t-[color:var(--border)] pt-[14px]">
        <Mark />
        <h3 id={headingId} className="m-0 font-display text-[18px] font-semibold tracking-[0.01em] text-[color:var(--fg)]">
          {ABOUT_PAGE_STRINGS.goodToKnow}
        </h3>
        <span className="ml-[2px] text-[13px] text-[color:var(--fg-muted)]">{ABOUT_PAGE_STRINGS.goodToKnowSub}</span>
      </div>
      <ul
        aria-labelledby={headingId}
        // Below md the row scrolls sideways and no card holds a focus target, so the row itself takes focus for the arrow keys.
        tabIndex={0}
        onScroll={(e) => setCurrent(currentCard(e.currentTarget, rules.length))}
        className="m-0 -mr-[16px] flex list-none rounded-[6px] outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] snap-x snap-mandatory gap-[12px] overflow-x-auto p-0 pr-[16px] [scrollbar-width:none] md:mr-0 md:grid md:grid-cols-2 md:gap-[16px] xl:grid-cols-3 md:overflow-visible md:pr-0 [&::-webkit-scrollbar]:hidden"
      >
        {rules.map((r) => (
          <li key={r.key} className="w-[292px] flex-none snap-start md:w-auto">
            <RuleCard rule={r} />
          </li>
        ))}
      </ul>
      {rules.length > 1 ? (
        <div data-good-to-know-dots aria-hidden="true" className="flex justify-center gap-[6px] pt-[2px] md:hidden">
          {rules.map((r, i) => (
            <i
              key={r.key}
              data-on={i === current ? "" : undefined}
              className={`block h-[6px] w-[6px] rounded-full ${
                i === current ? "bg-[color:var(--fg-muted)]" : "bg-[color:var(--border-strong)]"
              }`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
