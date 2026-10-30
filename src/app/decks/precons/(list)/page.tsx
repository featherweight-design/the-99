// /decks/precons (handoff `design_handoff_the99_precons`, R2): every Commander precon, with how many
// of its cards the reader owns. Cached per reader on the database's
// stamp, as `/decks` is, and on the catalog generation the precon ingest moves.

import type { Metadata } from "next";
import { cookies } from "next/headers";
import { after } from "next/server";
import { requireUserId } from "../../../../lib/auth";
import { cachePageForUser } from "../../../../lib/cache/page-cache";
import { preconsCopy } from "../../../../lib/copy/precons";
import { requestSwitchEnv } from "../../../../lib/switches/request";
import { parsePreconParams } from "../../../../lib/precons/list";
import {
  loadPreconList,
  type PreconList,
} from "../../../../lib/precons/list-read";
import {
  announcedProps,
  newPreconFiles,
  type UpcomingPayload,
} from "../../../../lib/precons/announced";
import { loadUpcomingPayload } from "../../../../lib/precons/announced-read";
import { visitSeenKeys } from "../../../../lib/precons/arrivals";
import { earlySeenKeys } from "../../../../lib/announcements/early-tiles";
import { markUpcomingSeen, utcDay } from "../../../../lib/precons/upcoming";
import { recordSoftFailure } from "../../../../lib/cache/soft-failure";
import { PreconListView } from "../../../../components/decks/precons/precon-list-view";
import { PreconsDown } from "../../../../components/decks/precons/precons-down";
import { PreconPickView } from "../../../../components/decks/precons/precon-pick-view";
import { collectionEditEnabled } from "../../../../lib/collection/edit-flag";
import {
  PICK_PARAM,
  PICK_VALUE,
  pickEntry,
} from "../../../../lib/precons/pick";
import { pageLanding } from "../../../../lib/discovery/page-landing";
import { TOOL_PARAM } from "../../../../lib/discovery/tool-param";
import { ToolLandingMount } from "../../../../components/discovery/tool-landing-mount";
import {
  parsePreconsAnnouncedCookie,
  parsePreconsViewCookie,
  PRECONS_ANNOUNCED_COOKIE,
  PRECONS_VIEW_COOKIE,
} from "../../../../components/ui/view-cookie";

export const metadata: Metadata = { title: preconsCopy.list.title };

export default async function PreconsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const userId = await requireUserId();
  // The reader's resolved switches, once: the cached list's key read the same env.
  const env = await requestSwitchEnv(userId);
  const raw = await searchParams;
  // Try it's landing (discovery R2·3): `?tool=precons` haloes the list's search; anything else, or any branch without the list (the pick, the list down), is stripped.
  const { landing, request } = pageLanding(raw[TOOL_PARAM], env, "precons");
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(raw))
    if (typeof v === "string") params.set(k, v);

  // Precons I own (no-collection entry S2 to S7): a pick mode of this list, behind collection edit. Its payload
  // carries each box's copies and tokens, so it has its own key and is never the plain list's entry. Off, or with
  // no `pick=own`, the page below is exactly as shipped.
  if (params.get(PICK_PARAM) === PICK_VALUE && collectionEditEnabled(env)) {
    let picked: PreconList | null = null;
    try {
      picked = await cachePageForUser(
        userId,
        "precons",
        [PICK_PARAM],
        async () => {
          const list = await loadPreconList(userId, { boxes: true });
          return { value: list, store: list.rows.length > 0 };
        },
        env,
      );
    } catch (error) {
      // not a fallback: a load that throws is never stored, and this renders L4, not a list.
      console.error("precons: the pick could not be read", error);
    }
    // The pick view draws no list search, so a `?tool=` here is only stripped.
    if (!picked || picked.rows.length === 0) {
      return (
        <>
          <ToolLandingMount landing={null} request={request} />
          <PreconsDown />
        </>
      );
    }
    // With cards, every row carries the shipped `you own N of M` (E2), and a box with a standing precon add its mark (S17).
    return (
      <>
        <ToolLandingMount landing={null} request={request} />
        <PreconPickView
          rows={picked.rows}
          entry={pickEntry(params.get("from"))}
          initial={parsePreconParams(params)}
          hasCollection={picked.hasCollection}
          added={picked.added ?? {}}
        />
      </>
    );
  }

  // Upcoming precons (plan PR 2): the Announced group, the `new ·` tags and the visit's seen write. The UTC day enters the key, because the reads' windows (an upcoming set, a listed precon) are
  // days; the reader's seen state rides inside the payload, retired by `user_prefs`'s stamp trigger (E5).
  const now = new Date();

  // L4: an empty or unreadable list is "couldn't be read", never "there are no precons". Not stored,
  // so the next visit reads again.
  let payload: { list: PreconList; upcoming: UpcomingPayload | null } | null =
    null;
  try {
    payload = await cachePageForUser(
      userId,
      "precons",
      [utcDay(now)],
      async (keyEnv) => {
        const list = await loadPreconList(userId);
        let upcoming: UpcomingPayload | null = null;
        try {
          upcoming = await loadUpcomingPayload(userId, now, keyEnv);
        } catch (error) {
          // T9: a failed upcoming read draws the list as shipped, and is served and never stored.
          recordSoftFailure();
          console.error("precons: the upcoming sets could not be read", error);
        }
        return {
          value: { list, upcoming },
          store: list.rows.length > 0 && upcoming !== null,
        };
      },
      env,
    );
  } catch (error) {
    // not a fallback: a load that throws is never stored, and this renders L4, not a list.
    console.error("precons: the list could not be read", error);
  }
  const list = payload?.list ?? null;
  if (!list || list.rows.length === 0) {
    return (
      <>
        <ToolLandingMount landing={null} request={request} />
        <PreconsDown />
      </>
    );
  }
  const upcoming = payload?.upcoming ?? null;
  // Whether this visit writes seen keys, which the view passes on to Home's banner for this document.
  let acknowledges: string[] = [];
  if (upcoming) {
    // A visit acknowledges every arrival the banner could show, from the UNFILTERED reads: whatever the filters,
    // the order (Most owned hides the group) or the disclosure, and a set whose lists have landed and so left the
    // group. After the response, so the page never waits on it; the write moves the stamp only when it adds a key.
    // With them, each set's early lists at the count this visit could show (G2: `early:<code>:<count>`, apart from
    // `lists:<code>`), so a further list lights the set again. None ride the payload with the switch off.
    const keys = [
      ...visitSeenKeys({
        sets: upcoming.sets,
        preconArrivals: upcoming.arrivals,
        now,
      }),
      ...earlySeenKeys(upcoming.early ?? {}),
    ];
    if (keys.length > 0) {
      acknowledges = keys;
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
  const storedView = parsePreconsViewCookie(
    jar.get(PRECONS_VIEW_COOKIE)?.value,
  );
  // The Announced head's last press, so the server draws the group as the reader left it (no open-after-hydration).
  const storedAnnounced = upcoming
    ? parsePreconsAnnouncedCookie(jar.get(PRECONS_ANNOUNCED_COOKIE)?.value)
    : null;

  return (
    <>
      <ToolLandingMount landing={landing} request={request} />
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
    </>
  );
}
