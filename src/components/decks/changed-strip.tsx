// §Surfaces 2 — the what-changed strip, and the type distribution under it.
//
// A different question from the change list beside it: not which cards moved but
// how the deck's shape moved. Six cells — the deck's average mana value plus the
// five recommended-mix roles — each carrying what the figure was, and one row per
// card type whose count is not where it was.
//
// It reads two whole lists rather than the changed rows, because a role's count
// is a property of a deck and not of a diff: a draft that swapped a ramp artifact
// for a draw spell is two changed rows and says nothing about what either role
// held. `computeRoleCounts` is the fold the deck page's mix strip uses, so the
// two figures a reader sees one scroll apart come out of one function.
//
// The cells are drawn here rather than through the shipped `RoleCounterCell`:
// that cell draws a figure against its target with a fill bar, and this one draws
// a movement — `8 → 10` at two type sizes with a verdict line under it — which is
// a different cell in the design table. What the two share is the fold above.

import { deckVersioningCopy } from "../../lib/copy/deck-versioning";
// Types only: `draft-state.ts` reaches `src/db`, which throws at module init in a
// browser. See `src/lib/client-bundle-safety.test.ts`.
import type { ShapeCard } from "../../lib/decks/draft-state";
import { cardTypeGroup, groupByCardType, type CardTypeGroup } from "../../lib/decks/grouping";
import { averageManaValue } from "../../lib/decks/mana-value";
import { ROLE_ORDER, type RecommendedMix } from "../../lib/decks/mix";
import type { JobRowsByCard } from "./../../lib/decks/job-tally";
import { roleCounterFor } from "../../lib/decks/label-role-counts";

const copy = deckVersioningCopy.changed;

type ChangedStripProps = {
  /** What this deck is compared to, resolved once per request by the route. A PROP rather than
   *  an import, because the targets are now per-commander — a component reaching for a module
   *  constant would draw one deck's recommendation on every deck. */
  mix: RecommendedMix;
  /** The newest committed version's list, and null on a brew — the presence of a
   *  version, not the size of its list, is what says whether there is anything to
   *  compare against. `+12 ramp` against no previous version is a claim about a
   *  comparison that does not exist; a version that happens to hold no cards is a
   *  comparison, and every figure in it is a nought the reader moved off. */
  before: ShapeCard[] | null;
  /** The draft — the deck's own `deck_cards`, as the decklist draws them. */
  after: ShapeCard[];
  /** The label rows for the cards in both lists. Absent or null counts by `role`, as before. */
  labelRows?: JobRowsByCard | null;
};

/** A card type whose count moved. */
type TypeMove = { group: CardTypeGroup; before: number; after: number };

function tallyTypes(cards: ShapeCard[]): Map<CardTypeGroup, number> {
  const counts = new Map<CardTypeGroup, number>();
  for (const card of cards) {
    const group = cardTypeGroup(card.typeLine);
    counts.set(group, (counts.get(group) ?? 0) + card.quantity);
  }
  return counts;
}

/**
 * The types the draft moved, in the decklist's own order.
 *
 * Only the types that moved: a row whose two figures are equal is a line
 * explaining that nothing happened, and six of them would bury the two that did.
 *
 * The order comes from `groupByCardType` rather than from a list written down
 * here, because the decklist's order is not exported as one and a second copy of
 * it would put Creatures above Instants on one surface and below it on the other.
 */
function typeMoves(before: ShapeCard[], after: ShapeCard[]): TypeMove[] {
  const was = tallyTypes(before);
  const now = tallyTypes(after);
  const ordered = groupByCardType(
    [...before, ...after].map((card) => ({
      cardTypeGroup: cardTypeGroup(card.typeLine),
      name: "",
    })),
  ).map(([group]) => group);
  return ordered
    .map((group) => ({ group, before: was.get(group) ?? 0, after: now.get(group) ?? 0 }))
    .filter((move) => move.before !== move.after);
}

