"use client";

// Show me's landing on an About page (About visual build, plan `2026-10-27-about-visual.md`, PR 5; handoff
// `design/design_handoff_the99_about_visual/`, calls 6 and 7, board Ways-In "Landing").
//
// A one-time `?lit=<label key>`. The page decides the landing on the server, from the labels the reader is drawn and
// whether they have been told about this one (`unseenUnits`, the banner's own rule), and hands it here. The labelled
// screen lights the label through its own press-to-light state (`labelled-screen.tsx` seeds it from this landing), so
// the halo, the pin and the line are the ones a press draws. A label the reader has NOT been told about is also marked
// New, with a Show me under its words and its tool card: on a phone directly under the label, from `md` lit in the
// section's Try it row (the boards draw each). A label they have been told about lights and nothing more.
//
// Then the parameter is stripped through `mirrorUrl`, never `history.replaceState`, keeping the section's hash. A
// `?lit=` the page could not land on (a label switched off, another page's, anything else) is stripped the same way.
// Nothing is written here: recording the visit is PR 6b's.

import { createContext, useContext, useEffect, type ReactNode } from "react";
import { ABOUT_PAGE_STRINGS } from "../../lib/copy/about-pages";
import type { PageWidth } from "../../lib/about/page-shots";
import type { Landing, PageCard, PageToolCard } from "../../lib/discovery/page-tools";
import { reveal } from "../../lib/ui/reveal";
import { mirrorUrl } from "../../lib/url/mirror";
import { ToolCard, type ToolCardLink } from "../about/tools/tool-card";
import { TOUCH_HIT } from "../ui/touch-hit";

/** The one-time parameter Show me writes. */
export const LIT_PARAM = "lit";

export type { Landing, PageCard };

const LandingContext = createContext<Landing | null>(null);

/** The landing this page is drawing, or null. */
export function useLabelLanding(): Landing | null {
  return useContext(LandingContext);
}

/** Where a landing's Show me scrolls to: the card under the label (phone) or the lit card in Try it (desktop). */
export const landingCardAnchor = (tool: string, width: PageWidth) => `landing-${width}-${tool}`;

/** The Show me link on a page's tool card: lights its label (call 6). */
export const showMeLink = (card: PageToolCard): ToolCardLink => ({ href: card.showMe, label: ABOUT_PAGE_STRINGS.toolShowMe });

/** Strips `?lit=` from the live address, keeping its hash and history state. */
export function stripLit(): void {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(LIT_PARAM)) return;
  url.searchParams.delete(LIT_PARAM);
  mirrorUrl(url, window.history.state);
}

export function LabelLanding({
  landing, request, children,
}: {
  landing: Landing | null;
  /** The page's per-render token when the address carried `?lit=`, so a second Show me to this page lands again. */
  request: string | null;
  children: ReactNode;
}) {
  useEffect(() => {
    if (request !== null) stripLit();
  }, [request]);
  return <LandingContext.Provider value={landing}>{children}</LandingContext.Provider>;
}

/** The New tag after a landed label's words, for a label the reader has not been told about (Ways-In `.newtag`). */
export function NewTag({ landing }: { landing: Landing }) {
  if (!landing.isNew) return null;
  return (
    <span
      data-about-new
      className="ml-[6px] inline-block rounded-[4px] bg-[color:var(--accent)] px-[5px] align-[1px] font-mono text-[9.5px] font-semibold uppercase leading-[16px] tracking-[0.08em] text-[color:var(--bg)]"
    >
      {ABOUT_PAGE_STRINGS.newTag}
    </span>
  );
}

/** Under a new label's words, Show me: scrolls to its tool card, under the label or lit in Try it (Ways-In `.showme`). */
export function LandingShowMe({ landing, width }: { landing: Landing; width: PageWidth }) {
  if (!landing.isNew || landing.card === null) return null;
  const tool = landing.card.card.id;
  return (
    <button
      type="button"
      data-about-landing-show-me
      // `reveal`, the app's own eased scroll, so quick return reads it as the app's and not the reader's.
      onClick={() => reveal(document.getElementById(landingCardAnchor(tool, width)), "nearest")}
      className={`${TOUCH_HIT} cursor-pointer border-0 bg-transparent p-0 font-mono text-[12px] font-medium text-[color:var(--accent-text)] hover:underline`}
    >
      {ABOUT_PAGE_STRINGS.toolShowMe}
    </button>
  );
}

/** On a phone, the landed label's tool card, directly under it (Ways-In phone landing). */
export function LandingCard({ landing }: { landing: Landing }) {
  if (!landing.isNew || landing.card === null) return null;
  const { card, phone } = landing.card;
  return (
    <div data-about-landing-card={card.id} className="pb-[8px] pt-[4px]">
      <ToolCard card={card} shot={phone} link={showMeLink(card)} anchor={landingCardAnchor(card.id, "phone")} />
    </div>
  );
}
