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
// its 390 crop and a desktop card its tool's desktop crop. Phone: the first card, then "N more tools", which opens the
// rest under it. Desktop: a row of three at the boards' 1300 (two below `lg`, where a third of the page squeezes a card's
// name against its cost chip). A Show me landing on a label the reader had not been told about lights its tool's card
// in the desktop row (Ways-In desktop landing); on a phone that card is drawn under the label instead.
//
// Addendum R4 board 4: the block is a panel faintly lit in the accent at every width, its heading's ring gives way to
// a square spark plate in Good to know's family, the sub-line stacks under the heading, and "N more below" becomes a
// full-width button (`.morebtn`) with the folded cards peeking out as two edges under the first. Open, the peeks go
// and Show fewer takes the same button. Each card's one press is its button (board 5), which the open list focuses.

import { useEffect, useRef, useState } from "react";
import { ABOUT_PAGE_STRINGS } from "../../../lib/copy/about-pages";
import { addPanelCopy } from "../../../lib/copy/decks-builder";
import { noteAppScroll } from "../../../lib/ui/reveal";
import { landingCardAnchor, showMeLink, useLabelLanding, type PageCard } from "../../discovery/label-landing";
import { ToolCard } from "../tools/tool-card";

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
    // The card's one press, its button (R4 board 5). A card with no button: its first link or button, else the card
    // itself, so focus still reaches what opened.
    if (after === "opened") {
      const added = listRef.current?.children[1] as HTMLElement | undefined;
      const target =
        added?.querySelector<HTMLElement>("[data-tool-card-press]") ?? added?.querySelector<HTMLElement>("a, button") ?? added;
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
  // R4 board 4's `.morebtn`: full width, 44px tall, the secondary style; More and Show fewer share it.
  const press =
    "flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-[8px] rounded-[10px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface)] px-[12px] text-[14px] font-medium text-[color:var(--fg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)] md:hidden";
  const litTool = landing?.isNew && landing.card ? landing.card.card.id : null;
  // On a phone the landed card is drawn under its label instead (Ways-In phone landing), so it leaves this list; a
  // list it leaves empty draws no phone heading either.
  const phoneAll = cards.filter((c) => c.card.id !== litTool);
  const [first, ...rest] = phoneAll;
  const phoneCards = open ? phoneAll : phoneAll.slice(0, 1);
  return (
    <div
      data-try-it={sectionId}
      className={`${first ? "flex" : "hidden md:flex"} -mx-[4px] flex-col gap-[14px] rounded-[16px] border border-solid border-[color:color-mix(in_oklab,var(--accent)_34%,var(--border))] bg-[color:color-mix(in_oklab,var(--accent)_7%,var(--bg))] px-[14px] pb-[16px] pt-[14px]`}
    >
      <div className="grid grid-cols-[22px_1fr] items-center gap-x-[10px] gap-y-[2px]">
        <SparkPlate />
        <h3 id={headingId} className="m-0 font-display text-[18px] font-semibold tracking-[0.01em] text-[color:var(--fg)]">
          {ABOUT_PAGE_STRINGS.tryIt}
        </h3>
        <span className="col-start-2 text-[13px] text-[color:var(--fg-muted)]">{ABOUT_PAGE_STRINGS.tryItSub}</span>
      </div>
      {/* Folded, the cards behind the first peek out under it as two edges (`.stack`, `.peek`), however many wait. */}
      <div className={`relative isolate md:hidden ${!open && rest.length > 0 ? "pb-[12px]" : ""}`}>
        <ul ref={listRef} id={phoneListId} aria-labelledby={headingId} data-try-it-width="phone" className="relative z-[1] m-0 flex list-none flex-col gap-[16px] p-0">
          {phoneCards.map((c) => (
            <li key={c.card.id}>
              <ToolCard card={c.card} shot={c.phone} link={showMeLink(c.card)} />
            </li>
          ))}
        </ul>
        {!open && rest.length > 0 && (
          <>
            <i
              aria-hidden
              data-try-it-peek
              className="absolute bottom-[6px] left-[8px] right-[8px] z-0 block h-[20px] rounded-b-[14px] border border-t-0 border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-raised)]"
            />
            <i
              aria-hidden
              data-try-it-peek
              className="absolute bottom-0 left-[16px] right-[16px] -z-[1] block h-[20px] rounded-b-[14px] border border-t-0 border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-sunken)]"
            />
          </>
        )}
      </div>
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
          {addPanelCopy.consider.collapse}
          <span aria-hidden="true" className="text-[color:var(--accent-text)]">▴</span>
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
          {ABOUT_PAGE_STRINGS.moreTools(rest.length)}
          <span aria-hidden="true" className="text-[color:var(--accent-text)]">▾</span>
        </button>
      ))}
      <ul
        aria-labelledby={headingId}
        data-try-it-width="desktop"
        // Stretched, so each card's button sits at its foot and a row's buttons share one baseline (R4 README 5.4).
        className="m-0 hidden list-none items-stretch gap-[16px] p-0 md:grid md:grid-cols-2 lg:grid-cols-3"
      >
        {cards.map((c) => (
          <li key={c.card.id} className="h-full">
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

/** Try it's mark (R4 board 4, `mark_try_new`): Good to know's square plate holding a small four-point spark, so it cannot
 *  read as a card's round press. */
function SparkPlate() {
  return (
    <span
      aria-hidden="true"
      data-try-it-mark
      className="box-border flex h-[22px] w-[22px] flex-none items-center justify-center rounded-[6px]"
      style={{
        background: "color-mix(in srgb, var(--accent) 16%, transparent)",
        border: "1px solid color-mix(in srgb, var(--accent) 45%, transparent)",
      }}
    >
      <svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true">
        <path d="M6 0 L7.3 4.7 L12 6 L7.3 7.3 L6 12 L4.7 7.3 L0 6 L4.7 4.7 Z" fill="var(--accent)" />
      </svg>
    </span>
  );
}
