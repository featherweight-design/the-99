/**
 * What the Announced group on `/decks/precons` is handed (plan `2026-10-14-upcoming-precons.md`, PR 2), as a pure
 * step over the cached reads, so every time-bound fact (`new`, the countdown's day, `new ·` on a precon tile) is
 * decided once on the server against one `now` and the browser draws exactly what the server drew.
 */
import { earlyIsNew, type EarlySet } from "../announcements/early-tiles";
import { announcedOpensByItself, preconIsNew } from "./arrivals";
import type { PreconArrival } from "./arrivals-read";
import type { RevealedCommander } from "./revealed";
import { utcDay, type UpcomingSet } from "./upcoming";

/** The catalog reads behind the group and the `new ·` tags, cached inside the precons payload (E5). */
export type UpcomingPayload = {
  sets: UpcomingSet[];
  commanders: Record<string, RevealedCommander[]>;
  arrivals: PreconArrival[];
  /**
   * Each set's posted early lists (announcements UI 5), by code; empty while `ANNOUNCEMENTS_ENABLED` is off for the
   * reader. Optional so an entry cached before this field reads as none.
   */
  early?: Record<string, EarlySet>;
  /** The early seen keys the reader holds (`early:<code>:<count>`, G2). */
  earlySeen?: string[];
};

export type AnnouncedProps = {
  sets: UpcomingSet[];
  commanders: Record<string, RevealedCommander[]>;
  /** `YYYY-MM-DD`, the UTC day the countdowns count from. */
  today: string;
  /**
   * The sets that read `new`: arrived in the banner's window and not shown to this reader, or holding early lists the
   * reader has not been shown at their present count (G2: a further list lights it again).
   */
  newCodes: string[];
  /** Each set's posted early lists, by code (announcements UI 5); absent reads as none. */
  early?: Record<string, EarlySet>;
  /** The group holds news, so it opens by itself (the `#announced` half is the browser's). */
  opensByItself: boolean;
};

export function announcedProps(upcoming: UpcomingPayload, now: Date): AnnouncedProps {
  const early = upcoming.early ?? {};
  const held = upcoming.earlySeen ?? [];
  const earlyNew = (code: string) => earlyIsNew(code, early[code]?.lists.length ?? 0, held);
  const newCodes = upcoming.sets.filter((s) => announcedOpensByItself([s], "", now) || earlyNew(s.code)).map((s) => s.code);
  return {
    sets: upcoming.sets,
    commanders: upcoming.commanders,
    today: utcDay(now),
    newCodes,
    early,
    // Early lists the reader has not been shown are news, so they open the group as a new set does; the visit
    // acknowledges them (`earlySeenKeys`), so it never stays open on its own.
    opensByItself: announcedOpensByItself(upcoming.sets, "", now) || newCodes.length > 0,
  };
}

/** The precons that read `new ·` on their tile now: listed in the last 14 days, the same for every reader (G5). */
export const newPreconFiles = (arrivals: readonly PreconArrival[], now: Date): string[] =>
  arrivals.filter((a) => preconIsNew(a.arrivedAt, now)).map((a) => a.fileName);
