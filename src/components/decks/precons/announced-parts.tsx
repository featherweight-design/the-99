"use client";

// The pieces the Announced group's two views share (handoff R1 T2–T6, R2 Q3; design table: Set block, Revealed
// card, Strip, None plate, `new` tag, Jump): a revealed commander, the strip of them, the empty plate, the set
// block in tiles, and the meta lines' words.
//
// A revealed commander opens its card details on a press (`CardDetailTrigger`; Hugh, 2026-10-15, reversing G2's
// "links nowhere"). In ROWS the opened row's small strip also draws the hover preview, as every card thumb in a row
// does (`preview`); in TILES it draws none (Hugh, 2026-10-16 UTC, superseding that reversal for tiles: a tile's art is already about the size of one, and the
// rule is no hover preview in tile view; `hover-art.test.ts` fails any `*Tile` component that draws one). In tiles each
// set's commanders are drawn as the precon list's own tiles, in its own grid (`PRECON_TILES_CLASS`), so they are
// the decklists' size. Outside a `CardDetailProvider` (About's
// specimen) a commander is drawn as before, unpressable.

import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { preconDate, preconsCopy } from "../../../lib/copy/precons";
import { colorNames } from "../../../lib/copy/color-labels";
import { WUBRG_COLOR } from "../../../lib/collection/browse";
import { countdown, type AnnouncedMatch } from "../../../lib/precons/arrivals";
import type { RevealedCommander } from "../../../lib/precons/revealed";
import { HydratedImg } from "../../ui/hydrated-art";
import { CardDetailTrigger, useCardDetailIfAny } from "../../cards/card-detail-provider";
import { CardTileCaption, TILE_ART_CLIP, TILE_ART_RATIO, TILE_SHELL } from "../../ui/card-tile-caption";
import { PRECON_TILES_CLASS } from "./precon-grid";
import { SheetGroupToggle } from "../../ui/sheet-group";
import { collapsible, firstPaintCss } from "../../../lib/precons/announced-collapse";
import { noteAppScroll } from "../../../lib/ui/reveal";
import { announcedSetAnchor } from "../../../lib/announcements/early-list";
import type { EarlyTile } from "../../../lib/announcements/early-tiles";
import type { PreconRow } from "../../../lib/precons/list";
import Link from "next/link";
import { PreconTile } from "./precon-tile";
import { CommanderThumb } from "../../ui/commander-thumb";
import { PendingReporter } from "../../shell/pending-reporter";

const copy = preconsCopy.upcoming;

/** The 1px inner edge every card image carries, drawn OVER the art (an inset shadow paints under an img). */
const INNER_EDGE = "pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.25)]";
/** 2px `--accent`, 2px off (STATES H8, C3). */
export const FOCUS_RING = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]";
/**
 * The `new` mark (announcements R1b-2): no box, the word in `--accent-text`, leading the set's mono meta line, the rows
 * view's third line and following the group head's count, as the precon tiles say "new · you own…". It takes the
 * line's own font. `lead` puts the separator after it (it leads a line); otherwise before it (it trails the head's count).
 */
export function NewMark({ lead = true }: { lead?: boolean }) {
  return (
    <>
      {!lead && copy.sep}
      <span className="text-[color:var(--accent-text)]" data-testid="new-mark">{copy.newTag}</span>
      {lead && copy.sep}
    </>
  );
}

/** A set's dots: its revealed commanders' identities, in WUBRG order. */
export function setIdentity(commanders: readonly RevealedCommander[]): string[] {
  return ["W", "U", "B", "R", "G"].filter((c) => commanders.some((x) => x.colorIdentity.includes(c)));
}

