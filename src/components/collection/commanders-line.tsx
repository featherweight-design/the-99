// The first import's receipt: how many commanders the new collection can build, and the way to see them (landing PR 7b).
// A server component, drawn inside a Suspense on the receipt page so the receipt shows at once and the line fills in: after an
// upload the stored scores no longer match, so the ranked list recomputes (the Commanders place needs the same read next, and
// this warms it). The count is the one `buildableCount` definition. A failed or empty read draws nothing, never a zero.

import { cardAssignmentsCopy as copy } from "../../lib/copy/card-assignments";
import { requestFlags } from "../../lib/flags/request";
import { buildableCount } from "../../lib/recs/buildable";
import { getRankedList } from "../../lib/recs/ranked-list";
import { GhostButton } from "../ui/button";

export function CommandersLineView({ count }: { count: number }) {
  return (
    <div data-commanders-line="" className="mt-[16px] flex flex-col gap-[12px] sm:flex-row sm:items-center">
      <p className="m-0 flex items-center gap-[10px] rounded-[10px] border border-solid border-[color:color-mix(in_oklab,var(--accent)_45%,transparent)] bg-[color:color-mix(in_oklab,var(--accent)_10%,transparent)] px-[12px] py-[10px] text-[13.5px] text-[color:var(--fg)]">
        {copy.summary.buildable(count)}
      </p>
      <GhostButton href="/commanders" className="min-h-[44px] self-start px-[18px] py-[9px] text-[13.5px]">{copy.summary.seeCommanders}</GhostButton>
    </div>
  );
}

export async function CommandersLine({ userId }: { userId: string }) {
  let count: number | null = null;
  try {
    count = buildableCount(await getRankedList(userId, await requestFlags(userId)));
  } catch {
    count = null;
  }
  return count !== null && count > 0 ? <CommandersLineView count={count} /> : null;
}
