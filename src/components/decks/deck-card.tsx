import Link from "next/link";
import { IntentPrefetchLink } from "../ui/intent-prefetch-link";
import { PendingReporter } from "../shell/pending-reporter";
import { refreshCopy } from "../../lib/copy/refresh";
import { deckBodySize } from "../../lib/decks/deck-size";
import { countStatus, type StatusPill } from "../../lib/decks/status";
import { commanderDisplayName } from "../../lib/cards/printed-name";
import { colorLabel, deckIdentity } from "../../lib/decks/format";
import { formatCents } from "../../lib/decks/price";
import type { DeckListItem } from "../../lib/decks/read";
import type { DeckShopping } from "../../lib/decks/shopping-rollup";
import { statusBarStyle } from "../../lib/decks/status-style";
import { deckStateMarksCopy } from "../../lib/copy/deck-state-marks";
import { formatWhen } from "../../lib/format/when";
import { ArtWash, INK_SHADOW } from "../ui/art-wash";
import { DeckCardOverflow } from "./deck-card-overflow";
import { StatusPillBadge } from "./status-pill";
import { BracketChip } from "./bracket-chip";
import { NoticeMark, noticeSentence, noticeSpoken } from "./notice-tag";
import { noticesHref } from "../../lib/notices/arrival";
import { FactTooltip } from "../cards/fact-tooltip";
import { verdictHead } from "../../lib/bracket/verdict-head";

import { proxyCopy } from "../../lib/copy/proxies";

/**
 * The one figure that explains the status (`STATES-deck-statuses.md` §7). Total
 * over the six values: a status with no branch here would render an empty slot,
 * which reads as a bug rather than as an absence.
 *
 * Null is a branch, not a gap: several statuses are explained by the `87 / 99`
 * the meta row already prints, and for those the honest detail is nothing at
 * all rather than a second figure invented to fill the slot.
 */
/**
 * The value whose FIGURE a tile draws.
 *
 * A `Draft` keeps its count figure even though the pill stopped saying the
 * count word — that is the trade R6 names when it moves the phase above the
 * counts, and the detail row is where the cost is paid back. Every other value
 * answers for itself.
 *
 * It is one function rather than a line in each consumer because three reads
 * depend on it: the figure, the `in use elsewhere` clause (a question about the
 * COUNT, which every brew now hides behind the word `Draft`) and the proxy
 * fallback's guard.
 */
function countStatusFor(
  deck: DeckListItem,
  shopping: DeckShopping | undefined,
): Exclude<StatusPill, "Draft"> {
  if (deck.statusPill !== "Draft") return deck.statusPill;
  return countStatus({
    built: deck.built,
    ownedCount: deck.ownedCount,
    // `built - toBuyCount`, NEVER `ownedCount + proxiedCount`. `proxiedCount`
    // is `copies` — every card this deck prints, commander included — and
    // `proxies.ts` names it the one figure that must not be added to
    // `ownedCount`: a proxied commander is not a body slot, and a printed card
    // the player also owns is already counted. Adding it let a 98-owned
    // 99-card deck read `Complete` with a card genuinely missing, once. The
    // server has already done that subtraction with `covers`, which is what
    // `toBuyCount` is.
    coveredCount: deck.built - deck.toBuyCount,
    unresolvedCount: deck.unresolvedCount,
    // The roll-up, which is this tile's own definition of "to buy" and the
    // figure it prints. Without it a draft that owns every card whose copies an
    // older deck has sleeved draws NO figure and then flips to `To buy` the
    // moment it commits — the seniority defect, moved into the detail row.
    unfundedCount: shopping?.copies ?? 0,
    bodySize: deckBodySize(deck.partnerName !== null),
  });
}

