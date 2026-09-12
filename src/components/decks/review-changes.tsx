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
import { useId, useState } from "react";
import { deckVersioningCopy } from "../../lib/copy/deck-versioning";
import { pullCandidate, type DraftState } from "../../lib/decks/draft-shape";
// Types only: `draft-state.ts` reaches `src/db`, which throws at module init in
// a browser. See `src/lib/client-bundle-safety.test.ts`.
import type { DraftRow, DraftRows } from "../../lib/decks/draft-state";
import { groupByCardType } from "../../lib/decks/grouping";
import { CardDetailProvider } from "../cards/card-detail-provider";
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
  /** Unread here: the commit sheet mounts at the foot of this component seeded
   *  from it (Task 18). Declared now because the route is written once. */
  commitOpen?: boolean;
  rows: DraftRows["rows"];
  state: DraftState;
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

function Column({
  deckId,
  heading,
  headingTone,
  note,
  rows,
  siblings,
  descriptionId,
  hiddenOnPhone,
  onPulled,
  newestAsOf,
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
  onPulled: () => void;
  /** The newest `as_of` in the price table, so a row can tell a live price from
   *  a sold-out printing's last one. */
  newestAsOf: Date | null;
}) {
  const renderGroup = ([group, groupRows]: TypeGroup) => (
    <div key={group} className="mb-[16px] last:mb-0">
      <DecklistGroupHeader label={group} count={groupRows.length} />
      <div className="flex flex-col gap-[4px]">
        {groupRows.map((row) => {
          const word = bucketWord(row.bucket);
          const wordId = `${descriptionId}-${row.oracleId}`;
          // The claim the row's control is drawn against, guards and all —
          // one selector, shared with the banner's own pull hints, so the
          // two surfaces can never disagree about which deck holds a copy.
          const pullClaim =
            row.direction === "in" ? pullCandidate(row.availability ?? undefined) : null;
          const card = {
            oracleId: row.oracleId,
            name: row.name,
            typeLine: row.typeLine,
            auto: row.auto,
            owned: row.owned,
            availability: row.availability ?? null,
            manaCost: row.manaCost ?? null,
            price: row.price ?? null,
            newestAsOf,
            // An owned card whose free copies are all sleeved somewhere else.
            // The bucket is the server's answer to exactly that question, so
            // the dot is not left to re-derive it from the rollup.
            committed: row.bucket === "claimed",
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
      {/* Desktop only: at 390px the segmented pair above the column is the
          direction, and a heading repeating it would be the same word twice. */}
      <div className="hidden md:flex items-baseline justify-between gap-[10px] pb-[10px] mb-[14px] [border-bottom:1px_solid_var(--elevated)]">
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

export function ReviewChanges({ deckId, deckName, rows, state }: ReviewChangesProps) {
  const descriptionId = useId();
  const router = useRouter();
  // Phone only, and it decides which column is on screen rather than which one
  // is drawn twice: both columns are in the markup once, and the inactive one is
  // hidden below `md` and shown above it. A second mounting for the narrow
  // width would put every card name, every buy tag and every card-modal trigger
  // in the DOM twice.
  const [shown, setShown] = useState<"in" | "out">("in");

  const inCount = rows.in.length;
  const outCount = rows.out.length;
  // One list across both columns, so the card modal's Prev/Next pages the whole
  // change set in the order the page draws it rather than stopping at a column.
  const siblings = [...rows.in, ...rows.out].map((r) => r.oracleId);

  // Counted off the state's own buckets rather than off `rows.in`, because the
  // state is what every other surface's figure is counted off: the banner, this
  // breakdown and the commit sheet's buy block are one purchase with three
  // appearances (addendum R3), and a column that re-tallied its own rows would
  // be the fourth.
  const free = state.adds.filter((a) => a.bucket === "free").length;
  const sleeved = state.adds.filter((a) => a.bucket === "claimed").length;
  const buy = state.adds.filter((a) => a.bucket === "unowned").length;

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
      <div className="mx-auto" style={{ maxWidth: 1180 }}>
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
            {copy.heading(inCount + outCount, state.version?.number ?? 1)}
          </h1>
          {/* Desktop only. At 390px the sentence is five lines above a list the
              reader came here to read, and the pulls it describes are on that
              list with their own controls. */}
          <p className="hidden md:block mt-0 mb-[18px] max-w-[680px] text-[14px] leading-[1.6] text-[color:var(--fg-body)]">
            {copy.lede((state.version?.number ?? 0) + 1)}
          </p>
        </header>

        <div className="px-[14px] pt-[13px] md:px-[26px] md:pt-0 md:pb-[26px]">
          {/* Desktop only, and a nought is never drawn: an empty chip is a figure
              standing for a purchase, a pull or a column that is not there. */}
          {chips.length > 0 && (
            <div className="hidden md:flex flex-wrap gap-[8px] mb-[20px]">
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
          <div className="flex flex-col md:flex-row md:items-start gap-[22px]">
          {/* Empty columns are drawn as nothing at all rather than as an empty
              state: the only way to arrive with none is `?commit=1`, where the
              commit sheet is the page and a "no changes" panel above it would
              contradict it. */}
          {inCount > 0 && (
            <Column
              deckId={deckId}
              heading={copy.groupIn(inCount)}
              headingTone="var(--success)"
              note={copy.groupInBreakdown(free, sleeved, buy)}
              rows={rows.in}
              siblings={siblings}
              descriptionId={descriptionId}
              hiddenOnPhone={segmented && shown !== "in"}
              newestAsOf={state.newestAsOf}
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
              note={copy.outNote(outCount)}
              rows={rows.out}
              siblings={siblings}
              descriptionId={descriptionId}
              hiddenOnPhone={segmented && shown !== "out"}
              newestAsOf={state.newestAsOf}
              onPulled={() => router.refresh()}
            />
          )}
          </div>
        </div>
      </div>
    </CardDetailProvider>
  );
}
