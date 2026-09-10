"use client";

// LastSlotsStrip — the last-31 box, sitting between the provenance ledger and
// the decklist in the builder.
//
// #361 deleted the two fill CTAs. The strip no longer adds cards; it opens a
// list (#360 scope 1). One door, and behind it the whole ranked pool with a
// tick per row and one commit.
//
// The strip owns the selection rather than the list, because ticks and declines
// survive the list being closed (state 9) while TopOffList unmounts on close.
// It also owns the box, the heading, the caption and the door note; everything
// from the selection head down belongs to TopOffList.

import { type Ref, useEffect, useId, useRef, useState } from "react";
import { synergyCopy } from "../../lib/copy/synergy-discovery";
import { topOffCopy } from "../../lib/copy/top-off";
import type { TopOffCandidate } from "../../lib/decks/last-slots";
import { useIsDesktop } from "../ui/use-is-desktop";
import { TopOffList } from "./top-off-list";

export interface LastSlotsStripProps {
  deckId: string;
  /** The deck's body size minus the current built count from the optimistic
      card list — 99 for a single commander, 98 for a pair. */
  openSlots: number;
  /** The ceiling the counts on this strip are measured against. Passed rather
      than reconstructed: `openSlots` alone cannot tell 3 of 99 from 3 of 98. */
  bodySize: number;
  /** The whole ranked pool, uncapped, already excluding what the deck holds. */
  candidates: TopOffCandidate[];
  /** Oracle ids in the deck right now — the list names a row that went illegal
      while it was open rather than dropping it from under the cursor. */
  deckOracleIds: Set<string>;
  /** Newest price as-of, for the buy tags and the money figure. */
  newestAsOf: Date | null;
  /** Writes one message per settle to the live region in builder-shell.tsx. */
  onAnnounce: (message: string) => void;
  /** True while the commit is running. The shell uses it to disable quick-add. */
  onInflight?: (inflight: boolean) => void;
  /** Open/closed, so the shell can collapse the quick-add dock at phone widths
      (state 20) — the dock is hidden, never unmounted, so its query survives. */
  onOpenChange?: (open: boolean) => void;
  /** The open list's pinned commit bar, measured, so the shell can reserve it at
      the page foot. See TopOffListProps.onBarHeight. */
  onBarHeight?: (height: number) => void;
}

// ── Exhausted line (state 13) ──────────────────────────────────────────────
// The strip keeps a line and loses its control. §16's plate, which is the
// shipped provenance shape with a sans sentence and the accent left border —
// accent rather than warning because an exhausted pool is honest, not alarming.
// Border-left is set via inline styles (as provenance-line.tsx does) so jsdom
// can inspect the individual longhand properties.

function ExhaustedLine({
  total,
  shortfall,
  ref,
}: {
  total: string;
  shortfall: string;
  ref?: Ref<HTMLDivElement>;
}) {
  return (
    <div
      ref={ref}
      data-testid="last-slots-exhausted"
      // The plate is what a closing list has left to return focus to when the
      // pass emptied the pool, so it takes focus programmatically. Not in the
      // tab order: it is a sentence, and reaching it by tabbing would be one
      // more stop between the strip and the decklist.
      tabIndex={-1}
      className="flex items-start gap-[10px] rounded-[9px] px-[13px] py-[11px]"
      style={{
        background: "var(--surface-sunken)",
        border: "1px solid var(--border)",
        borderLeftWidth: "3px",
        borderLeftStyle: "solid",
        borderLeftColor: "var(--accent)",
      }}
    >
      <div
        className="flex flex-none items-center justify-center rounded-full font-mono text-[10px] md:text-[11px] w-[18px] h-[18px] md:w-[20px] md:h-[20px]"
        aria-hidden
        style={{ border: "1px solid var(--accent-shadow)", color: "var(--accent)" }}
      >
        i
      </div>
      <p className="flex-1 text-[12.5px] leading-[1.6]" style={{ color: "var(--fg-body)" }}>
        {synergyCopy.lastSlots.short(total, shortfall)}
      </p>
    </div>
  );
}

