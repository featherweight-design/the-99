/**
 * Upcoming precons and the arrivals banner, as pure rules over what the reads give (plan
 * `2026-10-14-upcoming-precons.md`, §Pure rules), so every line, key, countdown and filter is unit tested
 * without a database. No copy here: each rule returns a structured value, and the words are PR 2's and 3's.
 *
 * An ARRIVAL is a set the catalog showed for the first time (`UpcomingSet.arrivedAt`) or a precon it listed
 * for the first time (`PreconArrival`). A baseline stamp (`arrivedAt` null) is never one: it was already there
 * when stamping began.
 */
import { fold } from "./list";
import type { PreconArrival } from "./arrivals-read";
import type { RevealedCommander } from "./revealed";
import type { UpcomingSet } from "./upcoming";

/** How long an arrival stays news for the banner (G6). */
export const BANNER_WINDOW_DAYS = 30;
/** How long a listed precon carries `new ·`, from its own arrival, the same for every reader (G5). */
export const PRECON_NEW_DAYS = 14;

const DAY_MS = 86_400_000;

const within = (arrivedAt: Date | null, now: Date, days: number) =>
  arrivedAt !== null && now.getTime() - arrivedAt.getTime() < days * DAY_MS;

/** One line of the banner. `releasesOn` is `YYYY-MM-DD`. */
export type ArrivalLine =
  | { kind: "set"; code: string; name: string; releasesOn: string; arrivedAt: Date }
  /** A set's decklists listed: `count` of them, `arrivedAt` the earliest of their arrivals. */
  | { kind: "lists"; code: string; name: string; releasesOn: string; arrivedAt: Date; count: number };

export type ArrivalsInput = {
  sets: readonly UpcomingSet[];
  preconArrivals: readonly PreconArrival[];
  now: Date;
};

/**
 * The banner's lines: each set announced, and each set's decklists listed, that arrived in the last
 * `BANNER_WINDOW_DAYS` and the reader has not been shown. Seen is read off the rows (`UpcomingSet.seen`,
 * `PreconArrival.listsSeen`), which carry the reader's `upcoming_seen_codes` from the same statement.
 *
 * A set whose announcement the reader never saw and whose lists have arrived is ONE line, the lists line
 * (STATES rule 5: an arrival is told once).
 *
 * ORDER: soonest release first, ties by code, the order the Announced group reads in (README §Order). A lists
 * line orders by its set's release too, so a set already out (its decks listed) comes before one still to come.
 */
export function arrivalsFor({ sets, preconArrivals, now }: ArrivalsInput): ArrivalLine[] {
  const setByCode = new Map(sets.map((s) => [s.code, s]));
  const lists = new Map<string, Extract<ArrivalLine, { kind: "lists" }>>();
  for (const p of preconArrivals) {
    if (p.listsSeen || !within(p.arrivedAt, now, BANNER_WINDOW_DAYS)) continue;
    const held = lists.get(p.setCode);
    if (held) {
      held.count += 1;
      if (p.arrivedAt < held.arrivedAt) held.arrivedAt = p.arrivedAt;
      continue;
    }
    const set = setByCode.get(p.setCode);
    lists.set(p.setCode, {
      kind: "lists",
      code: p.setCode,
      name: set?.name ?? p.setName ?? p.setCode.toUpperCase(),
      releasesOn: set?.releasesOn ?? p.releasesOn,
      arrivedAt: p.arrivedAt,
      count: 1,
    });
  }
  const lines: ArrivalLine[] = [...lists.values()];
  for (const s of sets) {
    if (s.seen || lists.has(s.code) || s.arrivedAt === null || !within(s.arrivedAt, now, BANNER_WINDOW_DAYS)) continue;
    lines.push({ kind: "set", code: s.code, name: s.name, releasesOn: s.releasesOn, arrivedAt: s.arrivedAt });
  }
  return lines.sort((a, b) =>
    a.releasesOn < b.releasesOn ? -1 : a.releasesOn > b.releasesOn ? 1 : a.code < b.code ? -1 : a.code > b.code ? 1 : 0);
}

