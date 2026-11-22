// /friends/table/[id]/play: the life tracker's play surface (life tracker plan, PR 4). Not linked from anywhere until
// go-live, so it must be safe on its own: the table is read through the viewer's grant (`loadTableWith`, or
// `loadClosedTableWith` once its host has closed it) and the roster only exists inside the table's night (`tableRoster`),
// so a stranger and a table past its 6 am answer not found. Over six seats, only a game this device already holds plays.
//
// A seat still waiting for its deck plays on a plain panel (S2). A table its host closed keeps the game this device
// holds until 6 am (S4): it passes no seats, since no new game starts there, and the surface goes back to Friends
// when the device has no game for it.
//
// The surface is full screen, as the boards draw it: `data-full-screen` sets the shell's nav aside (globals.css), and
// the way out is setup's ✕ and the strip's Menu, or the browser's own Back.

import { notFound } from "next/navigation";
import { requireUserId } from "../../../../../lib/auth";
import { MAX_SEATS } from "../../../../../lib/tracker/engine";
import type { PlaySeat } from "../../../../../lib/tracker/seat";
import { tableRoster } from "../../../../../lib/social/rule-zero-result";
import { loadClosedTableWith, loadTableWith } from "../../../../../lib/social/rule-zero-table";
import { logGameHref } from "../../../../../lib/rule-zero/table-view";
import { PlaySurface } from "../../../../../components/tracker/play-surface";

export default async function PlayPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const userId = await requireUserId();
  const { id } = await params;
  // The Last game card's Undo (U5) opens the play surface to undo the game this device holds.
  const undoNow = (await searchParams).undo === "1";
  const again = (await searchParams).again === "1";
  // The roster is read in the same snapshot as the seats, so it seals the very seats this page draws: a reseat landing
  // between two separate reads would start a game whose save the roster then refuses, or credits the wrong seats.
  const roster = (tx: Parameters<Parameters<typeof loadTableWith>[2]>[0]) => tableRoster(userId, id, tx);
  const live = await loadTableWith(userId, id, roster);
  const view = live?.view ?? null;
  const shut = live ? null : await loadClosedTableWith(userId, id, roster);
  const closed = shut?.closed ?? null;
  if (!view && (!closed || closed.how.kind !== "host" || !closed.how.logOpen)) notFound();
  const night = live?.also ?? shut?.also ?? null;
  if (!night) notFound();

  if (closed) {
    const how = closed.how as Extract<typeof closed.how, { kind: "host" }>;
    return (
      <div data-full-screen="" className="flex w-full flex-1 flex-col">
        <PlaySurface
          tableId={id}
          roster={night.roster}
          expiresAt={night.closesAt.getTime()}
          seats={null}
          backHref="/friends"
          logHref={logGameHref(closed, closed.games.find((g) => g.loggedAt === null)?.gameMs ?? null)}
          podName={closed.podName}
          closed={{ by: how.byYou ? "you" : how.by, at: how.at.getTime() }}
          undoNow={undoNow}
        />
      </div>
    );
  }

  // Over six seated, no new game starts (S1), but a game this device started before the reseat still resumes from its own
  // Start snapshot, so the surface gets no seats rather than a not found.
  const fits = view!.seats.length <= MAX_SEATS;
  // Turn order is the table's seat order, rotated so the viewer's own seat is the one nearest the bottom of the screen.
  const table = view!;
  const mine = table.seats.findIndex((s) => s.you);
  const ordered = [...table.seats.slice(mine), ...table.seats.slice(0, mine)];
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
    <div data-full-screen="" className="flex w-full flex-1 flex-col">
      <PlaySurface tableId={id} roster={night.roster} expiresAt={table.closesAt.getTime()} seats={fits ? seats : null} again={again} undoNow={undoNow} backHref={`/friends/table/${id}`} logHref={logGameHref(table)} podName={table.podName} />
    </div>
  );
}
