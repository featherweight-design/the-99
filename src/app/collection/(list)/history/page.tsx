// /collection/history — every upload and edit of the last 90 days (collection edit §F).
//
// The fourth tab of the place strip, behind `COLLECTION_EDIT_ENABLED`: with the switch off the
// route does not exist, and the tab is never drawn. The list is one page of entries at a time,
// counts only; a row's own changes are read when it opens.

import { notFound } from "next/navigation";
import { requireUserId } from "../../../../lib/auth";
import { collectionEditEnabled } from "../../../../lib/collection/edit-flag";
import { listHistory } from "../../../../lib/collection/history";
import { historyShipDate } from "../../../../lib/collection/history-ship";
import { dayLabel, historyReachesBack } from "../../../../lib/collection/history-view";
import { isUuid } from "../../../../lib/uuid";
import { HistoryList } from "../../../../components/collection/history-list";

export default async function CollectionHistoryPage({ searchParams }: { searchParams: Promise<{ entry?: string | string[] }> }) {
  if (!collectionEditEnabled()) notFound();
  const userId = await requireUserId();
  const { entry } = await searchParams;
  const focusId = typeof entry === "string" && isUuid(entry) ? entry : undefined;
  const { entries, nextBefore } = await listHistory(userId);
  // One clock for the whole render, so "Today" and the 90-day edge cannot disagree.
  const nowMs = Date.now();
  const ship = historyShipDate();
  const reachesBack = historyReachesBack(ship, nowMs);
  return (
    <div className="flex flex-col">
      <HistoryList
        initial={entries}
        nextBefore={nextBefore}
        nowMs={nowMs}
        reachesBack={reachesBack}
        reachesBackLabel={dayLabel(reachesBack)}
        shipLabel={dayLabel(ship)}
        focusId={focusId}
      />
    </div>
  );
}
