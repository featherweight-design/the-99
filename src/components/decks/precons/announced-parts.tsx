// The pieces the Announced group's two views share (handoff R1 T2–T6, R2 Q3; design table: Set block, Revealed
// card, Strip, None plate, `new` tag, Jump): a revealed commander, the strip of them, the empty plate, the set
// block in tiles, and the meta lines' words.

import { preconDate, preconsCopy } from "../../../lib/copy/precons";
import { colorNames } from "../../../lib/copy/color-labels";
import { WUBRG_COLOR } from "../../../lib/collection/browse";
import { countdown, type AnnouncedMatch } from "../../../lib/precons/arrivals";
import type { RevealedCommander } from "../../../lib/precons/revealed";
import { HydratedImg } from "../../ui/hydrated-art";

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

/** One revealed commander: its small art, its name (two lines at most) and its dots. Links nowhere (G2). */
function RevealedCard({ card }: { card: RevealedCommander }) {
  const colors = card.colorIdentity.length > 0 ? colorNames(card.colorIdentity).join(", ") : preconsCopy.row.colorless;
  return (
    <li className="flex w-[76px] flex-none flex-col gap-[5px] md:w-[84px]" data-testid="revealed-card">
      <span aria-hidden className="relative block h-[106px] w-[76px] overflow-hidden rounded-[4px] bg-[color:var(--surface-sunken)] md:h-[117px] md:w-[84px]">
        {card.imageUriSmall && (
          <HydratedImg src={card.imageUriSmall} decoding="async" className="absolute inset-0 h-full w-full object-cover" />
        )}
        <span className={INNER_EDGE} />
      </span>
      {/* The full name is spoken; the printed one is clamped to two lines. */}
      <span className="sr-only">{copy.cardAria(card.name, colors)}</span>
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

/** The strip: wraps at 900, one row that scrolls sideways at 390, bleeding to the block's right edge. */
export function RevealedStrip({ commanders, className = "" }: { commanders: readonly RevealedCommander[]; className?: string }) {
  return (
    <ul className={`m-0 -mr-[12px] flex list-none flex-nowrap gap-[8px] overflow-x-auto p-0 pr-[12px] md:mr-0 md:flex-wrap md:gap-x-[8px] md:gap-y-[12px] md:overflow-visible md:pr-0 ${className}`}>
      {commanders.length === 0 ? <NonePlate /> : commanders.map((c) => <RevealedCard key={c.oracleId} card={c} />)}
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

/** One set in tiles (T2–T6, L1, L2). */
export function AnnouncedSet({ match, today, isNew, listed }: { match: AnnouncedMatch; today: string; isNew: boolean; listed: ListedJump | null }) {
  const { set } = match;
  const code = set.code.toUpperCase();
  return (
    <li className="flex flex-col gap-[10px] rounded-[10px] border border-dashed border-[color:var(--border-dashed)] p-[11px_12px_12px] md:p-[12px_14px_14px]" data-testid="announced-set">
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
      <RevealedStrip commanders={match.commanders} />
    </li>
  );
}

