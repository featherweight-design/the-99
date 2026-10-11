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

export type HubTiles = Record<HubTool, HubTileRun | null>;

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