// ── LastSlotsStrip ─────────────────────────────────────────────────────────

export function LastSlotsStrip(props: LastSlotsStripProps) {
  // States 10 and 14: the strip is absent at a full deck. Arithmetic, not a
  // flag. The guard lives in the outer component so the stateful inner one
  // never calls hooks conditionally — React requires hooks to run every render.
  if (props.openSlots <= 0) return null;
  return <LastSlotsStripInner {...props} />;
}

function LastSlotsStripInner({
  deckId,
  openSlots,
  bodySize,
  candidates,
  deckOracleIds,
  newestAsOf,
  onAnnounce,
  onInflight,
  onOpenChange,
  onBarHeight,
}: LastSlotsStripProps) {
  const listId = useId();
  const doorRef = useRef<HTMLButtonElement>(null);
  const isDesktop = useIsDesktop();

  const [open, setOpen] = useState(false);
  // The list has been opened in this visit, so the door note stops promising a
  // seed that already happened. Cancelling does not discard the selection, so
  // this is set on the open rather than on a landed pass: reopening after a
  // cancel restores what the player left, which is the reopen note's promise
  // and not the first-open one's. Session state rather than a server figure —
  // a reload has no selection, and the first-open note is honest again then.
  const [visited, setVisited] = useState(false);

  // Held here rather than in TopOffList: both survive the list being closed and
  // reopened (state 9), and the list unmounts on close.
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const [declined, setDeclined] = useState<Set<string>>(new Set());
  // Ticks are seeded on the FIRST open only. Reopening restores the selection
  // the player left, which is the promise strip.doorNoteAgain makes.
  const seeded = useRef(false);

  const ownedIds = candidates.filter((c) => c.owned).map((c) => c.oracleId);

  const closeRef = useRef<HTMLButtonElement>(null);
  const exhaustedRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const moveFocus = useRef(false);

  function openList() {
    let seedTicked = ticked;
    if (!seeded.current) {
      seeded.current = true;
      seedTicked = new Set(ownedIds.slice(0, openSlots));
      setTicked(seedTicked);
    }
    moveFocus.current = true;
    setOpen(true);
    setVisited(true);
    onOpenChange?.(true);
    // The selection survives a close, and the deck does not stand still while
    // the list is shut: slots can close under it and a card can join the deck
    // from the quick-add dock. A reopen therefore announces what the list will
    // actually show, derived the way TopOffList derives it — pool order, minus
    // what is declined or already in the deck, clipped to the slots left. On a
    // first open this is the seed itself, so one expression serves both.
    const liveTicks = candidates
      .map((c) => c.oracleId)
      .filter((id) => seedTicked.has(id) && !declined.has(id) && !deckOracleIds.has(id))
      .slice(0, Math.max(openSlots, 0)).length;
    // One message per settle, and opening at phone settles two facts at once —
    // so they are one message. Two calls would leave only the second in the
    // live region, and the one that would survive is the lesser of the two.
    const opened = topOffCopy.announce.opened(
      String(candidates.length),
      String(openSlots),
      String(liveTicks),
    );
    onAnnounce(isDesktop ? opened : `${opened} ${topOffCopy.dock.retiredAnnounce}`);
  }

  function closeList() {
    moveFocus.current = true;
    setOpen(false);
    onOpenChange?.(false);
  }

  // The door and `Close the list` are two faces of one disclosure, because the
  // drawing replaces the first with the second rather than relabelling a single
  // control the way the shipped CoverageDisclosure does. That costs a focus
  // move the chip never needs: the door unmounts under the cursor, and a button
  // that unmounts drops focus to the body, which is the very thing §1e's "does
  // not steal focus" is protecting against. Focus therefore follows the
  // disclosure to whichever face is mounted — never into the rows, which is
  // what the handoff rules out. Both moves wait for the render that mounts the
  // target; a synchronous focus() would find nothing there.
  //
  // A pass can take the last candidates and leave slots still open, and then
  // the door the list closes back onto does not exist — the exhausted plate
  // stands in its place. Focus follows the drawing rather than the control, or
  // the one close that ends the feature drops the reader on the body.
  useEffect(() => {
    if (!moveFocus.current) return;
    moveFocus.current = false;
    const target = open ? closeRef.current : (doorRef.current ?? exhaustedRef.current);
    // The strip is the last thing on the builder page, so its head sits near the
    // bottom of the viewport and the list opens below the fold — at 390px the
    // player is handed a commit bar reading `Add 31 cards` with not one card on
    // screen, which is the blind add the whole feature exists to end. The head
    // is brought to the top of the viewport so the rows are what fills it.
    // Scrolling the focus target would only re-reveal the head, which is already
    // visible, so the scroll is asked of the panel and denied to the focus.
    target?.focus({ preventScroll: true });
    // Instant, like every other scroll on this surface: an animated scroll has
    // to answer prefers-reduced-motion, and the jump answers it by not moving.
    // Optional call: jsdom does not implement scrollIntoView at all.
    if (open) rootRef.current?.scrollIntoView?.({ block: "start" });
  }, [open]);

  // The strip unmounts the moment the deck fills, and a fill can land from the
  // quick-add dock while the list is open — a path that never calls close. The
  // flags it raised would then stay raised with nothing left to lower them, and
  // the phone dock would stay hidden for a list that no longer exists.
  const flags = useRef({ onOpenChange, onInflight });
  useEffect(() => {
    flags.current = { onOpenChange, onInflight };
  });
  useEffect(
    () => () => {
      flags.current.onOpenChange?.(false);
      flags.current.onInflight?.(false);
    },
    [],
  );

  // State 13: nothing left to offer. The line replaces the caption and the
  // door both — a control with nothing to do is absent, not disabled.
  const exhausted = candidates.length === 0;

  // The first-open note promises what will arrive ticked, and the seed clamps to
  // the open slots, so it states the seeded figure rather than the owned one.
  // The two reopen notes are about ownership rather than ticks, so they keep the
  // unclamped count: you do still own all of them.
  const doorNote = !visited
    ? topOffCopy.strip.doorNote(String(Math.min(ownedIds.length, Math.max(openSlots, 0))))
    : ownedIds.length === 0
      ? topOffCopy.strip.doorNoteAgain(String(candidates.length))
      : topOffCopy.strip.doorNoteAgainOwned(
          String(ownedIds.length),
          String(candidates.length),
        );

  return (
    <div
      ref={rootRef}
      className={[
        "mx-[16px] md:mx-[30px] mt-[10px] md:mt-[12px] mb-[12px] md:mb-[16px] rounded-[10px]",
        // The open panel is tighter at phone, where the list beneath it carries
        // its own spacing; desktop padding does not change between the two.
        open ? "px-[12px] pt-[12px] pb-[10px]" : "px-[14px] py-[13px]",
        "md:px-[16px] md:py-[14px]",
      ].join(" ")}
      style={{
        background: "var(--surface-rail)",
        border: "1px solid var(--border-strong)",
      }}
    >
      {/* Heading and caption. One baseline row at desktop, two blocks at phone;
          `Close the list` joins that row while the list is open. */}
      <div className="md:flex md:items-baseline md:gap-[10px] md:mb-[11px]">
        <p
          className="font-mono uppercase text-[10px] md:text-[10.5px] mb-[4px] md:mb-0"
          style={{ letterSpacing: ".14em", color: "var(--accent)" }}
        >
          {topOffCopy.strip.heading(String(openSlots))}
        </p>

        {!exhausted && (
          <p
            className="font-mono text-[10px] md:text-[10.5px] mb-[11px] md:mb-0"
            style={{ color: "var(--fg-faint)" }}
          >
            <span className="md:hidden">
              {open
                ? topOffCopy.strip.captionMobileOpen(String(candidates.length))
                : topOffCopy.strip.captionMobile(
                    String(openSlots),
                    String(candidates.length),
                  )}
            </span>
            {/* Desktop drops the caption once the list is open: the list's own
                head carries the candidate count and the slot denominator, and
                the ordering line carries the ordering, so leaving it up states
                both a third time. Phone keeps its variant because that head is
                desktop-only. */}
            {!open && (
              <span className="hidden md:inline">
                {topOffCopy.strip.caption(String(openSlots), String(candidates.length))}
              </span>
            )}
          </p>
        )}

        {open && (
          <button
            ref={closeRef}
            type="button"
            onClick={closeList}
            // The expanded half of the disclosure the door opens, so it carries
            // the state and the target rather than leaving the pair silent
            // about both while the list is up.
            aria-expanded
            aria-controls={listId}
            // `Close` is a visual truncation at 390px, not a second label, and
            // both spans are in the DOM at every width — so without this the
            // spoken name is the two of them run together.
            aria-label={topOffCopy.strip.close}
            // The rule belongs to the word, not to the tap target: the phone
            // box is 44px tall and centres its text, so a border on the button
            // draws a detached dash a good 15px under the label, underlining
            // nothing. `flex w-fit` rather than `inline-flex` because the phone
            // head is a block, where `ml-auto` on an inline box does nothing and
            // the control sat left, reading as a section label over the ticks.
            className="ml-auto flex-none flex w-fit items-center min-h-[44px] md:min-h-0 font-mono text-[10px] md:text-[11px] bg-transparent cursor-pointer [color:var(--fg-faint)]"
          >
            {/* Shortened at 390px, where the strip head has one line to give.
                One element with responsive spans, not two mounted controls. */}
            <span className="md:hidden [border-bottom:1px_dashed_var(--border-dashed)]">
              {topOffCopy.strip.closeShort}
            </span>
            <span className="hidden md:inline [border-bottom:1px_dashed_var(--border-dashed)]">
              {topOffCopy.strip.close}
            </span>
          </button>
        )}
      </div>

      {/* The open list outranks the exhausted plate. A quick-add can take the
          last candidates while the list is up, and gating on the pool first
          would tear the pass down mid-selection and stand a plate in its place,
          which is the whole of what state 17's frozen pool forbids. The plate is
          what the list closes back onto instead. */}
      {open ? (
        <TopOffList
          deckId={deckId}
          listId={listId}
          openSlots={openSlots}
          bodySize={bodySize}
          candidates={candidates}
          deckOracleIds={deckOracleIds}
          ticked={ticked}
          onTickedChange={setTicked}
          declined={declined}
          onDeclinedChange={setDeclined}
          newestAsOf={newestAsOf}
          onAnnounce={onAnnounce}
          onInflight={(v) => onInflight?.(v)}
          onBarHeight={(h) => onBarHeight?.(h)}
          onClose={closeList}
        />
      ) : exhausted ? (
        <ExhaustedLine
          ref={exhaustedRef}
          total={String(bodySize - openSlots)}
          shortfall={String(openSlots)}
        />
      ) : (
        <div className="md:flex md:items-center md:gap-[12px] md:flex-wrap">
          <button
            ref={doorRef}
            type="button"
            onClick={openList}
            aria-expanded={false}
            aria-controls={listId}
            aria-label={topOffCopy.strip.openAria(String(openSlots))}
            className={[
              "flex md:inline-flex items-center justify-center md:justify-start",
              "gap-[8px] md:gap-[9px] w-full md:w-auto min-h-[44px] md:min-h-0",
              "md:px-[16px] md:py-[10px] rounded-[8px] bg-transparent",
              "font-semibold text-[14px] md:text-[13px] cursor-pointer",
              "[border:1px_solid_var(--accent)] [color:var(--accent)]",
            ].join(" ")}
          >
            {topOffCopy.strip.open(String(openSlots))}
            <span aria-hidden className="font-mono text-[12px]" style={{ color: "var(--fg-faint)" }}>
              {"↓"}
            </span>
          </button>
          <p
            className="font-mono text-[10px] md:text-[10.5px] leading-[1.55] md:leading-[1.6] mt-[9px] md:mt-0 md:flex-1 md:min-w-[240px]"
            style={{ color: "var(--fg-locked)" }}
          >
            {doorNote}
          </p>
        </div>
      )}
    </div>
  );
}
