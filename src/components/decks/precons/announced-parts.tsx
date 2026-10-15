"use client";

// The pieces the Announced group's two views share (handoff R1 T2–T6, R2 Q3; design table: Set block, Revealed
// card, Strip, None plate, `new` tag, Jump): a revealed commander, the strip of them, the empty plate, the set
// block in tiles, and the meta lines' words.
//
// A revealed commander opens its card details on a press and draws the hover preview, as every card thumb in the
// app does (`CardDetailTrigger` with `preview`; Hugh, 2026-10-15, reversing G2's "links nowhere"). In tiles each
// set's commanders are drawn as the precon list's own tiles, in its own grid (`PRECON_TILES_CLASS`), so they are
// the decklists' size; in rows the opened row keeps the small strip. Outside a `CardDetailProvider` (About's
// specimen) a commander is drawn as before, unpressable.

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { preconDate, preconsCopy } from "../../../lib/copy/precons";
import { colorNames } from "../../../lib/copy/color-labels";
import { WUBRG_COLOR } from "../../../lib/collection/browse";
import { countdown, type AnnouncedMatch } from "../../../lib/precons/arrivals";
import type { RevealedCommander } from "../../../lib/precons/revealed";
import { HydratedImg } from "../../ui/hydrated-art";
import { CardDetailTrigger, useCardDetailIfAny } from "../../cards/card-detail-provider";
import { CardTileCaption, TILE_ART_CLIP, TILE_ART_RATIO, TILE_SHELL } from "../../ui/card-tile-caption";
import { PRECON_TILES_CLASS } from "./precon-grid";

const copy = preconsCopy.upcoming;

/** The 1px inner edge every card image carries, drawn OVER the art (an inset shadow paints under an img). */
const INNER_EDGE = "pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.25)]";
/** 2px `--accent`, 2px off (STATES H8, C3). */
export const FOCUS_RING = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]";
/** The `new` tag (design table: `new` tag). */
export const NEW_TAG = "flex-none rounded-[4px] border border-solid border-[color:color-mix(in_srgb,var(--accent)_45%,transparent)] px-[5px] font-mono text-[10px] leading-[16px] tracking-[0.06em] text-[color:var(--accent)]";

/** A set's dots: its revealed commanders' identities, in WUBRG order. */
export function setIdentity(commanders: readonly RevealedCommander[]): string[] {
  return ["W", "U", "B", "R", "G"].filter((c) => commanders.some((x) => x.colorIdentity.includes(c)));
}

function Dots({ identity, size }: { identity: readonly string[]; size: string }) {
  const shown = identity.length > 0 ? identity : ["C"];
  return (
    <span aria-hidden className="flex flex-none gap-[3px]">
      {shown.map((c) => (
        <span key={c} className={`${size} rounded-full`} style={{ background: c === "C" ? "var(--fg-faint)" : WUBRG_COLOR[c] }} />
      ))}
    </span>
  );
}

/** A commander's spoken name: its full name (the printed one is clamped or truncated), its colors, what it is. */
function spokenName(card: RevealedCommander, press = false): string {
  const colors = card.colorIdentity.length > 0 ? colorNames(card.colorIdentity).join(", ") : preconsCopy.row.colorless;
  return press ? copy.pressAria(card.name, colors) : copy.cardAria(card.name, colors);
}

/**
 * A commander's art as the control that opens it: the shared `CardDetailTrigger`, with the hover preview of its
 * normal render, paging the set's commanders. It carries the commander's whole spoken name, so nothing beside it
 * speaks the name again. With no provider it is the art alone, hidden, and the name is spoken beside it.
 */
