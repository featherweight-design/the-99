/**
 * The arrivals banner's payload (upcoming precons, plan PR 3): what Home draws between its header and Ready to
 * build. The lines come from the pure `arrivalsFor` over the two reads PR 1 shipped, plus each announced set's
 * revealed-commander count for its sentence.
 *
 * It rides in Home's cached payload (E5). `user_prefs`, which holds what the reader has seen, carries the stamp
 * trigger since 0123, so either write that marks an arrival seen retires the entry: a ✕ (`dismissArrivals`) or a
 * Precons visit (the page's `after()`, rule 6). `check:list-cache` holds that.
 */
import { recordSoftFailure } from "../cache/soft-failure";
import { loadPreconArrivals } from "./arrivals-read";
import { arrivalsFor, seenKeysFor, type ArrivalLine } from "./arrivals";
import { loadRevealedCommanders } from "./revealed";
import { loadUpcomingSets, SEEN_KEY } from "./upcoming";

/** One line as the banner draws it. */
export type BannerLine =
  | { kind: "set"; code: string; name: string; revealed: number }
  | { kind: "lists"; code: string; name: string; count: number };

export type ArrivalsBannerData = {
  lines: BannerLine[];
  /** Where the banner's one link goes. */
  href: string;
  /** What ✕ marks seen (`seenKeysFor`). The action re-checks them against the reader's lines at the press. */
  keys: string[];
};

const PRECONS = "/decks/precons?sort=newest";

/**
 * The link. A set line goes to the Announced group (`#announced`, which opens it by itself); a lists line to its
 * year's group on Precons (`#precons-<year>`, the year head's id). Several lines take one link: the Announced
 * group when any of them is a set announced, else the first line's year (the lines are soonest first).
 *
 * `sort=newest` is explicit because the list restores a Most owned order the browser saved when the URL names
 * none, and under Most owned neither target is drawn.
 */
export function arrivalsHref(lines: readonly ArrivalLine[]): string {
  const first = lines[0];
  if (!first || lines.some((l) => l.kind === "set")) return `${PRECONS}#announced`;
  return `${PRECONS}#precons-${first.releasesOn.slice(0, 4)}`;
}

/** The lines as drawn: a set line carries its revealed count, a lists line its decklist count. */
export function bannerLines(lines: readonly ArrivalLine[], revealedByCode: Readonly<Record<string, readonly unknown[]>>): BannerLine[] {
  return lines.map((l) =>
    l.kind === "set"
      ? { kind: "set", code: l.code, name: l.name, revealed: revealedByCode[l.code]?.length ?? 0 }
      : { kind: "lists", code: l.code, name: l.name, count: l.count });
}

/** At most this many keys are read from a ✕: the banner never draws a quarter of it. */
const MAX_CLAIMED = 100;

/**
 * What a ✕ writes. `claimed` is what the page drew, sent back by the browser and so not trusted: each must be a
 * well-formed seen key (`SEEN_KEY`) AND one of the keys the reader's own lines give NOW (`current`). So a caller can
 * drop a key but never add one, and an arrival that landed after the banner rendered is not marked seen unread.
 */
export function dismissKeys(claimed: unknown, current: readonly string[]): string[] {
  if (!Array.isArray(claimed)) return [];
  const now = new Set(current);
  const keys = claimed.slice(0, MAX_CLAIMED).filter((k): k is string => typeof k === "string" && SEEN_KEY.test(k) && now.has(k));
  return [...new Set(keys)];
}

/** The reader's banner lines now, from the reads. Throws when a read fails. */
export async function readArrivalLines(userId: string, now: Date): Promise<ArrivalLine[]> {
  const [sets, preconArrivals] = await Promise.all([loadUpcomingSets(userId, now), loadPreconArrivals(userId, now)]);
  return arrivalsFor({ sets, preconArrivals, now });
}

/**
 * The banner for `userId`, or null when there is nothing to show. A failed read is null too, and is recorded as a
 * fallback, so Home draws without the banner (STATES rule 8: nothing is said) and that render is not stored.
 */
export async function loadArrivalsBanner(userId: string, now: Date): Promise<ArrivalsBannerData | null> {
  try {
    const lines = await readArrivalLines(userId, now);
    if (lines.length === 0) return null;
    const revealed = await loadRevealedCommanders(lines.filter((l) => l.kind === "set").map((l) => l.code));
    return { lines: bannerLines(lines, revealed), href: arrivalsHref(lines), keys: seenKeysFor(lines) };
  } catch {
    recordSoftFailure();
    return null;
  }
}