function StripCell({
  label,
  before,
  after,
  afterTone,
  note,
  noteTone,
}: {
  label: string;
  /** Null when there is no previous figure — a brew, or a version with nothing to
   *  average. The cell then draws the figure alone rather than an arrow out of
   *  nowhere. */
  before: string | null;
  after: string;
  afterTone: string;
  note: string | null;
  noteTone: string;
}) {
  return (
    <div
      className={
        "min-w-0 rounded-[8px] md:rounded-[9px] px-[11px] py-[9px] md:px-[14px] md:py-[12px] " +
        "md:flex-1 bg-[color:var(--surface)] border border-solid border-[color:var(--border)]"
      }
    >
      <p className="m-0 mb-[5px] md:mb-[7px] font-mono uppercase truncate text-[9px] md:text-[10px] tracking-[0.12em] md:tracking-[0.14em] text-[color:var(--fg-faint)]">
        {label}
      </p>
      <p className="m-0 flex items-baseline gap-[5px] md:gap-[7px]">
        {before !== null && (
          <>
            <span className="font-mono text-[12px] md:text-[15px] text-[color:var(--fg-locked)]">
              {before}
            </span>
            <span className="font-mono text-[10px] md:text-[12px] text-[color:var(--fg-locked)]">
              →
            </span>
          </>
        )}
        <span className="font-mono text-[16px] md:text-[19px]" style={{ color: afterTone }}>
          {after}
        </span>
      </p>
      {/* Desktop only, as the design draws it: at 390px a cell is a third of the
          screen and `still under rec 10` wraps inside it. The figures above are
          the fact; this is the reading of it, and it is the half that survives
          being read one screen later on a wider window. */}
      {note !== null && (
        <p className="hidden md:block m-0 mt-[6px] font-mono text-[10px]" style={{ color: noteTone }}>
          {note}
        </p>
      )}
    </div>
  );
}

