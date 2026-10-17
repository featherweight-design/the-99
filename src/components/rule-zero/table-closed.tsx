// The expired table (L4, H3): `This table has closed`, why, and that logged games stay, over the seated faces
// greyed round an empty table; `Back to Friends`. Centered in the page at both widths. The pod row and Home's card
// are already gone by the time this draws, since every read filters `expires_at > now()`.

import { ruleZeroCopy } from "../../lib/copy/rule-zero";
import { Face } from "../social/face";
import { BackLink } from "./back-link";
import { GhostButton } from "../ui/button";

const copy = ruleZeroCopy.expired;

/** The board's oval: faces round a 140 × 62 table in a 200 × 120 box, the first at the top, clockwise. */
const RX = 83;
const RY = 44;

export function TableClosed({
  podName,
  setBy,
  faces,
}: {
  podName: string;
  /** The setter's display name, or null when the viewer set it. */
  setBy: string | null;
  /** The seated players, drawn greyed: their names (for initials) and their decks' art. */
  faces: readonly { name: string; artCropUri: string | null }[];
}) {
  return (
    // The phone keeps its `‹ Friends` row (L4); desktop draws the card alone, centered in the page (H3).
    <div className="flex min-h-[calc(100dvh-140px)] flex-col">
      <BackLink className="h-[44px] gap-[4px] px-[8px] text-[14px] xl:hidden" glyph />
      <div data-testid="table-closed" className="m-auto flex max-w-[440px] flex-col items-center gap-[12px] px-[20px] py-[30px] text-center">
        <div aria-hidden className="relative mb-[8px] h-[120px] w-[200px]">
          <span className="absolute left-[30px] top-[30px] h-[62px] w-[140px] rounded-[31px] border-[1.5px] border-dashed border-[color:var(--border-dashed)]" />
          {faces.map((f, i) => {
            const a = (2 * Math.PI * i) / faces.length;
            return (
              <span
                key={i}
                className="absolute rounded-full opacity-55 shadow-[0_0_0_1px_rgba(255,255,255,.12)] [filter:grayscale(.6)]"
                style={{ left: Math.round(RX + RX * Math.sin(a)), top: Math.round(RY - RY * Math.cos(a)) }}
              >
                <Face name={f.name} commander={{ artCropUri: f.artCropUri }} size={30} className="h-[34px]! w-[34px]! rounded-full! bg-[color:var(--elevated)]! font-semibold! text-[color:var(--fg-muted)]! [border:1.5px_solid_var(--bg)]!" />
              </span>
            );
          })}
        </div>
        <h1 className="m-0 font-display text-[22px] font-bold">{copy.title}</h1>
        <p className="m-0 text-[14.5px] leading-[1.6] text-[color:var(--fg-muted)] [text-wrap:pretty]">
          {copy.body(podName, setBy ?? "you")}
        </p>
        <GhostButton href="/friends" className="inline-flex min-h-[44px] items-center justify-center rounded-[10px] px-[18px] text-[14.5px]">
          {copy.back}
        </GhostButton>
      </div>
    </div>
  );
}
