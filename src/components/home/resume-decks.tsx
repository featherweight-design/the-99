// "Pick up where you left off" — the four decks you touched last, at both widths.
//
// Property table: docs/superpowers/design-tables/ui-refresh-home.md §ResumeRows.
// Handoff: design/design_handoff_the99_home/ (R1).
//
// It is the only route back into a deck from Home now: `Your decks` — a second,
// worse /decks one tap from the real one — is deleted, and this block takes the
// whole job, which is why it carries four rows rather than two and why its
// footer carries the total that block's heading used to print.
//
// The ordering lives in `resumeDecks` rather than in the component so it can be
// tested without a DOM. It is `byTouched` now: the most recent of the deck's
// last edit, commit and logged game, and each row prints the act that won, so
// the order states its own evidence.

import { IntentPrefetchLink } from "../ui/intent-prefetch-link";
import { GhostButton } from "@/components/ui/button";
import { shortCommanderName } from "../../lib/copy/decks-builder";
import { deckImportCopy } from "../../lib/copy/deck-import";
import { verdictHead } from "../../lib/bracket/verdict-head";
import { refreshCopy } from "../../lib/copy/refresh";
import { deckBodySize } from "../../lib/decks/deck-size";
import { commanderDisplayName } from "../../lib/cards/printed-name";
import type { DeckListItem } from "../../lib/decks/read";
import type { ShoppingRollup } from "../../lib/decks/shopping-rollup";
import { byTouched, elapsed, touchedBy } from "../../lib/decks/touched";
import { statusBarStyle } from "../../lib/decks/status-style";
import { TRUNCATES } from "../decks/spine-desktop";
import { BracketChip } from "../decks/bracket-chip";
import { StatusPillBadge } from "../decks/status-pill";
import { ArtWash } from "../ui/art-wash";

export const RESUME_COUNT = 4;

const partnerCopy = deckImportCopy.commander;

/**
 * Most recently touched first — `byTouched`, which is the last edit, commit or
 * logged game, whichever is newest, then name, then id.
 *
 * The rule itself lives in `lib/decks/touched.ts` beside the columns it reads;
 * this only takes the first four.
 *
 * The copy over `[...decks]` is load-bearing: the caller's array is the whole
 * deck list, and sorting in place would reorder somebody else's view of it.
 */
export function resumeDecks(decks: readonly DeckListItem[]): DeckListItem[] {
  return [...decks].sort(byTouched).slice(0, RESUME_COUNT);
}

/**
 * The copies clause's figure, or null for no clause.
 *
 * The roll-up and only the roll-up. It excludes basics, as every Shopping
 * surface does, and knows about seniority; `deck.toBuyCount` is
 * `built − ownedCount` and does neither, so the two are different definitions of
 * "to buy" and falling back from one to the other would put a count on this row
 * that covers different cards from the one the deck tile prints for the same
 * deck. A deck with no entry draws the count alone — the `87 / 99` beside it
 * already says how far along it is.
 */
function toBuyCopies(shopping: ShoppingRollup, deckId: string): number | null {
  const copies = shopping.byDeck.get(deckId)?.copies ?? 0;
  return copies > 0 ? copies : null;
}

/**
 * The touched stamp: `edited 2h ago`, `committed 3d ago`, `played yesterday`.
 *
 * The only element this round adds to a shipped row. It sits on the row's first
 * line, right-aligned beside the deck name, at both widths — never on a line of
 * its own, and never in the meta line, which cannot hold it: see the note at the
 * name row below for the measurement that moved it.
 *
 * `now` is the page's one server clock, threaded down rather than read here: two
 * clocks on one page disagree, and every relative date on Home measures against
 * that one.
 */
function touchedStamp(deck: DeckListItem, now: Date): string {
  const { at, verb } = touchedBy(deck);
  const ago = elapsed(at, now);
  const c = refreshCopy.home.elapsed;
  const figure =
    ago.unit === "yesterday" ? c.yesterday
      : ago.unit === "hours" ? c.hours(ago.value)
      : ago.unit === "days" ? c.days(ago.value)
      : ago.unit === "weeks" ? c.weeks(ago.value)
      : c.months(ago.value);
  return refreshCopy.home.touched[verb](figure);
}

