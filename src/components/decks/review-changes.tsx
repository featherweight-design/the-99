"use client";

// §Surfaces 2 — the review page. Two columns: what is coming in, what is going
// out. Nothing here decides whether a card goes in — the list on the deck page
// is already this list, and this page exists to say what committing it will
// cost. The one write is the pull hanging off an `in` row, which decides where
// a copy comes from rather than whether the card arrives.
//
// The rows are `update-diff-row`'s, verbatim. OVERLAPS.md call 2 forbids a second
// diff row in this feature, and the reuse is not a saving of lines: the row
// already resolves the buy tag against the availability rollup, already reads a
// `free === 0` on a removal as this deck's own claim rather than somebody else's,
// and already opens the card modal from the name. A fork would have had to be
// taught all three, and would have got one of them wrong.

import type { RecommendedMix } from "../../lib/decks/mix";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useOptimistic, useRef, useState, useTransition } from "react";
import { deckVersioningCopy } from "../../lib/copy/deck-versioning";
import {
  heldElsewhere, printsPair, pullCandidate, releasedCopies, type DraftState,
} from "../../lib/decks/draft-shape";
// Types only: `draft-state.ts` reaches `src/db`, which throws at module init in
// a browser. See `src/lib/client-bundle-safety.test.ts`.
import type { DraftRow, DraftRows, ShapeCard } from "../../lib/decks/draft-state";
import { groupByCardType } from "../../lib/decks/grouping";
import { CardDetailProvider, type Sibling } from "../cards/card-detail-provider";
import { PrimaryButton } from "../ui/button";
import { CommanderSection, ZoneHint } from "./change-commander-review";
import { commanderZoneHint } from "./change-commander-banner";
import { changeCommanderCopy } from "../../lib/copy/change-commander";
import { ChangedStrip } from "./changed-strip";
import { CommitSheet } from "./commit-sheet";
import { DiscardConfirm, DiscardTrigger, useDiscardConfirm } from "./discard-draft";
import { DISCARD_RECEIPT_HASH, draftAnnouncer } from "./draft-announcer";
import { DecklistGroupHeader } from "./decklist-group-header";
import { HoverPreviewProvider } from "./hover-preview";
import { PullControl } from "./pull-control";
import type { ContestedCard } from "../../lib/collection/summary-read";
import { PutBackControl } from "./put-back-control";
import { MutationError } from "./mutation-error";
import { lockedCardsCopy } from "../../lib/copy/locked-cards";
import { addCardToDeck } from "../../app/decks/actions";
import { DiffRowIn, DiffRowOut } from "./update-diff-row";
import { proxyCopy } from "../../lib/copy/proxies";
import { mirrorUrl } from "../../lib/url/mirror";

/** Every write to this draft, as one state. See the latch in `ReviewChanges`. */
type WriteState = "idle" | "writing" | "unknown";

const copy = deckVersioningCopy.review;
const restoreCopy = deckVersioningCopy.restore;

type ReviewChangesProps = {
  /** Passed straight through to the strip below. The route resolves it once; this component
   *  only carries it, which is why it is not computed here. */
  mix: RecommendedMix;
  /** The deck being reviewed — the one a pull moves a copy INTO, which is why
   *  every `PullControl` below is given it rather than the holder's id alone. */
  deckId: string;
  /** The deck's own name, for the one way out of this page that is not a commit
   *  or a discard. A bare "Back" would make the reader remember which deck they
   *  were editing to know where the link goes. */
  deckName: string;
  /** True when the reader arrived from a deck-page CTA that means "commit this",
   *  so the sheet at the foot is open on landing rather than behind a second
   *  click on a page they asked to be taken to. */
  commitOpen?: boolean;
  rows: DraftRows["rows"];
  state: DraftState;
  /**
   * The cards on this page more committed decks want than the collection holds. Drives the
   * `chipShort` summary figure; the per-row chooser that used to hang under each one was
   * removed (Hugh, 2026-10-04 — no Design round, a removal), with a replacement going to
   * Design separately. Loaded unexcluded, for reasons the route (`page.tsx`) states — including
   * that the chip must keep counting this deck's own shortfall.
   */
  contested: ContestedCard[];
  /** The two whole lists the shape strip folds — the newest version's, and the
   *  draft's. Read by the route rather than derived here: the changed rows cannot
   *  say what a role or a card type held, and `before` is a query of its own.
   *  Null `before` is a brew, where nothing states a movement. */
  before: ShapeCard[] | null;
  after: ShapeCard[];
  /** The server's count of the cards the commit would freeze, passed straight
   *  through to the sheet — see `commit-sheet.tsx`. */
  cardCount: number;
};

/**
 * The word behind the row's colour. The marker and the buy tag say this in hue
 * and in glyph, and a reader who gets neither would otherwise be told only the
 * card's name — so it rides along in `aria-describedby`.
 *
 * Null at `free` and at a null bucket, and that is not an omission: the
 * availability marker renders nothing at `free` on every surface in the app, and
 * a null bucket is an availability read that FAILED. Neither has a colour for a
 * word to be the alternative to, and "free" on a row drawn as nothing would be
 * the description of an element that is not there.
 */
/** The id a group heading takes focus by, scoped to its column: both columns can
 *  hold an `Artifacts` group, and two elements with one id is a focus target
 *  that lands on whichever came first. */
function groupHeadingId(prefix: string, column: "in" | "out", group: string): string {
  return `${prefix}-${column}-${group.replace(/\W+/g, "-").toLowerCase()}`;
}

function bucketWord(bucket: DraftRow["bucket"]): string | null {
  if (bucket === "unowned") return copy.chipBuy;
  if (bucket === "claimed") return copy.chipPullable;
  // `proxied` is deliberately absent here. This function feeds the row's
  // SR-ONLY description, and a printed add gets a full sentence rather than a
  // word — see the `word` composition below, which names the card and says why
  // the row costs nothing. Returning the bare chip too would only make the
  // sentence unreachable.
  return null;
}

/** Stable, so `useOptimistic`'s base identity never changes between renders. */
const EMPTY_RESTORED: string[] = [];

