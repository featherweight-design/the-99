// Role Counter Strip — §Role Counter Strip — 5 cells.
// Server component — recomputes role counts from detail.cards.
import type { DeckDetailCard } from "../../lib/decks/grouping";
import {
  computeRoleCounts,
  RECOMMENDED_MIX,
  RECOMMENDED_MIX_SOURCE_LINE,
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
  cards: DeckDetailCard[];
  /** True when the deck was just filled (`deck.filled && autoCount > 0`). Passed
   *  straight through to each cell so a short cell reads as a short-in-filled-deck
   *  rather than as an ordinary short. Defaults to false. */
  justFilled?: boolean;
} & (
  | { onSeeShelf: (role: MixRole) => void; rolesWithShelves: ReadonlySet<MixRole> }
  | { onSeeShelf?: never; rolesWithShelves?: never }
);

const ROLE_ORDER: MixRole[] = ["ramp", "draw", "removal", "wipes", "land"];

export function RoleCounterStrip({
  cards,
  onSeeShelf,
  rolesWithShelves,
  justFilled = false,
}: RoleCounterStripProps) {
  const counts = computeRoleCounts(cards);

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
          {RECOMMENDED_MIX_SOURCE_LINE}
        </span>
      </div>

      {/* Role cells row */}
      <div className="flex gap-[4px] md:gap-[8px]">
        {ROLE_ORDER.map((role) => (
          <RoleCounterCell
            key={role}
            label={RECOMMENDED_MIX[role].label}
            have={counts[role]}
            target={RECOMMENDED_MIX[role].target}
            advisory={RECOMMENDED_MIX[role].advisory}
            justFilled={justFilled}
            onSeeShelf={
              onSeeShelf &&
              counts[role] < RECOMMENDED_MIX[role].target &&
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
      <StripRationale />
    </section>
  );
}
