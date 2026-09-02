// Role Counter Strip — §Role Counter Strip — 5 cells.
// Server component — recomputes role counts from detail.cards.
import type { DeckDetailCard } from "../../lib/decks/grouping";
import {
  computeRoleCounts,
  RECOMMENDED_MIX,
  RECOMMENDED_MIX_SOURCE_LINE,
  RECOMMENDED_MIX_WORKED_EXAMPLE,
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
} & (
  | { onSeeShelf: (role: MixRole) => void; rolesWithShelves: ReadonlySet<MixRole> }
  | { onSeeShelf?: never; rolesWithShelves?: never }
);

const ROLE_ORDER: MixRole[] = ["ramp", "draw", "removal", "wipes", "land"];

export function RoleCounterStrip({
  cards,
  onSeeShelf,
  rolesWithShelves,
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

        {/* §Strip header — "a guide, not a gate" */}
        <span
          className="font-mono text-[9px] md:hidden"
          style={{ color: "var(--fg-locked)" }}
        >
          a guide, not a gate
        </span>

        {/* §Strip header — source copy (desktop) */}
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

      {/* One disclosure for the strip, where there were five per-cell buttons. */}
      <StripRationale />

      {/*
        §Worked-example callout (desktop mid-build)
        display flex, align-items flex-start, gap 11px, mt 12px
        bg var(--surface-sunken), border 1px var(--border), border-left 3px var(--accent)
        br 9px, p 11px 15px
      */}
      <div
        className="hidden md:flex items-start gap-[11px] mt-[12px] rounded-[9px] px-[15px] py-[11px]"
        style={{
          background: "var(--surface-sunken)",
          border: "1px solid var(--border)",
          borderLeft: "3px solid var(--accent)",
        }}
      >
        {/* §Worked-example callout — "i" icon */}
        <div
          className="flex-none flex items-center justify-center rounded-full font-display font-bold text-[12px]"
          style={{
            width: 20,
            height: 20,
            border: "1.5px solid var(--accent)",
            color: "var(--accent)",
          }}
          aria-hidden
        >
          i
        </div>
        {/* §Worked-example callout — text */}
        <p
          className="text-[12.5px] leading-[1.55]"
          style={{ color: "var(--fg-body)" }}
        >
          {RECOMMENDED_MIX_WORKED_EXAMPLE}
        </p>
      </div>
    </section>
  );
}
