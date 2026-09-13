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

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useId, useOptimistic, useRef, useState, useTransition } from "react";
import { deckVersioningCopy } from "../../lib/copy/deck-versioning";
import { pullCandidate, releasedCopies, type DraftState } from "../../lib/decks/draft-shape";
// Types only: `draft-state.ts` reaches `src/db`, which throws at module init in
// a browser. See `src/lib/client-bundle-safety.test.ts`.
import type { DraftRow, DraftRows, ShapeCard } from "../../lib/decks/draft-state";
import { groupByCardType } from "../../lib/decks/grouping";
import { CardDetailProvider } from "../cards/card-detail-provider";
import { PrimaryButton } from "../ui/button";
import { ChangedStrip } from "./changed-strip";
import { CommitSheet } from "./commit-sheet";
import { DiscardConfirm, DiscardTrigger, useDiscardConfirm } from "./discard-draft";
import { DISCARD_RECEIPT_HASH, draftAnnouncer } from "./draft-announcer";
import { DecklistGroupHeader } from "./decklist-group-header";
import { PullControl } from "./pull-control";
import { PutBackControl } from "./put-back-control";
import { MutationError } from "./mutation-error";
import { addCardToDeck } from "../../app/decks/actions";
import { DiffRowIn, DiffRowOut } from "./update-diff-row";

const copy = deckVersioningCopy.review;
const restoreCopy = deckVersioningCopy.restore;

type ReviewChangesProps = {
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
  return null;
}

/** A row whose copy count moved rather than a card arriving or leaving whole.
 *  `draftDiff` files a change only when the counts differ, so the only pair this
 *  excludes is one where a side is zero — which the column heading has said. */
/** Stable, so `useOptimistic`'s base identity never changes between renders. */
const EMPTY_RESTORED: string[] = [];

/** The `Coming in` column's error map, which is always empty. */
const EMPTY_ERRORS: Record<string, string> = {};

function isQuantityMove(row: DraftRow): boolean {
  return row.from > 0 && row.to > 0;
}

type TypeGroup = readonly [string, DraftRow[]];

/** How many rows a type group can hold and still share a line with the group
 *  under it. The design pairs two short groups into a nested row of two
 *  sub-columns and never says where short ends, so the figure is ours: at four
 *  rows a pair is already as tall as the heading it saves, which is the whole
 *  reason to pair them. */
const PAIRABLE_ROWS = 3;

/**
 * The column's groups, with short neighbours folded into one drawn line.
 *
 * Consecutive only, and never a third into an existing pair: the point is a
 * shorter column, not a grid — a group that finds no short neighbour beside it
 * simply takes the full width, which is what every long group does.
 */
function pairGroups(rows: DraftRow[]): TypeGroup[][] {
  const lines: TypeGroup[][] = [];
  for (const group of groupByCardType(rows) as TypeGroup[]) {
    const open = lines[lines.length - 1];
    const short = group[1].length <= PAIRABLE_ROWS;
    if (open && open.length === 1 && short && open[0][1].length <= PAIRABLE_ROWS) {
      open.push(group);
    } else {
      lines.push([group]);
    }
  }
  return lines;
}

/**
 * A column's rows in the order it draws them — across group boundaries, and left
 * to right through a paired line's two sub-columns.
 *
 * `decklist.tsx` flattens its groups the same way and for the same reason: the
 * modal's Prev/Next walks the list the eye does, and the payload's own order is
 * not that list once the rows are grouped by type.
 */
function orderedIds(rows: DraftRow[]): string[] {
  return pairGroups(rows).flatMap((line) =>
    line.flatMap(([, groupRows]) => groupRows.map((r) => r.oracleId)),
  );
}

