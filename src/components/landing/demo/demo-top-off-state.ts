// The demo's Top off selection, as pure rules: what is ticked, and what a tap does. Local state only, and the same rules the
// signed-in list reads (`top-off-list.tsx`): a declined row is never ticked, and ticks stop at the open slots, the survivors
// being the first ones in rank order.

/** The ticks that count: not declined, in pool order, no more than the open slots. */
export function liveTicks(poolIds: readonly string[], ticked: ReadonlySet<string>, declined: ReadonlySet<string>, openSlots: number): Set<string> {
  return new Set(poolIds.filter((id) => ticked.has(id) && !declined.has(id)).slice(0, Math.max(openSlots, 0)));
}

/** A tap on a row's box: unticks a ticked row, ticks any other unless the open slots are all taken. */
export function toggleTick(live: ReadonlySet<string>, id: string, openSlots: number): Set<string> {
  const next = new Set(live);
  if (next.has(id)) next.delete(id);
  else if (next.size < openSlots) next.add(id);
  return next;
}

/** Setting a row aside takes its tick with it. */
export function declineRow(live: ReadonlySet<string>, declined: ReadonlySet<string>, id: string): { ticked: Set<string>; declined: Set<string> } {
  const ticked = new Set(live);
  ticked.delete(id);
  return { ticked, declined: new Set(declined).add(id) };
}
