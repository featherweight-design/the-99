"use client";

// The Top off list's frame, drawn from props alone (landing demo split 5h).
//
// The head (the figures, the cap line, the bulk pair and the clear and restore presses), the column header, the
// group the rows sit in, the empty-list note and the commit row, with every figure and every press arriving as a
// prop. What the signed-in list keeps: the read, the selection, the bulk plans, the actions, the announcements, the
// bar's height publishing and the hover preview's provider (handed in as `wrapRows`). A surface with none of them (the
// public landing's demo) passes figures and presses that only tick, and draws the same frame.

import type { ReactNode, Ref } from "react";
import { topOffCopy } from "../../lib/copy/top-off";
import { synergyCopy } from "../../lib/copy/synergy-discovery";
import { AddSurfaceMarkKey } from "./add-surface-mark-key";
import { COST_TRACK } from "../ui/cost-pips";
import { GhostButton } from "../ui/button";
import { RefusalPlate, TYPE_COL } from "./top-off-rows";

/** One bulk control: its label, its accessible name (which carries the concession), the visible note and its press. */
export type BulkControlSpec = {
  label: string;
  ariaLabel: string;
  note: string;
  onPress: () => void;
};

export interface TopOffFrameProps {
  listId: string;
  /** The id the cap line carries, wherever it is mounted (the head at desktop, the bar at phone). */
  capLineId: string;
  isDesktop: boolean;
  openSlots: number;
  bodySize: number;
  /** The frozen pool's size, and how many of its rows are neither ticked nor declined. */
  poolSize: number;
  untouched: number;
  tickedCount: number;
  declinedHere: number;
  atCap: boolean;
  inflight: boolean;
  /** The bulk pair, each absent when its press would tick nothing or repeat the other. Both null draws no pair. */
  bulk: { collection: BulkControlSpec | null; best: BulkControlSpec | null };
  onClearTicks: () => void;
  onRestoreAll: () => void;
  /** The rows, between the column header and the end of the scroll group. */
  children: ReactNode;
  /** Wraps the scroll group, for the one hover preview the whole list shares. Omitted: no preview. */
  wrapRows?: (group: ReactNode) => ReactNode;
  /** The note under the rows when nothing is ticked, already chosen from the three variants; null draws none. */
  emptyNote: string | null;
  /** How many ticked rows are unowned, and the figure for them (null when no copy is priced). */
  buyCount: number;
  buyTotal: string | null;
  /** The pinned bar's ref, so the signed-in list can measure it. */
  barRef?: Ref<HTMLDivElement>;
  onCommit: () => void;
  onCancel: () => void;
  /** The commit's refusal, or the pair's when the commit has none. */
  errorMessage: string | null;
}

/**
 * Whether two plans would select the SAME CARDS.
 *
 * As sets, never by length: two plans of twelve differing by one card are two different
 * answers, and collapsing them would leave a player choosing between controls that are not
 * the same while the surface tells them they are. Order is not a difference — both are
 * applied as a `Set` — so the comparison must not be sensitive to it.
 */
export function sameSelection(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const inA = new Set(a);
  return b.every((id) => inA.has(id));
}

/**
 * One control and its concession, as one row.
 *
 * The button is a fixed 232px column on desktop so the notes share a left edge and can be
 * read against each other — 232px is the wider label at its largest reachable figure,
 * `Select the 47 this deck needs`, so nothing in the pair wraps. At phone the button is full
 * width at the 44px minimum and the note is indented to its edge, because side by side each
 * label gets ~175px and the longer one wraps to three lines there.
 *
 * THE CONCESSION IS IN THE ACCESSIBLE NAME and the visible note is `aria-hidden`: a sibling
 * note is read AFTER the choice on a linear pass, and the whole design is that both
 * concessions are legible BEFORE either press. Hidden rather than duplicated, so the figure
 * is not spoken twice.
 */