function CommanderPress({ card, siblings, className, style, children }: {
  card: RevealedCommander;
  siblings: readonly string[];
  className: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const detail = useCardDetailIfAny();
  if (!detail) {
    return (
      <>
        <span aria-hidden className={className} style={style}>{children}</span>
        <span className="sr-only">{spokenName(card)}</span>
      </>
    );
  }
  return (
    <CardDetailTrigger
      oracleId={card.oracleId}
      name={card.name}
      siblings={siblings}
      imageUri={card.imageUri ?? card.imageUriSmall}
      preview
      ariaLabel={spokenName(card, true)}
      testId="revealed-press"
      // The trigger merges its classes, and the merge drops the ring's bare `outline` as a width it outranks, which
      // also took the outline's style with it: `outline-solid` puts the style back.
      className={`${className} ${FOCUS_RING} focus-visible:outline-solid`}
      style={style}
    >
      {children}
    </CardDetailTrigger>
  );
}

/** One revealed commander in the rows view's strip: its small art, its name (two lines at most) and its dots. */
function RevealedCard({ card, siblings }: { card: RevealedCommander; siblings: readonly string[] }) {
  return (
    <li className="flex w-[76px] flex-none flex-col gap-[5px] md:w-[84px]" data-testid="revealed-card">
      <CommanderPress
        card={card}
        siblings={siblings}
        className="relative block h-[106px] w-[76px] overflow-hidden rounded-[4px] bg-[color:var(--surface-sunken)] md:h-[117px] md:w-[84px]"
      >
        {card.imageUriSmall && (
          <HydratedImg src={card.imageUriSmall} decoding="async" className="absolute inset-0 h-full w-full object-cover" />
        )}
        <span className={INNER_EDGE} />
      </CommanderPress>
      <span aria-hidden className="line-clamp-2 min-h-[27px] text-[10.5px] leading-[1.3] text-[color:var(--fg-body)] md:min-h-[28px] md:text-[11px]">
        {card.name}
      </span>
      <Dots identity={card.colorIdentity} size="h-[7px] w-[7px] md:h-[8px] md:w-[8px]" />
    </li>
  );
}

/** T2: nothing revealed yet. One card's size, in the shipped no-art language. */
function NonePlate() {
  return (
    <li className="flex h-[106px] w-[76px] flex-none items-center justify-center rounded-[4px] border border-solid border-[color:var(--border)] bg-[color:var(--surface-sunken)] px-[6px] text-center md:h-[117px] md:w-[84px]" data-testid="none-plate">
      <span className="font-mono text-[9px] text-[color:var(--fg-locked)]">{copy.nonePlate}</span>
    </li>
  );
}

/**
 * Whether a box scrolls sideways now: its content is wider than it is. Re-measured as the box or its list resizes,
 * and whenever `size` (the number of cards) changes, since a filter can grow the content without either box moving.
 */
function useOverflowsX<T extends HTMLElement>(size: number) {
  const ref = useRef<T | null>(null);
  const [overflows, setOverflows] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const measure = () => setOverflows(el.scrollWidth > el.clientWidth + 1);
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    measure();
    return () => observer.disconnect();
  }, [size]);
  return [ref, overflows] as const;
}

/**
 * The strip (rows view): wraps at 900, one row that scrolls sideways at 390, bleeding to the block's right edge.
 * While it overflows, the scroll box is a named region; it is a keyboard stop of its own only where its cards are
 * not (no provider), since a focused card scrolls itself into view. Wrapped, it is neither.
 */
export function RevealedStrip({ commanders, className = "" }: { commanders: readonly RevealedCommander[]; className?: string }) {
  const [ref, overflows] = useOverflowsX<HTMLDivElement>(commanders.length);
  const pressable = useCardDetailIfAny() !== null;
  const siblings = commanders.map((c) => c.oracleId);
  return (
    <div
      ref={ref}
      data-testid="revealed-strip"
      {...(overflows ? { role: "region", "aria-label": copy.stripLabel(commanders.length), ...(pressable ? {} : { tabIndex: 0 }) } : {})}
      // 4px of room on every side inside the scroll box (taken back by a matching negative margin), so a focused
      // card's ring, 2px at a 2px offset, is not clipped by it. At 900 the strip wraps and clips nothing.
      className={`-my-[4px] -ml-[4px] -mr-[12px] overflow-x-auto rounded-[4px] py-[4px] pl-[4px] pr-[12px] md:m-0 md:overflow-visible md:p-0 ${FOCUS_RING} ${className}`}
    >
      <ul className="m-0 flex w-max list-none flex-nowrap gap-[8px] p-0 md:w-auto md:flex-wrap md:gap-x-[8px] md:gap-y-[12px]">
        {commanders.length === 0 ? <NonePlate /> : commanders.map((c) => <RevealedCard key={c.oracleId} card={c} siblings={siblings} />)}
      </ul>
    </div>
  );
}

/**
 * One revealed commander in tiles: the precon tile's shell, art box and caption (`PreconTile`'s anatomy), holding
 * a card rather than a precon, so it is the decklists' size in their grid. The art is the press; the caption's
 * dots and name are drawn for the eye, the press speaks them.
 */
