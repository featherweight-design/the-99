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
import { chooseBulkTicks } from "../../lib/decks/bulk-choice";
import { topOffCopy } from "../../lib/copy/top-off";
import { canSeed, type TopOffCandidateWithFacts } from "../../lib/decks/last-slots";

/**
 * What this strip hands down: the DECK-SCOPED candidate, both of its deck-scoped fields
 * REQUIRED.
 *
 * This is the middle link of the chain the card-note round had to repair. With `facts`
 * optional anywhere along it, the page's attachment is erased on the way down and removing
 * that attachment compiles — which is exactly how a payload ships, tested, and is drawn by
 * nobody. Fixtures say `facts: null` rather than saying nothing.
 */
type RowCandidate = TopOffCandidateWithFacts;
import { useIsDesktop } from "../ui/use-is-desktop";
import { TopOffList } from "./top-off-list";
import type { NoteCounts } from "../../lib/bracket/card-note";
import type { Bracket } from "../../lib/bracket/types";
import { useTopOffDraft } from "./use-top-off-draft";
import { reveal } from "../../lib/ui/reveal";

export interface LastSlotsStripProps {
  deckId: string;
  /** The deck's body size minus the current built count from the optimistic
      card list — 99 for a single commander, 98 for a pair. */
  openSlots: number;
  /** The ceiling the counts on this strip are measured against. Passed rather
      than reconstructed: `openSlots` alone cannot tell 3 of 99 from 3 of 98. */
  bodySize: number;
  /** The whole ranked pool, uncapped, already excluding what the deck holds.
   *  The deck-scoped row type, with `facts` REQUIRED — see `RowCandidate`. */
  candidates: RowCandidate[];
  /** The pool is empty because every ranked card argues against itself rather
   *  than because the collection ran out. Two different facts, two different
   *  sentences: `synergyCopy.lastSlots.short` describes only the first, and it
   *  is false in both of its clauses for the second. */
  allNegative?: boolean;
  /** Oracle ids in the deck right now — the list names a row that went illegal
      while it was open rather than dropping it from under the cursor. */
  deckOracleIds: Set<string>;
  /** Newest price as-of, for the buy tags and the money figure. */
  newestAsOf: Date | null;
  /**
   * The card note's two deck-level inputs — the deck's live declaration and what its list
   * already holds of each note-bearing kind.
   *
   * REQUIRED, and threaded rather than defaulted, for the reason `newestAsOf` beside it is:
   * a row that receives no counts draws every ordinal from zero and says `your 1st game
   * changer` about a deck holding four. A wrong figure rather than a missing prop, and
   * silent — the failure that comment records having shipped once already.
   */
  declaredBracket: Bracket | null;
  noteCounts: NoteCounts;

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
  allNegative = false,
  ref,
}: {
  total: string;
  shortfall: string;
  /** See `LastSlotsStripProps.allNegative`. */
  allNegative?: boolean;
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
        {/* Two ways to empty the pool, and only one of them is the collection
            running out. `lastSlots.short` says there was nothing left that
            EDHREC ranks — false when the rows were cut because EDHREC ranked
            them BELOW their own baseline, which is where a deck holding every
            positively-ranked card lands. */}
        {allNegative
          ? topOffCopy.strip.exhaustedAllNegative
          : synergyCopy.lastSlots.short(total, shortfall)}
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
  allNegative = false,
  deckOracleIds,
  newestAsOf,
  declaredBracket,
  noteCounts,
  onAnnounce,
  onInflight,
  onOpenChange,
  onBarHeight,
}: LastSlotsStripProps) {
  const listId = useId();
  const doorRef = useRef<HTMLButtonElement>(null);
  const isDesktop = useIsDesktop();

  const [open, setOpen] = useState(false);

  // Held here rather than in TopOffList: both survive the list being closed and
  // reopened (state 9), and the list unmounts on close. Persisted per deck
  // rather than held in state, because they survive a reload too — a player
  // part-way through choosing 31 cards used to lose the lot to a refresh, with
  // nothing on screen saying so. Both halves persist together: restoring the
  // ticks while re-offering every declined candidate would hand back a list
  // the player has to clear again.
  const { ticked, declined, restored, setTicked, setDeclined, discard } = useTopOffDraft(deckId);

  // The list has been opened before, so the door note stops promising a seed
  // that already happened. Cancelling does not discard the selection, so this
  // is true from the open rather than from a landed pass: reopening after a
  // cancel restores what the player left, which is the reopen note's promise
  // and not the first-open one's.
  //
  // A restored selection counts as a visit. The note promises what will arrive
  // ticked, and a reload no longer empties the selection — so printing the
  // first-open note to a player whose own 31 picks are about to come back
  // would be the one reading of this state that is now false.
  const [visitedThisMount, setVisitedThisMount] = useState(false);
  const visited = visitedThisMount || restored;

  // Ticks are seeded on the FIRST open only. Reopening restores the selection
  // the player left, which is the promise strip.doorNoteAgain makes — and a
  // restored selection is that same selection, so it is never seeded over.
  const seeded = useRef(false);

  // THE SAME STALENESS RULE THE LIST APPLIES to its own bulk control, because the seed is now
  // the same asynchronous act. The draft can move while the server thinks — a hand tick, a
  // decline, a quick-add closing a slot — and a seed that landed on top of it would overwrite
  // a choice the player had just made, which is the one thing a CONVENIENCE must never do.
  // A TOKEN PER OPEN. The draft generation below says whether the DECK moved; this says
  // whether the open that asked is still the open on screen. They are different questions and
  // one ref cannot answer both: closing the list moves neither `ticked` nor `declined`, so a
  // seed landing after a close would tick a shut list and announce into it.
  const openToken = useRef(0);

  const draftGen = useRef(0);
  useEffect(() => {
    draftGen.current += 1;
  }, [ticked, declined, openSlots, deckOracleIds]);
  // UNMOUNT SUPERSEDES AN IN-FLIGHT SEED, both ways, and the second bump is the
  // one that matters. The strip unmounts on its own when `openSlots` reaches 0,
  // so a seed asked moments earlier lands with nothing on screen — and bumping
  // only `draftGen` stops the TICKS while routing the continuation into the
  // draft-moved branch, which still announces. `onAnnounce` is the parent's,
  // and the live region it writes to outlives this component: the message
  // reaches a screen reader describing a list that is gone. Bumping the open
  // token returns before either.
  useEffect(() => () => {
    draftGen.current += 1;
    openToken.current += 1;
  }, []);

  const ownedIds = candidates.filter((c) => c.owned).map((c) => c.oracleId);

  // What the SEED may reach for, which is narrower than what the player may tick. The rule is
  // `canSeed`, shared with the list's bulk control.
  //
  // THEY SHARE BOTH NOW. `canSeed` decides what is ELIGIBLE, and `chooseBulkTicks` decides
  // which of those to choose — the seed below and the list's own bulk control call the same
  // function. Sharing only the first is how they drifted: #798 taught the control to ask the
  // real fill and left the seed taking the top N of this list by synergy, on the half a player
  // is actually shown.
  const seedableIds = candidates.filter(canSeed).map((c) => c.oracleId);

  const closeRef = useRef<HTMLButtonElement>(null);
  const exhaustedRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const moveFocus = useRef(false);

  /** What the list will actually show ticked, derived the way `TopOffList` derives it —
   *  pool order, minus what is declined or already in the deck, clipped to the slots left. */
  function liveTickCount(from: ReadonlySet<string>): number {
    return candidates
      .map((c) => c.oracleId)
      .filter((id) => from.has(id) && !declined.has(id) && !deckOracleIds.has(id))
      .slice(0, Math.max(openSlots, 0)).length;
  }

  // READ WHEN THE ANSWER LANDS, not when the request went out. The stale path announces the
  // open with whatever is ticked NOW, and the closure's copy is from the render that opened.
  const liveCount = useRef<() => number>(() => 0);
  useEffect(() => {
    liveCount.current = () => liveTickCount(ticked);
  });

  function announceOpen(tickCount: number) {
    // One message per settle, and opening at phone settles two facts at once — so they are
    // one message. Two calls would leave only the second in the live region, and the one
    // that would survive is the lesser of the two.
    const opened = topOffCopy.announce.opened(
      String(candidates.length),
      String(openSlots),
      String(tickCount),
    );
    onAnnounce(isDesktop ? opened : `${opened} ${topOffCopy.dock.retiredAnnounce}`);
  }

  function openList() {
    // A restored selection is one the player already made, so the seed would be writing over
    // their choices — including the choice to clear every one of them, which reads as an
    // empty selection and not as an absent one.
    const owed = !seeded.current && !restored;
    if (owed) seeded.current = true;

    openToken.current += 1;
    moveFocus.current = true;
    setOpen(true);
    setVisitedThisMount(true);
    onOpenChange?.(true);

    if (!owed) {
      // The selection survives a close, and the deck does not stand still while the list is
      // shut: slots can close under it and a card can join the deck from the quick-add dock.
      // A reopen therefore announces what the list will actually show.
      announceOpen(liveTickCount(ticked));
      return;
    }

    // THE SEED ASKS THE REAL FILL, through the same function the list's own bulk control
    // calls. It used to take the top N of this list by synergy — "what can I sleeve" where
    // the player asked "what does this deck need" — which is the failure #798 fixed on the
    // button while leaving it here, on the half a player is actually shown.
    //
    // It cannot be synchronous, so the list opens with nothing ticked and the ticks arrive.
    // The alternative was computing the plan on the deck page for every deck with an open
    // slot, which is a fill per page load to prepare for a press that may never come.
    const askedAt = draftGen.current;
    const openedAs = openToken.current;
    void chooseBulkTicks({
      deckId,
      slots: Math.max(openSlots, 0),
      allowed: () => new Set(seedableIds),
    }).then((result) => {
      // SUPERSEDED. The list was closed, or closed and opened again — and a reopen announces
      // for itself on the `!owed` path above. Answering here as well would put two messages in
      // the live region for one open, the first of them the zero this defers to avoid.
      if (openToken.current !== openedAs) return;

      // THE DRAFT MOVED while the answer was coming, so the ticks are not applied: they were
      // chosen for a deck that is no longer in front of anyone, and overwriting a hand tick is
      // the one thing a convenience must never do. The OPEN still happened, so it is still
      // announced — with what is ticked now, read through a ref rather than the closure.
      if (draftGen.current !== askedAt) {
        announceOpen(liveCount.current());
        return;
      }

      const ticks = result.ok ? result.ticks : new Set<string>();
      if (result.ok) setTicked(ticks);
      // A REFUSED SEED opens with nothing ticked and says nothing about the refusal: the
      // player did not ask for a pre-tick, so its failure is not theirs to read. It leaves the
      // seed OWED, because nothing happened — a reopen may try again. A stale one does not,
      // above, because the player has acted and re-seeding would write over them.
      if (!result.ok) seeded.current = false;
      announceOpen(liveTickCount(ticks));
    });
  }

  function closeList() {
    // Supersedes any seed still in flight: it was asked for an open that is over.
    openToken.current += 1;
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
    // Eased, and a jump under prefers-reduced-motion: `reveal` answers both.
    if (open) reveal(rootRef.current, "start");
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
  // the open slots, so it states the seeded figure rather than the owned one —
  // which now means the SEEDABLE count, not the owned one. The promise and the
  // seed read the same list or the note overstates by exactly the cards whose
  // every copy is sleeved elsewhere.
  //
  // The two reopen notes are about ownership rather than ticks, so they keep the
  // unclamped owned count: you do still own all of them.
  const seedCount = String(Math.min(seedableIds.length, Math.max(openSlots, 0)));
  // A seed of zero is now two opposite facts, and the sentence has to tell them
  // apart: the player owns none of the candidates, or they own them and every
  // copy is sleeved in another deck. `doorNote`'s zero branch says `You own none
  // of these`, which is false in the second case and false to the player best
  // placed to notice. The OWNED count picks between them, never the seed.
  const noneFree = seedCount === "0" && ownedIds.length > 0;
  const doorNote = !visited
    ? noneFree
      ? topOffCopy.strip.doorNoteNoneFree
      : topOffCopy.strip.doorNote(seedCount)
    : ownedIds.length === 0
      ? topOffCopy.strip.doorNoteAgain(String(candidates.length))
      : topOffCopy.strip.doorNoteAgainOwned(
          String(ownedIds.length),
          String(candidates.length),
        );

  // At 390px the desktop sentence runs three mono lines, so the phone forms drop
  // the provenance and keep the promise. Both reopen cases take the one string:
  // the closed caption directly above already states the candidate count.
  const doorNoteMobile = !visited
    ? noneFree
      ? topOffCopy.strip.doorNoteNoneFreeMobile
      : topOffCopy.strip.doorNoteMobile(seedCount)
    : topOffCopy.strip.doorNoteAgainMobile;

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
          declaredBracket={declaredBracket}
          noteCounts={noteCounts}
          onAnnounce={onAnnounce}
          onCommitted={discard}
          onInflight={(v) => onInflight?.(v)}
          onBarHeight={(h) => onBarHeight?.(h)}
          onClose={closeList}
        />
      ) : exhausted ? (
        <ExhaustedLine
          ref={exhaustedRef}
          total={String(bodySize - openSlots)}
          shortfall={String(openSlots)}
          allNegative={allNegative}
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
            <span className="md:hidden">{doorNoteMobile}</span>
            <span className="hidden md:inline">{doorNote}</span>
          </p>
        </div>
      )}
    </div>
  );
}
