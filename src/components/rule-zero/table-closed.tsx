"use client";
// The expired table (L4, H3): `This table has closed`, why, and that logged games stay, over the seated faces
// greyed round an empty table; `Back to Friends`. Centered in the page at both widths. The pod row and Home's card
// are already gone by the time this draws, since every read applies the open predicate (not closed and not past `expires_at`);
// a host-closed table keeps Log this game for its seated players until its original morning (`how.logOpen`), over
// Back to Friends in the board's 300px column (C3 to C5). How it ended is the sentence: the shipped morning one, or the
// closer's with the time they closed it (revisions 5).

import { ruleZeroCopy } from "../../lib/copy/rule-zero";
import { PersonText } from "../../lib/person-name";
import { logGameHref } from "../../lib/rule-zero/table-view";
import type { ClosedTable } from "../../lib/social/rule-zero-table";
import { closesWhen } from "../../lib/social/when";
import { useHydrated } from "../ui/hydrated-art";
import { Face } from "../social/face";
import { BackLink } from "./back-link";
import { GhostButton } from "../ui/button";

const copy = ruleZeroCopy.expired;

/** The board's oval: faces round a 140 × 62 table in a 200 × 120 box, the first at the top, clockwise. */
const RX = 83;
const RY = 44;

export function TableClosed({ closed }: { closed: ClosedTable }) {
  const { podName, setBy, faces, how } = closed;
  // The time is the reader's own zone after hydration; the server draws UTC so the two first renders agree (`when.ts`).
  const utc = !useHydrated();
  const at = (d: Date) => closesWhen(d, d, utc ? "UTC" : undefined);
  const closer = how.kind === "host" ? (how.byYou ? "you" : (how.by ?? setBy)) : null;
  // A host close names who closed it; with no one to name (their profile is gone), the shipped sentence stands.
  const body =
    how.kind === "host" && closer === "you"
      ? copy.bodyClosedByYou(podName, at(how.at))
      : how.kind === "host" && closer !== null
        ? copy.bodyClosedBy(closer, podName, at(how.at))
        : copy.body(podName, setBy ?? "you");
  const log = how.kind === "host" && how.logOpen ? logGameHref(closed) : null;
  return (
    // The phone keeps its `‹ Friends` row (L4); desktop draws the card alone, centered in the page (H3).
    // `flex-1` continues the shell's stretch chain, so the card centers in the height the shell leaves at either width.
    <div className="flex flex-1 flex-col">
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
          <PersonText text={body} />
        </p>
        {log ? (
          <div className="flex w-full max-w-[300px] flex-col items-center gap-[8px]">
            <GhostButton href={log} className="flex min-h-[44px] w-full items-center justify-center rounded-[10px] px-[18px] text-[14.5px]">
              {ruleZeroCopy.page.log}
            </GhostButton>
            <GhostButton href="/friends" className="flex min-h-[44px] w-full items-center justify-center rounded-[10px] border-transparent px-[18px] text-[14.5px]">
              {copy.back}
            </GhostButton>
          </div>
        ) : (
          <GhostButton href="/friends" className="inline-flex min-h-[44px] items-center justify-center rounded-[10px] px-[18px] text-[14.5px]">
            {copy.back}
          </GhostButton>
        )}
      </div>
    </div>
  );
}
