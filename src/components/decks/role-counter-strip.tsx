// Role Counter Strip — §Role Counter Strip — 5 cells.
// Server component — recomputes role counts from detail.cards.
import { deckVersioningCopy } from "../../lib/copy/deck-versioning";
import type { DeckDetailCard } from "../../lib/decks/grouping";
import { roleCounterFor } from "../../lib/decks/label-role-counts";
import type { JobRowsByCard } from "../../lib/decks/job-tally";
import {
  mixSourceLine,
  type RecommendedMix,
  ROLE_ORDER,
  type MixRole,
} from "../../lib/decks/mix";
import { RoleCounterCell } from "./role-counter-cell";
import { StripRationale } from "./strip-rationale";

/**
 * `onSeeShelf` switches the builder to Consider, scrolls to that role's shelf
 * and moves focus onto its heading. A cell cannot be an anchor: the Consider
 * panel is unmounted while the deck tab is up, so the `#shelf-*` heading does
 * not exist at click time.
 *
 * `rolesWithShelves` names the roles Consider actually draws a shelf for, which
 * is not every short role: a shelf is built from owned suggestions, so a role
 * with none is missing from the panel and the scroll would find nothing.
 *
 * The two arrive together or not at all. Supplying the handler alone would
 * disable every short cell rather than fail, and a strip that silently offers
 * nothing is the exact defect this prop was added to close.
 */
type RoleCounterStripProps = {
  /** What this deck is compared to, resolved once per request by the route. A PROP rather than
   *  an import, because the targets are now per-commander — a component reaching for a module
   *  constant would draw one deck's recommendation on every deck. */
  mix: RecommendedMix;
  cards: DeckDetailCard[];
  /** True when the deck was just filled (`deck.filled && autoCount > 0`). Passed
   *  straight through to each cell so a short cell reads as a short-in-filled-deck
   *  rather than as an ordinary short. Defaults to false. */
  justFilled?: boolean;
  /** The role counts the newest committed version held (#389). Absent on a brew
   *  and on a committed deck with nothing pending. A cell whose figure has not
   *  moved keeps its recommendation line, so an unchanged role says nothing new.
   *  Must be the same fold as `counts` below — the caller runs
   *  `computeRoleCounts` over the version's cards — or the two figures in one
   *  cell are measuring different things. */
  wasCounts?: Record<MixRole, number>;
  /** The deck's label rows when the strip counts by label (`LABEL_ROLE_COUNTS_ENABLED`); absent or
   *  null counts by `card.role`, exactly as before. */
  labelRows?: JobRowsByCard | null;
} & (
  | { onSeeShelf: (role: MixRole) => void; rolesWithShelves: ReadonlySet<MixRole> }
  | { onSeeShelf?: never; rolesWithShelves?: never }
);

export function RoleCounterStrip({
  mix,
  cards,
  onSeeShelf,
  rolesWithShelves,
  justFilled = false,
  wasCounts,
  labelRows,
}: RoleCounterStripProps) {
  const countRoles = roleCounterFor(labelRows);
  const counts = countRoles(cards);

  return (
    /*
      §Strip container (desktop)
      mobile:  within spine, compressed
      desktop: p 14px 30px, border-bottom 1px var(--border)
    */
    <section
      className="px-[16px] py-[10px] md:px-[30px] md:py-[14px]"
      style={{ borderBottom: "1px solid var(--border)" }}
      aria-label="Recommended mix"
    >
      {/*
        §Strip header row
        mobile:  flex, baseline, mb 6px, justify space-between
        desktop: flex, baseline, gap 10px, mb 10px
      */}
      <div
        className="flex items-baseline justify-between md:justify-start md:gap-[10px] mb-[8px] md:mb-[12px]"
      >
        {/* §Strip header — "Recommended mix" label */}
        {/* mobile: var(--fg-faint) · desktop: var(--fg-body) (design table §Strip header — "Recommended mix" label) */}
        <span
          className="font-mono uppercase text-[9px] md:text-[11px] tracking-[0.1em] md:tracking-[0.12em] text-[color:var(--fg-faint)] md:text-[color:var(--fg-body)]"
        >
          Recommended mix
        </span>

        {/* §Strip header — source copy (desktop). The phone had its own
            "a guide, not a gate" gloss here; both said the same thing and
            neither said what the numbers are, which is what StripRationale
            below is for. */}
        <span
          className="hidden md:inline font-mono text-[10.5px]"
          style={{ color: "var(--fg-faint)" }}
        >
          {mixSourceLine(mix)}
        </span>

        {/* §Strip header — the draft sub-run (#389, surface 1). `wasCounts` is
            the draft's own presence: absent on a brew and on a committed deck
            with nothing pending, which is exactly when the figures below have
            only one list to have come from. It rides the source line's size and
            breakpoint so the two read as one sentence. */}
        {wasCounts && (
          <span
            className="hidden md:inline font-mono text-[10.5px] tracking-[0.06em]"
            style={{ color: "var(--accent)" }}
          >
            {deckVersioningCopy.pending.mixStripDraftNote}
          </span>
        )}
      </div>

      {/* Role cells row */}
      <div className="flex gap-[4px] md:gap-[8px]">
        {ROLE_ORDER.map((role) => (
          <RoleCounterCell
            key={role}
            label={mix.cells[role].label}
            have={counts[role]}
            target={mix.cells[role].target}
            advisory={mix.cells[role].advisory}
            justFilled={justFilled}
            was={wasCounts?.[role] !== counts[role] ? wasCounts?.[role] : undefined}
            onSeeShelf={
              onSeeShelf &&
              counts[role] < mix.cells[role].target &&
              rolesWithShelves?.has(role)
                ? () => onSeeShelf(role)
                : undefined
            }
          />
        ))}
      </div>

      {/* One disclosure for the strip, where there were five per-cell buttons.
          The desktop worked-example callout that used to sit below it is gone:
          it taught how to read a cell using hypothetical numbers, and
          StripRationale answers the same question about the reader's own deck
          and answers it better. Two explanations of one strip, the permanent
          one weaker than the one behind the disclosure. */}
      <StripRationale mix={mix} />
    </section>
  );
}
