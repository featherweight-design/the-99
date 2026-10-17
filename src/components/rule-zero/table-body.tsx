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
import { GhostButton } from "../ui/button";
import { ReadCard } from "./read-card";
import { TableSeat } from "./table-seat";

const copy = ruleZeroCopy.page;

export function TableBody({
  view,
  gamesEnabled,
  closes,
  updated,
}: {
  view: TableView;
  /** `socialGamesEnabled(env)` for the reader. */
  gamesEnabled: boolean;
  /** The closing time as the page meta draws it (`9:40 pm tomorrow`), formatted by the page. */
  closes: string;
  /** `updated just now`'s when, once the poll lands (PR 4). */
  updated?: string;
}) {
  const draw = drawTable(view);
  const log = gamesEnabled ? logGameHref(view) : null;
  return (
    <div data-testid="table-body" className="flex flex-col gap-[14px] md:gap-[22px]">
      <header className="flex flex-col">
        <h1 className="m-0 font-display text-[24px] font-bold leading-[1.2] md:text-[30px]">{copy.title}</h1>
        <p className="m-0 mt-[6px] font-mono text-[11.5px] leading-[1.55] text-[color:var(--fg-faint)] md:text-[12px]">
          {copy.meta(view.podName, view.setBy, view.seats.length, closes)}
        </p>
      </header>
      <div className="flex flex-col gap-[14px] md:grid md:grid-cols-[minmax(0,1fr)_392px] md:grid-rows-[auto_1fr] md:items-start md:gap-x-[28px]">
        <div className="md:col-start-2 md:row-start-1">
          <ReadCard draw={draw} updated={updated} />
        </div>
        <div className="flex flex-col gap-[10px] md:col-start-1 md:row-span-2 md:row-start-1" data-testid="table-seats">
          {draw.seats.map((s) => (
            <TableSeat key={s.key} draw={s} />
          ))}
        </div>
        {log ? (
          <div className="md:col-start-2 md:row-start-2 md:self-start">
            <GhostButton href={log} className="flex min-h-[44px] w-full items-center justify-center rounded-[10px] px-[18px] text-[14.5px]">
              {copy.log}
            </GhostButton>
          </div>
        ) : null}
      </div>
    </div>
  );
}
