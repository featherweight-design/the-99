"use client";

// Home's tour (discovery R3·1b and R3·2, plan decision 6). Due on a first-run Home, it opens once, as R3·1b built it.
// Asked for again (`/?tour=1`, from the account menu's `Take the tour` or About's head press), it opens whatever
// `tour_seen_at` says: the parameter is stripped through `mirrorUrl`, and the spend writes only while the stamp is null
// (`spendTourWrite`), so a replay moves no stamp. On a first-run account the replay is the first-run tour; on a
// dashboard it runs on the real app (`mode: "dashboard"`).
//
// Mounted by Home only with `FIRST_RUN_TOUR_ENABLED` on for the reader, so with the switch off `?tour=1` does nothing.

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLiveQuery } from "../../lib/commanders/live-query";
import { TOUR_PARAM } from "../../lib/copy/discovery";
import type { TourMode } from "../../lib/discovery/tour-steps";
import { mirrorUrl } from "../../lib/url/mirror";
import { FirstRunTour } from "./first-run-tour";

export function HomeTour({ due, mode, precons }: { due: boolean; mode: TourMode; precons: boolean }) {
  // The live query, seeded from the server's: a second `Take the tour` from the menu is a same-route navigation that
  // restores the kept Home tree, which `useSearchParams` can miss (`live-query.ts`), and a missed ask would leave the
  // finished tour closed.
  const asked = new URLSearchParams(useLiveQuery(useSearchParams()?.toString() ?? "")).get(TOUR_PARAM) === "1";
  // Each ask is its own run: a second `Take the tour` arrives as a fresh `?tour=1` after the first was stripped, and a
  // new key starts the tour again rather than finding the last one finished. Counted during render, so the tour mounts
  // in the same commit as the ask.
  const [seen, setSeen] = useState(asked);
  const [runs, setRuns] = useState(asked ? 1 : 0);
  if (asked !== seen) {
    setSeen(asked);
    if (asked) setRuns(runs + 1);
  }
  useEffect(() => {
    if (!asked) return;
    const url = new URL(window.location.href);
    url.searchParams.delete(TOUR_PARAM);
    mirrorUrl(url, window.history.state);
  }, [asked, runs]);
  if (!due && runs === 0) return null;
  // An asked run is not held off by this tab's spent mark (R3·1b), which keeps only a restored Home from rerunning.
  return <FirstRunTour key={runs} precons={precons} mode={mode} again={runs > 0} />;
}