/** A set row's dots: its revealed commanders' and its posted early lists' identities, in WUBRG order. */
export function matchIdentity(m: AnnouncedMatch): string[] {
  const lists = m.early?.lists ?? [];
  return ["W", "U", "B", "R", "G"].filter((c) => m.commanders.some((x) => x.colorIdentity.includes(c)) || lists.some((l) => l.identity.includes(c)));
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

/**
 * T2: nothing revealed yet. One strip card's size (76x106, 84x117), in the shipped no-art language, in both views,
 * inside the set's dashed block. It stays that small in tiles too, beside ~190px commander tiles, on purpose: it is a
 * NOTE that nothing is revealed, not a stand-in for a tile, so it must not read as a missing card (design review B,
 * 2026-10-15).
 */
function NonePlate({ label = copy.nonePlate, className = "", hidden = false }: { label?: string; className?: string; hidden?: boolean }) {
  return (
    <li
      className={`flex h-[106px] w-[76px] flex-none items-center justify-center rounded-[4px] border border-solid border-[color:var(--border)] bg-[color:var(--surface-sunken)] px-[6px] text-center md:h-[117px] md:w-[84px] ${className}`}
      data-testid="none-plate"
      hidden={hidden || undefined}
      style={hidden ? { display: "none" } : undefined}
    >
      <span className="font-mono text-[9px] text-[color:var(--fg-locked)]">{label}</span>
    </li>
  );
}

/** An early list as the precon tile and row read it: the shipped `PreconRow` shape, with no set, decks or twin. */
export function earlyRow(tile: EarlyTile): PreconRow {
  return {
    fileName: tile.href, name: tile.name, setCode: "", releaseDate: "", twinName: null,
    commanders: tile.commanders, identity: tile.identity, owned: tile.owned, of: tile.of, unmapped: 0, built: [],
  };
}

/** The revealed commanders still waiting for their list: those no posted list stands for (all of them before any list). */
export function waitingCommanders(match: AnnouncedMatch): RevealedCommander[] {
  if (!match.early) return match.commanders;
  const listed = new Set(match.early.listed);
  return match.commanders.filter((c) => !listed.has(c.oracleId));
}

/** The row shell the opened set row's early lists and waiting commanders share (board `Announced`, rows view). */
const SUB_ROW = "relative flex min-h-[60px] items-center gap-[11px] rounded-[10px] border p-[6px_8px_6px_10px]";
const SUB_META = "flex min-w-0 items-center gap-[6px] font-mono text-[10.5px] text-[color:var(--fg-faint)]";

/**
 * One early list in the opened set row (STATES 3.1, rows view): the shipped precon row's anatomy, solid-edged since it
 * opens, its name stretched over the row to the early page; line 2 is its dots, "early list" in `--fact` and what the
 * reader owns.
 */
export function EarlyRow({ tile }: { tile: EarlyTile }) {
  const lead = tile.commanders[0];
  return (
    <li className={`${SUB_ROW} border-solid border-[color:var(--border)] bg-[color:var(--surface)]`} data-testid="early-row">
      <CommanderThumb imageUri={lead?.imageUriSmall ?? lead?.imageUri ?? null} colorIdentity={tile.identity} size="list" lazy />
      <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <Link
          href={tile.href}
          aria-label={copy.earlyAria(tile.name, tile.commanders.map((c) => c.name), tile.owned, tile.of)}
          className={`truncate text-[13.5px] font-semibold text-[color:var(--fg)] no-underline after:absolute after:inset-0 after:rounded-[inherit] after:content-[''] ${FOCUS_RING}`}
        >
          {tile.name}
          <PendingReporter href={tile.href} />
        </Link>
        <span className={SUB_META}>
          <span className="sr-only">{tile.identity.length > 0 ? colorNames(tile.identity).join(", ") : preconsCopy.row.colorless}</span>
          <Dots identity={tile.identity} size="h-[9px] w-[9px]" />
          <span className="text-[color:var(--fact)]" data-testid="early-mark">{copy.earlyList}</span>
          <span aria-hidden>·</span>
          <span className="truncate">
            {preconsCopy.row.ownLead} <b className="font-semibold text-[color:var(--fg)]">{preconsCopy.row.own(tile.owned, tile.of)}</b>
          </span>
        </span>
      </span>
    </li>
  );
}

/** A revealed commander still waiting for its list, in the opened set row: dashed (nothing to open but its card). */
function WaitingRow({ card, siblings }: { card: RevealedCommander; siblings: readonly string[] }) {
  return (
    <li className={`${SUB_ROW} border-dashed border-[color:var(--border-dashed)] bg-transparent`} data-testid="waiting-row">
      <CommanderPress
        card={card}
        siblings={siblings}
        className="relative block h-[48px] w-[34px] flex-none overflow-hidden rounded-[3px] bg-[color:var(--surface-sunken)]"
      >
        {card.imageUriSmall && (
          <HydratedImg src={card.imageUriSmall} decoding="async" className="absolute inset-0 h-full w-full object-cover" />
        )}
        <span className={INNER_EDGE} />
      </CommanderPress>
      <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <span aria-hidden className="truncate text-[13.5px] font-semibold text-[color:var(--fg)]">{card.name}</span>
        <span className={SUB_META}>
          <Dots identity={card.colorIdentity} size="h-[9px] w-[9px]" />
          {copy.waiting}
        </span>
      </span>
    </li>
  );
}

/**
 * The opened set row's lists (rows view, once Wizards posts them): each early list, then each revealed commander still
 * waiting for its list, then the note for lists still to come.
 */
export function EarlyRowList({ match }: { match: AnnouncedMatch }) {
  const waiting = waitingCommanders(match);
  const siblings = waiting.map((c) => c.oracleId);
  const toCome = match.early?.toCome ?? 0;
  return (
    <div className="flex flex-col gap-[8px]" data-testid="early-rows">
      <ul className="m-0 flex list-none flex-col gap-[8px] p-0">
        {match.early?.lists.map((t) => <EarlyRow key={t.href} tile={t} />)}
        {waiting.map((c) => <WaitingRow key={c.oracleId} card={c} siblings={siblings} />)}
      </ul>
      {toCome > 0 && <p className="m-0 p-[4px_2px] font-mono text-[10.5px] text-[color:var(--fg-locked)]" data-testid="to-come">{copy.toCome(toCome)}</p>}
    </div>
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
 * The ring a revealed tile draws while its press has keyboard focus: on the tile itself, 2px `--accent` 2px off, as
 * every focus ring here is. The tile clips (`TILE_SHELL`'s `overflow-hidden`, for the art's corners), so a ring on
 * the press inside it would be cut on three sides; the press draws none of its own.
 */
export const TILE_FOCUS_RING =
  "has-[:focus-visible]:outline has-[:focus-visible]:outline-solid has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[color:var(--accent)]";

/**
 * One revealed commander in tiles: the precon tile's shell, art box and caption (`PreconTile`'s anatomy), holding
 * a card rather than a precon. As on `PreconTile`, the WHOLE tile is the press: the name in the caption is the
 * control, and its `::after` is stretched over the tile, so the art and the caption both open it. No hover preview: a
 * tile's art is the size of one already. One accessible name, the press's.
 */
function RevealedTile({ card, siblings, hidden = false }: { card: RevealedCommander; siblings: readonly string[]; hidden?: boolean }) {
  const identity = card.colorIdentity.length > 0 ? card.colorIdentity : ["C"];
  const art = card.imageUri ?? card.imageUriSmall;
  const pressable = useCardDetailIfAny() !== null;
  return (
    <li
      className={`${TILE_SHELL} art-lift-host relative min-w-0 border border-solid border-[color:var(--border)] bg-[color:var(--surface)] md:hover:border-[color:var(--border-strong)] transition-colors ${TILE_FOCUS_RING}`}
      data-testid="revealed-tile"
      // `hidden` as well as `display: none`: the class's own display outranks the attribute, and card details' return
      // focus walks out of a `[hidden]` opener to the disclosure that controls its grid.
      hidden={hidden || undefined}
      style={hidden ? { display: "none" } : undefined}
    >
      <div
        aria-hidden
        className={`relative w-full overflow-hidden bg-[color:var(--surface-sunken)] ${TILE_ART_CLIP}`}
        style={{ aspectRatio: TILE_ART_RATIO }}
        data-testid="revealed-art"
      >
        {art && (
          <HydratedImg src={art} decoding="async" className="art-lift absolute inset-0 h-full w-full object-cover object-center" />
        )}
        <span className={INNER_EDGE} />
      </div>
      <CardTileCaption
        meta={
          <span aria-hidden className="flex flex-none gap-[3px]">
            {identity.map((c) => (
              <span key={c} className="h-[8px] w-[8px] rounded-full md:h-[9px] md:w-[9px]" style={{ background: c === "C" ? "var(--fg-faint)" : WUBRG_COLOR[c] }} />
            ))}
          </span>
        }
        name={pressable ? (
          <CardDetailTrigger
            oracleId={card.oracleId}
            name={card.name}
            siblings={siblings}
            imageUri={art}
            ariaLabel={spokenName(card, true)}
            testId="revealed-press"
            // A block that truncates itself (a button is never inline, so the caption's own ellipsis cannot reach
            // its text); stretched over the tile by its `::after` (the tile is the positioned box, and the caption's
            // clip is not its containing block); no ring of its own, which the tile would clip: the tile draws it
            // (`TILE_FOCUS_RING`).
            className="block w-full truncate p-0 text-left font-[inherit] text-[length:inherit] text-[color:inherit] focus-visible:outline-none after:absolute after:inset-0 after:rounded-[inherit] after:content-['']"
          >
            {card.name}
          </CardDetailTrigger>
        ) : card.name}
        nameHidden={!pressable}
        nameSpoken={pressable ? undefined : <span className="sr-only">{spokenName(card)}</span>}
      />
    </li>
  );
}

/** The columns the grid lays, read from its computed template; null until measured (the server's paint has none). */
function useGridColumns(ref: React.RefObject<HTMLElement | null>, watch: boolean): number | null {
  const [columns, setColumns] = useState<number | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !watch) return;
    const read = () => {
      const tracks = getComputedStyle(el).gridTemplateColumns;
      setColumns(tracks && tracks !== "none" ? tracks.split(/\s+/).length : null);
    };
    read();
    const observer = new ResizeObserver(read);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, watch]);
  return columns;
}