function detailFor(
  deck: DeckListItem,
  shopping: DeckShopping | undefined,
  now: Date,
): { text: string; color: string; cart?: true } | null {
  const c = refreshCopy.decks;
  const figureFor = countStatusFor(deck, shopping);
  // THE CHANGE FIGURE OUTRANKS THE COUNT FIGURES while a draft is open. Mid-edit
  // the count figures are transience rather than facts to act on — one deck
  // reads Complete, Building, Over and Complete again over the course of a
  // single swap — and the change count is the thing the reader did not know.
  //
  // `Unresolved` is the ONE exception, and for the reason the shipped cascade
  // already ranks it above shopping: an unnamed line is not a consequence of
  // editing, it is a card the app cannot even price.
  if (deck.pendingChanges > 0 && deck.versionNumber !== null && deck.statusPill !== "Unresolved") {
    return {
      text: deckStateMarksCopy.detail(deck.pendingChanges, deck.versionNumber),
      // `--fg-faint`, as the canvas draws it. The states matrix's `--accent`
      // is R2 residue: it was there so the rule above and the line below read
      // as one mark, and R3 moved the rule to `--fg`, which retired the reason.
      color: "var(--fg-faint)",
    };
  }
  const statusDetail = statusDetailFor(deck, shopping, now, figureFor);
  // Fills the slot only where the status has nothing to say in it. The clause is
  // a fact about the collection, and `4 over` or `3 lines unresolved` is a fact
  // about the deck the reader opened the tile for — the narrower reading of the
  // table's "in place of the ordinary detail figure", and the one that never
  // hides a warning. Flagged for Design to ratify.
  // `Building` only, which is the scope the state table gives the clause. Before
  // this round `Complete` had a figure of its own (`all owned`) and could not
  // reach here; cutting that figure opened the fallback to it, and a finished
  // deck reading `3 in use elsewhere` is a state nobody drew. Building is also
  // the status the clause answers a question for — what is holding this deck up.
  // `figureFor`, not `statusPill`: the clause answers "what is holding this
  // deck up", which is a question about the COUNT — and since R6 every
  // uncommitted short deck says `Draft`, so keying on the word would have
  // dropped this line from every brew that had it.
  if (statusDetail === null && figureFor === "Building" && deck.inUseElsewhere > 0) {
    return { text: c.detailInUseElsewhere(deck.inUseElsewhere), color: "var(--accent)" };
  }
  // SECOND fallback, ranked after the clause above: that one answers "what is
  // holding this deck up", and a proxy is not holding anything up.
  //
  // It can never take a warning colour, and nothing was added to prevent that:
  // every status that would lend it one already fills this slot with a figure
  // (`4 over`, `3 lines unresolved`, the To-buy roll-up), so the only values
  // reaching here are Complete, Building and New — all `--fg-faint`. `Draft` is
  // not among them and cannot be: `figureFor` resolves every draft through
  // `countStatus`, which answers one of the five committed values.
  // GUARDED to the three statuses that can reach the fallback honestly. `To buy`
  // also returns null here — a deck whose only missing cards are basics has a
  // `To buy` pill and no roll-up entry — and printing a proxy count there takes
  // a slot that deliberately stays empty. The PR body claimed this was
  // structurally impossible; it is not, which is what the guard is for.
  const FALLBACK_STATUSES = ["Complete", "Building", "New"] as const;
  if (
    statusDetail === null
    && deck.proxiedCount > 0
    && (FALLBACK_STATUSES as readonly string[]).includes(figureFor)
  ) {
    return { text: proxyCopy.deckCard.line(deck.proxiedCount), color: "var(--fg-faint)" };
  }
  if (statusDetail === null) return null;
  // The To buy roll-up is the one figure the all-decks cart can open on this deck (Q8). Only here:
  // the pending-changes figure above outranks it, as it outranks every count figure (gap G1a).
  return figureFor === "To buy"
    ? { text: statusDetail, color: DETAIL_COLOR[deck.statusPill], cart: true }
    : { text: statusDetail, color: DETAIL_COLOR[deck.statusPill] };
}

