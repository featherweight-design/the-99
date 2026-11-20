// /friends/table/[id]/play: the life tracker's play surface (life tracker plan, PR 4). Not linked from anywhere until
// go-live, so it must be safe on its own: the table is read through the viewer's grant (`loadTable`, which is null for a
// table the viewer is not seated at or whose pod they left) and the roster only exists inside the table's night
// (`tableRoster`), so a stranger, a closed table and a tracker over seven seats all answer not found. A table whose seat
// still waits for its deck goes back to the table: the tracker starts with every seat's deck known.

import { notFound, redirect } from "next/navigation";
import { requireUserId } from "../../../../../lib/auth";
import { MAX_SEATS } from "../../../../../lib/tracker/engine";
import { tableRoster } from "../../../../../lib/social/rule-zero-result";
import { loadTable } from "../../../../../lib/social/rule-zero-table";
import { PlaySurface } from "../../../../../components/tracker/play-surface";
import type { PlaySeat } from "../../../../../components/tracker/panel";

export default async function PlayPage({ params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  const { id } = await params;
  const view = await loadTable(userId, id);
  if (!view || view.seats.length > MAX_SEATS) notFound();
  const roster = await tableRoster(userId, id);
  if (!roster) notFound();
  if (view.seats.some((s) => s.deck === null)) redirect(`/friends/table/${id}`);

  // Turn order is the table's seat order, rotated so the viewer's own seat is the one nearest the bottom of the screen.
  const mine = view.seats.findIndex((s) => s.you);
  const ordered = [...view.seats.slice(mine), ...view.seats.slice(0, mine)];
  const seats: PlaySeat[] = ordered.map((s) => ({
    seat: s.seat,
    you: s.you,
    name: s.displayName,
    art: s.deck?.commander.artCropUri ?? null,
    partnerArt: s.deck?.partner?.artCropUri ?? null,
  }));

  return (
    <div className="flex w-full flex-1 flex-col">
      <PlaySurface tableId={id} roster={roster} expiresAt={view.closesAt.getTime()} seats={seats} backHref={`/friends/table/${id}`} />
    </div>
  );
}
