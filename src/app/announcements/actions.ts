"use server";

import { requireUserId } from "../../lib/auth";
import { requestFlags } from "../../lib/flags/request";
import { loadArchivePage } from "../../lib/announcements/archive";
import { parseArchiveKind, parseCursor, type ArchivePage } from "../../lib/announcements/archive-model";

/**
 * One more page of the archive: Show older, a month jump, a kind's first page. READS ONLY (nothing is revalidated and no
 * seen state moves). Null while `ANNOUNCEMENTS_ENABLED` is off for this reader, which the view draws as a failed page. A
 * cursor that is not one reads the first page, as `loadArchivePage` does; the kind is checked against the closed set.
 */
export async function loadArchivePageAction(kind: unknown, after: unknown): Promise<ArchivePage | null> {
  const userId = await requireUserId();
  const env = await requestFlags(userId);
  return loadArchivePage(env, parseArchiveKind(kind), typeof after === "string" && parseCursor(after) ? after : null);
}
