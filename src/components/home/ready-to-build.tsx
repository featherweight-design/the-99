// "Ready to build" — the two hero commanders and the line under them.
//
// Property table: docs/superpowers/design-tables/ui-refresh-home.md
// §ReadyToBuild. The threshold Design's READINESS blocks on is `readySlice`'s
// (plan ruling 1): a RANK cut (`READY_COUNT`, two weeks deep), never a score cut. Nothing here invents
// one, and nothing here re-derives `moreCount` or `floor` from the shown pair.
//
// Placement inside the two-column §HomeBody belongs to the layout task; this
// draws the section and nothing around it.

import { GhostButton } from "@/components/ui/button";
import type { ReceiptCounts } from "../../lib/commanders/in-use";
import { refreshCopy } from "../../lib/copy/refresh";
import type { CommanderListItem } from "../../lib/recs/recommend";
import type { ReadySlice } from "../../lib/recs/ready-to-build";
import { HeroCommander } from "./hero-commander";
import { ArrivalOrder } from "@/components/ui/arrival-queue";

export function ReadyToBuild({
  ready,
  inUse,
}: {
  ready: ReadySlice<CommanderListItem>;
  inUse: Map<string, ReceiptCounts>;
}) {
  const c = refreshCopy.home;
  // A heading over nothing is worse than silence: with no scored commander the
  // whole section leaves, rather than announcing an empty "Ready to build".
  if (ready.shown.length === 0) return null;

  return (
    <section className="flex flex-col gap-[11px]">
      {/* §SectionLabel */}
      <h2 className="m-0 flex-none font-mono text-[10px] font-normal tracking-[0.14em] text-[color:var(--fg-faint)] uppercase">
        {c.readyHeading}
      </h2>

      {/* The pair arrives together: one row, one fade (Hugh, 2026-10-12). */}
      <ArrivalOrder>
      <div className="grid grid-cols-1 gap-[12px] sm:grid-cols-2 sm:gap-[14px]">
        {ready.shown.map((item) => (
          <HeroCommander
            key={item.oracleId}
            item={item}
            // `wantedByDraft` is read by neither figure on this card and is
            // dropped here. A commander with no entry is the same claim as
            // zero, and the clause is absent for both.
            inUse={inUse.get(item.oracleId)?.inUse ?? 0}
          />
        ))}
      </div>
      </ArrivalOrder>

      {/* §ReadyToBuild — "more above" row */}
      <div className="flex flex-none items-center gap-[10px] sm:gap-[12px]">
        {ready.moreCount > 0 && ready.floor !== null && (
          <span className="font-mono text-[10.5px] text-[color:var(--fg-faint)] sm:text-[11px]">
            {c.moreAbove(ready.moreCount, ready.floor)}
          </span>
        )}
        {/* Always drawn, including at moreCount 0: this is the route to the
            lane, not a footnote on a count that may not be there. `ml-auto`
            therefore has to survive being the row's only child.
            Phone pushes it to the far edge; desktop sits it one gap after the
            count, which is why the auto margin is dropped at sm. */}
        <GhostButton
          href="/commanders"
          // 44 on phone, not the frame's 36: ruling 14 floors every phone
          // target at 44, and the card's own secondary above is drawn at 44 in
          // the same table. Recorded as a deliberate departure from the frame.
          className="ml-auto flex h-[44px] items-center rounded-[10px] px-[12px] text-[13px] font-normal sm:ml-0 sm:h-[32px] sm:rounded-[8px] sm:px-[13px] sm:text-[12.5px]"
        >
          {c.allCommanders}
        </GhostButton>
      </div>
    </section>
  );
}