function statusDetailFor(
  deck: DeckListItem,
  shopping: DeckShopping | undefined,
  now: Date,
  /** The value whose FIGURE this row draws — see `countStatusFor`. */
  figureFor: Exclude<StatusPill, "Draft">,
): string | null {
  const c = refreshCopy.decks;
  switch (figureFor) {
    case "New":
      // `detailDraft` is the literal `created today`, so it is only true on the
      // day of creation. An older Draft draws no figure rather than being told
      // a date it does not have — a Draft deck older than a day is a real state
      // the copy file does not cover, and the gap report says so.
      return formatWhen(deck.createdAt, now) === "today" ? c.detailDraft : null;
    case "Building":
      // No figure. Building's count IS its explanation, and the count already
      // has its own slot in the same row — a second copy of `87 / 99` beside
      // the first says nothing and reads as a rendering fault.
      return null;
    case "Over":
      return c.detailOver(deck.built - deckBodySize(deck.partnerName !== null));
    case "Unresolved":
      return c.detailUnresolved(deck.unresolvedCount);
    case "To buy": {
      // Every figure here comes from the roll-up, never from `deck.toBuyCount`.
      // The roll-up excludes basics, as every Shopping surface does;
      // `toBuyCount` is `built − coveredCount`, which neither excludes basics
      // nor knows about seniority, so the two are different definitions of "to
      // buy" and mixing them prints a cost that covers fewer copies than the
      // number beside it.
      //
      // A deck whose only unowned cards are basics therefore has a `To buy`
      // pill — that threshold counts them — and no roll-up entry at all. It
      // draws no figure rather than a count of cards no Shopping surface will
      // offer to sell; the `87 / 99` beside it already says how far along it is.
      if (!shopping) return null;
      // No price row is not "free" — the copies still print, the cost does not.
      return shopping.cents > 0
        ? c.detailToBuy(shopping.copies, formatCents(shopping.cents))
        : c.detailToBuyNoPrice(shopping.copies);
    }
    case "Complete":
      // No figure. `all owned` was a third way of saying Complete, beside a full
      // green bar and `99 / 99` — and the bar and the count carry it between
      // them. More art means less room for chrome, and this was the chrome that
      // repeated itself.
      return null;
  }
}

/** The detail figure carries the status's colour only where the status is a warning. */
const DETAIL_COLOR: Record<DeckListItem["statusPill"], string> = {
  // `New` and `Draft` are phases, not warnings: the figure beneath them is
  // whatever their counts would say, drawn quietly.
  New: "var(--fg-faint)",
  Draft: "var(--fg-faint)",
  Building: "var(--fg-faint)",
  // H5: red TEXT reads under 4.5:1 on the tile, so `Over`'s figure is quiet like the rest and
  // the pill above it carries the red on its hairline and tint.
  Over: "var(--fg-faint)",
  Unresolved: "var(--warning)",
  "To buy": "var(--fg-faint)",
  Complete: "var(--fg-faint)",
};

interface DeckCardProps {
  deck: DeckListItem;
  /** Absent when the deck's cards are all owned — absent, never a zeroed row. */
  shopping: DeckShopping | undefined;
  /** `ALL_DECKS_CART_ENABLED`: the To buy figure links into the all-decks cart on this deck. */
  cartLink?: boolean;
  /**
   * A prop for the same reason `formatWhen` takes one: the page is a server
   * component, it reads the clock once, and every tile on it must agree.
   */
  now: Date;
  /**
   * Every shelf the reader can file this deck onto — the destinations in the
   * overflow menu's move mode. Empty is a real state: with no folders the move
   * list offers `Unfiled` and `New folder…` alone (STATES M4).
   */
  folders: readonly { id: string; name: string }[];
  /** Passed through to the menu's move mode — see `DeckCardOverflow`. */
  onCreateFolder: () => void;
  onMove: (to: { id: string | null; name: string | null }) => void;
  keepsFocus: boolean;
  /** Bumped when a create started from this card's move mode is dismissed, which closes the
   *  panel. It carries no outcome: the move is optimistic, and its answer arrives later. */
  closeAfterCreate: { seq: number } | null;
  /** One of the first tiles in the grid: on a phone, prefetch the deck once it is on screen. */
  eager?: boolean;
  /** Told when this tile's prefetch actually starts. */
  onPrefetch?: () => void;
}

