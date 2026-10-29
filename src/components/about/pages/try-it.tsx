"use client";

// Try it (About visual build, plan `2026-10-27-about-visual.md`, PR 5; handoff `design/design_handoff_the99_about_visual/`,
// calls 0 and 6, R3, boards Decks-Phone, Decks-Desktop, Other-Pages, Ways-In; the boards' `.try-h`, `.tc`, `.tc-grid`).
//
// A section's tool cards, after its Good to know: the shipped tool card, its press still Try it (`tryHref`), its
// footer's left link now `Show me ›`, which lights the tool's label on this page (call 6). The heading matches Good to
// know's weight (R3): a ruled line above, an accent ring with an arrow, "Try it" in the display face at 18, a muted
// sub-line. A section with no card for this reader draws nothing.
//
// THE PICTURE MATCHES THE DEVICE (call 0): both widths render and CSS shows the reader's own, so a phone card carries
// its 390 crop and a desktop card its tool's desktop crop. Phone: the first card, then "N more below", which opens the
// rest under it. Desktop: a row of three at the boards' 1300 (two below `lg`, where a third of the page squeezes a card's
// name against its cost chip). A Show me landing on a label the reader had not been told about lights its tool's card
// in the desktop row (Ways-In desktop landing); on a phone that card is drawn under the label instead.

import { useEffect, useRef, useState } from "react";
import { ABOUT_PAGE_STRINGS } from "../../../lib/copy/about-pages";
import { addPanelCopy } from "../../../lib/copy/decks-builder";
import { noteAppScroll } from "../../../lib/ui/reveal";
import { landingCardAnchor, showMeLink, useLabelLanding, type PageCard } from "../../discovery/label-landing";
import { ToolCard } from "../tools/tool-card";
import { TOUCH_HIT } from "../../ui/touch-hit";

export function TryIt({ sectionId, cards }: { sectionId: string; cards: readonly PageCard[] }) {
  // Per visit: a remount (a new visit, a ? landing) starts folded (Small items 2, item 2).
  const [open, setOpen] = useState(false);
  // Where focus goes after the list opens or folds: the first card it added, or the press it restored.
  const focusAfter = useRef<"opened" | "folded" | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const moreRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    const after = focusAfter.current;
    focusAfter.current = null;
    // The card's Try it press is its whole-card link, the one that carries the card's name as its label. A card with no
    // way in draws none: then its first link or button, else the card itself, so focus still reaches what opened.
    if (after === "opened") {
      const added = listRef.current?.children[1] as HTMLElement | undefined;
      const target = added?.querySelector<HTMLElement>("a[aria-label]") ?? added?.querySelector<HTMLElement>("a, button") ?? added;
      if (target && target === added) added.tabIndex = -1;
      target?.focus();
    }
    if (after === "folded") {
      moreRef.current?.focus();
      // The app's own scroll, so quick return does not read it as the reader's.
      noteAppScroll();
      moreRef.current?.scrollIntoView?.({ block: "nearest" });
    }
  }, [open]);
  const landing = useLabelLanding();
  if (cards.length === 0) return null;
  const headingId = `${sectionId}-try-it`;
  const phoneListId = `${sectionId}-try-it-phone`;
  // 44 x 44 at every pointer (Small items 2, 2a): the box itself, and `TOUCH_HIT` past it on a coarse one.
  const press = `${TOUCH_HIT} inline-flex min-h-[44px] min-w-[44px] items-center justify-center cursor-pointer self-center border-0 bg-transparent p-0 font-mono text-[10px] font-medium tracking-[0.04em] text-[color:var(--fg-faint)] hover:text-[color:var(--fg-muted)] active:text-[color:var(--fg-muted)] md:hidden`;
  const litTool = landing?.isNew && landing.card ? landing.card.card.id : null;
  // On a phone the landed card is drawn under its label instead (Ways-In phone landing), so it leaves this list; a
  // list it leaves empty draws no phone heading either.
  const phoneAll = cards.filter((c) => c.card.id !== litTool);
  const [first, ...rest] = phoneAll;
  const phoneCards = open ? phoneAll : phoneAll.slice(0, 1);
  return (
    <div data-try-it={sectionId} className={`${first ? "flex" : "hidden md:flex"} flex-col gap-[16px] md:gap-[14px]`}>
      <div className="flex items-center gap-[10px] border-t border-t-[color:var(--border)] pt-[14px]">
        <span
          aria-hidden="true"
          className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full border border-[color:var(--accent)] text-[12px] text-[color:var(--accent-text)]"
        >
          →
        </span>
        <h3 id={headingId} className="m-0 font-display text-[18px] font-semibold tracking-[0.01em] text-[color:var(--fg)]">
          {ABOUT_PAGE_STRINGS.tryIt}
        </h3>
        <span className="ml-[2px] text-[13px] text-[color:var(--fg-muted)]">{ABOUT_PAGE_STRINGS.tryItSub}</span>
      </div>
      <ul ref={listRef} id={phoneListId} aria-labelledby={headingId} data-try-it-width="phone" className="m-0 flex list-none flex-col gap-[16px] p-0 md:hidden">
        {phoneCards.map((c) => (
          <li key={c.card.id}>
            <ToolCard card={c.card} shot={c.phone} link={showMeLink(c.card)} />
          </li>
        ))}
      </ul>
      {rest.length > 0 && (open ? (
        <button
          type="button"
          data-try-it-fewer
          aria-expanded="true"
          aria-controls={phoneListId}
          onClick={() => {
            focusAfter.current = "folded";
            setOpen(false);
          }}
          className={press}
        >
          {addPanelCopy.consider.collapse}<span aria-hidden="true"> ▴</span>
        </button>
      ) : (
        <button
          ref={moreRef}
          type="button"
          data-try-it-more
          aria-expanded="false"
          aria-controls={phoneListId}
          onClick={() => {
            focusAfter.current = "opened";
            setOpen(true);
          }}
          className={press}
        >
          {ABOUT_PAGE_STRINGS.moreBelow(rest.length)}<span aria-hidden="true"> ▾</span>
        </button>
      ))}
      <ul
        aria-labelledby={headingId}
        data-try-it-width="desktop"
        className="m-0 hidden list-none items-start gap-[16px] p-0 md:grid md:grid-cols-2 lg:grid-cols-3"
      >
        {cards.map((c) => (
          <li key={c.card.id}>
            <ToolCard
              card={c.card}
              shot={c.desktop}
              link={showMeLink(c.card)}
              lit={c.card.id === litTool}
              anchor={c.card.id === litTool ? landingCardAnchor(c.card.id, "desktop") : undefined}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
