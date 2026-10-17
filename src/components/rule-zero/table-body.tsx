"use client";
// The table page's body (plan PR 3; boards `R1 - Read-Phone` and `R2 - Read-Desktop`): the head, the read, every
// seat, and `Log this game`. ONE TREE AT BOTH WIDTHS: the phone stacks the read, the seats and the log in that order;
// desktop (R2) puts one seat per row on the left and the read with `Log this game` in a 392px column on the right,
// placed by the grid rather than mounted twice.
//
// `Log this game` is a plain link to the viewer's seated deck's Games tab (plan PR 8), absent with no space kept when
// games are off (L3) or while the viewer's seat waits for a deck. Its URL carries the viewer's own deck id, the only
// deck id the page holds (decision 5).

import { ruleZeroCopy } from "../../lib/copy/rule-zero";
import { drawTable, logGameHref, type TableView } from "../../lib/rule-zero/table-view";
import { closesWhen } from "../../lib/social/when";
import { GhostButton } from "../ui/button";
import { useHydrated } from "../ui/hydrated-art";
import { BackLink } from "./back-link";
import { ReadCard } from "./read-card";
import { SeatsButton } from "./seats-button";
import { TableSeat } from "./table-seat";

const copy = ruleZeroCopy.page;

export function TableBody({
  view,
  gamesEnabled,
  now,
  updated,
}: {
  view: TableView;
  /** `socialGamesEnabled(env)` for the reader. */
  gamesEnabled: boolean;
  /** The server's clock at the draw: the close time is `today` or `tomorrow` against it. */
  now: Date;
  /** `updated just now`'s when, once the poll lands (PR 4). */
  updated?: string;
}) {
  const draw = drawTable(view);
  // The server's draw is in UTC, the reader's own zone after hydration, so the two first renders agree (`when.ts`).
  const closes = closesWhen(view.closesAt, now, useHydrated() ? undefined : "UTC");
  const log = gamesEnabled ? logGameHref(view) : null;
  return (
    <div data-testid="table-body" className="flex flex-col">
      {/* The phone's back row sits outside the padded column (R1); desktop's sits in the head band (R2). */}
      <BackLink className="h-[44px] gap-[4px] px-[8px] text-[14px] xl:hidden" glyph />
      <div className="flex flex-col gap-[14px] px-[16px] pb-[22px] xl:block xl:p-0">
        {/* A grid, so `Seats` mounts once: beside the title on the phone (R1 `.pgh .row`), at the foot of the head's
            right edge on desktop (R2 `.dph`, aligned to the end). */}
        <header className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-[10px] xl:gap-x-[20px] xl:border-b xl:border-b-[color:var(--border)] xl:px-[34px] xl:pb-[16px] xl:pt-[22px]">
          <BackLink className="col-start-1 mb-[6px] hidden gap-[6px] text-[13px] xl:flex" />
          <h1 className="col-start-1 m-0 font-display text-[24px] font-bold leading-[1.2] xl:text-[30px]">{copy.title}</h1>
          <p className="col-start-1 m-0 mt-[6px] font-mono text-[11.5px] leading-[1.55] text-[color:var(--fg-faint)] xl:text-[12px] xl:leading-normal">
            <b className="font-medium text-[color:var(--fg-body)]">{view.podName}</b>
            {copy.metaSetBy(view.setByYou ? null : view.setBy, view.seats.length)}
            <span className="hidden xl:inline"> · </span>
            <br className="xl:hidden" />
            {copy.metaOpen(closes)}
          </p>
          {view.setByYou ? (
            <SeatsButton tableId={view.tableId} className="col-start-2 row-start-1 self-start xl:row-span-3 xl:self-end" />
          ) : null}
        </header>
        {/* One mount of each part, placed by the grid: desktop's right column is the read over Log this game (14px
            apart), and the seats span both rows on the left. */}
        <div className="flex flex-col gap-[14px] xl:grid xl:grid-cols-[minmax(0,1fr)_392px] xl:grid-rows-[auto_1fr] xl:items-start xl:gap-x-[28px] xl:gap-y-[14px] xl:px-[34px] xl:pb-[28px] xl:pt-[22px]">
          <div className="xl:col-start-2 xl:row-start-1">
            <ReadCard draw={draw} updated={updated} />
          </div>
          <div className="flex flex-col gap-[10px] xl:col-start-1 xl:row-start-1 xl:row-end-3" data-testid="table-seats">
            {draw.seats.map((s) => (
              <TableSeat key={s.key} draw={s} now={now} />
            ))}
          </div>
          {log ? (
            <div className="xl:col-start-2 xl:row-start-2">
              <LogGame href={log} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function LogGame({ href }: { href: string }) {
  return (
    <GhostButton
      href={href}
      className="flex min-h-[44px] w-full items-center justify-center gap-[8px] whitespace-nowrap rounded-[10px] px-[18px] text-[14.5px]"
    >
      {copy.log}
    </GhostButton>
  );
}
