import { ReplaceFlow } from "../collection/replace-flow";
import { shellCopy } from "../../lib/copy/shell";
import { Crown } from "../ui/crown";

/**
 * First-run home is the checklist itself (design decision #4).
 * Step 1 is active + wired to the upload flow. Steps 2 & 3 are locked/dimmed.
 * Style per property table §First-Run Home — Hybrid Checklist.
 */
export function FirstRunChecklist({ name }: { name: string | null }) {
  return (
    <div className="p-5 md:px-10 md:pt-[34px] md:pb-11 bg-[radial-gradient(640px_340px_at_40%_-40px,rgba(201,162,75,0.07),transparent_70%)]">
      {/* §Page heading:
          Mobile:  Cinzel 700 23px primary, line-height 1.2
          Desktop: Cinzel 700 30px primary
          Content: "Welcome to the 99, {name}" (or "Welcome to the 99" when name null) */}
      {/* The crown is load-bearing here: this is the first brand moment a new
          player sees, so it sits above the heading rather than beside it. */}
      <Crown tone="page" className="mb-[14px]" />
      <h1
        className="text-[23px] md:text-[30px]"
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          color: "var(--fg)",
          lineHeight: 1.2,
          margin: 0,
        }}
      >
        {name ? `Welcome to the 99, ${name}` : "Welcome to the 99"}
      </h1>

      {/* §Page subhead:
          Mobile:  13px fg-body, margin 8px 0 20px, line-height 1.5
                   content "Three steps to your first recommendations."
          Desktop: 15px fg-body, margin 10px 0 28px
                   content "Three steps to your first recommendations. Start by handing us your cards." */}
      <p
        className="text-[13px] md:text-[15px] mt-[8px] md:mt-[10px] mb-[20px] md:mb-[28px] leading-[1.5]"
        style={{ color: "var(--fg-body)" }}
      >
        <span className="md:hidden">Three steps to your first recommendations.</span>
        <span className="hidden md:inline">
          Three steps to your first recommendations. Start by handing us your cards.
        </span>
      </p>

      {/* Step 1 — Active
          §Step 1 active container:
            Mobile:  bg surface, border accent, br 12px, padding 16px
            Desktop: bg surface, border accent, br 14px, padding 26px 28px */}
      <div
        className="rounded-[12px] md:rounded-[14px] p-4 md:p-[26px_28px]"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--accent)",
        }}
      >
        <div className="flex items-center gap-3">
          {/* §Step badge — Active:
              Mobile:  22×22px, br 999px, bg accent, color base, mono 12px 600
              Desktop: 26×26px, br 999px, bg accent, color base, mono 13px 600 */}
          <span
            className="flex h-[22px] w-[22px] md:h-[26px] md:w-[26px] items-center justify-center rounded-full text-[12px] md:text-[13px]"
            style={{
              background: "var(--accent)",
              color: "var(--bg)",
              fontFamily: "var(--font-mono)",
              fontWeight: 600,
            }}
          >
            1
          </span>
          {/* §Step label — Active:
              Mobile:  Cinzel 600 16px primary
              Desktop: Cinzel 600 20px primary */}
          <span
            className="text-[16px] md:text-[20px]"
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              color: "var(--fg)",
            }}
          >
            Upload your collection
          </span>
        </div>
        <div className="mt-5">
          <ReplaceFlow currentCardCount={0} embedded />
        </div>
      </div>

      {/* Steps 2 & 3 — Locked.
          §Step container — Locked:
            Mobile:  flex, align-center, gap 10px, padding 15px 16px,
                     mt 12px (step 2) / 10px (step 3), bg #181410,
                     border 1px solid elevated, br 12px, opacity 0.55
            Desktop: flex, align-center, gap 12px, padding 18px 22px,
                     mt 14px (step 2) / 12px (step 3), bg #181410,
                     border 1px solid elevated, br 14px, opacity 0.55 */}
      <div
        className="mt-[12px] md:mt-[14px] flex items-center gap-[10px] md:gap-[12px] rounded-[12px] md:rounded-[14px] p-[15px_16px] md:p-[18px_22px] opacity-[0.55]"
        style={{
          background: "#181410",
          border: "1px solid var(--border)",
        }}
      >
        {/* §Step badge — Locked:
            Mobile:  22×22px, br 999px, border #4A4033, color faint, mono 12px
            Desktop: 26×26px, br 999px, border #4A4033, color faint, mono 13px */}
        <span
          className="flex h-[22px] w-[22px] md:h-[26px] md:w-[26px] shrink-0 items-center justify-center rounded-full text-[12px] md:text-[13px]"
          style={{
            border: "1px solid #4A4033",
            color: "var(--fg-faint)",
            fontFamily: "var(--font-mono)",
          }}
        >
          2
        </span>
        {/* §Step label — Locked:
            Mobile:  Cinzel 600 15px muted
            Desktop: Cinzel 600 18px muted */}
        <span
          className="text-[15px] md:text-[18px]"
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            color: "var(--fg-muted)",
          }}
        >
          Review your commanders
        </span>
        {/* §Locked step "unlocks after upload" hint (desktop only):
            ml-auto, mono 11px, color #8E8269, content "unlocks after upload" (step 2 only) */}
        <span
          className="ml-auto hidden md:block"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--fg-faint)",
          }}
        >
          {shellCopy.firstRun.lockedHint}
        </span>
      </div>

      <div
        className="mt-[10px] md:mt-[12px] flex items-center gap-[10px] md:gap-[12px] rounded-[12px] md:rounded-[14px] p-[15px_16px] md:p-[18px_22px] opacity-[0.55]"
        style={{
          background: "#181410",
          border: "1px solid var(--border)",
        }}
      >
        <span
          className="flex h-[22px] w-[22px] md:h-[26px] md:w-[26px] shrink-0 items-center justify-center rounded-full text-[12px] md:text-[13px]"
          style={{
            border: "1px solid #4A4033",
            color: "var(--fg-faint)",
            fontFamily: "var(--font-mono)",
          }}
        >
          3
        </span>
        <span
          className="text-[15px] md:text-[18px]"
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            color: "var(--fg-muted)",
          }}
        >
          Build your first deck
        </span>
      </div>
    </div>
  );
}