/** The `Coming in` column's error map, which is always empty. */
const EMPTY_ERRORS: Record<string, string> = {};


/**
 * Whether a removal is one this page can offer to put back.
 *
 * A put-back is `addCardToDeck` unwrapped — ONE copy — while the optimistic
 * model beside it retires the whole row and credits `from - to` copies to the
 * deck. Those two agree on a removal of a single copy and on nothing else, so a
 * five-Swamp cut would add one Swamp, hide the row, and tell the reader the deck
 * grew by five.
 *
 * Basics are the only rows that ever carried a count above one, so until they
 * were drawn this could not be reached. A `5 → 4` basic is still a single copy
 * and still offers the control; a `5 → 0` does not, and the deck page is where
 * that edit is undone.
 */
function restorable(row: DraftRow): boolean {
  return row.from - row.to === 1;
}

type TypeGroup = readonly [string, DraftRow[]];

/**
 * A column's rows in the order it draws them, across group boundaries.
 *
 * `decklist.tsx` flattens its groups the same way and for the same reason: the
 * modal's Prev/Next walks the list the eye does, and the payload's own order is
 * not that list once the rows are grouped by type.
 */
function orderedIds(rows: DraftRow[]): Sibling[] {
  return (groupByCardType(rows) as TypeGroup[])
    .flatMap(([, groupRows]) => groupRows.map((r) => ({ oracleId: r.oracleId, name: r.name, imageUri: r.imageUri })));
}

/**
 * One column of the review page — its heading, its breakdown note, and its
 * diff rows with whatever control each row earns.
 *
 * EXPORTED for `/about`, which draws `Coming in` as the `review-and-commit`
 * entry's specimen: it is the slice carrying the four-bucket breakdown,
 * `Pull it` and both pull guards, none of which any other route has. The
 * review page is its only other caller and passes every prop.
 */