/**
 * A deck tile: a 248px band of commander art with the deck's identity at its
 * foot — name, commander, colour — then one row that reads `[chip] [bar]
 * [count]` as a sentence about progress, and a detail row only where there is a
 * figure or a real last-played date to put in it.
 *
 * The status pill is NOT on the art. It was pinned to the band's bottom-left and
 * moved to the bar's row: the chip is a status and the bar is a status, so
 * together they leave the block above carrying identity alone — which is what
 * drops the band's `labelAt` from 78 to 46 and turns 32px of darkness back into
 * art.
 *
 * **No call to action.** The whole tile is the link, so an "Open builder"
 * button would be a second way to do the one thing the tile already does. The
 * absolute-inset `<Link>` is what makes that work; the overflow is a
 * `relative z-10` sibling so its clicks never reach the overlay.
 *
 * The body is a grid rather than a stack of rows, because the phone and the
 * desktop put the same nodes in different places: the detail figure sits in the
 * meta row on a phone and below the bar on desktop. Two grid-area maps move one
 * set of nodes; two subtrees would read the label twice to a screen reader and
 * pass a property check on both columns while being wrong.
 */
/**
 * The yield (HANDOFF §1a, readiness F6; the tile marker addendum §5, F22). From the band floor (330)
 * to the width that holds the widest pill, the widest range and the notice mark on one line, a
 * RANGE beside a mark draws marks only. The mark is 18px whatever its ink, so one window serves
 * both kinds, where the retired tag needed two (`Not legal` and `● 99`). The upper figure is
 * MEASURED by `probe:notices-tile`, never derived: `Unresolved` and `Exhibition or Core` beside the
 * mark measured 332.1px from `md` (321.3px on a phone), so the window closes at 336, leaving a few
 * pixels for a platform's glyphs.
 */
const YIELD = { faced: "@min-[330px]:@max-[336px]:hidden", marks: "hidden @min-[330px]:@max-[336px]:contents" };