function RevealedTile({ card, siblings }: { card: RevealedCommander; siblings: readonly string[] }) {
  const identity = card.colorIdentity.length > 0 ? card.colorIdentity : ["C"];
  const art = card.imageUri ?? card.imageUriSmall;
  return (
    <li
      className={`${TILE_SHELL} art-lift-host relative min-w-0 border border-solid border-[color:var(--border)] bg-[color:var(--surface)] md:hover:border-[color:var(--border-strong)] transition-colors`}
      data-testid="revealed-tile"
    >
      <CommanderPress
        card={card}
        siblings={siblings}
        className={`relative block w-full overflow-hidden bg-[color:var(--surface-sunken)] ${TILE_ART_CLIP}`}
        style={{ aspectRatio: TILE_ART_RATIO }}
      >
        {art && (
          <HydratedImg src={art} decoding="async" className="art-lift absolute inset-0 h-full w-full object-cover object-center" />
        )}
        <span className={INNER_EDGE} />
      </CommanderPress>
      <CardTileCaption
        meta={
          <span aria-hidden className="flex flex-none gap-[3px]">
            {identity.map((c) => (
              <span key={c} className="h-[8px] w-[8px] rounded-full md:h-[9px] md:w-[9px]" style={{ background: c === "C" ? "var(--fg-faint)" : WUBRG_COLOR[c] }} />
            ))}
          </span>
        }
        name={card.name}
        nameHidden
      />
    </li>
  );
}

/** A set's commanders in tiles: the precon list's own grid, or the empty plate. */
function RevealedTiles({ commanders }: { commanders: readonly RevealedCommander[] }) {
  if (commanders.length === 0) {
    return <ul className="m-0 flex list-none p-0"><NonePlate /></ul>;
  }
  const siblings = commanders.map((c) => c.oracleId);
  return (
    <ul className={PRECON_TILES_CLASS} data-testid="revealed-tiles">
      {commanders.map((c) => <RevealedTile key={c.oracleId} card={c} siblings={siblings} />)}
    </ul>
  );
}

/** The date half of a set's meta: `Nov 13, 2026 · in 30 days`, or `out Nov 13, 2026 · decklists not listed yet`. */
export function whenLine(releasesOn: string, today: string, lead = false): string {
  const c = countdown(releasesOn, today);
  const date = preconDate(releasesOn);
  if (c.kind === "out") return lead ? copy.outLead(date) : copy.out(date);
  return copy.when(date, copy.until(c));
}

/** The count half: the matches when a filter narrowed the commanders, else how many are revealed. */
export function countLine(m: AnnouncedMatch): string {
  return m.matched < m.revealed ? copy.matches(m.matched, m.revealed) : copy.revealed(m.revealed);
}

export type ListedJump = { count: number; year: string };

/**
 * One set in tiles (T2–T6, L1, L2). The dashed block holds the set's head (and the empty plate while nothing is
 * revealed); its commanders follow it as tiles at the list's full width, so each is exactly a decklist tile's size.
 */
export function AnnouncedSet({ match, today, isNew, listed }: { match: AnnouncedMatch; today: string; isNew: boolean; listed: ListedJump | null }) {
  const { set } = match;
  const code = set.code.toUpperCase();
  return (
    <li className="flex flex-col gap-[10px]" data-testid="announced-set">
      <div className="flex flex-col gap-[10px] rounded-[10px] border border-dashed border-[color:var(--border-dashed)] p-[11px_12px_12px] md:p-[12px_14px_14px]" data-testid="announced-set-head">
        <div className="flex flex-col gap-[3px]">
          <div className="flex items-center gap-[8px]">
            <h3 className="m-0 font-display text-[15px] font-normal text-[color:var(--fg)] md:text-[16px]">{set.name}</h3>
            {isNew && <span className={NEW_TAG}>{copy.newTag}</span>}
          </div>
          <span className="hidden font-mono text-[11px] leading-[1.5] text-[color:var(--fg-faint)] md:block">
            {copy.meta(code, whenLine(set.releasesOn, today), countLine(match))}
          </span>
          <span className="font-mono text-[11px] leading-[1.5] text-[color:var(--fg-faint)] md:hidden">{whenLine(set.releasesOn, today, true)}</span>
          <span className="font-mono text-[11px] leading-[1.5] text-[color:var(--fg-faint)] md:hidden">{copy.metaCode(code, countLine(match))}</span>
          {listed && (
            <a
              href={`#precons-${listed.year}`}
              className={`inline-flex min-h-[24px] items-center self-start font-mono text-[11px] text-[color:var(--fg)] underline decoration-[color-mix(in_srgb,var(--accent)_55%,transparent)] underline-offset-[3px] ${FOCUS_RING}`}
            >
              {copy.listed(listed.count)}
            </a>
          )}
        </div>
        {match.commanders.length === 0 && <RevealedTiles commanders={match.commanders} />}
      </div>
      {match.commanders.length > 0 && <RevealedTiles commanders={match.commanders} />}
    </li>
  );
}

