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

interface RoleCounterStripProps {
  cards: DeckDetailCard[];
}

const ROLE_ORDER: MixRole[] = ["ramp", "draw", "removal", "wipes", "land"];

export function RoleCounterStrip({ cards }: RoleCounterStripProps) {
  const counts = computeRoleCounts(cards);

  return (
    /*
      §Strip container (desktop)
      mobile:  within spine, compressed
      desktop: p 14px 30px, border-bottom 1px #2A241D
    */
    <section
      className="px-[16px] py-[10px] md:px-[30px] md:py-[14px]"
      style={{ borderBottom: "1px solid #2A241D" }}
      aria-label="Recommended mix"
    >
      {/*
        §Strip header row
        mobile:  flex, baseline, mb 6px, justify space-between
        desktop: flex, baseline, gap 10px, mb 10px
      */}
      <div
        className="flex items-baseline justify-between md:justify-start md:gap-[10px] mb-[6px] md:mb-[10px]"
      >
        {/* §Strip header — "Recommended mix" label */}
        {/* mobile: #8E8269 · desktop: #C6B79A (design table §Strip header — "Recommended mix" label) */}
        <span
          className="font-mono uppercase text-[9px] md:text-[11px] tracking-[0.1em] md:tracking-[0.12em] text-[#8E8269] md:text-[#C6B79A]"
        >
          Recommended mix
        </span>

        {/* §Strip header — "a guide, not a gate" */}
        <span
          className="font-mono text-[9px] md:hidden"
          style={{ color: "#6E6353" }}
        >
          a guide, not a gate
        </span>

        {/* §Strip header — source copy (desktop) */}
        <span
          className="hidden md:inline font-mono text-[10.5px]"
          style={{ color: "#8E8269" }}
        >
          {RECOMMENDED_MIX_SOURCE_LINE}
        </span>

        {/* §Strip header — hover hint (desktop) */}
        <span
          className="hidden md:inline font-mono text-[10.5px] ml-auto"
          style={{ color: "#6E6353" }}
        >
          Click a cell for rationale
        </span>
      </div>

      {/* Role cells row */}
      <div className="flex gap-[4px] md:gap-[8px]">
        {ROLE_ORDER.map((role) => (
          <RoleCounterCell
            key={role}
            role={role}
            label={RECOMMENDED_MIX[role].label}
            have={counts[role]}
            target={RECOMMENDED_MIX[role].target}
            advisory={RECOMMENDED_MIX[role].advisory}
            rationale={RECOMMENDED_MIX[role].rationale}
          />
        ))}
      </div>

      {/*
        §Worked-example callout (desktop mid-build)
        display flex, align-items flex-start, gap 11px, mt 12px
        bg #181410, border 1px #2A241D, border-left 3px #C9A24B
        br 9px, p 11px 15px
      */}
      <div
        className="hidden md:flex items-start gap-[11px] mt-[12px] rounded-[9px] px-[15px] py-[11px]"
        style={{
          background: "#181410",
          border: "1px solid #2A241D",
          borderLeft: "3px solid #C9A24B",
        }}
      >
        {/* §Worked-example callout — "i" icon */}
        <div
          className="flex-none flex items-center justify-center rounded-full font-display font-bold text-[12px]"
          style={{
            width: 20,
            height: 20,
            border: "1.5px solid #C9A24B",
            color: "#C9A24B",
          }}
          aria-hidden
        >
          i
        </div>
        {/* §Worked-example callout — text */}
        <p
          className="text-[12.5px] leading-[1.55]"
          style={{ color: "#C6B79A" }}
        >
          {RECOMMENDED_MIX_WORKED_EXAMPLE}
        </p>
      </div>
    </section>
  );
}
