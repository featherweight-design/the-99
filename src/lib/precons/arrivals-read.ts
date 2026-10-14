/**
 * The precons the catalog listed lately (upcoming precons, E3): every `precons` row whose `catalog_first_seen`
 * stamp (kind `precon`, keyed on `precons.file_name`, as `db:seed:precons` writes it) is an arrival rather than
 * the baseline, within `BANNER_WINDOW_DAYS`. The arrivals banner rolls them up by set (`arrivalsFor`), and the
 * precon list tags each `new ·` for `PRECON_NEW_DAYS` (`preconIsNew`). No caller yet but its tests and
 * `pnpm probe:upcoming-precons`.
 *
 * A twin (a Collector's Edition repeating another deck's list) is left out: the list shows one row for both, so
 * the banner's count of decklists is the count the reader finds there.
 */
import { and, eq, gt, isNull, sql } from "drizzle-orm";

import { db } from "../../db";
import { catalogFirstSeen, precons, sets, userPrefs } from "../../db/schema";
import { BANNER_WINDOW_DAYS } from "./arrivals";

export type PreconArrival = {
  fileName: string;
  name: string;
  /** `sets.code`: lowercase, where `precons.set_code` is MTGJSON's uppercase. */
  setCode: string;
  /** The set's name from `sets`; null only when the catalog lacks the set (none did on 2026-10-14). */
  setName: string | null;
  /** `YYYY-MM-DD`, the precon's own release date. */
  releasesOn: string;
  arrivedAt: Date;
  /** The reader holds `lists:<setCode>`: they have been shown this set's decklists. */
  listsSeen: boolean;
};

type Reader = Pick<typeof db, "select">;

const DAY_MS = 86_400_000;

/** The read, apart so a test can render its SQL. */
export function preconArrivalsQuery(userId: string, now: Date, q: Reader = db) {
  const since = new Date(now.getTime() - BANNER_WINDOW_DAYS * DAY_MS);
  return q
    .select({
      fileName: precons.fileName,
      name: precons.name,
      setCode: sql<string>`lower(${precons.setCode})`,
      setName: sets.name,
      releasesOn: precons.releaseDate,
      arrivedAt: catalogFirstSeen.firstSeenAt,
      listsSeen: sql<boolean>`coalesce(('lists:' || lower(${precons.setCode})) = any(${userPrefs.upcomingSeenCodes}), false)`,
    })
    .from(precons)
    .innerJoin(catalogFirstSeen, and(eq(catalogFirstSeen.kind, "precon"), eq(catalogFirstSeen.key, precons.fileName)))
    .leftJoin(sets, eq(sets.code, sql`lower(${precons.setCode})`))
    .leftJoin(userPrefs, eq(userPrefs.userId, userId))
    .where(and(eq(catalogFirstSeen.baseline, false), gt(catalogFirstSeen.firstSeenAt, since), isNull(precons.twinOf)))
    .orderBy(catalogFirstSeen.firstSeenAt, precons.fileName);
}

/** The precons that arrived in the last `BANNER_WINDOW_DAYS`, oldest arrival first, with whether `userId` saw their set's lists. */
export async function loadPreconArrivals(userId: string, now = new Date(), q: Reader = db): Promise<PreconArrival[]> {
  const rows = await preconArrivalsQuery(userId, now, q);
  return rows.map((r) => ({ ...r, releasesOn: r.releasesOn as string }));
}
