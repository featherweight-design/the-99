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
import { useCallback, useId, useState } from "react";
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
import { DISCARD_RECEIPT_HASH } from "./draft-announcer";
import { DecklistGroupHeader } from "./decklist-group-header";
import { PullControl } from "./pull-control";
import { DiffRowIn, DiffRowOut } from "./update-diff-row";

const copy = deckVersioningCopy.review;

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
function bucketWord(bucket: DraftRow["bucket"]): string | null {
  if (bucket === "unowned") return copy.chipBuy;
  if (bucket === "claimed") return copy.chipPullable;
  return null;
}

/** A row whose copy count moved rather than a card arriving or leaving whole.
 *  `draftDiff` files a change only when the counts differ, so the only pair this
 *  excludes is one where a side is zero — which the column heading has said. */
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
      <DecklistGroupHeader label={group} count={groupRows.length} />
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
        <h2
          className="font-mono text-[11px] uppercase tracking-[0.16em] m-0"
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
  // The same hook the banner's control uses, so the question asked from either
  // door is one construct with one set of answers.
  const discard = useDiscardConfirm(state);

  // The version's own size, for the consequence sentence — and `before` IS that
  // version's card list, which is why this page takes no prop for the figure the
  // deck page passes down. Copies rather than rows: it is the figure the decklist
  // prints, and what the reader is being told they land on.
  const versionCards = (before ?? []).reduce((n, card) => n + card.quantity, 0);

  const inCount = rows.in.length;
  const outCount = rows.out.length;
  // One list across both columns, so the card modal's Prev/Next pages the whole
  // change set in the order the page draws it rather than stopping at a column.
  // Grouped order, not the payload's: the columns group by type, and Prev/Next
  // stepping to a row three groups down is a list the reader cannot follow.
  const siblings = [...orderedIds(rows.in), ...orderedIds(rows.out)];

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
  const basicsOnly = !firstCommit && inCount === 0 && outCount === 0 && state.basicsChanged;

  // Copies going back in the pool, never rows: one remove of `3 → 1` releases
  // two, and this figure is printed beside `buyCount`, which counts copies.
  const released = releasedCopies(state);

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
  const segmented = inCount > 0 && outCount > 0;

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
              ? copy.firstHeading(cardCount)
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
          <ChangedStrip before={before} after={after} />

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
                  aria-pressed={shown === value}
                  // Verbatim the builder bar's filter pill: selection is bone on
                  // `--elevated`, never an accent fill, and it drops the ring the
                  // unselected segment carries. `ViewToggle` is the app's other
                  // segmented control and is not this one — it is two 44px glyph
                  // squares in a sunken well, and these segments carry a figure
                  // and a word.
                  className={[
                    "font-sans transition-[filter] hover:brightness-125 text-[12.5px]",
                    "flex-1 rounded-full px-[11px] py-[6px] min-h-[38px]",
                    shown === value
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
              hiddenOnPhone={segmented && shown !== "in"}
              phoneHeading={!segmented}
              newestAsOf={state.newestAsOf}
              claimsKnown={state.claimsKnown}
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
              // Said once beside the heading, never per row: there is no Keep on
              // a removal here, because putting one back is adding it to the
              // deck and the deck page already does that.
              note={copy.outNote(released)}
              rows={rows.out}
              siblings={siblings}
              descriptionId={descriptionId}
              hiddenOnPhone={segmented && shown !== "out"}
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
              state={state}
              rows={rows}
              cardCount={cardCount}
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
                      className="inline-flex flex-1 md:flex-none items-center justify-center min-h-[48px] md:min-h-0 md:py-[11px] md:px-[20px] text-[14px]"
                    >
                      {deckVersioningCopy.pending.commitCta((state.version?.number ?? 0) + 1)}
                    </PrimaryButton>
                    {/* Withheld on a brew, where there is no version for a discard
                        to land on — the rendering half of the server's own refusal. */}
                    {discard.offered && (
                      <DiscardTrigger onOpen={discard.open} triggerRef={discard.triggerRef} />
                    )}
                  </div>
                  <span className="order-first md:order-last font-mono text-[10px] md:text-[11px] text-[color:var(--fg-faint)]">
                    {/* The released figure is the state's own removals, which is what
                        the sheet one click down counts: two figures under each other
                        that disagreed would be the same commit priced twice. */}
                    {state.claimsKnown
                      ? copy.footer(cardCount, state.buyCount, released)
                      : copy.footerUnknown(cardCount, released)}
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
