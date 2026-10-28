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

import { useState } from "react";
import { ABOUT_PAGE_STRINGS } from "../../../lib/copy/about-pages";
import { landingCardAnchor, showMeLink, useLabelLanding, type PageCard } from "../../discovery/label-landing";
import { ToolCard } from "../tools/tool-card";
import { TOUCH_HIT } from "../../ui/touch-hit";

export function TryIt({ sectionId, cards }: { sectionId: string; cards: readonly PageCard[] }) {
  const [open, setOpen] = useState(false);
  const landing = useLabelLanding();
  if (cards.length === 0) return null;
  const headingId = `${sectionId}-try-it`;
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
      <ul aria-labelledby={headingId} data-try-it-width="phone" className="m-0 flex list-none flex-col gap-[16px] p-0 md:hidden">
        {phoneCards.map((c) => (
          <li key={c.card.id}>
            <ToolCard card={c.card} shot={c.phone} link={showMeLink(c.card)} />
          </li>
        ))}
      </ul>
      {!open && rest.length > 0 && (
        <button
          type="button"
          data-try-it-more
          onClick={() => setOpen(true)}
          className={`${TOUCH_HIT} cursor-pointer self-center border-0 bg-transparent p-0 font-mono text-[10px] font-medium tracking-[0.04em] text-[color:var(--fg-faint)] hover:text-[color:var(--fg-muted)] md:hidden`}
        >
          {ABOUT_PAGE_STRINGS.moreBelow(rest.length)}
        </button>
      )}
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
