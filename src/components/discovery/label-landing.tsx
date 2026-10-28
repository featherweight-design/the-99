"use client";

// Show me's landing on an About page (About visual build, plan `2026-10-27-about-visual.md`, PR 5; handoff
// `design/design_handoff_the99_about_visual/`, calls 6 and 7, board Ways-In "Landing").
//
// A one-time `?lit=<label key>`, read from the LIVE address (`useLiveQuery`), not from the server render: a second Show
// me to the page the reader is on is served from Next's router cache with no server render at all (measured at 1300:
// the label stayed dark and `lit` was never stripped). The server decides only which labels this page can land on and
// whether each is New to the reader (`landableIn`, from `unseenUnits`, the banner's own rule), plus the request's own
// `lit` so the first paint is already lit. Every ARRIVAL of `lit` in the address lands, the same label's included
// after it was stripped, and bumps the landing's token so the labelled screen lights it again. The labelled
// screen lights the label through its own press-to-light state (`labelled-screen.tsx` seeds it from this landing), so
// the halo, the pin and the line are the ones a press draws. A label the reader has NOT been told about is also marked
// New, with a Show me under its words and its tool card: on a phone directly under the label, from `md` lit in the
// section's Try it row (the boards draw each). A label they have been told about lights and nothing more.
//
// Then the parameter is stripped through `mirrorUrl`, never `history.replaceState`, the hash written once as the
// landed label's section (Next can double it on a same-page push), and that section brought into view. A `?lit=` the
// page could not land on (a label switched off, another page's, anything else) is stripped the same way and lights
// nothing.
// Nothing is written here: recording the visit is PR 6b's.

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { ABOUT_PAGE_STRINGS } from "../../lib/copy/about-pages";
import type { PageWidth } from "../../lib/about/page-shots";
import { useLiveQuery } from "../../lib/commanders/live-query";
import {
  LIT_PARAM, landingFor, landingSectionId, type Landable, type Landing, type PageCard, type PageToolCard,
} from "../../lib/discovery/page-tools";
import { reveal } from "../../lib/ui/reveal";
import { mirrorUrl } from "../../lib/url/mirror";
import { ToolCard, type ToolCardLink } from "../about/tools/tool-card";
import { TOUCH_HIT } from "../ui/touch-hit";


export type { Landable, Landing, PageCard };

const LandingContext = createContext<{ landing: Landing | null; request: number }>({ landing: null, request: 0 });

/** The landing this page is drawing, or null. */
export function useLabelLanding(): Landing | null {
  return useContext(LandingContext).landing;
}

/** The landing's token: a new one for every arrival of `?lit=`, the same label's included, so each one lands again. */
export function useLandingRequest(): number {
  return useContext(LandingContext).request;
}

/** Where a landing's Show me scrolls to: the card under the label (phone) or the lit card in Try it (desktop). */
export const landingCardAnchor = (tool: string, width: PageWidth) => `landing-${width}-${tool}`;

/** The Show me link on a page's tool card: lights its label (call 6). */
export const showMeLink = (card: PageToolCard): ToolCardLink => ({ href: card.showMe, label: ABOUT_PAGE_STRINGS.toolShowMe });

/** Strips `?lit=` from the live address, keeping its hash. No history state is passed: Next's `replaceState` skips
 * adopting a URL whose state carries its own `__NA` mark (it copies its internals itself), and a router left holding
 * `?lit=` treats the next Show me to the same label as a jump within the page, with no server render and the hash
 * written twice (measured at 1300). */
export function stripLit(section: string | null = null): void {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(LIT_PARAM)) return;
  url.searchParams.delete(LIT_PARAM);
  if (section) url.hash = section;
  mirrorUrl(url);
}

/** The `lit` a query string carries: null with none, "" (lands nowhere, still stripped) for a repeated one. */
function litOf(query: string): string | null {
  const all = new URLSearchParams(query).getAll(LIT_PARAM);
  if (all.length === 0) return null;
  return all.length === 1 ? all[0] : "";
}

export function LabelLanding({
  landable, initialLit, cards, children,
}: {
  /** The labels this page can land on, and whether each is New to the reader (`landableIn`). */
  landable: Landable;
  /** The request's `?lit=` when it names a landable label: the server render and first paint are lit with it. */
  initialLit: string | null;
  /** The page's tool cards, for the landed label's own. */
  cards: readonly PageCard[];
  children: ReactNode;
}) {
  const live = litOf(useLiveQuery(initialLit === null ? "" : new URLSearchParams({ [LIT_PARAM]: initialLit }).toString()));
  // Each arrival of `lit` in the address, adjusted during render: a change to a value is an arrival, and the strip's
  // change back to none is not. The landing outlives the strip, so the label stays lit with its New mark.
  const [arrival, setArrival] = useState<{ n: number; lit: string | null }>(() => ({ n: live === null ? 0 : 1, lit: live }));
  const [last, setLast] = useState<string | null>(live);
  if (live !== last) {
    setLast(live);
    if (live !== null) setArrival((a) => ({ n: a.n + 1, lit: live }));
  }
  const landing = landingFor(arrival.lit, landable, cards);
  const section = landing === null ? null : landingSectionId(landing.key);
  useEffect(() => {
    if (arrival.n === 0) return;
    stripLit(section);
    // The strip loses the browser's own jump to the section (measured at 390: the page stayed at the top), so the
    // landing brings its section into view itself, through `reveal` so the app's scroll marks read it as the app's. A
    // landed label's section is its key's; a `lit` that lands nowhere scrolls to the address's own hash, if any.
    let id = section ?? "";
    if (!id) {
      try {
        id = decodeURIComponent(window.location.hash.slice(1));
      } catch {
        // A malformed fragment names no section.
      }
    }
    if (id) reveal(document.getElementById(id), "start");
  }, [arrival, section]);
  return <LandingContext.Provider value={{ landing, request: arrival.n }}>{children}</LandingContext.Provider>;
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
