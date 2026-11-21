// /friends/table/[id]/play: the life tracker's play surface (life tracker plan, PR 4). Not linked from anywhere until
// go-live, so it must be safe on its own: the table is read through the viewer's grant (`loadTable`, or
// `loadClosedTable` once its host has closed it) and the roster only exists inside the table's night (`tableRoster`),
// so a stranger, a table past its 6 am and a tracker over six seats all answer not found.
//
// A seat still waiting for its deck plays on a plain panel (S2). A table its host closed keeps the game this device
// holds until 6 am (S4): it passes no seats, since no new game starts there, and the surface goes back to Friends
// when the device has no game for it.

import { notFound } from "next/navigation";
import { requireUserId } from "../../../../../lib/auth";
import { MAX_SEATS } from "../../../../../lib/tracker/engine";
import type { PlaySeat } from "../../../../../lib/tracker/seat";
import { tableRoster } from "../../../../../lib/social/rule-zero-result";
import { loadClosedTable, loadTable } from "../../../../../lib/social/rule-zero-table";
import { logGameHref } from "../../../../../lib/rule-zero/table-view";
import { PlaySurface } from "../../../../../components/tracker/play-surface";

export default async function PlayPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const userId = await requireUserId();
  const { id } = await params;
  // The Last game card's Undo (U5) opens the play surface to undo the game this device holds.
  const undoNow = (await searchParams).undo === "1";
  const view = await loadTable(userId, id);
  if (view && view.seats.length > MAX_SEATS) notFound();
  const closed = view ? null : await loadClosedTable(userId, id);
  if (!view && (!closed || closed.how.kind !== "host" || !closed.how.logOpen)) notFound();
  const night = await tableRoster(userId, id);
  if (!night) notFound();

  if (closed) {
    const how = closed.how as Extract<typeof closed.how, { kind: "host" }>;
    return (
      <div className="flex w-full flex-1 flex-col">
        <PlaySurface
          tableId={id}
          roster={night.roster}
          expiresAt={night.closesAt.getTime()}
          seats={null}
          backHref="/friends"
          logHref={logGameHref(closed)}
          podName={closed.podName}
          closed={{ by: how.byYou ? "you" : how.by, at: how.at.getTime() }}
          undoNow={undoNow}
        />
      </div>
    );
  }

  // Turn order is the table's seat order, rotated so the viewer's own seat is the one nearest the bottom of the screen.
  const live = view!;
  const mine = live.seats.findIndex((s) => s.you);
  const ordered = [...live.seats.slice(mine), ...live.seats.slice(0, mine)];
  const seats: PlaySeat[] = ordered.map((s) => ({
    seat: s.seat,
    you: s.you,
    name: s.displayName,
    art: s.deck?.commander.artCropUri ?? null,
    partnerArt: s.deck?.partner?.artCropUri ?? null,
    commander: s.deck?.commander.name ?? "",
    partner: s.deck?.partner?.name ?? null,
    deck: s.deck?.name ?? null,
  }));

  return (
    <div className="flex w-full flex-1 flex-col">
      <PlaySurface tableId={id} roster={night.roster} expiresAt={live.closesAt.getTime()} seats={seats} backHref={`/friends/table/${id}`} logHref={logGameHref(live)} podName={live.podName} undoNow={undoNow} />
    </div>
  );
}