function ResumeRow(
  { deck, copies, now, className, eager = false }:
  { deck: DeckListItem; copies: number | null; now: Date; className?: string; eager?: boolean },
) {
  const stamp = touchedStamp(deck, now);
  const { partnerName } = deck;
  // The name on the copy the player owns, because the portrait beside it is that
  // copy's art. The partner carries no printed name in this payload and needs
  // none: no resume row draws a second commander's art.
  const commanderName = commanderDisplayName({
    name: deck.commanderName,
    printedName: deck.commanderPrintedName,
  });
  const bodySize = deckBodySize(partnerName !== null);
  const count = `${deck.built} / ${bodySize}`;
  // Decision 23: a pair row draws the count alone, and the to-buy figure lives in
  // the row's accessible name. The rule was made when the count shared line two
  // with the pill and a pair's two names, which left it no room. The bracket-chip
  // addendum moved the count to its own line beside the bar and kept the rule as
  // it was (section C: the clause draws for "a roll-up entry and not a pair"), so
  // it stands as Design's call rather than as a width this line cannot give. One
  // boolean, and not a new state: a deck with no roll-up entry already draws the
  // count alone.
  const clause = copies !== null && partnerName === null;
  return (
    <IntentPrefetchLink
      href={`/decks/${deck.id}`}
      // The deck touched last is prefetched on sight (speed plan (b)): it is the one most likely
      // opened next, and the others wait for intent.
      eager={eager}
      // The whole row is the target — no per-row button, because a button would
      // be a second way to do the one thing the row already does.
      // The height is stated, not a floor: the wash beside it is a hard 72px, so
      // a row allowed to grow past that would show an unwashed strip.
      // `flex-none` below 1180px, `flex-1` above. The container is a COLUMN
      // there, so `flex: 1` applies to HEIGHT: four rows in a short column each
      // shrank below the stated 72 and showed a strip of unwashed band under
      // the portrait. Two rows never overflowed, which is why the bug arrives
      // with the fourth. Above 1180px the container is a row again and `flex-1`
      // is what makes the pair share the width.
      className={`relative flex h-[72px] min-w-0 flex-none items-center overflow-hidden rounded-[12px] border border-[color:var(--border)] bg-[color:var(--surface-inset)] py-[4px] pr-[10px] min-[1180px]:flex-1 min-[1180px]:pr-[18px] ${className ?? ""}`}
    >
      {/* §ResumeRow — the commander's portrait, at the band's own height. It is
          a column the type starts clear of, not a plate the type sits on: 99px
          of portrait plus a 17px gap is where the 116px inset comes from, and
          nothing on this row needs a text shadow as a result. */}
      <ArtWash
        strategy="left-portrait"
        // The portrait's width is stated now rather than derived from the band:
        // one band can carry two portraits elsewhere in the system, so the table
        // is keyed by width. 99 on a 72 band is this row's own pairing, the one
        // it has always drawn.
        height={72}
        portrait={99}
        // No vertical ramp. This row's type starts at the 116px inset, clear of
        // the 99px portrait — a vertical scrim would darken the band top to
        // bottom to protect ink that is already beside the art rather than under
        // it. The horizontal scrim is still climbing at 116, which is the
        // thinnest ground anything here stands on, and that is the point
        // `wash-contrast.test.ts` samples.
        labelAtPx="flat"
        artCropUri={deck.commanderArtCropUri}
        colorIdentity={deck.commanderColorIdentity}
      />

      <span
        data-resume-text
        // 108 below 1000px, 116 above. The inset clears the 99px portrait and
        // then a gap, and the gap is the only part of it that can give: at 640px
        // the dashboard's left column is 252px, and 116 of inset plus 18 of right
        // padding left 118 for a meta line whose fixed content — pill, gap, count
        // — needs 121. Three pixels, and the count was clipped by the row's own
        // `overflow-hidden`. A 9px gap instead of 17, and 10px of right padding
        // instead of 18, give that line 134 and the commander's name what is
        // left. Nothing moves at 1000px and above, where the row has the room it
        // was drawn with. Since the bracket-chip addendum the count has its own line (the third),
        // and the row's vertical padding closed from 10 to 4 to hold three lines in its 62px content
        // box: 17.4 + 4 + 22 / 24 + 4 + 12.6 = 60 / 62.
        className="relative flex min-w-0 flex-auto flex-col gap-[4px] pl-[108px] min-[1000px]:pl-[116px]"
      >
        {/* The DECK name, not the commander's. The frame prints the commander
            in both rows only because a new deck is named after its commander by
            default; a renamed deck must show the name its owner gave it, as the
            rail and the deck tile both already do. */}
        {/* The deck name and the stamp share the row's first line. The stamp
            sat in the meta line until the measurement below moved it: with the
            longest verb and the longest figure — `committed 10mo ago` — the
            pill, the count and the stamp are three non-shrinking children of one
            line, and at 390px they need 243px of the 240 that line has. The
            commander's name had already shrunk to nothing by then, so the row's
            own overflow ate the stamp.

            Up here it sits beside the one child that is SUPPOSED to give: the
            deck name truncates, which is what a long name does anyway. No row
            grows a line, the stamp is never half-printed, and there is one stamp
            element rather than a width-switched pair. `pnpm probe:home` writes
            the longest stamp into every row and re-measures, at every width. */}
        <span className="flex min-w-0 items-baseline gap-[8px]">
          <span
            data-resume-name
            className="min-w-0 truncate font-display text-[14.5px] font-semibold text-[color:var(--fg)]"
            style={{ lineHeight: 1.2 }}
          >
            {deck.name}
          </span>
          <span
            data-resume-stamp
            className="ml-auto flex-none whitespace-nowrap font-mono text-[10.5px] text-[color:var(--fg-locked)]"
          >
            {stamp}
          </span>
        </span>

        {/* Line two (addendum §C): the plates, then the commander. The height is STATED rather
            than left to the pill (N4): a row with no chip would otherwise be the pill's 19px tall,
            and in a mixed pair of rows the deck names above would sit 2.5px apart. */}
        <span className="flex h-[22px] min-w-0 items-center gap-[14px] md:h-[24px]">
          <span className="flex flex-none items-center gap-[8px]">
            {/* With a chip, the pill and the marks are one spoken phrase, `To buy, bracket
                Upgraded`, as the tile's accessible name says it (F4). Without one the pill
                speaks for itself, as it always has. */}
            <span aria-hidden={deck.bracket ? true : undefined} className="flex">
              <StatusPillBadge
                status={deck.statusPill}
                className="flex h-[19px] flex-none items-center rounded-[5px] px-[7px] font-mono text-[10px]"
              />
            </span>
            {deck.bracket && (
              <>
                {/* Marks only on Home (R1): the row has no room for a name. */}
                <span aria-hidden className="flex">
                  <BracketChip permits={deck.bracket.permits} answered={deck.bracket.answered} face={false} />
                </span>
                <span className="sr-only">
                  {refreshCopy.decks.statusWithBracket(
                    deck.statusPill,
                    verdictHead(deck.bracket.permits, deck.bracket.answered).face,
                  )}
                </span>
              </>
            )}
          </span>
          {/* The commander names the portrait beside it. No text shadow, here
              or anywhere on this row: the type starts at the 116px inset, clear
              of the art, which is decision 9's stated exception.

              Decision 19 — a pair prints SHORT names, the substring before the
              first comma: `Ishai + Bruse Tarl` is 18 characters against 55 for
              the full pair, and the row has no room for the second. Shortening
              is pair-only, because the pair is what disambiguates two names the
              way the title disambiguates one, so no single-commander row
              changes a word.

              Two spans with the joiner leading the shrinking one, so the `+` is
              never the character truncation eats: the worst case is
              `Ishai + Br…`, which still says *pair*. Both commanders are named
              in full, primary first, in the row's accessible name below —
              truncation is a layout compromise, never an information one. */}
          {partnerName === null ? (
            <span className="min-w-0 flex-1 truncate font-mono text-[10.5px] text-[color:var(--fg-body)]">
              {commanderName}
            </span>
          ) : (
            <>
              <span
                aria-hidden
                className="flex min-w-0 flex-1 gap-[4px] overflow-hidden font-mono text-[10.5px] text-[color:var(--fg-body)]"
              >
                <span style={TRUNCATES}>{shortCommanderName(commanderName)}</span>
                <span style={{ ...TRUNCATES, flexShrink: 1000 }}>
                  {`+ ${shortCommanderName(partnerName)}`}
                </span>
              </span>
              {/* The one thing the pixels are allowed to drop and this is not:
                  both names in full, primary first, and the clause the pair row
                  does not draw. It stands in for the shortened names above
                  rather than following them, so the row is not read twice. */}
              <span className="sr-only">
                {copies === null
                  ? partnerCopy.pairAria(commanderName, partnerName)
                  : `${partnerCopy.pairAria(commanderName, partnerName)} · ${partnerCopy.pairRowBuyAria(copies)}`}
              </span>
            </>
          )}
        </span>

        {/* Line three (addendum §C, R2 = C): the tile's progress bar with the count beside it, on
            EVERY row, a row with no chip included, so the four rows are one shape. The count group
            is `flex-none` and nothing in it truncates: the bar is the only child with anything to
            give, and it keeps 85px or more at 360. */}
        <span className="flex min-w-0 items-center gap-[10px]" style={{ lineHeight: 1.2 }}>
          <span
            data-resume-bar
            className="relative h-[3px] min-w-0 flex-1 overflow-hidden rounded-[2px]"
            // `--border-strong`, not the tile's `--border`: this track stands on `--surface-inset` (N5).
            style={{ background: "var(--border-strong)" }}
          >
            {/* The tile's fill rule, kept (N5): an empty deck draws an empty track. */}
            {deck.built > 0 && (
              <span
                className="absolute top-0 bottom-0 left-0 rounded-[2px]"
                style={statusBarStyle(deck.statusPill, deck.built, bodySize)}
              />
            )}
          </span>
          <span
            data-resume-count
            className="flex flex-none gap-[4px] whitespace-nowrap font-mono text-[10.5px] text-[color:var(--fg-faint)]"
          >
            <span>{count}</span>
            {clause && <span>{`· ${refreshCopy.decks.detailCopies(copies!)}`}</span>}
          </span>
        </span>
      </span>
    </IntentPrefetchLink>
  );
}