/**
 * A set's commanders in tiles: the precon list's own grid, or the empty plate. A large reveal folds to its first row
 * with `Show all N` under the grid (addendum A1): more than twice the columns, no filter on, not pressed open this
 * visit. Hidden tiles are `display: none`, so they leave the tab and reading order; card details still page every
 * commander of the set (`siblings`).
 */
function RevealedTiles({ commanders, early = [], toCome = 0, setName, code, filtering, expanded, onToggleExpanded }: {
  /** The revealed commanders to draw: with posted lists, only those still waiting for theirs (`waitingCommanders`). */
  commanders: readonly RevealedCommander[];
  /** The set's posted early lists, first in the grid as precon tiles (announcements STATES 3.1). */
  early?: readonly EarlyTile[];
  /** Promised lists not posted yet: the none plate's note, last in the grid (STATES 3.2). */
  toCome?: number;
  setName: string;
  code: string;
  filtering: boolean;
  expanded: boolean;
  onToggleExpanded: () => void;
}) {
  const gridId = useId();
  const gridRef = useRef<HTMLUListElement>(null);
  const toggleRef = useRef<HTMLDivElement>(null);
  // Lists and commanders are one grid, and fold together: the fold counts every tile.
  const tiles = early.length + commanders.length;
  const columns = useGridColumns(gridRef, tiles > 4 && !filtering);
  const folds = columns !== null && collapsible(tiles, columns, filtering);
  const collapsed = folds && !expanded;
  // Show fewer lifts the toggle with the tiles it folds away: if that would leave it above the window, bring it back.
  const wasExpanded = useRef(expanded);
  useLayoutEffect(() => {
    if (wasExpanded.current && !expanded) {
      // The app's scroll, not the reader's (quick return).
      noteAppScroll();
      toggleRef.current?.querySelector("button")?.scrollIntoView({ block: "nearest" });
    }
    wasExpanded.current = expanded;
  }, [expanded]);
  if (tiles === 0) {
    return <ul className="m-0 flex list-none p-0"><NonePlate /></ul>;
  }
  const siblings = commanders.map((c) => c.oracleId);
  // The server cannot know the columns: until they are measured, CSS keyed on the grid's width hides what a fold would.
  const guess = columns === null && !filtering && !expanded ? firstPaintCss(code, tiles) : "";
  const shown = columns ?? 0;
  return (
    <>
      {guess && <style>{guess}</style>}
      <div className="@container">
        <ul
          id={gridId}
          ref={gridRef}
          className={PRECON_TILES_CLASS}
          data-testid="revealed-tiles"
          data-collapse={guess ? code : undefined}
          data-measured={columns !== null ? "" : undefined}
        >
          {early.map((t, i) => (
            <PreconTile key={t.href} row={earlyRow(t)} href={t.href} early hidden={collapsed && i >= shown} />
          ))}
          {commanders.map((c, i) => (
            <RevealedTile key={c.oracleId} card={c} siblings={siblings} hidden={collapsed && early.length + i >= shown} />
          ))}
          {toCome > 0 && <NonePlate label={copy.toCome(toCome)} className="self-start" hidden={collapsed} />}
        </ul>
      </div>
      {folds && (
        <div ref={toggleRef}>
          <SheetGroupToggle
            all={expanded}
            onToggle={onToggleExpanded}
            label={copy.showAll(tiles)}
            fewer={copy.showFewer}
            ariaLabel={early.length > 0
              ? (expanded ? copy.showFewerEarlyAria(setName) : copy.showAllEarlyAria(tiles, setName))
              : (expanded ? copy.showFewerAria(setName) : copy.showAllAria(tiles, setName))}
            controls={gridId}
            rule={false}
            className={`pl-0 ${FOCUS_RING}`}
          />
        </div>
      )}
    </>
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

/** The meta's count half: once Wizards posts the set's lists, how many of those promised (STATES 3.2); else the revealed count. */
export function countHalf(m: AnnouncedMatch): string {
  return m.early ? copy.listsSoFar(m.early.posted, m.early.promised) : countLine(m);
}

export type ListedJump = { count: number; year: string };

/**
 * One set in tiles (T2–T6, L1, L2): a dashed block (the handoff's lock that an announced set is not a precon) holding
 * the set's head and its commanders as tiles in the decklists' own grid. They are narrower than a decklist tile only
 * by the block's inset (orchestrator's ruling, option 3, 2026-10-15).
 */
export function AnnouncedSet({ match, today, isNew, listed, compact = false, filtering = false, expanded = false, onToggleExpanded = () => {} }: {
  match: AnnouncedMatch;
  today: string;
  isNew: boolean;
  listed: ListedJump | null;
  /**
   * Draw the commanders as the small strip instead of tiles: About's specimen, a figure of one set with one commander,
   * where a lone decklist-sized tile in a wide figure read as an empty box and clipped its name at 390.
   */
  compact?: boolean;
  /** A search or a color is on: nothing folds (addendum A1). */
  filtering?: boolean;
  /** This visit's press on Show all for this set, held by the list view. */
  expanded?: boolean;
  onToggleExpanded?: () => void;
}) {
  const { set } = match;
  const code = set.code.toUpperCase();
  return (
    <li id={announcedSetAnchor(set.code)} className="flex flex-col gap-[10px] rounded-[10px] border border-dashed border-[color:var(--border-dashed)] p-[11px_12px_12px] md:p-[12px_14px_14px]" data-testid="announced-set">
      <div className="flex flex-col gap-[3px]">
        <div className="flex items-center gap-[8px]">
          <h3 className="m-0 font-display text-[15px] font-normal text-[color:var(--fg)] md:text-[16px]">{set.name}</h3>
        </div>
        {/* R1b-2: `new` leads the meta line, no box. Posted lists' count reads in body ink (board `Announced`). */}
        <span className="hidden font-mono text-[11px] leading-[1.5] text-[color:var(--fg-faint)] md:block">
          {isNew && <NewMark />}
          {copy.meta(code, whenLine(set.releasesOn, today), "")}
          <span className={match.early ? "text-[color:var(--fg-body)]" : undefined}>{countHalf(match)}</span>
        </span>
        <span className="font-mono text-[11px] leading-[1.5] text-[color:var(--fg-faint)] md:hidden">
          {isNew && <NewMark />}
          {whenLine(set.releasesOn, today, !isNew)}
        </span>
        <span className="font-mono text-[11px] leading-[1.5] text-[color:var(--fg-faint)] md:hidden">
          {copy.metaCode(code, "")}
          <span className={match.early ? "text-[color:var(--fg-body)]" : undefined}>{countHalf(match)}</span>
        </span>
        {listed && (
          <a
            href={`#precons-${listed.year}`}
            className={`inline-flex min-h-[24px] items-center self-start font-mono text-[11px] text-[color:var(--fg)] underline decoration-[color-mix(in_srgb,var(--accent)_55%,transparent)] underline-offset-[3px] ${FOCUS_RING}`}
          >
            {copy.listed(listed.count)}
          </a>
        )}
      </div>
      {compact ? <RevealedStrip commanders={match.commanders} /> : (
        <RevealedTiles
          commanders={waitingCommanders(match)}
          early={match.early?.lists}
          toCome={match.early?.toCome}
          setName={set.name}
          code={set.code}
          filtering={filtering}
          expanded={expanded}
          onToggleExpanded={onToggleExpanded}
        />
      )}
    </li>
  );
}

