"use client";

// LastSlotsStrip — the last N, now the to-do card's A8 row (handoff `deck_messages`). The row's
// one press is the door; it toggles to Close, and the list opens inside the card under the row.
// With the pool empty the same row is the ran-out plate, whose press switches to Consider.
//
// #361 deleted the two fill CTAs. The strip no longer adds cards; it opens a
// list (#360 scope 1). One door, and behind it the whole ranked pool with a
// tick per row and one commit.
//
// The strip owns the selection rather than the list, because ticks and declines
// survive the list being closed (state 9) while TopOffList unmounts on close.
// It also owns the row; everything from the selection head down belongs to TopOffList.

import { useEffect, useId, useRef, useState } from "react";
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
import { TodoRow } from "./todo-card";
import type { NoteCounts } from "../../lib/bracket/card-note";
import type { Bracket } from "../../lib/bracket/types";
import { useTopOffDraft } from "./use-top-off-draft";
import { reveal } from "../../lib/ui/reveal";
import { momentsCopy } from "../../lib/copy/moments";
import { useMomentAnchor } from "../moments/moments-provider";
import { useMergedRef } from "../ui/use-merged-ref";

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
   *  sentences: `synergyCopy.lastSlots.exhaustedBody` describes only the first, and it
   *  is false for the second. */
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

  /** The to-do card's next step: the label, the tint and the only filled press. */
  next: boolean;
  /** The ran-out row's press: switch the shell to Consider, which has cards to buy. */
  onConsider: () => void;

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

// ── LastSlotsStrip ─────────────────────────────────────────────────────────

export function LastSlotsStrip(props: LastSlotsStripProps) {
  // States 10 and 14: the row is absent at a full deck (`deckTodo` drops it at the same figure). Arithmetic, not a
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
  next,
  onConsider,
  onAnnounce,
  onInflight,
  onOpenChange,
  onBarHeight,
}: LastSlotsStripProps) {
  const listId = useId();
  // The row's one press, in all three faces: the door, Close, and ran out's Consider.
  const pressRef = useRef<HTMLButtonElement>(null);
  // M1 (discovery R1): the door is the moment's control while it is drawn, which is a deck under its size with
  // cards left to offer. Attached only while the press IS the door (closed, pool not empty), so the ref does
  // the gating: the press swaps to the bare ref in its other two faces and the anchor unregisters.
  const doorMoment = useMomentAnchor("top-off", { eligible: openSlots > 0, copy: momentsCopy.topOff(openSlots) });
  const doorRefs = useMergedRef(pressRef, doorMoment.ref);
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

  // Ticks are seeded on the FIRST open only. Reopening restores the selection
  // the player left, declines and all — and a
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

  // The door, `Close the list` and ran out's `Consider` are three faces of ONE press, relabelled
  // in place, so the control under the cursor never unmounts and nothing drops focus to the body.
  // Focus is still placed on it after each toggle: a click does not focus a button in every
  // browser, and the reader must land on the face that is now drawn, never in the rows, which
  // §1e rules out. When a pass took the last candidates the same press is Consider.
  useEffect(() => {
    if (!moveFocus.current) return;
    moveFocus.current = false;
    const target = pressRef.current;
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

  // State 13: nothing left to offer, and the row says why and points to Consider instead.
  // The open list outranks it: a quick-add can take the last candidates while the list is up, and
  // tearing the pass down mid-selection is the whole of what state 17's frozen pool forbids.
  const exhausted = candidates.length === 0 && !open;

  // The body states the seeded figure rather than the owned one, which means the SEEDABLE count:
  // the promise and the seed read the same list, or the body overstates by exactly the cards whose
  // every copy is sleeved elsewhere. A seed of zero is two opposite facts, and the OWNED count
  // picks between them, never the seed: `You own none of them` is false to a player who owns them
  // all with every copy in another deck.
  const seedCount = String(Math.min(seedableIds.length, Math.max(openSlots, 0)));
  const cand = String(candidates.length);
  const body = seedCount !== "0"
    ? topOffCopy.strip.rowBody(cand, seedCount)
    : ownedIds.length > 0
      ? topOffCopy.strip.rowBodyNoneFree(cand)
      : topOffCopy.strip.rowBodyNoneOwned(cand);
  const n = String(openSlots);

  return (
    <div ref={rootRef}>
      {exhausted ? (
        <TodoRow
          tone="action"
          mark={n}
          title={allNegative ? synergyCopy.lastSlots.exhaustedTitleAllNegative(n) : synergyCopy.lastSlots.exhaustedTitle(n)}
          // Two ways to empty the pool, and only one of them is the collection running out:
          // `exhaustedBody` says there was nothing left that EDHREC ranks, which is false when the
          // rows were cut because EDHREC ranked them BELOW their own baseline.
          body={allNegative ? topOffCopy.strip.exhaustedAllNegative : synergyCopy.lastSlots.exhaustedBody}
          next={next}
          pressRef={pressRef}
          press={{
            label: topOffCopy.strip.exhaustedPress,
            name: topOffCopy.strip.exhaustedPressAria,
            onPress: onConsider,
          }}
        />
      ) : (
        <TodoRow
          tone="action"
          mark={n}
          title={topOffCopy.strip.open(n)}
          body={body}
          next={next}
          pressRef={open ? pressRef : doorRefs}
          press={
            open
              ? {
                  label: topOffCopy.strip.closeShort,
                  name: topOffCopy.strip.close,
                  onPress: closeList,
                  expanded: true,
                  controls: listId,
                }
              : {
                  label: topOffCopy.strip.openShort,
                  name: topOffCopy.strip.openAria(n),
                  onPress: openList,
                  expanded: false,
                  controls: listId,
                  describedBy: doorMoment["aria-describedby"],
                }
          }
        />
      )}
      {open && (
        <div className="px-[12px] pb-[10px] md:px-[16px] md:pb-[14px]">
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
        </div>
      )}
    </div>
  );
}
