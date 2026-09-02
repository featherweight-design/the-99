// Guided Banner (First-Run) — §Guided Banner (First-Run).
// Server component. Rendered only when firstRun === true.
import { CardFan } from "../marks";

interface GuidedBannerProps {
  commanderName: string;
}

export function GuidedBanner({ commanderName }: GuidedBannerProps) {
  return (
    /*
      §Banner container
      mobile:  bg var(--surface), border 1px var(--border), border-left 3px var(--accent), br 10px, p 12px 14px, block, m 20px 16px 0
      desktop: bg linear-gradient(120deg,var(--surface-raised),var(--surface-rail) 60%), border 1px var(--border-strong), br 14px,
               p 22px 26px, flex, items-center, gap 24px, m 26px 32px 0
      Responsive background/border split handled by .guided-banner in globals.css.
    */
    <div
      className="guided-banner mx-[16px] mt-[20px] md:mx-[32px] md:mt-[26px] rounded-[10px] md:rounded-[14px] px-[14px] py-[12px] md:px-[26px] md:py-[22px] block md:flex md:items-center md:gap-[24px]"
    >
      {/* Left: step label + diamond crumb + title + body (fills remaining space on desktop) */}
      <div className="flex-1 min-w-0">
        {/* §Banner — step label */}
        <p
          className="font-mono uppercase text-[10px] tracking-[0.14em] md:tracking-[0.16em]"
          style={{ color: "var(--accent)" }}
        >
          Step 3 of 3
        </p>

        {/* §Banner — diamond crumb (3 diamonds: 2 done + 1 active) */}
        <div className="flex items-center gap-[5px] md:gap-[6px] mt-[5px]">
          {/* Done steps: 6×6px (mobile) / 7×7px (desktop), green */}
          <div
            className="md:hidden"
            style={{ width: 6, height: 6, background: "var(--success)", transform: "rotate(45deg)" }}
            aria-hidden
          />
          <div
            className="hidden md:block"
            style={{ width: 7, height: 7, background: "var(--success)", transform: "rotate(45deg)" }}
            aria-hidden
          />
          <div
            className="md:hidden"
            style={{ width: 6, height: 6, background: "var(--success)", transform: "rotate(45deg)" }}
            aria-hidden
          />
          <div
            className="hidden md:block"
            style={{ width: 7, height: 7, background: "var(--success)", transform: "rotate(45deg)" }}
            aria-hidden
          />
          {/* Active step: 8×8px (mobile) / 9×9px (desktop), accent */}
          <div
            className="md:hidden"
            style={{ width: 8, height: 8, background: "var(--accent)", transform: "rotate(45deg)" }}
            aria-hidden
          />
          <div
            className="hidden md:block"
            style={{ width: 9, height: 9, background: "var(--accent)", transform: "rotate(45deg)" }}
            aria-hidden
          />
        </div>

        {/* §Banner — title "Build your first deck" */}
        <h2
          className="font-display font-semibold md:font-bold text-[15px] md:text-[23px] mt-[7px] md:mt-[6px]"
          style={{ color: "var(--fg)" }}
        >
          Build your first deck
        </h2>

        {/* §Banner — body copy */}
        <p
          className="text-[12.5px] md:text-[14px] leading-[1.5] md:leading-[1.55] mt-[3px] md:mt-[4px] md:max-w-[640px]"
          style={{ color: "var(--fg-body)" }}
        >
          Search cards or pick from your suggestions below — every card you add is counted
          toward your 99.
        </p>
      </div>

      {/* Right column on desktop: card-fan glyph + 0/99 figure + commander sub-label */}
      {/* On mobile: card-fan is hidden (brief says mobile variant in empty mark, not here) */}
      <div className="hidden md:flex flex-col items-center gap-[2px] flex-none">
        {/* §Banner — card-fan glyph: 52×52 (desktop) */}
        <div style={{ width: 52, height: 52 }}>
          <CardFan variant="decks-desktop" className="scale-[0.43] origin-top-left" />
        </div>

        {/* §Banner — 0/99 figure */}
        <p
          className="font-mono font-semibold text-[30px] text-center"
          style={{ color: "var(--fg)" }}
        >
          0/99
        </p>

        {/* §Banner — "+ Korvold" sub-label */}
        <p
          className="font-mono text-[10px] text-center mt-[2px]"
          style={{ color: "var(--fg-faint)" }}
        >
          + {commanderName}
        </p>
      </div>
    </div>
  );
}
