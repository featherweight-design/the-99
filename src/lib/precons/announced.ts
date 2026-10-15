/**
 * What the Announced group on `/decks/precons` is handed (plan `2026-10-14-upcoming-precons.md`, PR 2), as a pure
 * step over the cached reads, so every time-bound fact (`new`, the countdown's day, `new ·` on a precon tile) is
 * decided once on the server against one `now` and the browser draws exactly what the server drew.
 */
import { announcedOpensByItself, preconIsNew } from "./arrivals";
import type { PreconArrival } from "./arrivals-read";
import type { RevealedCommander } from "./revealed";
import { utcDay, type UpcomingSet } from "./upcoming";

/** The catalog reads behind the group and the `new ·` tags, cached inside the precons payload (E5). */
export type UpcomingPayload = {
  sets: UpcomingSet[];
  commanders: Record<string, RevealedCommander[]>;
  arrivals: PreconArrival[];
};

export type AnnouncedProps = {
  sets: UpcomingSet[];
  commanders: Record<string, RevealedCommander[]>;
  /** `YYYY-MM-DD`, the UTC day the countdowns count from. */
  today: string;
  /** Sets this reader has not been shown that arrived in the banner's window: the `new` tag. */
  newCodes: string[];
  /** The group holds news, so it opens by itself (the `#announced` half is the browser's). */
  opensByItself: boolean;
};

export function announcedProps(upcoming: UpcomingPayload, now: Date): AnnouncedProps {
  return {
    sets: upcoming.sets,
    commanders: upcoming.commanders,
    today: utcDay(now),
    newCodes: upcoming.sets.filter((s) => announcedOpensByItself([s], "", now)).map((s) => s.code),
    opensByItself: announcedOpensByItself(upcoming.sets, "", now),
  };
}

/** The precons that read `new ·` on their tile now: listed in the last 14 days, the same for every reader (G5). */
export const newPreconFiles = (arrivals: readonly PreconArrival[], now: Date): string[] =>
  arrivals.filter((a) => preconIsNew(a.arrivedAt, now)).map((a) => a.fileName);