export function ResumeDecks({
  decks,
  shopping,
  total,
  now,
}: {
  decks: DeckListItem[];
  shopping: ShoppingRollup;
  /** Every deck the player has, not the rows drawn — the footer's figure. */
  total: number;
  /** The page's one server clock, for every stamp below. */
  now: Date;
}) {
  // A heading over nothing is worse than silence. At 0 decks the dashboard mounts
  // `HomeDecksZero` in this slot instead (first-run R2), so this is only a guard: an
  // empty box under the words "pick up where you left off" is the app asserting a
  // history the player has not got.
  if (decks.length === 0) return null;

  return (
    <section className="flex flex-col gap-[12px] min-[1180px]:gap-[11px]">
      <div className="mt-[6px] flex flex-none items-baseline gap-[8px]">
        {/* §SectionLabel, with this instance's own `margin-top: 6`. */}
        <h2 className="m-0 font-mono text-[10px] font-normal tracking-[0.14em] text-[color:var(--fg-faint)] uppercase">
          {refreshCopy.home.resumeHeading}
        </h2>
        {/* The caption, at the label's own weight. It states what the order
            means; it is not a control, and the block has only ever had one
            order — a dropdown here would imply a list, which is the thing this
            round deleted. */}
        <span className="font-mono text-[10px] tracking-[0.14em] text-[color:var(--fg-locked)] lowercase">
          {refreshCopy.home.resumeSortCaption}
        </span>
      </div>

      {/* 2×2 above 1180px, stacked below, and the threshold is arithmetic. The
          old two-up line was drawn for a row with no stamp: the meta line's
          fixed content is a status pill at about 62, two 14px gaps, a
          non-shrinking count at about 45 and now a non-shrinking stamp at about
          78 — 213px before the commander's name gets a pixel, on top of the
          116px inset and 18px of right padding. A row therefore needs ~347, a
          pair needs ~706, and with 52px of page padding, the 20px gap, the
          316px rail and the 12px gap between them that is 1106px of viewport.
          1180 is the next round figure clear of it.

          At 1000 — where the pair sat before the stamp existed — each row was
          about 300px and the stamp was clipped away by the row's own overflow.
          That was measured at 1024, a width that now stacks and so cannot
          reproduce it; what `pnpm probe:home` carries forward instead is the
          measurement itself, writing the longest stamp into every row at every
          width it draws. A clipped stamp is invisible in a diff and in a class
          list alike.

          `basis-[calc(50%-6px)]` is half the row less half the 12px gap, so four
          rows wrap into two pairs; `flex-wrap` makes the second pair a second
          line rather than four columns. A single column of four would push
          Commitments off the fold and leave the right rail long and empty. */}
      <div className="flex flex-col gap-[12px] min-[1180px]:flex-row min-[1180px]:flex-wrap">
        {decks.map((deck, i) => (
          <ResumeRow
            key={deck.id}
            eager={i === 0}
            deck={deck}
            copies={toBuyCopies(shopping, deck.id)}
            now={now}
            className="min-[1180px]:basis-[calc(50%-6px)]"
          />
        ))}
      </div>

      {/* The footer the deleted `Your decks` block used to carry, in the
          construction the commanders block above already ends with. The total
          rides inside the control that goes there, so the number is a
          destination rather than a label. Absent at nought: a block whose figure
          is nought is absent, not zeroed. */}
      {total > decks.length && (
        // The commanders block above ends with exactly this pair, so this one is
        // drawn from its classes rather than a second set that merely looks
        // similar: the same mono figure at the same size and ink, and the same
        // ghost control at 44 on a phone and 32 above it. "The block ends the
        // way its neighbour does" is the handoff's decision 2, and two blocks
        // that end differently would say the two lists are different kinds of
        // thing.
        <div className="flex flex-none items-center gap-[10px] sm:gap-[12px]">
          <span className="font-mono text-[10.5px] text-[color:var(--fg-faint)] sm:text-[11px]">
            {refreshCopy.home.moreDecks(total - decks.length)}
          </span>
          <GhostButton
            href="/decks"
            className="ml-auto flex h-[44px] items-center rounded-[10px] px-[12px] text-[13px] font-normal sm:ml-0 sm:h-[32px] sm:rounded-[8px] sm:px-[13px] sm:text-[12.5px]"
          >
            {refreshCopy.home.allDecks(total)}
          </GhostButton>
        </div>
      )}
    </section>
  );
}