export function ChangedStrip({ before, after, mix, labelRows }: ChangedStripProps) {
  const countRoles = roleCounterFor(labelRows);
  const beforeCounts = countRoles(before ?? []);
  const afterCounts = countRoles(after);

  // A brew has no previous shape, so nothing on this surface states a movement:
  // no before figure, no arrow, no curve direction and no type block. What is
  // left is the deck as it stands against its recommendations, which is true of a
  // first commit as much as of a fiftieth.
  const comparable = before !== null;
  const moves = before !== null ? typeMoves(before, after) : [];

  // Averaged here, off the same two lists every other cell is tallied from,
  // rather than carried alongside them. A basics-only draft leaves every figure
  // in `DraftState` empty by design, and a curve read from there would take the
  // cell off the strip on the one edit that provably cannot move it: lands are
  // out of the average, so both ends of the pair are the figure they already
  // were.
  const manaValue = averageManaValue(after);
  const manaValueBefore = before === null ? null : averageManaValue(before);
  // One denominator across the drawn bars, so two rows of the same length mean
  // the same count. The design's own bars are not on one scale (Discrepancy 19);
  // this is the reading of them that lets a reader compare two rows.
  const scale = Math.max(1, ...moves.map((move) => Math.max(move.before, move.after)));

  // Two decimals, both figures, so the pair reads as one measurement — `3.4 →
  // 3.14` would look like a different kind of number on each side of the arrow.
  // Rounded here rather than in `averageManaValue`, which answers the exact
  // average: the cell's precision is the cell's business.
  const manaValueText = manaValue !== null ? manaValue.toFixed(2) : null;
  const manaValueBeforeText = manaValueBefore !== null ? manaValueBefore.toFixed(2) : null;
  // Compared as DRAWN, not as averaged. Two averages differing in the fourth
  // decimal print the same two decimals, and an arrow between two identical
  // figures tinted `--success` states a movement the reader cannot see.
  const movedCurve =
    manaValueText !== null && manaValueBeforeText !== null
    && manaValueText !== manaValueBeforeText;
  // Direction off the exact averages, which cannot tie once the drawn figures
  // differ.
  const curveDown =
    manaValue !== null && manaValueBefore !== null && manaValue < manaValueBefore;

  return (
    <>
      {/* The mana-value cell is absent, not empty, when there is nothing to
          average: an all-land list has no curve, and a dash there would be a
          figure standing in for one. */}
      {/* Three across on the phone, two rows of them, rather than one row of six
          55px columns or three cells and three omissions: every role the deck is
          measured against is a figure the reader came here for, and a mix cell
          the phone drops is a recommendation only desktop readers are held to.
          One element with responsive classes — a grid under 768px and the
          design's single flex row above it. */}
      <div className="grid grid-cols-3 md:flex gap-[7px] md:gap-[10px] mb-[11px] md:mb-[10px]">
        {manaValueText !== null && (
          <StripCell
            label={copy.manaValue}
            before={manaValueBeforeText}
            after={manaValueText}
            // A curve coming down is the improvement, which is the only reason
            // the cell has a colour at all: there is no recommended mana value
            // for it to be short of.
            afterTone={
              !movedCurve ? "var(--fg)" : curveDown ? "var(--success)" : "var(--warning)"
            }
            note={!movedCurve ? null : curveDown ? copy.manaValueDown : copy.manaValueUp}
            noteTone="var(--fg-locked)"
          />
        )}
        {ROLE_ORDER.map((role) => {
          const { label, target } = mix.cells[role];
          const have = afterCounts[role];
          const was = beforeCounts[role];
          const met = have >= target;
          return (
            <StripCell
              key={role}
              label={label}
              before={comparable ? String(was) : null}
              after={String(have)}
              // Rec-relative, never movement-relative: a role that lost a card
              // and still clears its recommendation has not gone wrong, and one
              // that gained two and is still short has not arrived.
              afterTone={met ? "var(--success)" : "var(--warning)"}
              note={met ? copy.clears(target) : copy.under(target)}
              // Green only where the draft is what carried the role over — an
              // already-met role reads its verdict as the standing fact it is.
              noteTone={met && comparable && was < target ? "var(--success)" : "var(--fg-locked)"}
            />
          );
        })}
      </div>

      {moves.length > 0 && (
        <section className="rounded-[8px] md:rounded-[9px] px-[12px] py-[11px] md:px-[16px] md:py-[14px] mb-[13px] md:mb-[20px] bg-[color:var(--surface)] border border-solid border-[color:var(--border)]">
          <h2 className="m-0 mb-[9px] md:mb-[11px] font-mono uppercase text-[9px] md:text-[10px] tracking-[0.12em] md:tracking-[0.14em] text-[color:var(--fg-faint)]">
            {copy.shapeHeading}
          </h2>
          <div className="flex flex-col gap-[6px] md:gap-[7px]">
            {moves.map((move) => {
              const delta = move.after - move.before;
              const kept = Math.min(move.before, move.after);
              const headroom = scale - Math.max(move.before, move.after);
              return (
                <div key={move.group} className="flex items-center gap-[8px] md:gap-[12px]">
                  {/* The name takes the row's spare width on a phone and the
                      figure beside it sizes to its digits: a type name is the
                      variable-length half of the pair, and a fixed slot for it
                      truncated `Enchantment` while `2 → 3` sat in space it had
                      no use for. Desktop keeps its fixed columns, where the bar
                      is what absorbs the slack. */}
                  <span className="min-w-0 flex-1 truncate md:flex-none md:shrink-0 md:w-[110px] text-[12px] md:text-[12.5px] text-[color:var(--fg-body)]">
                    {move.group}
                  </span>
                  {/* The after figure carries the row's ink and the before figure
                      is the faint one, exactly as in the cells above: the pair is
                      one measurement, and which end of it is the deck's shape now
                      should not need the arrow to be read. */}
                  <span className="shrink-0 md:w-[96px] font-mono text-[11px] md:text-[11.5px] text-[color:var(--fg-faint)]">
                    {move.before} → <span className="text-[color:var(--fg)]">{move.after}</span>
                  </span>
                  {/* Desktop only, and the one thing here that is not a figure:
                      what the row gained or lost against what it kept. */}
                  <div
                    aria-hidden
                    className="hidden md:flex flex-1 max-w-[520px] h-[7px] rounded-full overflow-hidden bg-[color:var(--border)]"
                  >
                    {/* The design names this segment by hex alone; `--fg-disabled`
                        is that exact value under the shipped theme, so the kept
                        portion follows a theme rather than one theme's palette. */}
                    <span
                      style={{ flexGrow: kept, flexBasis: 0, background: "var(--fg-disabled)" }}
                    />
                    <span
                      style={{
                        flexGrow: Math.abs(delta),
                        flexBasis: 0,
                        background: delta > 0 ? "var(--success)" : "var(--warning)",
                      }}
                    />
                    <span style={{ flexGrow: headroom, flexBasis: 0, background: "transparent" }} />
                  </div>
                  <span
                    className="shrink-0 md:w-[44px] md:text-right font-mono text-[11px] md:text-[11.5px]"
                    style={{ color: delta > 0 ? "var(--success)" : "var(--warning)" }}
                  >
                    {copy.delta(delta)}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}
