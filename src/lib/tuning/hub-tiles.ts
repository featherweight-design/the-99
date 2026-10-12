// The Tuning hub's tile facts (tuning hub handoff R1, canvas A1 to A3): per paid tool, the run in
// flight if there is one, and otherwise the newest finished run and what came of it. Pure, so the
// rules are unit tested; `hub-read.ts` reads the rows.

import { reapCutoff } from "./reaper";

export type HubTool = "suggested_changes" | "proposed_cuts";

export type HubRunRow = {
  id: string;
  tool: HubTool;
  status: "pending" | "ok" | "failed" | "cancelled";
  createdAt: Date;
};

/** An ok run's answered lines: how many it returned and how many the reader took. */
export type HubRunCounts = { total: number; accepted: number };

export type HubTileRun =
  | { kind: "running"; startedAt: string }
  | { kind: "ok"; at: string; total: number; accepted: number }
  | { kind: "failed"; at: string }
  | { kind: "stopped"; at: string };

export type HubTiles = Record<HubTool, HubTileRun | null> & {
  /** The History tile: every run and free count on the deck, and the runs in flight. Absent when
   *  the read did not carry it. */
  history?: { runs: number; running: number };
  /** Mana Balance's newest free count (ISO), null with none. A free count has no run in flight and
   *  no outcome, so this is its tile's whole status. Absent when the read did not carry it. */
  mana?: string | null;
  /** What each tool held when the hub read it: its last ok result and its newest settled run. The
   *  hub records it as the visit's baseline (`lib/decks/visit.ts`) before any tool is opened, so a
   *  run that was in flight on arrival and settles before the tool's own first read still counts
   *  as this visit's. Absent when the read did not carry it. */
  seen?: Record<"suggested" | "cuts", { okKey: string | null; runId: string | null }>;
};

/**
 * Newest first, one deck, one reader. A pending run past the reaper's cutoff was abandoned: the
 * tool's own read fails it when the tool opens, so the tile never shows it running. Read-only on
 * purpose: the landing writes nothing.
 */
export function shapeHubTiles(
  rows: readonly HubRunRow[],
  counts: ReadonlyMap<string, HubRunCounts>,
  now: Date,
): HubTiles {
  const cutoff = reapCutoff(now).getTime();
  const tileOf = (tool: HubTool): HubTileRun | null => {
    const mine = rows.filter((r) => r.tool === tool);
    const running = mine.find((r) => r.status === "pending" && r.createdAt.getTime() >= cutoff);
    if (running) return { kind: "running", startedAt: running.createdAt.toISOString() };
    const last = mine.find((r) => r.status !== "pending");
    if (!last) return null;
    const at = last.createdAt.toISOString();
    if (last.status === "ok") {
      const c = counts.get(last.id) ?? { total: 0, accepted: 0 };
      return { kind: "ok", at, total: c.total, accepted: c.accepted };
    }
    return last.status === "cancelled" ? { kind: "stopped", at } : { kind: "failed", at };
  };
  return { suggested_changes: tileOf("suggested_changes"), proposed_cuts: tileOf("proposed_cuts") };
}

/** The tools' state as the visit baseline reads it: the last ok run's time, as `okKeyOf` keys it,
 *  and the newest settled run's id (a pending run is not a prior one). */
export function hubSeen(rows: readonly HubRunRow[], lastOk: ReadonlyMap<HubTool, Date>, now: Date): NonNullable<HubTiles["seen"]> {
  const cutoff = reapCutoff(now).getTime();
  const of = (tool: HubTool) => {
    const ok = lastOk.get(tool);
    // A pending run past the reaper's cutoff was abandoned before this visit: the tool's own read
    // reaps it to failed, and that failure is a prior one, so it counts as settled here.
    const settled = rows.find((r) => r.tool === tool && (r.status !== "pending" || r.createdAt.getTime() < cutoff));
    return { okKey: ok ? String(ok.getTime()) : null, runId: settled?.id ?? null };
  };
  return { suggested: of("suggested_changes"), cuts: of("proposed_cuts") };
}
