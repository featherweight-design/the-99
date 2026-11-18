// PROPOSAL (request history R1b, Hugh 2026-11-17): a section's heading and its links live INSIDE the box that holds its
// rows, as the box's header band, never on a bare hairline above it. One shape for Waiting on you, Your requests, Friends
// and each month of Request history. Empty states get a drawn mark, from the CardFan family's tokens.
import type { ReactNode } from "react";
import { SpareGlyph } from "./spare-key-item";

/** The box: the shipped list well (Your requests' `ul`), now holding its own heading. */
export const PANEL =
  "mt-[26px] overflow-hidden rounded-[14px] bg-[color:var(--surface-inset)] [border:1px_solid_var(--border)] md:mt-[34px]";

/** The header band: the shipped section-head type, on the rail ground, a hairline under it, links at its end. */
export const BAND =
  "m-0 flex min-h-[48px] items-center justify-between gap-[12px] bg-[color:var(--surface-rail)] pl-[14px] pr-[6px] font-mono text-[10.5px] font-medium uppercase tracking-[.14em] text-[color:var(--fg-faint)] outline-none [border-bottom:1px_solid_var(--border)] md:min-h-[44px] md:pl-[16px] md:pr-[8px]";

/** A link or press at the band's end: 44px tall at phone, the bar's sans. */
export const BAND_LINK =
  "flex min-h-[44px] items-center px-[8px] font-sans text-[12.5px] font-medium normal-case tracking-normal text-[color:var(--fg)] no-underline md:min-h-[36px]";

/**
 * The handover mark: two cards, a friend's (dashed, behind) and the one passed (accent edge, tilted forward), with the
 * spare glyph on the passed card. Tokens only, in CardFan's inks. Decorative: the heading says it in words.
 */
export function HandoverMark({ size = "sm" }: { size?: "sm" | "lg" }) {
  const lg = size === "lg";
  const W = lg ? 132 : 72, H = lg ? 112 : 62, cw = lg ? 54 : 30, ch = lg ? 76 : 42, rx = lg ? 8 : 5;
  return (
    <span aria-hidden className="relative inline-flex" style={{ width: W, height: H }}>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H}>
        <g transform={`translate(${W * 0.36}, ${H / 2}) rotate(-10)`}>
          <rect x={-cw / 2} y={-ch / 2} width={cw} height={ch} rx={rx} fill="var(--elevated)" stroke="var(--border-dashed)" strokeWidth="1.5" strokeDasharray="4 3" />
        </g>
        <g transform={`translate(${W * 0.62}, ${H / 2 + (lg ? 4 : 2)}) rotate(12)`}>
          <rect x={-cw / 2} y={-ch / 2} width={cw} height={ch} rx={rx} fill="var(--border)" stroke="var(--accent)" strokeWidth="1.5" />
        </g>
        <path d={lg ? `M ${W * 0.2} ${H * 0.16} C ${W * 0.38} ${H * 0.02}, ${W * 0.62} ${H * 0.02}, ${W * 0.78} ${H * 0.14}` : `M ${W * 0.2} ${H * 0.14} C ${W * 0.38} ${H * 0.01}, ${W * 0.62} ${H * 0.01}, ${W * 0.78} ${H * 0.12}`}
          fill="none" stroke="var(--fg-faint)" strokeWidth="1.5" strokeLinecap="round" />
        <path d={`M ${W * 0.78 - 5} ${H * (lg ? 0.14 : 0.12) - 5} L ${W * 0.78} ${H * (lg ? 0.14 : 0.12)} L ${W * 0.78 - 6} ${H * (lg ? 0.14 : 0.12) + 3}`}
          fill="none" stroke="var(--fg-faint)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="absolute text-[color:var(--fact)]" style={{ left: W * 0.62 - (lg ? 11 : 7), top: H / 2 + (lg ? 4 : 2) - (lg ? 11 : 7) }}>
        <SpareGlyph size={lg ? 22 : 14} />
      </span>
    </span>
  );
}

/** An empty panel body: the mark, a title, one line, at most one press. */
export function PanelEmpty({ title, body, action, size = "sm" }: { title: string; body: string; action?: ReactNode; size?: "sm" | "lg" }) {
  const lg = size === "lg";
  return (
    <div className={`flex flex-col items-center text-center ${lg ? "gap-[8px] px-[22px] pb-[30px] pt-[28px] md:pb-[38px] md:pt-[36px]" : "gap-[6px] px-[18px] pb-[22px] pt-[20px]"}`}>
      <HandoverMark size={size} />
      <p className={`m-0 mt-[6px] font-display font-bold text-[color:var(--fg)] ${lg ? "text-[19px] md:text-[21px]" : "text-[16px]"}`}>{title}</p>
      <p className={`m-0 max-w-[380px] leading-[1.55] text-[color:var(--fg-body)] ${lg ? "text-[13.5px]" : "text-[13px]"}`}>{body}</p>
      {action}
    </div>
  );
}