export function BulkControl(props: {
  pool: "collection" | "best";
  label: string;
  ariaLabel: string;
  note: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <div className="flex flex-col gap-[5px] md:flex-row md:items-center md:gap-[14px]">
      <GhostButton
        data-bulk-fill={props.pool}
        onClick={props.onPress}
        disabled={props.disabled}
        aria-label={props.ariaLabel}
        className="flex w-full items-center justify-center min-h-[44px] font-mono text-[12px] md:w-[232px] md:min-h-0 md:h-[30px] md:text-[11px] rounded-[8px] text-[color:var(--fg-body)] disabled:opacity-50"
      >
        {props.label}
      </GhostButton>
      <p
        data-bulk-concession={props.pool}
        aria-hidden
        className="font-mono text-[11px] pl-[2px] md:pl-0"
        style={{ color: "var(--fg-body)" }}
      >
        {props.note}
      </p>
    </div>
  );
}

export function TopOffFrame({
  listId,
  capLineId,
  isDesktop,
  openSlots,
  bodySize,
  poolSize,
  untouched,
  tickedCount,
  declinedHere,
  atCap,
  inflight,
  bulk,
  onClearTicks,
  onRestoreAll,
  children,
  wrapRows,
  emptyNote,
  buyCount,
  buyTotal,
  barRef,
  onCommit,
  onCancel,
  errorMessage,
}: TopOffFrameProps) {
  const wrapGroup = wrapRows ?? ((group: ReactNode) => group);
  const total = bodySize - openSlots + tickedCount;
  const slotsLeft = openSlots - tickedCount;
  // The bar's one status line. The addendum draws three rungs, but rungs 1 and 2
  // partition the whole space — `atCap` is `slotsLeft <= 0` — so the third, the
  // dock notice, is unreachable behind them. That follows from the priority the
  // addendum itself sets and the reason it gives for setting it: the notice is
  // the only one of the three about a control the player is not currently using, and
  // `Cancel` and `Close` are both on screen and both the answer to it. So it
  // is written as the two rungs that can actually render rather than a branch
  // that never will.
  const barStatus =
    slotsLeft > 0
      ? topOffCopy.commit.slotsStayOpen(String(slotsLeft))
      : isDesktop
        ? null
        : topOffCopy.list.cap;

  const primaryLabel = inflight
    ? topOffCopy.commit.inFlight(String(tickedCount))
    : tickedCount === 0
      ? topOffCopy.commit.addEmpty
      : topOffCopy.commit.add(String(tickedCount));

  // An aria-label replaces the visible label rather than adding to it, so it
  // has to track all three of the button's states. Only the last one has a
  // count worth spelling out: at zero the copy file already drops it, and
  // mid-pass the count is in the visible label the aria-label is standing in
  // for. The added total is the fact the drawing puts nowhere else.
  const primaryAria = inflight
    ? primaryLabel
    : tickedCount === 0
      ? topOffCopy.commit.addEmpty
      : topOffCopy.commit.addAria(String(tickedCount), String(total), bodySize);

  const headDesktop = topOffCopy.list.head(
    String(tickedCount),
    String(openSlots),
    String(poolSize),
    String(Math.max(0, untouched)),
  );
  // The head is one of our own strings and its two halves take different ink.
  // Splitting on the separator it was written with is the only seam available;
  // a string without one renders whole, in the live half's ink.
  const [headLive, headStatic] = splitOnce(headDesktop, " · ");

  return (
    <div id={listId}>
      {/* ── Selection head (§2) ─────────────────────────────────────────── */}
      <div className="md:flex md:items-center md:gap-[12px] md:flex-wrap md:pt-[10px] md:pb-[11px] md:[border-bottom:1px_solid_var(--border)]">
        {/* Desktop only. At 390px the ticked count is stated once, in the pinned
            commit bar, where it sits beside the button that acts on it — and the
            strip's own caption takes this slot instead. */}
        <p className="hidden md:block font-mono text-[11px]">
          <span style={{ color: "var(--fg-body)" }}>{headLive}</span>
          {headStatic !== null && (
            <span style={{ color: "var(--fg-locked)" }}>{` · ${headStatic}`}</span>
          )}
        </p>

        {/* The cap's desktop home. The head is the one element always directly
            above the rows, so a player who taps an inert box at row 3 gets an
            answer; the line used to sit below all 38 of them. The divider is a
            rule rather than a middot because this is a different kind of
            statement from the figures beside it. */}
        {isDesktop && atCap && (
          <p
            id={capLineId}
            className="hidden md:block font-mono text-[10.5px] pl-[12px] [border-left:1px_solid_var(--border-strong)]"
            style={{ color: "var(--fg-locked)" }}
          >
            {topOffCopy.list.cap}
          </p>
        )}

        {/* ── The bulk pair (§5.1–§5.4, b1–b11) ──────────────────────────
            TWO GHOSTS OF EQUAL WEIGHT, one fixed column, each with its
            concession on its own line. The locked requirement is COMPARISON:
            two labels of different length push their notes to different x
            positions, and two figures that do not share a left edge are read
            one after the other rather than against each other. So the buttons
            take one fixed 232px column and the notes form a second.

            Neither is primary. The pair exists precisely because the app cannot
            know which concession a player minds, and weight would be an opinion
            it does not have. The brass outline on this surface is spoken for by
            `Add N cards`, the only control here that changes the deck.

            NEITHER TAKES A PRESSED STATE. A player can deselect by hand a moment
            later, and a lit button would claim a selection that no longer
            matches it. Pressing the other swaps the selection wholesale. */}
        <div className="flex flex-col gap-[10px] mt-[11px] md:gap-[7px]">
          {(bulk.collection || bulk.best) && (
            <>
              {/* b9 · nothing to sleeve. The collection control is ABSENT, not
                  disabled — the surface's standing rule — and the strip's
                  shipped door note already says which of the two zeroes it is. */}
              {/* EACH CONTROL NAMES THE ROWS ITS PRESS TICKS, not the open slots, and this is
                  where the build departs from the handoff's copy note.

                  That note says "both labels state the same count — the open slots — because
                  both fills take every one of them". True in b1's own figures and false
                  wherever a plan leaves a slot open: a collection holding four candidates for
                  twelve slots cannot take twelve, and a plan can choose none of the six a list
                  holds. `Select 6 from my collection` over a press that ticked nothing is what
                  shipped (Hugh, 2026-09-28).

                  The surface has already ruled on this shape once: "a button that says two
                  and ticks one is wrong on its face and in its name". Recorded as errata on the
                  handoff rather than settled quietly. */}
              {bulk.collection && (
                <BulkControl
                  pool="collection"
                  label={bulk.collection.label}
                  ariaLabel={bulk.collection.ariaLabel}
                  note={bulk.collection.note}
                  disabled={inflight}
                  onPress={bulk.collection.onPress}
                />
              )}
              {/* b3 · the two fills are the same set, so the second control is
                  ABSENT and the survivor's note says why. Two controls that do
                  the same thing are the shipped #361 defect in a new costume. */}
              {bulk.best && (
                <BulkControl
                  pool="best"
                  label={bulk.best.label}
                  ariaLabel={bulk.best.ariaLabel}
                  note={bulk.best.note}
                  disabled={inflight}
                  onPress={bulk.best.onPress}
                />
              )}
            </>
          )}
        </div>

        <div className="flex flex-wrap gap-[8px] mt-[11px] md:contents">
          <GhostButton
            onClick={onClearTicks}
            disabled={inflight || tickedCount === 0}
            className="flex flex-1 items-center justify-center min-h-[44px] md:inline-flex md:flex-none md:min-h-0 md:h-[30px] md:px-[11px] rounded-[8px] font-mono text-[11px] text-[color:var(--fg-body)] disabled:opacity-50"
          >
            {topOffCopy.list.clearTicks}
          </GhostButton>
          {declinedHere > 0 && (
            <GhostButton
              onClick={onRestoreAll}
              disabled={inflight}
              aria-label={topOffCopy.list.restoreAllAria(String(declinedHere))}
              className="flex basis-full items-center justify-center min-h-[44px] md:inline-flex md:basis-auto md:flex-none md:min-h-0 md:h-[30px] md:px-[11px] rounded-[8px] font-mono text-[11px] text-[color:var(--fg-body)] disabled:opacity-50"
            >
              {topOffCopy.list.restoreAll(String(declinedHere))}
            </GhostButton>
          )}
        </div>

        <p
          className="hidden md:block font-mono text-[10px] md:ml-auto"
          style={{ color: "var(--fg-locked)" }}
        >
          {topOffCopy.list.ordering}
        </p>
      </div>

      {/* THE KEY, above the rows, so the vocabulary is met before the first glyph. See
          `AddSurfaceMarkKey` for why it is unconditional here and conditional on the
          decklist: this list ranks a pool of 262 candidates for the average commander and
          shows a window on it. */}
      <AddSurfaceMarkKey className="px-[8px] md:px-[9px] pb-[10px]" />

      {/* ── The rows (§4) ──────────────────────────────────────────────── */}
      {/* One preview for the whole list, as the decklist mounts one for its
          ninety-nine: 262 rows each carrying a positioned 252x352 box and a
          timer of its own is the thing this component was written to avoid. No
          padding class — the decklist passes its own row padding here, and this
          list's rows carry theirs. */}
      {wrapGroup(
      <div
        // Named, so a probe can address THIS list rather than any group under
        // `<main>`. The decklist behind the strip carries a `View details for …`
        // trigger on every one of its rows, so a locator scoped to the page — or
        // to `div[role="group"]` — is satisfied by the decklist and reports this
        // list working when its own trigger is gone. That false pass has now been
        // written twice; the attribute is what stops a third.
        data-top-off-rows
        role="group"
        aria-label={topOffCopy.list.groupAria(
          String(poolSize),
          String(openSlots),
        )}
        // DESKTOP ONLY, and the handoff's own long-list note is why.
        //
        // That note refuses an inner scroller outright, on four grounds, and it
        // is right about every one of them AT 390px: two scroll surfaces a
        // gesture cannot tell apart on a box nearly as wide as the viewport, a
        // hidden bottom, chaining that throws the commit past a reader who is
        // slowing down, and a trapped primary. The phone keeps exactly what it
        // drew — one scroll surface, the commit pinned in the dock's slot.
        //
        // But it costs the decision as "a player scrolls past up to 38 rows",
        // because "the list can never be longer than 99 − built". It can:
        // `listLastSlotsCandidates` returns the whole ranked pool, which is 262
        // cards for the average commander and 423 at the widest, and 3,264 of
        // 3,279 commanders carry more than 100 even after the negative tail is
        // cut. So on desktop the shipped shape is the one option that note
        // refused by name — an unpinned commit at the end of the list — reached
        // by a premise that did not hold.
        //
        // A pointer can address one box of two; a 390px thumb cannot. Bounding
        // it here buys the always-visible primary the note wanted, without the
        // gesture ambiguity it was avoiding.
        //
        // 480px is the synergy panel's own box on `/commanders/[slug]`, which is
        // the other long EDHREC list in this app. `max-h`, so a list shorter than
        // the box is its own height and no reader is given a scrollbar for six
        // rows. Whether the POOL should be this long at all is a question for
        // Design; this is the reading surface, not the ranking.
        className="flex flex-col gap-[6px] md:gap-[5px] mt-[8px] md:max-h-[480px] md:overflow-y-auto"
      >
        {/* ── Column header (§3) — desktop only ───────────────────────────── */}
        {/* INSIDE the scroll box below, and sticky to its top, rather than a
            sibling above it. A classic (non-overlay) scrollbar takes its width out
            of the scroll container's CONTENT box, so a header outside would be
            about 15px wider than the rows and every heading after the flex-auto
            name column would sit that far right of the data it names — the same
            failure this file's own header comment records at 32px, arriving the
            other way. Invisible on overlay scrollbars, which is what macOS draws
            and what the probe measures, so nothing here would have caught it.

            Sticky, because a header that scrolled away with the rows would leave a
            480px box of unlabelled figures. It carries the strip's own background
            so rows pass under it rather than through it. */}
        <div
          aria-hidden
          className="hidden md:flex md:sticky md:top-0 md:z-[1] items-center gap-[10px] pt-[9px] pb-[7px] px-[9px] font-mono uppercase"
          style={{
            fontSize: "9.5px",
            letterSpacing: ".12em",
            color: "var(--fg-faint)",
            background: "var(--surface-rail)",
          }}
        >
          <span className="w-[18px] flex-none" />
          <span className="w-[7px] flex-none" />
          <span className="flex-auto min-w-0">{topOffCopy.list.colCard}</span>
          {/* Type, beside the name as the handoff's own long-list note orders it
              (`box, dot, name, type, buy tag, synergy, inclusion`). It reads the
              synergy panel's heading rather than declaring a second copy of the
              word: two surfaces listing the same EDHREC pool under two different
              headings for one column is the drift a shared string exists to stop. */}
          <span className="flex-none" style={{ width: TYPE_COL }}>{synergyCopy.panel.colType}</span>
          {/* The same shared track the rows draw into, never a literal beside it: the cost
              column widened from 40 to 72 when the pips stopped overlapping, and a header
              carrying its own copy of the old number put this heading and every one after it
              32px left of the data underneath. */}
          <span
            className="flex-none text-right"
            style={{ width: COST_TRACK }}
          >
            {topOffCopy.list.colCost}
          </span>
          <span className="w-[84px] flex-none" />
          {/* Both figures narrow to pay for the decline's 60px slot, measured
              against the string the row actually renders — `+147 pts`, eight
              characters at IBM Plex Mono's 0.6em advance, which is 57.6px at
              12px. 44px is recovered against 42px spent, so the name column
              gains 2px rather than paying anything. */}
          <span className="w-[60px] flex-none text-right">{topOffCopy.list.colSynergy}</span>
          <span className="w-[36px] flex-none text-right">{topOffCopy.list.colDecks}</span>
          <span className="w-[60px] flex-none" />
        </div>

        {children}
      </div>
      )}

      {emptyNote !== null && (
        <p className="font-mono text-[10.5px] mt-[9px]" style={{ color: "var(--fg-locked)" }}>
          {/* Emptied by choosing is not empty, and it is not state 13 either:
              every candidate is still there wearing its own way back. The other
              two variants describe a list that arrived ticked, which by now is a
              moment that has passed. */}
          {emptyNote}
        </p>
      )}

      {/* ── Commit row (§9) / commit bar (§10) ─────────────────────────── */}
      <div
        ref={barRef}
        className={[
          // Phone: the one pinned element, taking the quick-add dock's slot.
          "fixed left-0 right-0 bottom-[var(--tabbar-h)] z-30 px-[12px] pt-[11px] pb-[13px]",
          "flex flex-col gap-[9px]",
          // Desktop: an ordinary row at the foot of the list, never sticky.
          "md:static md:left-auto md:right-auto md:p-0 md:mt-[14px] md:pt-[14px]",
          "md:flex-row md:items-center md:gap-[14px] md:flex-wrap",
          // The dock's own background, because this takes the dock's slot. A
          // transparent pinned bar lets 191 rows scroll through its text.
          "[background:var(--bg)] md:[background:none]",
          "[border-top:1px_solid_var(--border-strong)] md:[border-top:1px_solid_var(--border)]",
        ].join(" ")}
      >
        {/* The bar's one status line, and one element rather than a pair split
            by CSS, so the sentence is never in the DOM twice. Desktop carries
            only the slots notice: its cap line lives in the head, and the dock
            notice is a phone-only fixture. Phone stacks all three as a single
            ternary so the bar can never grow a second line. Rungs 1 and 2 are
            mutually exclusive by arithmetic — at the cap there are no slots left
            to stay open — and the dock notice is last because it is the only one
            of the three about a control the player is not currently using, and
            `Cancel` and `Close` are both on screen and both the answer to it. */}
        {barStatus && (
          <p
            id={!isDesktop && atCap ? capLineId : undefined}
            className="order-1 md:order-4 md:ml-auto font-mono text-[10px] md:text-[10.5px]"
            style={{ color: "var(--fg-locked)" }}
          >
            {barStatus}
          </p>
        )}

        <div className="order-3 flex gap-[8px] md:contents">
          <button
            type="button"
            onClick={onCommit}
            disabled={tickedCount === 0 || inflight}
            aria-label={primaryAria}
            className={[
              "md:order-1 flex-auto md:flex-none inline-flex items-center justify-center",
              "min-h-[44px] md:min-h-0 rounded-[8px] px-[18px] md:py-[10px]",
              "bg-transparent font-semibold text-[14px] md:text-[13px] cursor-pointer",
              "disabled:cursor-default",
              inflight
                ? "[border:1px_solid_var(--accent-shadow)] [color:var(--fg-faint)]"
                : tickedCount === 0
                  ? "[border:1px_solid_var(--border)] [color:var(--fg-locked)]"
                  : "[border:1px_solid_var(--accent)] [color:var(--accent-text)]",
            ].join(" ")}
          >
            {primaryLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={inflight}
            className={[
              "md:order-2 flex-none inline-flex items-center justify-center",
              "min-h-[44px] md:min-h-0 rounded-[8px] px-[16px] md:py-[10px]",
              "bg-transparent text-[14px] md:text-[13px] cursor-pointer",
              "[border:1px_solid_var(--border-strong)] [color:var(--fg)]",
              "disabled:opacity-50 disabled:cursor-default",
              "disabled:[border-color:var(--border)] disabled:[color:var(--fg-locked)]",
            ].join(" ")}
          >
            {topOffCopy.commit.cancel}
          </button>
        </div>

        <div className="order-2 md:order-3 flex items-baseline gap-[8px] font-mono text-[10.5px] md:text-[11px] leading-[1.6]">
          <span className="md:hidden" style={{ color: "var(--fg-body)" }}>
            {topOffCopy.list.headMobile(String(tickedCount), String(openSlots))}
          </span>
          {buyCount > 0 && (
            <span className="order-2 md:order-2" style={{ color: "var(--warning)" }}>
              {topOffCopy.commit.toBuy(
                String(buyCount),
                // price-strip.tsx's rule, and the same threshold: a figure
                // stands as soon as one copy is priced, and leaves entirely
                // when none is. Zero priced copies sum to zero cents, which is
                // not a price of nothing.
                buyTotal,
              )}
            </span>
          )}
          <span className="order-3 md:order-1 ml-auto md:ml-0 text-[color:var(--fg-locked)] md:text-[color:var(--fg-body)]">
            {topOffCopy.commit.consequence(String(total), bodySize)}
          </span>
        </div>

        {errorMessage && (
          <RefusalPlate
            className="order-4 md:order-5 md:w-full"
            // The COMMIT's refusal wins when both are set: it is about something the player
            // just pressed, while the pair's is about a background read.
            message={errorMessage}
          />
        )}
      </div>
    </div>
  );
}

/** First separator only; a string without one keeps its whole self as the head. */
function splitOnce(value: string, sep: string): [string, string | null] {
  const at = value.indexOf(sep);
  if (at === -1) return [value, null];
  return [value.slice(0, at), value.slice(at + sep.length)];
}