function Column({
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
}: {
  deckId: string;
  heading: string;
  /** `--success` coming in, `--warning` going out. The direction is the one fact
   *  the header carries that the rows below it do not. */
  headingTone: string;
  note: string;
  rows: DraftRow[];
  siblings: string[];
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
          // claimed and no route releases it, and a holder with a draft of its
          // own is a deck to open rather than a copy to take. "can be pulled"
          // on either would name an act this page will not perform.
          //
          // The pending guard is the one that says nothing here: `PullControl`
          // gives its `Open →` link that exact sentence as the link's accessible
          // name, so describing the row with it as well reads one sentence twice
          // — once for the row, then again for the control inside it. Its bucket
          // word is dropped with it rather than falling through, because "can be
          // pulled" is the opposite of what that row is. The commander guard has
          // no control at all (no route releases a commander) and a one-word
          // visible tag, so the row is the only place its sentence can live.
          const word = pullClaim?.commander
            ? copy.commanderGuardA11y(pullClaim.name, row.name)
            : pullClaim?.pending
              ? null
              : bucketWord(row.bucket);
          const wordId = `${descriptionId}-${row.oracleId}`;
          const card = {
            oracleId: row.oracleId,
            name: row.name,
            typeLine: row.typeLine,
            auto: row.auto,
            owned: row.owned,
            availability: row.availability ?? null,
            manaCost: row.manaCost ?? null,
            // Dropped outright when the claim read failed: the buy tag still says
            // `buy` on an unowned row, and it says it without a figure, which is
            // the same degrade the pending banner makes.
            price: claimsKnown ? row.price ?? null : null,
            newestAsOf,
            // An owned card whose free copies are all sleeved somewhere else.
            // The bucket is the server's answer to exactly that question, so
            // the dot is not left to re-derive it from the rollup.
            committed: row.bucket === "claimed",
            // The buy tag's own question, and not one `owned` can answer: a
            // partially covered add with no claimant is filed `unowned` while
            // being a card the player owns a copy of. Zeroed with the price when
            // the claim read failed, where every shortfall is 0 by absence.
            shortfall: claimsKnown ? row.shortfall : 0,
          };
          // The row prints the pair itself, inside the name: a caption under the
          // row named the card a second time, and the card is already the row
          // the caption was hanging off.
          const recount = isQuantityMove(row)
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
                    pullClaim
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
                    onRestore
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
    <section className={`flex-1 min-w-0 flex-col ${hiddenOnPhone ? "hidden md:flex" : "flex"}`}>
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
      {pairGroups(rows).map((line) =>
        line.length === 1 ? (
          renderGroup(line[0])
        ) : (
          // Two short groups on one line, at the layout's own gap. Stacked on
          // the phone, where a sub-column is 190px and every card name wraps.
          <div key={line[0][0]} className="flex flex-col md:flex-row gap-[22px]">
            {line.map((group) => (
              <div key={group[0]} className="flex-1 min-w-0">
                {renderGroup(group)}
              </div>
            ))}
          </div>
        ),
      )}
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
  deckId,
  deckName,
  rows,
  state,
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
    history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
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
  // Keyed per row, not one slot: the controls stay live while another restore
  // is going, so two failures in flight would otherwise leave the first row
  // back on screen with the second row's message — or with none at all.
  const [restoreErrors, setRestoreErrors] = useState<Record<string, string>>({});
  // Kept, not dropped. Commit and discard serialize with this add on the deck
  // lock, so a commit that wins the race snapshots the cut the optimistic row
  // has already hidden — and the restore then lands as a fresh draft on the
  // other side of the navigation. The two doors are shut for the round trip.
  const [restoring, startRestore] = useTransition();
  // Rows already in the air. `PutBackControl` stays enabled by design — R3 rules
  // a disabled state out — so nothing stops a second click on the SAME row
  // before the transition re-renders, and a duplicate id would have every
  // projection counting that card twice. A ref rather than state: it has to be
  // true for the next click in the same tick, before any render.
  const inFlight = useRef<Set<string>>(new Set());
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

  // A versionless deck: the page is the v1 commit surface, so the heading, the
  // lede and the bar's CTA all name that act instead of a diff. The route admits
  // one only when it can actually cut v1 — see its own guard.
  const firstCommit = state.version === null;

  // A draft that moved only basic lands: a version to cut, and no row either
  // column can draw. Counting changes on it would print a nought standing for a
  // real edit, so the heading and the lede name the edit instead.
  // `basicsMoved` as well as `basicsChanged`: on a mixed draft the narrower flag
  // is false by design, so restoring the last non-basic row would empty both
  // lists and this would claim "0 changes" over a draft that still moves a
  // basic. The two together are "nothing is left but the mana base".
  const basicsOnly =
    !firstCommit && inCount === 0 && outCount === 0 && (state.basicsChanged || state.basicsMoved);
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
  const restore = useCallback(
    (card: { oracleId: string; name: string }) => {
      // Different rows may go at once; the same row may not go twice.
      if (inFlight.current.has(card.oracleId)) return;
      inFlight.current.add(card.oracleId);
      setRestoreErrors((current) => {
        if (!(card.oracleId in current)) return current;
        const next = { ...current };
        delete next[card.oracleId];
        return next;
      });
      const groupOfRow = rows.out.find((row) => row.oracleId === card.oracleId)?.cardTypeGroup;
      // Read BEFORE the write, from the figures this render already has: after
      // it, the row is gone from both the optimistic list and the server's.
      const outAfter = outCount - 1;
      const cardsAfter = liveCardCount + 1;
      // Whether another restore is already going. Read at the click, because
      // both figures above are this render's snapshot: tap two rows inside one
      // round trip and each would compute `outAfter === 0` from a column the
      // other has not left yet, and both would announce a dissolution that has
      // not happened. The stronger sentence is only earned when this write is
      // the only one in the air.
      const alone = !restoring;
      startRestore(async () => {
        addRestoredId(card.oracleId);
        let result: Awaited<ReturnType<typeof addCardToDeck>>;
        try {
          result = await addCardToDeck(deckId, card.oracleId);
        } catch {
          inFlight.current.delete(card.oracleId);
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
        inFlight.current.delete(card.oracleId);
        if (!result.ok) {
          // `addCardToDeck` can still refuse on its own vocabulary — an
          // off-identity card, say, if the catalogue moved under a committed
          // list. Passed through rather than re-worded: it is a sentence about
          // the card, not about this surface.
          setRestoreErrors((current) => ({ ...current, [card.oracleId]: result.message }));
          return;
        }
        // Announced into the region that outlives this row, because the row is
        // removed by its own success. Which sentence depends on what is left.
        //
        // Two different questions, and they were one flag by mistake.
        //
        // The ROUTE leaves whenever no named row is left: `admitsReview` admits
        // a basics-only draft only as `?commit=1`, so a normal visit redirects
        // whether or not a basic moved.
        const redirecting = alone && outAfter === 0 && inCount === 0;
        // The DECK matches its version again only if nothing else moved, and a
        // basic that moved is something else. "Matches v1" over a draft that
        // still changes the mana base is a claim about the deck, not the page.
        const matchesVersion = redirecting && !state.basicsMoved;
        draftAnnouncer().textContent =
          matchesVersion
            ? restoreCopy.announcedLastChange(card.name, state.version?.number ?? 1)
            : outAfter === 0
              ? restoreCopy.announcedLastOut(card.name, cardsAfter)
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
        router.refresh();
      });
    },
    [
      addRestoredId, deckId, descriptionId, inCount, liveCardCount, outCount,
      restoring, rows.out, router, state.basicsMoved, state.version,
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
    <CardDetailProvider>
      {/* `w-full` is load-bearing: the shell's `<main>` is a flex column, and a
          flex item with `margin-inline: auto` loses `align-items: stretch` and
          sizes to its content. Without it this page drew ~870px wide on a
          1300px desktop instead of filling to 1180. */}
      <div className="mx-auto w-full" style={{ maxWidth: 1180 }}>
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
              : basicsOnly
                ? copy.basicsHeading(state.version?.number ?? 1)
                : copy.heading(inCount + outCount, state.version?.number ?? 1)}
          </h1>
          {/* Desktop only. At 390px the sentence is five lines above a list the
              reader came here to read, and the pulls it describes are on that
              list with their own controls. */}
          <p className="hidden md:block mt-0 mb-[18px] max-w-[680px] text-[14px] leading-[1.6] text-[color:var(--fg-body)]">
            {firstCommit
              ? copy.firstLede
              : basicsOnly
                ? copy.basicsLede((state.version?.number ?? 0) + 1)
                : copy.lede((state.version?.number ?? 0) + 1)}
          </p>
        </header>

        <div className="px-[14px] pt-[13px] md:px-[26px] md:pt-0 md:pb-[26px]">
          {/* Under the lede and above the columns, because it answers the other
              question the page is asked: the columns say which cards moved, and
              this says where the deck's shape went. */}
          <ChangedStrip before={before} after={liveAfter} />

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
          <div id="review" className="flex flex-col md:flex-row md:items-start gap-[22px]">
          {/* Empty columns are drawn as nothing at all rather than as an empty
              state: the only way to arrive with none is `?commit=1`, where the
              commit sheet is the page and a "no changes" panel above it would
              contradict it. */}
          {inCount > 0 && (
            <Column
              deckId={deckId}
              heading={copy.groupIn(inCount)}
              headingTone="var(--success)"
              note={
                state.claimsKnown
                  ? copy.groupInBreakdown(free, sleeved, buy)
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
              deckId={deckId}
              heading={copy.groupOut(outCount)}
              headingTone="var(--warning)"
              note={copy.outNote(released)}
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
              // restore starts can commit the draft the row has left.
              commitDisabled={restoring}
              state={state}
              rows={rows}
              cardCount={liveCardCount}
              releasedOverride={released}
              onCancel={closeCommitSheet}
            />
          ) : (
            // The bar. A dock on the phone — its own plate, ruled off and
            // carrying the page's ground under it, because at 390px it is the
            // last thing under a list the reader has scrolled; desktop is a line
            // under the columns. The figures read first on the phone and last
            // above it, which is the only difference between the two: one
            // element, ordered twice.
            <div className="flex flex-col items-stretch md:flex-row md:items-center md:flex-wrap gap-[8px] md:gap-[12px] mt-[13px] md:mt-[24px] px-[14px] pt-[11px] pb-[16px] md:p-0 md:pt-[18px] bg-[color:var(--base)] md:bg-transparent [border-top:1px_solid_var(--border-strong)]">
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
                  disabled={restoring}
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
                      // fresh draft on the far side of the navigation.
                      disabled={restoring}
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
                        disabled={restoring}
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
      </div>
    </CardDetailProvider>
  );
}