/** The keys ✕ writes for these lines: a set line its code, a lists line its code AND `lists:<code>` (G4). */
export function seenKeysFor(lines: readonly ArrivalLine[]): string[] {
  return [...new Set(lines.flatMap((l) => (l.kind === "set" ? [l.code] : [l.code, `lists:${l.code}`])))];
}

/**
 * The keys a Precons visit writes: every arrival the banner could show, from the UNFILTERED reads, so a visit
 * acknowledges what is there whatever filter the page opened under.
 */
export const visitSeenKeys = (input: ArrivalsInput): string[] => seenKeysFor(arrivalsFor(input));

/** How far off a release is. Structured, not copy: the words are the Announced group's (PR 2). */
export type Countdown =
  | { kind: "tomorrow" }
  | { kind: "days"; n: number }
  | { kind: "months"; n: number }
  | { kind: "out" };

/** Past this many days a countdown reads in months. */
export const COUNTDOWN_DAYS_MAX = 60;
const DAYS_PER_MONTH = 30.44;

/** `releasesOn` against `today`, both `YYYY-MM-DD` UTC days (`utcDay`). On or after release day it is `out`. */
export function countdown(releasesOn: string, today: string): Countdown {
  const days = Math.round((Date.parse(`${releasesOn}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY_MS);
  if (days <= 0) return { kind: "out" };
  if (days === 1) return { kind: "tomorrow" };
  if (days <= COUNTDOWN_DAYS_MAX) return { kind: "days", n: days };
  return { kind: "months", n: Math.round(days / DAYS_PER_MONTH) };
}

/** A listed precon reads `new ·` for `PRECON_NEW_DAYS` from its own arrival; a baseline precon never does. */
export const preconIsNew = (arrivedAt: Date | null, now: Date): boolean => within(arrivedAt, now, PRECON_NEW_DAYS);

/**
 * The Announced group opens by itself when it holds news, or when the link asks for it (`#announced`, R2
 * change 1). News is a set arrival in the banner's window the reader has not seen: a BASELINE set is unseen by
 * everyone and is never news, or the group would open for every reader on the day the switch flips and, since a
 * visit acknowledges arrivals only, never close again (rule 9: never pushes the decklists down unasked).
 */
export function announcedOpensByItself(sets: readonly UpcomingSet[], hash: string, now: Date): boolean {
  if (hash === "#announced") return true;
  return sets.some((s) => !s.seen && within(s.arrivedAt, now, BANNER_WINDOW_DAYS));
}

export type AnnouncedFilter = { q: string; colours: readonly string[] };

export type AnnouncedMatch = {
  set: UpcomingSet;
  /** The revealed commanders that match, in their own order. */
  commanders: RevealedCommander[];
  /** `commanders.length`, the `N` of `N of 15 revealed matches`. */
  matched: number;
  /** Every commander the set has revealed, the `15`. */
  revealed: number;
};

/**
 * The Announced group under the list's filters (README §Also called):
 * - Search (trimmed, case- and accent-blind, as the precon list's) matches the set's name, its code, or a revealed
 *   commander's name. A set whose name or code matches keeps all its commanders to the colours.
 * - Colours match a COMMANDER by containment: its identity holds every colour on, as the precon list's rows do.
 * - A set with revealed commanders and none matching an active filter leaves.
 * - A set with no revealed commanders stays only with no filter on, or when its name or code matches the search.
 */
export function filterAnnounced(
  sets: readonly UpcomingSet[],
  commandersByCode: Readonly<Record<string, readonly RevealedCommander[]>>,
  { q, colours }: AnnouncedFilter,
): AnnouncedMatch[] {
  const needle = fold(q.trim());
  const active = needle !== "" || colours.length > 0;
  const out: AnnouncedMatch[] = [];
  for (const set of sets) {
    const all = commandersByCode[set.code] ?? [];
    const setMatches = needle !== "" && [set.name, set.code].some((h) => fold(h).includes(needle));
    const commanders = all.filter((c) =>
      colours.every((x) => c.colorIdentity.includes(x)) && (needle === "" || setMatches || fold(c.name).includes(needle)));
    const stays = all.length === 0 ? !active || setMatches : !active || commanders.length > 0;
    if (stays) out.push({ set, commanders, matched: commanders.length, revealed: all.length });
  }
  return out;
}