export function DeckCard({
  deck, shopping, now, folders, onCreateFolder, onMove, keepsFocus, closeAfterCreate, cartLink = false, eager = false, onPrefetch,
}: DeckCardProps) {
  const detail = detailFor(deck, shopping, now);
  // A pair takes two of the hundred, so its body is 98 and its tile says so.
  const bodySize = deckBodySize(deck.partnerName !== null);
  const count = `${deck.built} / ${bodySize}`;
  // `never played` is cut with no replacement: it filled a slot rather than
  // answering a question, and if last-played matters it belongs in the overflow
  // menu or on the deck's own page. A deck that has never been played draws
  // nothing here now.
  const lastPlayed = deck.lastPlayedAt ? formatWhen(deck.lastPlayedAt, now) : null;
  // ONE figure for whether the desktop row has a right-hand cell, because the
  // grid template and the render have to agree. A `New` deck never draws last
  // played — its detail row carries `created today` alone — and a `New` deck
  // CAN have a logged game, since the Games panel offers the form on an empty
  // deck. Two separate conditions would have given that deck an empty second
  // row at `sm`.
  //
  // `New` and not `Draft`: since R6 a draft is a draft at any length, so an
  // uncommitted 99 has a playing history like any other deck and the old test
  // would have hidden it.
  const hasLastPlayed = lastPlayed !== null && deck.statusPill !== "New";

  // The UNION, as `spine-desktop.tsx` already draws it: a pair's colour is both
  // commanders' identities together, and reading the primary's alone announces
  // and prints the wrong colour for any partner that adds one. Computed once and
  // used for the visible line and the accessible name, so the two cannot drift.
  const colour = colorLabel(deckIdentity(deck.commanderColorIdentity, deck.partnerColorIdentity));
  // The name on the copy the player owns, since the art beside it is that copy's.
  // The partner has no printed name here and needs none: no tile draws a second
  // commander's art, so there is no pairing for its name to break.
  const commanderName = commanderDisplayName({
    name: deck.commanderName,
    printedName: deck.commanderPrintedName,
  });
  // The same identity the block draws, in the same order, and a PAIR states both
  // commanders: the visible line shortens them to fit and the accessible name
  // never does — truncation is a layout compromise, not an information one.
  const identity = `${deck.partnerName === null ? commanderName : `${commanderName} and ${deck.partnerName}`}, ${colour}`;
  const withBracket = deck.bracket
    ? refreshCopy.decks.statusWithBracket(
        deck.statusPill,
        verdictHead(deck.bracket.permits, deck.bracket.answered).face,
      )
    : deck.statusPill;
  // The notice rides after the chip in the name as it does on the row, since the row is hidden.
  const notice = noticeSpoken(deck.notice ?? null);
  const spokenStatus = notice ? `${withBracket}, ${notice}` : withBracket;
  // The yield applies only to a RANGE beside a notice: a single mark's name fits beside any tag.
  const yieldsFace = Boolean(deck.bracket && deck.notice && verdictHead(deck.bracket.permits, deck.bracket.answered).split);
  const yieldClasses = YIELD;
  const ariaLabel =
    detail === null
      ? refreshCopy.decks.cardAriaNoDetail(
          deck.name,
          identity,
          spokenStatus,
          count,
          hasLastPlayed ? lastPlayed : undefined,
        )
      : refreshCopy.decks.cardAria(
          deck.name,
          identity,
          spokenStatus,
          count,
          detail.text,
          hasLastPlayed ? lastPlayed : undefined,
        );

  return (
    <article
      // `@container` so the band below can answer its own CELL rather than the
      // viewport: this tile's width is the grid's column, and the grid's column
      // is not a function of the viewport alone — a 262px filter column sits
      // beside it.
      // `sm:h-full` + a column, so the tile answers the GRID row's height rather
      // than its own content's: the footer below takes the slack, and a tile
      // with no detail line ends level with the one beside it that has one.
      // Paired with the `sm:h-full` on the `<li>`, and gated for the same reason
      // — below `sm` the list is a flex column with no height to be a percentage
      // of, and one stacked tile per row has nothing to end level with.
      className="@container relative flex min-w-0 flex-none flex-col overflow-hidden rounded-[14px] sm:h-full"
      style={{ background: "var(--surface-inset)", border: "1px solid var(--border)" }}
    >
      {/* 1 · Art header. Always present: `decks.commander_oracle_id` is NOT
          NULL, so every deck has a commander and every tile has art — Draft
          included.

          The cell band, stated at 248px. The 2.2:1 ratio plus a 104px floor made
          this band a function of the column it landed in — 86px at a 189px
          two-up and 198px at a 435px three-up, one of them clamped by the floor
          — and the reader was told which deck this is by whichever of those the
          viewport handed them. A grid cell's job is telling you which deck it is,
          so it takes the cell band and the crop gets the room.

          The cell band has a FLOOR, and the handoff states it: never in a column
          under ~330px. `sm:grid-cols-3` runs from 640px up, and the grid's own
          22px padding and two 14px gaps take 72px, so a cell is 189px at 640 and
          456px at 1440 — the floor arrives at about 1062px of viewport. A single
          248px band would therefore draw a 0.76:1 portrait sliver from 640 to
          1062, which is the handoff's own measured figure for this tile.

          So the tile is a container and the band answers its own cell: 248 where
          the column can hold it, and the resume band below, which at a 230px cell
          is within a hair of the crop's own 1.37:1. The remaining problem at the
          narrow end is the grid's — three columns at 640px is a 102px card
          whatever it draws — and `decks-view.tsx` belongs to another round. */}
      <div
        data-deck-art
        // `shrink-0`: the tile is a flex column now, and a band that gave way
        // would trade the art for the slack the footer is meant to take.
        className="relative h-[168px] shrink-0 overflow-hidden @min-[330px]:h-[248px]"
      >
        {/* Two bands, one shown by the tile's own container query, because the
            cell band has a FLOOR the handoff states — never in a column under
            ~330px — and three columns do not give it one until about 1062px of
            viewport: the grid's 22px padding and two 14px gaps take 72px, so a
            cell is 189px at 640 and 456px at 1440. A single 248px band would
            draw a 0.76:1 portrait sliver across that whole range.

            Below the floor the resume band takes over, which at a 230px cell is
            within a hair of the crop's own 1.37:1. The remaining problem at the
            narrow end is the grid's — three columns at 640px is a 102px card
            whatever it draws — and `decks-view.tsx` belongs to another round.

            `labelAtPx` is the same either way: the block is the block whatever
            the band, which is exactly what a px figure means. */}
        <div className="@min-[330px]:hidden">
          <ArtWash
            strategy="cover"
            height={168}
            labelAtPx={46}
            artCropUri={deck.commanderArtCropUri}
            colorIdentity={deck.commanderColorIdentity}
          />
        </div>
        <div className="hidden @min-[330px]:block">
          <ArtWash
            strategy="cover"
            height={248}
            // The block's measured height in pixels from the foot: 10px bottom
            // inset, a 10.5px meta line at 13, a 4px gap and a 17px name at 1.15
            // for 20. The chip is NOT in this block — it moved to the progress
            // row, which is what drops this figure from 78 and turns 32px of
            // darkness back into art.
            labelAtPx={46}
            artCropUri={deck.commanderArtCropUri}
            colorIdentity={deck.commanderColorIdentity}
          />
        </div>
        <DeckCardOverflow
          deckId={deck.id}
          deckName={deck.name}
          built={deck.built}
          folders={folders}
          folderId={deck.folderId}
          folderName={deck.folderName}
          onCreateFolder={onCreateFolder}
          onMove={onMove}
          keepsFocus={keepsFocus}
          closeAfterCreate={closeAfterCreate}
        />
        {/* The block at the foot, carrying identity alone: the deck's name, its
            commander and its colour. The chip and the bar are both statements
            about progress and they now sit together below the divider, which is
            what leaves this block with one job. The right padding clears the
            overflow control's 44px target in the same corner. */}
        <div
          // The hook a probe measures the ramp against. This block IS the ink,
          // so its own box is the measurement — unlike the row bands, whose
          // breakpoint wrappers span the whole band.
          data-wash-label
          // Presentation. The overlay link's own `aria-label` states these words
          // in order, so leaving them exposed announced the tile's identity
          // twice — once from this block and again from the link. Nothing here
          // is focusable, which is what makes hiding it safe; the overflow
          // control sits outside this block and stays exposed.
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 min-w-0 pb-[10px] pr-[56px] pl-[13px] sm:pr-[48px]"
        >
          <h3
            className="truncate font-display text-[17px] font-semibold sm:text-[15px]"
            style={{ color: "var(--fg)", lineHeight: 1.15, textShadow: INK_SHADOW }}
          >
            {deck.name}
          </h3>
          {/* Two spans, not one truncating string. The colour is the half that
              survives at a 189px column — it is what the pips came off FOR — and
              one `truncate` across both clips it away for any ordinary commander
              name, which would have removed the pips and put nothing in their
              place. The name gives; the colour does not.

              Stated leading on the row, like the name above it: `labelAtPx` is
              this block's measured height, and a line box inheriting the app's
              1.5 would make that figure move whenever the body leading did. */}
          <span
            className="mt-[4px] flex min-w-0 gap-[4px] font-mono text-[10.5px]"
            style={{ lineHeight: 1.25, color: "var(--fg-body)", textShadow: INK_SHADOW }}
          >
            {/* Both commanders, with the `+` the spines use. The accessible
                name already named the pair, so printing one of them left a
                sighted reader with a different deck identity than a screen
                reader got — on a pair deck, the wrong one. */}
            {deck.partnerName ? (
              // Two spans with the joiner between them, never one string: a
              // single `truncate` ellipsises the END of the primary name, so a
              // narrow cell printed `Ishai, Ojutai…` and lost both the `+` and
              // the partner — the two things that say *pair*. The partner takes
              // the larger shrink factor, so it is the half that gives, which is
              // the same ordered shrink the resume row and the spines use.
              <span className="flex min-w-0 gap-[4px]">
                <span className="min-w-0 truncate">{commanderName}</span>
                <span className="flex-none">+</span>
                <span className="min-w-0 truncate" style={{ flexShrink: 1000 }}>
                  {deck.partnerName}
                </span>
              </span>
            ) : (
              <span className="min-w-0 truncate">{commanderName}</span>
            )}
            <span className="flex-none whitespace-nowrap">· {colour}</span>
          </span>
        </div>
      </div>

      {/* 2 · Body, and it is one sentence about progress read left to right:
          `[chip] [bar] [count]`. The chip is a status and the bar is a status, so
          they belong on one row — and moving the chip off the art is what leaves
          the block above carrying identity alone.

          The pips are gone. The worded colour survives and moved into the block:
          `Green` beside a green square is the same redundancy one layer down, and
          at a 189px column the word is what stays legible. An earlier round had
          this backwards.

          The detail figure keeps its own row, because a warning is not part of
          that sentence — `4 over` and `3 lines unresolved` are facts about the
          deck the reader opened the tile for. */}
      <div
        // THREE FIXED ROWS (deck notices HANDOFF §1a, r2): chips, bar, detail. The bar never
        // changes length with the chips, and every tile on /decks is the same height: 248 band +
        // 92 footer, 94 from `md` where the chips row is the chip's 24px (readiness F6). The detail
        // row is ALWAYS drawn, empty when there is neither a figure nor a last-played date, so a
        // tile with nothing to say ends level with one that has something.
        // Presentation: the status, the count, the detail figure and the notice are all in the
        // link's name. No focusable element lives here.
        aria-hidden="true"
        // `flex-1` takes the slack of a grid row, below the rows rather than between them.
        className="deck-card-footer flex flex-1 flex-col gap-[9px] pt-[11px] pr-[13px] pb-[13px] pl-[13px]"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        {/* The chips row: status, bracket, notice. It NEVER WRAPS from the 330px band floor up,
            and below it keeps today's wrap (readiness F5): the narrow three-up the grid mis-sizes
            cannot hold the pill and a single chip on one line, notice or none. */}
        <span
          data-deck-chips
          className="flex h-[22px] flex-none flex-nowrap items-center gap-[8px] md:h-[24px] @max-[330px]:h-auto @max-[330px]:flex-wrap @max-[330px]:gap-y-[6px]"
        >
          <StatusPillBadge
            status={deck.statusPill}
            className="flex h-[22px] flex-none items-center rounded-[6px] px-[8px] font-mono text-[10.5px] tracking-[0.06em] md:h-[24px]"
          />
          {deck.bracket ? (
            yieldsFace ? (
              // THE ONE YIELD (HANDOFF §1a): a range beside a notice drops its name below the width
              // that holds all three, and keeps its plate and both marks. Both drawn, one shown, by
              // the tile's own container: a prop cannot answer a width. Below the band floor the
              // row wraps instead, so the name comes back there.
              <>
                <span className={`contents ${yieldClasses.faced}`}>
                  <BracketChip permits={deck.bracket.permits} answered={deck.bracket.answered} />
                </span>
                <span className={`contents ${yieldClasses.marks}`}>
                  <BracketChip permits={deck.bracket.permits} answered={deck.bracket.answered} face={false} />
                </span>
              </>
            ) : (
              <BracketChip permits={deck.bracket.permits} answered={deck.bracket.answered} />
            )
          ) : null}
          {deck.notice ? (
            // F19: the mark is lifted OVER the tile's cover link (last in the DOM, `absolute
            // inset-0`) so its tooltip can open, as a SECOND link to the same deck that opens its
            // Notices sheet on arrival (`noticesHref`), rather than a forwarded click: cmd-click
            // and middle-click then open a new tab, as the rest of the tile does. Out of the tab
            // order and the accessibility tree, since the cover link is the tile's one target and
            // already says the notice.
            <Link
              href={noticesHref(deck.id)}
              tabIndex={-1}
              aria-hidden="true"
              data-notice-link
              className="relative z-10 inline-flex flex-none"
            >
              <FactTooltip sentence={noticeSentence(deck.notice)}>
                <NoticeMark notice={deck.notice} />
              </FactTooltip>
            </Link>
          ) : null}
        </span>

        {/* 3 · Progress, then the count in a fixed slot sized for `100 / 99` at 12.5px (readiness
            F7), so an Over deck's count never clips and the bar is one length on every tile. The
            track is drawn for every status; the fill is omitted when nothing is built. */}
        <span className="flex h-[14px] flex-none items-center gap-[10px]">
          <div
            data-deck-bar
            className="relative h-[3px] min-w-0 flex-1 rounded-full"
            style={{ background: "var(--border)" }}
          >
            {/* `built`, not the status: an empty track is what nothing built looks like, and
                since R6 a `Draft` can be 47 cards along. */}
            {deck.built > 0 && (
              <div
                data-deck-bar-fill
                className="absolute top-0 bottom-0 left-0 rounded-full"
                style={statusBarStyle(deck.statusPill, deck.built, bodySize)}
              />
            )}
          </div>
          <span
            data-deck-count
            className="w-[60px] flex-none text-right font-mono text-[12.5px] tabular-nums sm:text-[12px]"
            style={{ color: deck.built === 0 ? "var(--fg-muted)" : "var(--fg)" }}
          >
            {count}
          </span>
        </span>

        {/* 4 · The detail figure left, truncating, and last played right, at BOTH widths (H6).
            A `New` tile has no last played: its row carries `created today` alone. */}
        <span data-deck-detail className="flex h-[14px] flex-none items-center gap-[10px] font-mono">
          <span
            className="min-w-0 flex-1 truncate text-[11px] sm:text-[10.5px]"
            style={detail ? { color: detail.color } : undefined}
          >
            {detail?.cart && cartLink ? (
              // A second link over the tile's cover link, F19's pattern: the To buy figure opens the
              // all-decks cart on this deck. Out of the tab order and the tree, since the cover link
              // is the tile's one target and already speaks the figure.
              <Link
                href={`/decks/shopping?deck=${deck.id}`}
                tabIndex={-1}
                aria-hidden="true"
                data-cart-link
                className="relative z-10 no-underline hover:underline hover:decoration-[color:var(--accent)]"
              >
                {detail.text}
                <PendingReporter href="/decks/shopping" />
              </Link>
            ) : detail?.text}
          </span>
          {hasLastPlayed && (
            <span className="flex-none text-right text-[10.5px]" style={{ color: "var(--fg-faint)" }}>
              {lastPlayed}
            </span>
          )}
        </span>
      </div>

      {/* The whole tile is the target. Last in the DOM so it overlays the body,
          and named with the same five things the tile shows, in the same order.
          It has no descendants of its own, so the presentation it covers is
          marked `aria-hidden` rather than left to be announced a second time. */}
      <IntentPrefetchLink
        href={`/decks/${deck.id}`}
        eager={eager && "phone-in-view"}
        onPrefetch={onPrefetch}
        className="absolute inset-0"
        aria-label={ariaLabel}
      />
    </article>
  );
}