export function Column({
  deckId,
  heading,
  headingTone,
  note,
  rows,
  siblings,
  descriptionId,
  hiddenOnPhone,
  phoneHeading,
  onPulled,
  onRestore,
  restoreErrors,
  columnKey,
  newestAsOf,
  claimsKnown,
  zoneHint,
}: {
  deckId: string;
  heading: string;
  /** `--success` coming in, `--warning` going out. The direction is the one fact
   *  the header carries that the rows below it do not. */
  headingTone: string;
  note: string;
  rows: DraftRow[];
  siblings: readonly Sibling[];
  /** Prefix for the per-row `sr-only` ids. Owned by the parent so both columns
   *  draw from one `useId` rather than two. */
  descriptionId: string;
  hiddenOnPhone: boolean;
  /** True when this is the only column on the page, so the phone has no segmented
   *  pair naming the direction and the heading has to. */
  phoneHeading: boolean;
  onPulled: () => void;
  /** Null in the `Coming in` column, which has nothing to put back. The list
   *  owns the write because the row is what leaves. */
  onRestore: ((card: { oracleId: string; name: string }) => void) | null;
  /** What to say on each row whose restore came back refused or threw, keyed by
   *  oracle id. Empty in the `Coming in` column, which has no restore. */
  restoreErrors: Record<string, string>;
  /** Which column this is, so its group headings get ids of their own. Both
   *  columns can hold an `Artifacts` group, and two elements with one id is a
   *  focus target that lands on whichever came first. */
  columnKey: "in" | "out";
  /** Change commander: a traded card's command-zone hint, or null. Absent, no row carries one. */
  zoneHint?: (oracleId: string, added: boolean) => string | null;
  /** The newest `as_of` in the price table, so a row can tell a live price from
   *  a sold-out printing's last one. */
  newestAsOf: Date | null;
  /** False when the claim read FAILED. Every other figure on the page stands
   *  down there — `unfreeAdds` returns nothing over null buckets, so the chips,
   *  the breakdown and the banner all quote no purchase — and a row that still
   *  printed its figure would be the one thing on the page pricing a commit
   *  nobody could cost. */
  claimsKnown: boolean;
}) {
  const renderGroup = ([group, groupRows]: TypeGroup) => (
    <div key={group} className="mb-[16px] last:mb-0">
      {/* The heading itself, not a wrapper around it: a reader landing on a
          bare div after a restore is told nothing about where they are, and the
          whole point of the target is that it names the group the row left.
          tabIndex −1 so it can receive focus without joining the tab order — it
          is a landing place after a write, not a stop on the way through. */}
      <DecklistGroupHeader
        label={group}
        count={groupRows.length}
        headingId={groupHeadingId(descriptionId, columnKey, group)}
        focusable
      />
      <div className="flex flex-col gap-[4px]">
        {groupRows.map((row) => {
          // The claim the row's control is drawn against, guards and all —
          // one selector, shared with the banner's own pull hints, so the
          // two surfaces can never disagree about which deck holds a copy.
          // `claimed` only, because that is the bucket the pull answers:
          // `bucketAdds` calls an add free as soon as the collection has a
          // spare copy for it, claims or none, and an offer to raid somebody
          // else's deck for a copy already sitting in the box is an act
          // `pullableCount` has never counted.
          const pullClaim =
            row.direction === "in" && row.bucket === "claimed"
              ? pullCandidate(row.availability ?? undefined)
              : null;
          // Wherever the control is refusing to offer a pull, the word behind
          // the colour is the guard it drew instead: a commander's copy is
          // claimed and no route releases it, and a locked copy stays where the
          // player put it. "can be pulled" on either would name an act this page
          // will not perform.
          //
          // Both guards draw a tag and no control, so the row is the only place
          // either sentence can live.
          const word = pullClaim?.commander
            ? copy.commanderGuardA11y(pullClaim.name, row.name)
            : pullClaim?.locked
              ? lockedCardsCopy.pull.a11y(pullClaim.name, row.name)
              // A full sentence for a printed add, shaped like the two guards
              // above it: it names the card and offers no action, because there
              // is none to offer. The chip alone says `proxied`, which on its own
              // does not say why the row costs nothing.
              : row.bucket === "proxied"
                ? proxyCopy.review.a11y(row.name)
                : bucketWord(row.bucket);
          const wordId = `${descriptionId}-${row.oracleId}`;
          const card = {
            oracleId: row.oracleId,
            name: row.name,
            typeLine: row.typeLine,
            auto: row.auto,
            owned: row.owned,
            // Carried so `AvailabilitySlot` can test it BEFORE `owned` — the
            // shipped slot drew a buy tag on any unowned add, and a printed card
            // is unowned by design.
            proxied: row.proxied,
            availability: row.availability ?? null,
            manaCost: row.manaCost ?? null,
            // Dropped outright when the claim read failed: the buy tag still says
            // `buy` on an unowned row, and it says it without a figure, which is
            // the same degrade the pending banner makes.
            price: claimsKnown ? row.price ?? null : null,
            newestAsOf,
            // An owned card whose free copies are all sleeved somewhere else.
            // Not `bucket === "claimed"`: that bucket now means "a pull would
            // relieve this", and a card held only by a deck junior to this one
            // buckets `unowned` while its copy is still in somebody's box.
            committed: heldElsewhere(row.availability, row.shortfall),
            // The buy tag's own question, and not one `owned` can answer: a
            // partially covered add with no claimant is filed `unowned` while
            // being a card the player owns a copy of. Zeroed with the price when
            // the claim read failed, where every shortfall is 0 by absence.
            shortfall: claimsKnown ? row.shortfall : 0,
            imageUri: row.imageUri,
          };
          // The row prints the pair itself, inside the name: a caption under the
          // row named the card a second time, and the card is already the row
          // the caption was hanging off.
          const recount = printsPair(row)
            ? { from: String(row.from), to: String(row.to) }
            : undefined;
          return (
            <div key={row.oracleId}>
              {word && (
                <span id={wordId} className="sr-only">
                  {word}
                </span>
              )}
              {row.direction === "in" ? (
                <DiffRowIn
                  card={card}
                  review
                  sourceLine={null}
                  // The deck the pull would raid, named on the row rather than
                  // only inside the control's accessible name.
                  heldBy={pullClaim?.name ?? null}
                  siblings={siblings}
                  describedBy={word ? wordId : undefined}
                  recount={recount}
                  // The adds column only. A removal has no pull to offer:
                  // the copy is leaving this deck, not being sought for it.
                  // Null for a row with no sleeved holder at all — an
                  // unowned card has nothing to pull from and a free one
                  // needs nothing pulled.
                  action={
                    // A trade's old commander, arriving from the command zone, says so in
                    // the slot a pull would use (handoff §4).
                    zoneHint?.(row.oracleId, true)
                      ? <ZoneHint side="in" text={zoneHint(row.oracleId, true)!} />
                      : pullClaim
                      ? (
                          <PullControl
                            deckId={deckId}
                            card={{ oracleId: row.oracleId, name: row.name }}
                            claim={pullClaim}
                            onPulled={onPulled}
                          />
                        )
                      : null
                  }
                />
              ) : (
                <DiffRowOut
                  card={card}
                  review
                  siblings={siblings}
                  describedBy={word ? wordId : undefined}
                  recount={recount}
                  // The slot `DiffRowOut` already reserves, and draws nothing in
                  // when it is null. A column, because a refusal is written
                  // underneath the control rather than beside it — the same
                  // shape `PullControl` uses on the other side of the page.
                  action={
                    // A trade's new commander left for the command zone: no Put back, which
                    // would re-add the card now leading the deck, and the zone named instead.
                    zoneHint?.(row.oracleId, false)
                      ? <ZoneHint side="out" text={zoneHint(row.oracleId, false)!} />
                      : onRestore && restorable(row)
                      ? (
                          <div className="inline-flex flex-col items-end flex-none">
                            <PutBackControl
                              card={{ oracleId: row.oracleId, name: row.name }}
                              onRestore={onRestore}
                            />
                            {restoreErrors[row.oracleId] && (
                              <MutationError message={restoreErrors[row.oracleId]} />
                            )}
                          </div>
                        )
                      : null
                  }
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    // From `md` the section is a subgrid spanning the parent's two rows, so the two
    // columns' headers share one row height. A note that wraps (`Going out` at double
    // digits) grows that row for both, and each column's first card stays level with
    // the other's instead of the longer note pushing its own column down.
    <section
      className={`flex-1 min-w-0 flex-col ${hiddenOnPhone ? "hidden" : "flex"} md:grid md:row-span-2 md:grid-rows-subgrid`}
    >
      {/* Hidden on the phone only while the segmented pair is above the column:
          that pair IS the direction, and a heading repeating it would be the same
          word twice. A lone column has no pair — the other direction is empty —
          so without this the phone would draw an unlabelled list of cards and
          never say which way they are going. */}
      <div
        className={`${
          phoneHeading ? "flex" : "hidden"
        } md:flex items-baseline justify-between gap-[10px] pb-[10px] mb-[14px] [border-bottom:1px_solid_var(--elevated)]`}
      >
        {/* flex-none: a flex item shrinks by default, so a long note crushed the
            heading into three stacked lines. */}
        <h2
          className="flex-none font-mono text-[11px] uppercase tracking-[0.16em] m-0"
          style={{ color: headingTone }}
        >
          {heading}
        </h2>
        <span className="font-mono text-[10px] text-right text-[color:var(--fg-locked)]">
          {note}
        </span>
      </div>
      {/* One group per line, at the column's full width. Two short groups used
          to share a line as sub-columns of about 276px, which saved a heading's
          height and cost every row on those lines the width its own contents
          need: a name, a cost track and a `Put back` do not fit across 276px, so
          the control wrapped under the name and the two halves of the column
          disagreed about what a row looks like. Hugh's ruling of 2026-09-14.

          The gap between groups is now `mb-[16px]` at EVERY boundary and every
          width. It already was, except between the two halves of a pair: each
          paired group was the only child of its own wrapper, so `last:mb-0`
          zeroed its margin and the wrapper's `gap-[22px]` stood in. That 22px
          was the flex gap a desktop row needed, inherited by the phone rather
          than chosen for it — a column whose group rhythm was 16px almost
          everywhere and 22px at the boundaries that happened to have been
          folded. One value, and it is the one the column already mostly had. */}
      <div>{(groupByCardType(rows) as TypeGroup[]).map(renderGroup)}</div>
    </section>
  );
}

/** One count chip, the facet strip's construct: a figure in the bucket's own hue
 *  beside a mono label. A chip whose count is nought is never built — the caller
 *  filters it out rather than drawing a nought. */
function CountChip({
  figure,
  tone,
  label,
  total,
}: {
  figure: number;
  tone: string;
  label: string;
  /** The to-buy chip alone carries the purchase beside its count. */
  total?: string | null;
}) {
  return (
    <span className="flex items-center gap-[8px] rounded-full px-[14px] py-[6px] bg-[color:var(--surface)] border border-solid border-[color:var(--border-strong)]">
      <span className="font-mono text-[13px]" style={{ color: tone }}>
        {figure}
      </span>
      <span className="font-mono text-[11px] text-[color:var(--fg-body)]">{label}</span>
      {total !== null && total !== undefined && (
        <span className="font-mono text-[11px] text-[color:var(--warning)]">{total}</span>
      )}
    </span>
  );
}

export function ReviewChanges({
  mix,
  deckId,
  deckName,
  rows,
  state,
  contested,
  before,
  after,
  cardCount,
  commitOpen,
}: ReviewChangesProps) {
  const descriptionId = useId();
  const router = useRouter();
  // Seeded from the URL and owned here afterwards. Cancelling UNMOUNTS the sheet
  // rather than hiding it, which is what leaves the note empty if it is opened
  // again — a half-typed reason for a version nobody committed is not a draft.
  const [commitSheetOpen, setCommitSheetOpen] = useState(commitOpen === true);
  // Cancelling takes `?commit=1` off the URL as well as closing the sheet. The
  // query is an instruction to open, and left behind it re-fires on a reload or
  // a back-forward return — the reader would be handed back the sheet they just
  // dismissed. `history.replaceState` rather than the router, per the repo's URL
  // mirror rule: the point is to avoid a navigation, not to make one.
  const closeCommitSheet = useCallback(() => {
    setCommitSheetOpen(false);
    const url = new URL(window.location.href);
    if (!url.searchParams.has("commit")) return;
    url.searchParams.delete("commit");
    mirrorUrl(url);
  }, []);
  // Phone only, and it decides which column is on screen rather than which one
  // is drawn twice: both columns are in the markup once, and the inactive one is
  // hidden below `md` and shown above it. A second mounting for the narrow
  // width would put every card name, every buy tag and every card-modal trigger
  // in the DOM twice.
  const [shown, setShown] = useState<"in" | "out">("in");

  // The first optimistic write on this surface. `PullControl` beside it is
  // deliberately NOT optimistic, and the difference is the whole reason: a
  // pull's row STAYS — it changes the row's availability — while a restore's
  // row LEAVES, because the list is derived from `draftDiff.removes` and the
  // card is no longer in it. A row that leaves has nothing to hold a spinner.
  //
  // Oracle ids rather than rows: the rows come back from the server on the next
  // render and this list only has to say which of them to hide meanwhile. React
  // discards it when the transition settles, which is also the revert.
  const [restoredIds, addRestoredId] = useOptimistic<string[], string>(
    EMPTY_RESTORED,
    (current, oracleId) => [...current, oracleId],
  );
  // Keyed per row, not one slot: a row that failed keeps its own message while
  // the reader moves on to another, and the map outlives the write that wrote it.
  const [restoreErrors, setRestoreErrors] = useState<Record<string, string>>({});
  // The transition is the optimistic list's, and nothing else: which doors are
  // shut is the latch's business below, because `restoring` cannot describe a
  // write this component does not own or an outcome it never learned.
  const [, startRestore] = useTransition();
  // ONE latch for every write to this draft, whoever owns it. Three states:
  //
  //  `idle`     nothing in the air.
  //  `writing`  a write is going — a restore here, or the commit sheet or the
  //             discard question, which report their own through `onWriteState`.
  //             Both of those can be open BEFORE a restore starts and neither is
  //             unmounted while it runs, so a guard on this page's transition
  //             alone only ever shut the door one way.
  //  `unknown`  a write threw. A throw can be a write that LANDED and lost its
  //             reply, so nothing this client already holds can settle it —
  //             only rows the server built after the fact. In particular the
  //             reader dismissing the message is not an answer, which is why a
  //             child unmounting reports `settled` and this state ignores it.
  //
  // All three writes serialize on the deck lock, so one latch is the honest
  // model: the second write cannot proceed until the first is answered, and
  // every apparatus for describing two at once — settled ids, sibling counts, a
  // reconciliation against refreshed rows — is a client narrating a race it
  // cannot see the end of. One restore at a time is a scope decision, and it is
  // what lets the receipt below be counted rather than predicted.
  //
  // A ref as well as state: the ref has to be true for the next click in the
  // same tick, before any render, and the state is what disables the other two
  // doors during one. `PutBackControl` itself stays live — R3 rules a disabled
  // state out — and a press while the latch is shut is ignored, exactly as a
  // second press on the same row already was.
  const writeRef = useRef<WriteState>("idle");
  const [writeState, setWriteState] = useState<WriteState>("idle");
  const setWrite = useCallback((next: WriteState) => {
    writeRef.current = next;
    setWriteState(next);
  }, []);
  // What the commit sheet and the discard question report. `settled` is a claim
  // about THEIR write, not about the page: an unknown outcome outlives the
  // component that failed to learn it, so only fresh rows clear that.
  //
  // That rule is also why neither child hands anything back on unmount. Both keep
  // their own way out disabled while their write is pending, so a reader cannot
  // dismiss one mid-write; the only state they can be dismissed in is over an
  // unresolved message, where `unknown` has already been reported — and the rule
  // below then ignores the `settled` an unmount cleanup would send. A cleanup
  // that cleared the guard outright is exactly the defect: it made dismissing a
  // message the same act as learning the answer.
  const reportWrite = useCallback(
    (next: "writing" | "settled" | "unknown") => {
      if (next === "settled") {
        // The asymmetry is the whole rule, and it is deliberately kept even though
        // no child can reach it today: a `settled` only ever follows that child's
        // own refusal, and a refusal cannot follow the throw that made the page
        // uncertain. Written as a rule about the PAGE rather than a fact about
        // today's children, because the version that read it as a fact — clearing
        // the guard on whatever a child last said — is the defect this fixes.
        if (writeRef.current !== "unknown") setWrite("idle");
        return;
      }
      setWrite(next);
    },
    [setWrite],
  );
  const writeBusy = writeState !== "idle";
  // The same hook the banner's control uses, so the question asked from either
  // door is one construct with one set of answers.
  const discard = useDiscardConfirm(state);

  // The version's own size, for the consequence sentence — and `before` IS that
  // version's card list, which is why this page takes no prop for the figure the
  // deck page passes down. Copies rather than rows: it is the figure the decklist
  // prints, and what the reader is being told they land on.
  const versionCards = (before ?? []).reduce((n, card) => n + card.quantity, 0);

  const inCount = rows.in.length;
  // Every figure below reads the OPTIMISTIC list, not `rows.out`. Reading the
  // server list for any one of them leaves that figure a round trip behind the
  // row that just left — and on the phone it leaves a stale `Going out · 1` tab
  // selected over a hidden `Coming in` list.
  const outRows = rows.out.filter((row) => !restoredIds.includes(row.oracleId));
  const outCount = outRows.length;
  // Copies the restores took back out of the pool. Every row here is a whole
  // removal — basics never reach this list and no other card can hold a second
  // copy — so `from - to` is `from`, but it is written as the subtraction
  // `releasedCopies` does, so the two cannot drift.
  const restoredCopies = rows.out
    .filter((row) => restoredIds.includes(row.oracleId))
    .reduce((sum, row) => sum + (row.from - row.to), 0);
  // One list across both columns, so the card modal's Prev/Next pages the whole
  // change set in the order the page draws it rather than stopping at a column.
  // Grouped order, not the payload's: the columns group by type, and Prev/Next
  // stepping to a row three groups down is a list the reader cannot follow.
  // `outRows`, not `rows.out`: a row that has optimistically left the column is
  // not somewhere Prev/Next should be able to page back to.
  const siblings = [...orderedIds(rows.in), ...orderedIds(outRows)];

  // Counted off the state's own buckets rather than off `rows.in`, because the
  // state is what every other surface's figure is counted off: the banner, this
  // breakdown and the commit sheet's buy block are one purchase with three
  // appearances (addendum R3), and a column that re-tallied its own rows would
  // be the fourth.
  const free = state.adds.filter((a) => a.bucket === "free").length;
  const sleeved = state.adds.filter((a) => a.bucket === "claimed").length;
  const buy = state.adds.filter((a) => a.bucket === "unowned").length;
  // The fourth term. Without it the three above stop summing to the group's own
  // count the moment a printed card is added — ruling 9.
  const proxied = state.adds.filter((a) => a.bucket === "proxied").length;

  // A versionless deck: the page is the v1 commit surface, so the heading, the
  // lede and the bar's CTA all name that act instead of a diff. The route admits
  // one only when it can actually cut v1 — see its own guard.
  const firstCommit = state.version === null;

  // The draft's own size, which a restore grows: the card is back in the deck.
  const liveCardCount = cardCount + restoredCopies;

  // The strip's `after` is the draft's shape, so a restored card belongs in it:
  // its role, its type and its mana value are all back in the deck and every
  // cell the strip draws counts them. Without this the row leaves the column
  // while the curve beside it still describes a deck the card is out of.
  const liveAfter =
    restoredCopies === 0
      ? after
      : [
          ...after,
          ...rows.out
            .filter((row) => restoredIds.includes(row.oracleId))
            .map((row) => ({
              role: row.role,
              quantity: row.from - row.to,
              typeLine: row.typeLine,
              cmc: row.cmc,
            })),
        ];

  // Copies going back in the pool, never rows: one remove of `3 → 1` releases
  // two, and this figure is printed beside `buyCount`, which counts copies.
  // Clamped, because the two terms come from different reads: `state.removes`
  // is the server's and the rows are this render's. In production they agree —
  // the rows ARE that diff — so the clamp only ever catches a test fixture or a
  // payload that disagrees with itself, and a negative "back in the pool" is
  // the one thing the figure must never say.
  const released = Math.max(0, releasedCopies(state) - restoredCopies);

  // The write. `addCardToDeck` unwrapped, exactly as the handoff says: every row
  // here is a whole removal of a single copy, so there is no quantity to carry
  // and no bespoke action to write. It already ends in `revalidateClaims`, which
  // is the helper a claim write owes every other deck's availability.
  // The refresh a lost reply asked for, landing. New rows are the only thing that
  // can settle an unknown outcome: they were built by the server after whatever
  // did or did not happen, and until they arrive this client's own figures may
  // describe a draft that no longer exists.
  useEffect(() => {
    if (writeRef.current === "unknown") setWrite("idle");
  }, [rows, setWrite]);

  const restore = useCallback(
    (card: { oracleId: string; name: string }) => {
      // One write at a time, whoever owns it — see the latch. The control stays
      // live and the press is ignored.
      if (writeRef.current !== "idle") return;
      setWrite("writing");
      setRestoreErrors((current) => {
        if (!(card.oracleId in current)) return current;
        const next = { ...current };
        delete next[card.oracleId];
        return next;
      });
      const restoredRow = rows.out.find((row) => row.oracleId === card.oracleId);
      const groupOfRow = restoredRow?.cardTypeGroup;
      startRestore(async () => {
        addRestoredId(card.oracleId);
        let result: Awaited<ReturnType<typeof addCardToDeck>>;
        try {
          // `relock` (L1): a card that left locked comes back locked. The server wakes the dormant
          // lock only if there is one, so a card that was never locked returns as it left.
          result = await addCardToDeck(deckId, card.oracleId, { relock: true });
        } catch {
          // The latch is NOT opened. A throw can be an add that landed and lost
          // its reply, so the next write would be computing its receipt — and
          // the commit sheet its figures — off a list that is already wrong. The
          // effect above opens it when the refresh this asks for delivers rows.
          setWrite("unknown");
          // A throw is a transport or database failure, not a refusal: nothing
          // was decided and trying again is the whole remedy. React drops the
          // optimistic id when this transition settles, so the row returns and
          // this message lands on it.
          setRestoreErrors((current) => ({ ...current, [card.oracleId]: restoreCopy.failed }));
          // The outcome is UNKNOWN, not failed: a lost response after the
          // transaction committed looks identical here, and without this the
          // row would sit saying "still going out" over a card already back in
          // `deck_cards` until something else navigated. Re-reading the route
          // is what the commit and discard paths do with the same ambiguity.
          router.refresh();
          return;
        }
        if (!result.ok) {
          // A refusal IS settled: the server declined before it wrote.
          setWrite("idle");
          // `addCardToDeck` can still refuse on its own vocabulary — an
          // off-identity card, say, if the catalogue moved under a committed
          // list. Passed through rather than re-worded: it is a sentence about
          // the card, not about this surface.
          setRestoreErrors((current) => ({ ...current, [card.oracleId]: result.message }));
          return;
        }
        // The write LANDED, so the latch opens — and the two figures are exact,
        // which they were not before. Both are still this render's snapshot: the
        // closure captured them at the click and moving the expressions below the
        // `await` does not re-read a prop. What changed is that the snapshot can
        // no longer be WRONG. A receipt used to guess what every other write in
        // the air would leave behind, and the guess failed for whichever of them
        // settled second: it had been told one more row was going out than was
        // still true, and said so out loud. The latch means no other write to this
        // draft can have moved the column since the press, so the snapshot is the
        // answer. (A revalidation from some other surface still could, and this
        // deliberately does not model that — a receipt is a sentence about one
        // act, not a live figure.)
        //
        // Copies, not rows, and written as the subtraction `releasedCopies` does
        // rather than as `from`: every row offered a control is a cut of exactly
        // one copy — `restorable` is `from - to === 1` — so a `5 → 4` basic has a
        // `from` of five and releases one, and the two figures must not be
        // confused.
        setWrite("idle");
        const outAfter = outCount - 1;
        const cardsAfter = liveCardCount + ((restoredRow?.from ?? 1) - (restoredRow?.to ?? 0));
        // Announced into the region that outlives this row, because the row is
        // removed by its own success. Which sentence depends on what is left.
        //
        // Every card the draft moved is a row, basics among them, so an empty
        // pair of columns IS a deck back at its version — one question, and the
        // route's own `admitsReview` asks it the same way. The pair used to be
        // two questions and two flags, because a moved basic could empty both
        // columns while the draft still differed.
        // A moved commander is a change the columns do not list, so the route stays.
        const redirecting = outAfter === 0 && inCount === 0 && !state.commander;
        draftAnnouncer().textContent =
          redirecting
            ? restoreCopy.announcedLastChange(card.name, state.version?.number ?? 1)
            : outAfter === 0
              ? restoreCopy.announcedLastOut(card.name, cardsAfter)
              // Never a nought — the copy promises one is never drawn — and it
              // cannot be one: a nought is the branch above.
              : restoreCopy.announced(card.name, cardsAfter, outAfter);
        // Focus before the refresh, while the tree this render built is still
        // in the document. The group heading the row left, never the next row's
        // control.
        //
        // NOT when this was the last change of any kind: the route redirects to
        // the deck page, and focusing a node about to be unmounted by a
        // navigation is a no-op that reads like a promise kept. The
        // announcement above is the receipt for that case, and a landing hash
        // like the commit and discard receipts is a separate piece of work.
        if (!redirecting) {
          // The row's own group first. It may have gone with the row — a group
          // of one empties when its row leaves — in which case any other
          // heading still in the column is the nearest true answer, and only
          // then the page heading.
          const heading =
            outAfter > 0
              ? (groupOfRow &&
                  document.getElementById(groupHeadingId(descriptionId, "out", groupOfRow))) ||
                document.querySelector<HTMLElement>(
                  `[id^="${CSS.escape(descriptionId)}-out-"]`,
                )
              : null;
          // The page heading is the fallback when the column itself is going.
          // It carries no tabindex of its own — a heading nothing focuses does
          // not need one — so it is given one for the landing, the way the
          // discard receipt does it.
          const fallback = document.querySelector("h1");
          if (heading) heading.focus();
          else if (fallback) {
            fallback.setAttribute("tabindex", "-1");
            fallback.focus();
          }
        }
        // No refresh here. `addCardToDeck` ends in `revalidateClaims`, and
        // `claimSurfaces` names this very route, so the server has already told
        // this client to re-read — a second call is a second full pass over the
        // draft rows, the availability read and the price join. The catch path
        // below keeps its refresh, because a throw may have revalidated nothing.
      });
    },
    [
      addRestoredId, deckId, descriptionId, inCount, liveCardCount,
      outCount, rows.out, router, setWrite, state.version,
    ],
  );

  // Four figures, each dropped at nought rather than drawn as one. The purchase
  // rides on the to-buy chip because the two are one fact: a count of copies and
  // what those copies cost.
  const chips = [
    { figure: inCount, tone: "var(--success)", label: copy.chipIn, total: null },
    { figure: outCount, tone: "var(--warning)", label: copy.chipOut, total: null },
    {
      figure: state.buyCount,
      tone: "var(--warning)",
      label: copy.chipBuy,
      total: state.total,
    },
    {
      figure: state.pullableCount,
      tone: "var(--accent)",
      label: copy.chipPullable,
      total: null,
    },
    {
      // CARDS, not copies: each contested row is one decision waiting on this page. The ink is
      // the over state's own, because that is what a contested card is — `marker.over` says
      // `short n` about the same card on the deck page.
      figure: contested.length,
      tone: "var(--avail-over-fg)",
      label: copy.chipShort,
      total: null,
    },
  ].filter((chip) => chip.figure > 0);

  // Both columns present is the only case with anything to switch between, and
  // its absence is also what keeps a one-column page from drawing a control
  // whose other segment leads nowhere.
  // Both counts are the optimistic ones. Restoring the last `out` row while the
  // reader is standing on the Out segment would otherwise leave a stale
  // `Going out · 1` tab selected over a hidden `Coming in` list.
  const segmented = inCount > 0 && outCount > 0;
  // The segment a restore emptied is no longer a place to stand. Derived rather
  // than set in the write, so it cannot disagree with the counts beside it.
  const shownColumn = outCount === 0 ? "in" : inCount === 0 ? "out" : shown;

  return (
    // The rows open the card modal, and the builder's provider does not reach
    // this route — the review page is its own page, as the update diff is.
    <CardDetailProvider deckPage>
      {/* `w-full` is load-bearing: the shell's `<main>` is a flex column, and a
          flex item with `margin-inline: auto` loses `align-items: stretch` and
          sizes to its content. Without it this page drew ~870px wide on a
          1300px desktop instead of filling to 1180. The page's box is the
          preview provider's own wrapper: one preview for both columns, as the
          decklist and the top-off list have, with the rows reporting hover. */}
      <HoverPreviewProvider className="mx-auto w-full max-w-[1180px]">
        {/* Its own block on the phone, ruled off and full-bleed, because the back
            link and the heading are what the reader lands on before the list
            starts. Desktop has no such division: the heading opens the page. */}
        <header className="px-[14px] pt-[38px] pb-[12px] border-b border-solid border-[color:var(--border)] md:px-[26px] md:pt-[24px] md:pb-0 md:border-b-0">
          <Link
            href={`/decks/${deckId}`}
            className="font-mono text-[10px] md:text-[11px] text-[color:var(--fg-faint)]"
          >
            {`← ${deckName}`}
          </Link>
          <h1 className="font-display font-bold text-[18px] md:text-[24px] mt-[9px] mb-0 md:mt-[12px] md:mb-[8px] text-[color:var(--fg)]">
            {firstCommit
              ? copy.firstHeading(liveCardCount)
              // A moved commander is one change on top of the cards (handoff §4).
              : copy.heading(inCount + outCount + (state.commander ? 1 : 0), state.version?.number ?? 1)}
          </h1>
          {/* Desktop only. At 390px the sentence is five lines above a list the
              reader came here to read, and the pulls it describes are on that
              list with their own controls. */}
          <p className="hidden md:block mt-0 mb-[18px] max-w-[680px] text-[14px] leading-[1.6] text-[color:var(--fg-body)]">
            {firstCommit
              ? copy.firstLede
              : copy.lede((state.version?.number ?? 0) + 1)}
          </p>
        </header>

        <div className="px-[14px] pt-[13px] md:px-[26px] md:pt-0 md:pb-[26px]">
          {/* Under the lede and above the columns, because it answers the other
              question the page is asked: the columns say which cards moved, and
              this says where the deck's shape went. */}
          {/* Change commander: first under the lede, above the strip (handoff §4). Absent unless
              the draft moved its commander. */}
          <CommanderSection state={state} />
          <ChangedStrip before={before} after={liveAfter} mix={mix} />

          {/* Desktop only, and a nought is never drawn: an empty chip is a figure
              standing for a purchase, a pull or a column that is not there. */}
          {chips.length > 0 && (
            <div className="hidden md:flex flex-wrap gap-[8px] mb-[18px]">
              {chips.map((chip) => (
                <CountChip
                  key={chip.label}
                  figure={chip.figure}
                  tone={chip.tone}
                  label={chip.label}
                  total={chip.total}
                />
              ))}
            </div>
          )}

          {segmented && (
            <div className="md:hidden flex gap-[6px] mb-[13px]">
              {([
                ["in", copy.groupIn(inCount)],
                ["out", copy.groupOut(outCount)],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setShown(value)}
                  aria-pressed={shownColumn === value}
                  // Verbatim the builder bar's filter pill: selection is bone on
                  // `--elevated`, never an accent fill, and it drops the ring the
                  // unselected segment carries. `ViewToggle` is the app's other
                  // segmented control and is not this one — it is two 44px glyph
                  // squares in a sunken well, and these segments carry a figure
                  // and a word.
                  className={[
                    "font-sans transition-[filter] hover:brightness-125 text-[12.5px]",
                    "flex-1 rounded-full px-[11px] py-[6px] min-h-[38px]",
                    shownColumn === value
                      ? "font-semibold text-[color:var(--fg)] bg-[color:var(--elevated)]"
                      : "font-medium text-[color:var(--fg-faint)] bg-transparent border border-solid border-[color:var(--border-strong)]",
                  ].join(" ")}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Desktop: two equal columns, gap 22px. Phone: one at a time, because
              two ~190px columns put every card name on three lines. */}
          {/* Named, because the commit sheet's money block links back up to the
              rows it is quoting. */}
          <div
            id="review"
            className="flex flex-col gap-[22px] md:grid md:grid-flow-col md:auto-cols-[minmax(0,1fr)] md:grid-rows-[auto_auto] md:gap-x-[22px] md:gap-y-0"
          >
          {/* Empty columns are drawn as nothing at all rather than as an empty
              state: the only way to arrive with none is `?commit=1`, where the
              commit sheet is the page and a "no changes" panel above it would
              contradict it. */}
          {inCount > 0 && (
            <Column
              zoneHint={(id, added) => commanderZoneHint(state, id, added)}
              deckId={deckId}
              heading={copy.groupIn(inCount)}
              headingTone="var(--success)"
              note={
                state.claimsKnown
                  ? copy.groupInBreakdown(free, sleeved, buy, proxied)
                  : copy.groupInUnknown
              }
              rows={rows.in}
              siblings={siblings}
              descriptionId={descriptionId}
              hiddenOnPhone={segmented && shownColumn !== "in"}
              phoneHeading={!segmented}
              newestAsOf={state.newestAsOf}
              claimsKnown={state.claimsKnown}
              // Nothing to put back in this column: the reverse of an add is a
              // removal, and the deck page does that.
              onRestore={null}
              restoreErrors={EMPTY_ERRORS}
              columnKey="in"
              // Every figure on this page is the server's — the breakdown beside
              // the heading, the buy count, the row's own tag — so a pull that
              // moved a copy is read again rather than patched in place.
              onPulled={() => router.refresh()}
            />
          )}
          {outCount > 0 && (
            <Column
              zoneHint={(id, added) => commanderZoneHint(state, id, added)}
              deckId={deckId}
              heading={copy.groupOut(outCount)}
              headingTone="var(--warning)"
              // A trade's only cut is the new commander leaving for the command zone, which the
              // pool sentence would misdescribe (R3 and the half-trade addendum, the review page).
              note={outRows.length > 0 && outRows.every((r) => commanderZoneHint(state, r.oracleId, false) !== null)
                ? changeCommanderCopy.review.outNoteToZone
                : copy.outNote(released)}
              rows={outRows}
              onRestore={restore}
              restoreErrors={restoreErrors}
              columnKey="out"
              siblings={siblings}
              descriptionId={descriptionId}
              hiddenOnPhone={segmented && shownColumn !== "out"}
              phoneHeading={!segmented}
              newestAsOf={state.newestAsOf}
              claimsKnown={state.claimsKnown}
              onPulled={() => router.refresh()}
            />
          )}
          </div>

          {commitSheetOpen ? (
            <CommitSheet
              deckId={deckId}
              // Same race, one door further in: a sheet already open when a
              // restore starts can commit the draft the row has left. And any
              // write whose outcome is unknown, which is the one state a commit
              // must not be started from: the draft it would freeze may already
              // have changed under it.
              commitDisabled={writeBusy}
              state={state}
              rows={rows}
              cardCount={liveCardCount}
              releasedOverride={released}
              // The other half of the same guard. Without it a commit started
              // FIRST still raced a restore started second — the sheet is not
              // unmounted while its own write runs, so nothing here knew.
              onWriteState={reportWrite}
              onCancel={closeCommitSheet}
            />
          ) : (
            // The bar. A dock on the phone — its own plate, ruled off and
            // carrying the page's ground under it, because at 390px it is the
            // last thing under a list the reader has scrolled; desktop is a line
            // under the columns. The figures read first on the phone and last
            // above it, which is the only difference between the two: one
            // element, ordered twice.
            <div className="flex flex-col items-stretch md:flex-row md:items-center md:flex-wrap gap-[8px] md:gap-[12px] mt-[13px] md:mt-[24px] px-[14px] pt-[11px] pb-[16px] md:p-0 md:pt-[18px] bg-[color:var(--bg)] md:bg-transparent [border-top:1px_solid_var(--border-strong)]">
              {discard.confirming ? (
                // The question takes the bar's own body, exactly as it takes the
                // banner's on the deck page — the same two lines and the same two
                // answers, with no second wording authored for this door.
                <DiscardConfirm
                  deckId={deckId}
                  state={state}
                  versionCards={versionCards}
                  // The question can already be open when a restore starts, and
                  // the trigger's own guard cannot reach it: the trigger is
                  // unmounted while the question is up.
                  //
                  // It reports its own write here too, and that is what keeps the
                  // destructive answer shut after one throws: `pending` goes false
                  // while the outcome is still unknown, and the answer would come
                  // back live over a draft that may already be gone.
                  disabled={writeBusy}
                  onWriteState={reportWrite}
                  onCancel={discard.cancel}
                  // This page is a page about a draft, so once the draft is gone
                  // there is nothing here to read: the route's own guard would
                  // send the reader back on the next render, and going straight
                  // there spares them a frame of two empty columns.
                  // With the receipt hash: this navigation takes the confirm,
                  // its answers and the whole page with it, and the deck page's
                  // version line is where a reader who just discarded needs to
                  // land. See `DISCARD_RECEIPT_HASH`.
                  onDiscarded={() => router.push(`/decks/${deckId}${DISCARD_RECEIPT_HASH}`)}
                />
              ) : (
                <>
                  {/* Both controls in one wrapper, which dissolves on desktop: at
                      390px they share the row under the figures, and above it all
                      three items are one line. */}
                  <div className="flex items-center gap-[8px] md:contents">
                    {/* The deck page's own wording for the same act, because this is
                        the same act: a reader who came here by a different door should
                        not have to work out that two different phrasings are one
                        button. */}
                    <PrimaryButton
                      onClick={() => setCommitSheetOpen(true)}
                      // Shut for the length of a restore's round trip. The two
                      // writes serialize on the deck lock, so a commit that wins
                      // the race freezes the cut the optimistic row has already
                      // taken off the screen — and the restore then lands as a
                      // fresh draft on the far side of the navigation. And for
                      // any other write in flight, including one whose outcome
                      // is still unknown.
                      disabled={writeBusy}
                      className="inline-flex flex-1 md:flex-none items-center justify-center min-h-[48px] md:min-h-0 md:py-[11px] md:px-[20px] text-[14px]"
                    >
                      {deckVersioningCopy.pending.commitCta((state.version?.number ?? 0) + 1)}
                    </PrimaryButton>
                    {/* Withheld on a brew, where there is no version for a discard
                        to land on — the rendering half of the server's own refusal. */}
                    {discard.offered && (
                      <DiscardTrigger
                        onOpen={discard.open}
                        triggerRef={discard.triggerRef}
                        disabled={writeBusy}
                      />
                    )}
                  </div>
                  <span className="order-first md:order-last font-mono text-[10px] md:text-[11px] text-[color:var(--fg-faint)]">
                    {/* The released figure is the state's own removals, which is what
                        the sheet one click down counts: two figures under each other
                        that disagreed would be the same commit priced twice. */}
                    {state.claimsKnown
                      ? copy.footer(liveCardCount, state.buyCount, released)
                      : copy.footerUnknown(liveCardCount, released)}
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      </HoverPreviewProvider>
    </CardDetailProvider>
  );
}
