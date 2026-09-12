"use client";

// §Surfaces 2 — the review page. Two columns: what is coming in, what is going
// out. Nothing here writes, and nothing here is a decision except the pulls
// Task 17 hangs on the `in` rows — the list on the deck page is already this
// list, and this page exists to say what committing it will cost.
//
// The rows are `update-diff-row`'s, verbatim. OVERLAPS.md call 2 forbids a second
// diff row in this feature, and the reuse is not a saving of lines: the row
// already resolves the buy tag against the availability rollup, already reads a
// `free === 0` on a removal as this deck's own claim rather than somebody else's,
// and already opens the card modal from the name. A fork would have had to be
// taught all three, and would have got one of them wrong.

import { useId, useState } from "react";
import { deckImportCopy } from "../../lib/copy/deck-import";
import { deckVersioningCopy } from "../../lib/copy/deck-versioning";
import type { DraftState } from "../../lib/decks/draft-shape";
// Types only: `draft-state.ts` reaches `src/db`, which throws at module init in
// a browser. See `src/lib/client-bundle-safety.test.ts`.
import type { DraftRow, DraftRows } from "../../lib/decks/draft-state";
import { groupByCardType } from "../../lib/decks/grouping";
import { CardDetailProvider } from "../cards/card-detail-provider";
import { DecklistGroupHeader } from "./decklist-group-header";
import { DiffRowIn, DiffRowOut } from "./update-diff-row";

const copy = deckVersioningCopy.review;

type ReviewChangesProps = {
  /**
   * Unread here, and both of these are the next two tasks' inputs rather than
   * spare props: `PullControl` writes against this deck (Task 17), and the
   * commit sheet mounts at the foot of this component seeded from `commitOpen`
   * (Task 18). They are declared now because the route is written once.
   */
  deckId: string;
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

function Column({
  heading,
  note,
  rows,
  siblings,
  descriptionId,
  hiddenOnPhone,
}: {
  heading: string;
  note: string;
  rows: DraftRow[];
  siblings: string[];
  /** Prefix for the per-row `sr-only` ids. Owned by the parent so both columns
   *  draw from one `useId` rather than two. */
  descriptionId: string;
  hiddenOnPhone: boolean;
}) {
  return (
    <section className={`flex-1 min-w-0 flex-col ${hiddenOnPhone ? "hidden md:flex" : "flex"}`}>
      <h2 className="font-display font-semibold text-[15px] md:text-[17px] m-0 text-[color:var(--fg)]">
        {heading}
      </h2>
      <p className="mt-[4px] mb-[16px] text-[12.5px] md:text-[13px] leading-[1.5] text-[color:var(--fg-muted)]">
        {note}
      </p>
      {groupByCardType(rows).map(([group, groupRows]) => (
        <div key={group} className="mb-[18px] last:mb-0">
          <DecklistGroupHeader label={group} count={groupRows.length} />
          <div className="flex flex-col gap-[6px]">
            {groupRows.map((row) => {
              const word = bucketWord(row.bucket);
              const wordId = `${descriptionId}-${row.oracleId}`;
              const card = {
                oracleId: row.oracleId,
                name: row.name,
                typeLine: row.typeLine,
                auto: row.auto,
                owned: row.owned,
                availability: row.availability ?? null,
              };
              return (
                <div key={row.oracleId} className="flex flex-col gap-[3px]">
                  {word && (
                    <span id={wordId} className="sr-only">
                      {word}
                    </span>
                  )}
                  {row.direction === "in" ? (
                    <DiffRowIn
                      card={card}
                      sourceLine={null}
                      siblings={siblings}
                      describedBy={word ? wordId : undefined}
                    />
                  ) : (
                    <DiffRowOut
                      card={card}
                      siblings={siblings}
                      describedBy={word ? wordId : undefined}
                    />
                  )}
                  {/* The shipped recount string, not a second phrasing of the
                      same fact — the update flow already tells a player what
                      `3 → 1` means, and two wordings for it is how the two
                      surfaces come to disagree. */}
                  {isQuantityMove(row) && (
                    <span className="font-mono text-[10.5px] pl-[12px] text-[color:var(--fg-faint)]">
                      {deckImportCopy.update.diff.recountedItem(
                        row.name,
                        String(row.from),
                        String(row.to),
                      )}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}

export function ReviewChanges({ rows, state }: ReviewChangesProps) {
  const descriptionId = useId();
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

  // Both columns present is the only case with anything to switch between, and
  // its absence is also what keeps a one-column page from drawing a control
  // whose other segment leads nowhere.
  const segmented = inCount > 0 && outCount > 0;

  return (
    // The rows open the card modal, and the builder's provider does not reach
    // this route — the review page is its own page, as the update diff is.
    <CardDetailProvider>
      <div className="mx-auto" style={{ maxWidth: 1180, padding: "24px 26px" }}>
        <h1 className="font-display text-[22px] m-0">
          {copy.heading(inCount + outCount, state.version?.number ?? 1)}
        </h1>
        <p className="mt-[6px] mb-[18px] text-[13.5px] text-[color:var(--fg-faint)]">
          {copy.lede((state.version?.number ?? 0) + 1)}
        </p>

        {segmented && (
          <div className="md:hidden flex gap-[7px] mb-[16px]">
            {([
              ["in", copy.chipIn, inCount],
              ["out", copy.chipOut, outCount],
            ] as const).map(([value, label, count]) => (
              <button
                key={value}
                type="button"
                onClick={() => setShown(value)}
                aria-pressed={shown === value}
                // Verbatim the builder bar's filter pill: selection is bone on
                // `--elevated` with a `--border-strong` ring, never an accent
                // fill. `ViewToggle` is the app's other segmented control and is
                // not this one — it is two 44px glyph squares in a sunken well,
                // and these segments carry a figure and a word.
                className={[
                  "font-sans transition-[filter] hover:brightness-125 text-[12px]",
                  "rounded-full px-[11px] py-[6px] min-h-[36px]",
                  "border border-solid border-[color:var(--border-strong)]",
                  shown === value
                    ? "font-semibold text-[color:var(--fg)] bg-[color:var(--elevated)]"
                    : "text-[color:var(--fg-faint)] bg-transparent",
                ].join(" ")}
              >
                {count} {label}
              </button>
            ))}
          </div>
        )}

        {/* Desktop: two equal columns, gap 22px. Phone: one at a time, because
            two ~190px columns put every card name on three lines. */}
        <div className="flex flex-col md:flex-row gap-[22px]">
          {/* Empty columns are drawn as nothing at all rather than as an empty
              state: the only way to arrive with none is `?commit=1`, where the
              commit sheet is the page and a "no changes" panel above it would
              contradict it. */}
          {inCount > 0 && (
            <Column
              heading={copy.groupIn(inCount)}
              note={copy.groupInBreakdown(free, sleeved, buy)}
              rows={rows.in}
              siblings={siblings}
              descriptionId={descriptionId}
              hiddenOnPhone={segmented && shown !== "in"}
            />
          )}
          {outCount > 0 && (
            <Column
              heading={copy.groupOut(outCount)}
              // Said once under the heading, never per row: there is no Keep on
              // a removal here, because putting one back is adding it to the
              // deck and the deck page already does that.
              note={copy.outNote(outCount)}
              rows={rows.out}
              siblings={siblings}
              descriptionId={descriptionId}
              hiddenOnPhone={segmented && shown !== "out"}
            />
          )}
        </div>
      </div>
    </CardDetailProvider>
  );
}
