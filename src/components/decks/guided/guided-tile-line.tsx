"use client";

// The guided build's mark on a deck's tile (G6, STATES "Deck tile / page"): `Sharpening toward X · 0:05` in the /decks tile's detail row
// while the run is going, and a short or failed run's sentence for the day after it. Home's resume row has one slot a line can hold (its
// stamp), so it carries the clock alone. The clock starts blank and fills after mount: the server's `now` is not the reader's.
import { useEffect, useState } from "react";
import { guidedBuildCopy } from "../../../lib/copy/guided-build";
import type { GuidedTile } from "../../../lib/guided/tile";
import { UPGRADE_REAP_MS } from "../../../lib/precons/upgrade/constants";
import { clockOf } from "../precons/upgrade/wait-view";

const copy = guidedBuildCopy.line;

/** The words a screen reader gets for the tile: the line without its ticking clock, so the tile's name does not change each second. */
export function guidedTileSpoken(g: GuidedTile): string {
  return g.status === "running" ? copy.runningSpoken(g.strategyLabel) : g.status === "failed" ? copy.failed(g.strategyLabel) : copy.short(g.strategyLabel);
}

/** Null before mount, and once the run is past the reaper's limit: a cached payload must not keep a dead run ticking. */
function useRunClock(startedAt: Date): string | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const t = setInterval(tick, 1000);
    return () => { clearTimeout(first); clearInterval(t); };
  }, []);
  if (now === null || now - startedAt.getTime() >= UPGRADE_REAP_MS) return null;
  return clockOf(now - startedAt.getTime());
}

function Clock({ startedAt, render, fallback = "" }: { startedAt: Date; render: (clock: string) => string; fallback?: string }) {
  const clock = useRunClock(startedAt);
  return <>{clock === null ? fallback : render(clock)}</>;
}

/** The /decks tile's detail text. */
export function GuidedTileText({ guided }: { guided: GuidedTile }) {
  if (guided.status === "running") return <Clock startedAt={guided.startedAt} render={(c) => copy.running(guided.strategyLabel, c)} />;
  return <>{guided.status === "failed" ? copy.failed(guided.strategyLabel) : copy.short(guided.strategyLabel)}</>;
}

/** Home's resume row stamp, while the run is going. */
export function GuidedStamp({ startedAt, stamp }: { startedAt: Date; stamp: string }) {
  return <Clock startedAt={startedAt} render={copy.runningStamp} fallback={stamp} />;
}
