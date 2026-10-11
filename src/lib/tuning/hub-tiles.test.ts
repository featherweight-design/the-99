import { describe, expect, it } from "vitest";

import { hubSeen, shapeHubTiles, type HubRunRow } from "./hub-tiles";
import { REAPER_CUTOFF_MS } from "./limits";

const now = new Date("2026-10-11T12:00:00Z");
const ago = (ms: number) => new Date(now.getTime() - ms);
const row = (id: string, tool: HubRunRow["tool"], status: HubRunRow["status"], at: Date): HubRunRow => ({ id, tool, status, createdAt: at });

describe("shapeHubTiles", () => {
  it("is empty for a tool that has never run", () => {
    expect(shapeHubTiles([], new Map(), now)).toEqual({ suggested_changes: null, proposed_cuts: null });
  });

  it("shows a pending run inside the reaper's cutoff as running, from its start", () => {
    const tiles = shapeHubTiles([row("a", "suggested_changes", "pending", ago(14_000))], new Map(), now);
    expect(tiles.suggested_changes).toEqual({ kind: "running", startedAt: ago(14_000).toISOString() });
  });

  it("never shows an abandoned pending run as running, and falls back to the last finished one", () => {
    const tiles = shapeHubTiles(
      [
        row("stale", "proposed_cuts", "pending", ago(REAPER_CUTOFF_MS + 1000)),
        row("done", "proposed_cuts", "ok", ago(REAPER_CUTOFF_MS + 60_000)),
      ],
      new Map([["done", { total: 6, accepted: 2 }]]),
      now,
    );
    expect(tiles.proposed_cuts).toEqual({ kind: "ok", at: ago(REAPER_CUTOFF_MS + 60_000).toISOString(), total: 6, accepted: 2 });
  });

  it("reads the newest finished run per tool, each tool apart", () => {
    const tiles = shapeHubTiles(
      [
        row("c2", "proposed_cuts", "cancelled", ago(1000)),
        row("s2", "suggested_changes", "failed", ago(2000)),
        row("s1", "suggested_changes", "ok", ago(3000)),
      ],
      new Map([["s1", { total: 5, accepted: 2 }]]),
      now,
    );
    expect(tiles.suggested_changes).toEqual({ kind: "failed", at: ago(2000).toISOString() });
    expect(tiles.proposed_cuts).toEqual({ kind: "stopped", at: ago(1000).toISOString() });
  });

  it("reads an ok run with no counted lines as zero of zero", () => {
    const tiles = shapeHubTiles([row("s", "suggested_changes", "ok", ago(1000))], new Map(), now);
    expect(tiles.suggested_changes).toEqual({ kind: "ok", at: ago(1000).toISOString(), total: 0, accepted: 0 });
  });
});

describe("hubSeen", () => {
  it("keys each tool's last ok run and names its newest settled run, never a pending one", () => {
    const okAt = ago(60_000);
    const seen = hubSeen(
      [row("p", "suggested_changes", "pending", ago(1000)), row("f", "suggested_changes", "failed", ago(5000))],
      new Map([["suggested_changes", okAt]]),
      now,
    );
    expect(seen.suggested).toEqual({ okKey: String(okAt.getTime()), runId: "f" });
    expect(seen.cuts).toEqual({ okKey: null, runId: null });
  });

  it("counts a pending run past the reaper's cutoff as settled: its reaped failure is a prior one", () => {
    const seen = hubSeen([row("gone", "proposed_cuts", "pending", ago(REAPER_CUTOFF_MS + 1000))], new Map(), now);
    expect(seen.cuts.runId).toBe("gone");
  });
});
