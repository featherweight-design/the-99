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
//
// A landing on a rule (the ? on a screen whose question a rule answers, Addendum A1: `?lit=rule/<id>`) lights its card
// (Addendum-A1 `.gk.on`: an accent border and ring) and, on a phone, scrolls the swipe row to it.
//
// Addendum R4 board 4: the block is a panel on the sunken surface at every width (`.panel.gtk`), its heading's top
// rule gone and its sub-line stacked under the heading (`.sh.stacked`); the phone's swipe row bleeds to the panel's
// right edge rather than the page's.

import { useEffect, useRef, useState } from "react";
import { ABOUT_PAGE_STRINGS, type AboutRuleDiagram } from "../../../lib/copy/about-pages";
import { Mark } from "../../home/banner-mark";
import { RuleDiagram } from "./rule-diagrams";
import { useLabelLanding, useLandingRequest } from "../../discovery/label-landing";

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

export function RuleCard({ rule, lit = false }: { rule: RuleCardModel; lit?: boolean }) {
  return (
    <article
      data-rule={rule.key}
      data-lit={lit ? "" : undefined}
      className={`flex h-full flex-col overflow-hidden rounded-[14px] border bg-[color:var(--surface)] ${
        lit
          ? "border-[color:var(--accent)] shadow-[0_0_0_2px_color-mix(in_oklab,var(--accent)_45%,transparent)]"
          : "border-[color:var(--border)]"
      }`}
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
  const landing = useLabelLanding();
  const request = useLandingRequest();
  const row = useRef<HTMLUListElement>(null);
  const litAt = landing === null ? -1 : rules.findIndex((r) => r.key === landing.key);
  // Each landing on one of these rules brings its card into the swipe row's view; from `md` the row is a grid and
  // does not scroll, so this moves nothing there.
  useEffect(() => {
    const el = row.current;
    if (litAt < 0 || el === null || el.scrollWidth <= el.clientWidth) return;
    el.scrollTo({ left: litAt * (CARD_W + GAP), behavior: "instant" });
    setCurrent(currentCard(el, rules.length));
  }, [request, litAt, rules.length]);
  if (rules.length === 0) return null;
  const headingId = `${sectionId}-good-to-know`;
  return (
    <div
      data-good-to-know={sectionId}
      className="-mx-[4px] flex flex-col gap-[14px] rounded-[16px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-sunken)] px-[14px] pb-[16px] pt-[14px]"
    >
      <div className="grid grid-cols-[22px_1fr] items-center gap-x-[10px] gap-y-[2px]">
        <Mark />
        <h3 id={headingId} className="m-0 font-display text-[18px] font-semibold tracking-[0.01em] text-[color:var(--fg)]">
          {ABOUT_PAGE_STRINGS.goodToKnow}
        </h3>
        <span className="col-start-2 text-[13px] text-[color:var(--fg-muted)]">{ABOUT_PAGE_STRINGS.goodToKnowSub}</span>
      </div>
      <ul
        ref={row}
        aria-labelledby={headingId}
        // Below md the row scrolls sideways and no card holds a focus target, so the row itself takes focus for the arrow keys.
        tabIndex={0}
        onScroll={(e) => setCurrent(currentCard(e.currentTarget, rules.length))}
        className="m-0 -mr-[14px] flex list-none rounded-[6px] outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] snap-x snap-mandatory gap-[12px] overflow-x-auto p-0 pr-[14px] [scrollbar-width:none] md:mr-0 md:grid md:grid-cols-2 md:gap-[16px] xl:grid-cols-3 md:overflow-visible md:pr-0 [&::-webkit-scrollbar]:hidden"
      >
        {rules.map((r) => (
          <li key={r.key} className="w-[292px] flex-none snap-start md:w-auto">
            <RuleCard rule={r} lit={landing !== null && landing.key === r.key} />
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
