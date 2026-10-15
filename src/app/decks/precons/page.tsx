// /decks/precons (handoff `design_handoff_the99_precons`, R2): every Commander precon, with how many
// of its cards the reader owns. Behind `PRECONS_ENABLED`. Cached per reader on the database's
// stamp, as `/decks` is, and on the catalog generation the precon ingest moves.

import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { requireUserId } from "../../../lib/auth";
import { cachePageForUser } from "../../../lib/cache/page-cache";
import { preconsCopy } from "../../../lib/copy/precons";
import { preconsEnabled } from "../../../lib/precons/flag";
import { requestSwitchEnv } from "../../../lib/switches/request";
import { parsePreconParams } from "../../../lib/precons/list";
import { loadPreconList, type PreconList } from "../../../lib/precons/list-read";
import { announcedProps, newPreconFiles, type UpcomingPayload } from "../../../lib/precons/announced";
import { loadUpcomingPayload } from "../../../lib/precons/announced-read";
import { visitSeenKeys } from "../../../lib/precons/arrivals";
import { upcomingPreconsEnabled } from "../../../lib/precons/upcoming-flag";
import { markUpcomingSeen, utcDay } from "../../../lib/precons/upcoming";
import { recordSoftFailure } from "../../../lib/cache/soft-failure";
import { PreconListView } from "../../../components/decks/precons/precon-list-view";
import { PreconsDown } from "../../../components/decks/precons/precons-down";
import {
  parsePreconsAnnouncedCookie, parsePreconsViewCookie, PRECONS_ANNOUNCED_COOKIE, PRECONS_VIEW_COOKIE,
} from "../../../components/ui/view-cookie";

export const metadata: Metadata = { title: preconsCopy.list.title };

export default async function PreconsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const userId = await requireUserId();
  // The reader's resolved switches, once: the gate and the cached list's key read the same env.
  const env = await requestSwitchEnv(userId);
  if (!preconsEnabled(env)) notFound();
  const raw = await searchParams;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(raw)) if (typeof v === "string") params.set(k, v);

  // Upcoming precons (plan PR 2): the Announced group, the `new ·` tags and the visit's seen write, all behind
  // the switch. The UTC day enters the key, because the reads' windows (an upcoming set, a listed precon) are
  // days; the reader's seen state rides inside the payload, retired by `user_prefs`'s stamp trigger (E5).
  const upcomingOn = upcomingPreconsEnabled(env);
  const now = new Date();

  // L4: an empty or unreadable list is "couldn't be read", never "there are no precons". Not stored,
  // so the next visit reads again.
  let payload: { list: PreconList; upcoming: UpcomingPayload | null } | null = null;
  try {
    payload = await cachePageForUser(userId, "precons", upcomingOn ? [utcDay(now)] : [], async () => {
      const list = await loadPreconList(userId);
      let upcoming: UpcomingPayload | null = null;
      if (upcomingOn) {
        try {
          upcoming = await loadUpcomingPayload(userId, now);
        } catch (error) {
          // T9: a failed upcoming read draws the list as shipped, and is served and never stored.
          recordSoftFailure();
          console.error("precons: the upcoming sets could not be read", error);
        }
      }
      return { value: { list, upcoming }, store: list.rows.length > 0 && (!upcomingOn || upcoming !== null) };
    }, env);
  } catch (error) {
    // not a fallback: a load that throws is never stored, and this renders L4, not a list.
    console.error("precons: the list could not be read", error);
  }
  const list = payload?.list ?? null;
  if (!list || list.rows.length === 0) return <PreconsDown />;
  const upcoming = upcomingOn ? payload?.upcoming ?? null : null;
  // Whether this visit writes seen keys, which the view passes on to Home's banner for this document.
  let acknowledges = false;
  if (upcoming) {
    // A visit acknowledges every arrival the banner could show, from the UNFILTERED reads: whatever the filters,
    // the order (Most owned hides the group) or the disclosure, and a set whose lists have landed and so left the
    // group. After the response, so the page never waits on it; the write moves the stamp only when it adds a key.
    const keys = visitSeenKeys({ sets: upcoming.sets, preconArrivals: upcoming.arrivals, now });
    if (keys.length > 0) {
      acknowledges = true;
      after(async () => {
        try {
          await markUpcomingSeen(userId, keys);
        } catch (error) {
          // not a fallback: a lost write leaves the banner up until the next visit or its ✕, and nothing is drawn from it.
          console.error("precons: the seen write failed", error);
        }
      });
    }
  }
  // The view the browser stored, so the server draws tiles or rows as the reader will see them. A
  // hint only: anything but `tiles` or `rows` reads as absent.
  const jar = await cookies();
  const storedView = parsePreconsViewCookie(jar.get(PRECONS_VIEW_COOKIE)?.value);
  // The Announced head's last press, so the server draws the group as the reader left it (no open-after-hydration).
  const storedAnnounced = upcoming ? parsePreconsAnnouncedCookie(jar.get(PRECONS_ANNOUNCED_COOKIE)?.value) : null;

  return (
    <PreconListView
      rows={list.rows}
      hasCollection={list.hasCollection}
      fromNew={params.get("from") === "new"}
      initial={parsePreconParams(params)}
      query={params.toString()}
      storedView={storedView}
      announced={upcoming ? announcedProps(upcoming, now) : null}
      storedAnnounced={storedAnnounced}
      newFileNames={upcoming ? newPreconFiles(upcoming.arrivals, now) : []}
      acknowledgesArrivals={acknowledges}
    />
  );
}
