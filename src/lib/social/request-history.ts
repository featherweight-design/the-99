/**
 * Request history (#2984, R1d): every spare request the viewer asked ("You asked") or was asked ("Asked of you"), newest first,
 * 30 a page. Every read here lives in `src/lib/social/` and joins the viewer's own friendship row in the same statement, so a
 * request whose other side is no longer a friend is simply not read (README Q2: hidden; rows survive `unfriend`, so re-friending
 * restores them). Cleared asks show (✕ sets `asker_cleared_at`, never deletes). A withdrawn ask never shows on the holder's side.
 */
import { sql, type SQL } from "drizzle-orm";
import { db } from "../../db";
import { cards, decks, friendLinks, printings, socialProfiles, spareRequests } from "../../db/schema";
import { named } from "../person-name/mint";
import type { OtherSide, AskCard } from "./spare-requests";
import type { ProfileCommander } from "./commander";
import { expiresAt, requestState, type RequestState, type StoredStatus } from "./spare-request-rules";

type Executor = Pick<typeof db, "execute">;

export const HISTORY_PAGE = 30;
export type HistoryDirection = "asked" | "received";
/** Keyset on (created_at, id), newest first: the last row of the page before. `createdAt` is the database's own ISO text for the stamp in UTC with microseconds (`to_char`, so no session DateStyle or zone can change it), never a JS Date, so a tie within a millisecond neither repeats nor skips a row. */
export type HistoryCursor = { createdAt: string; id: string };

export type HistoryEntry = {
  id: string; oracleId: string; card: AskCard; copies: number;
  /** The asker's deck by name, or null (none, or since deleted). On the holder's side the asker chose to send it with the ask. */
  deckName: string | null;
  other: OtherSide;
  state: RequestState;
  createdAt: Date;
  /** When it ended: the answer's time for a Yes or No, the 14th day for no answer, the withdrawal's time (null for one withdrawn before `withdrawn_at` existed), the day asked while open. */
  endedAt: Date | null;
  /** An offer (`initiated_by = 'holder'`): From you, the viewer made it; To you, it was made to the viewer. An offer row carries no deck line. */
  offer: boolean;
};
export type HistoryPage = { entries: HistoryEntry[]; next: HistoryCursor | null };

type Row = {
  id: string; oracle_id: string; status: StoredStatus; created_at: Date | string; answered_at: Date | string | null; withdrawn_at: Date | string | null; cursor_at: string;
  copies: number; public_id: string; display_name: string; card_name: string; card_image: string | null; deck_name: string | null;
  commander_oracle_id: string | null; commander_name: string | null; commander_art: string | null; offer: boolean;
};

const CURSOR_AT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** A cursor comes back from a client: a malformed one reads as no cursor (the first page) rather than a cast error. */
export function validCursor(c: HistoryCursor): boolean {
  return CURSOR_AT.test(c.createdAt) && UUID.test(c.id);
}

/**
 * One page. The direction is who STARTED the row (You have it R2): `asked` (From you) is every ask the viewer made (the asker) and every
 * offer the viewer made (the holder); `received` (To you) the reverse, and `withdrawn` is left out (the starter withdrew it; the other
 * side never sees it). The other side is the row's other user either way. The friendship join is the viewer's own row
 * (`friend_links.user_id = viewer`). Fetches one row past the page to know a next exists.
 */
export function requestHistoryQuery(viewerId: string, direction: HistoryDirection, cursor: HistoryCursor | null, limit = HISTORY_PAGE): SQL {
  const asked = direction === "asked";
  // An ask is started by its asker, an offer by its holder: the starter and the other side follow `initiated_by`, not the column.
  const starter = sql`(case when hsr.initiated_by = 'asker' then hsr.asker_user_id else hsr.holder_user_id end)`;
  const nonStarter = sql`(case when hsr.initiated_by = 'asker' then hsr.holder_user_id else hsr.asker_user_id end)`;
  const mine = asked ? starter : nonStarter;
  const theirs = asked ? nonStarter : starter;
  // The same test written on the plain columns, so the (asker, created_at) and (holder, created_at) indexes can serve the filter.
  const mineIsViewer = asked
    ? sql`((hsr.initiated_by = 'asker' and hsr.asker_user_id = ${viewerId}) or (hsr.initiated_by = 'holder' and hsr.holder_user_id = ${viewerId}))`
    : sql`((hsr.initiated_by = 'asker' and hsr.holder_user_id = ${viewerId}) or (hsr.initiated_by = 'holder' and hsr.asker_user_id = ${viewerId}))`;
  const notWithdrawn = asked ? sql`` : sql` and hsr.status <> 'withdrawn'`;
  const after = cursor && validCursor(cursor) ? sql` and (hsr.created_at, hsr.id) < (${cursor.createdAt}::timestamptz, ${cursor.id}::uuid)` : sql``;
  return sql`select hsr.id, hsr.oracle_id, hsr.status, hsr.created_at, hsr.answered_at, hsr.withdrawn_at, to_char(hsr.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as cursor_at, hsr.copies, (hsr.initiated_by = 'holder') as offer,
      hsp.public_id::text as public_id, hsp.display_name, hc.name as card_name, hc.image_uri as card_image, hdk.name as deck_name,
      hcc.oracle_id as commander_oracle_id, hcc.name as commander_name, coalesce(hfp.art_crop_uri, hcc.art_crop_uri) as commander_art
    from ${spareRequests} hsr
    join ${friendLinks} hfl on hfl.user_id = ${mine} and hfl.friend_user_id = ${theirs}
    join ${socialProfiles} hsp on hsp.user_id = ${theirs}
    join ${cards} hc on hc.oracle_id = hsr.oracle_id
    left join ${decks} hdk on hdk.id = hsr.deck_id and hdk.user_id = hsr.asker_user_id and hsr.initiated_by = 'asker'
    left join ${cards} hcc on hcc.oracle_id = hsp.commander_oracle_id
    left join ${printings} hfp on hfp.scryfall_id = hsp.commander_printing_id and hfp.oracle_id = hsp.commander_oracle_id
    where ${mineIsViewer}${notWithdrawn}${after}
    order by hsr.created_at desc, hsr.id desc
    limit ${limit + 1}`;
}

/** How many requests and offers the history would show the viewer (a withdrawn row never shows on the non-starter's side: the holder of an ask, the wanter of an offer) that name someone who is not a friend now. A count: no names are read (G3). */
export function hiddenHistoryCountQuery(viewerId: string): SQL {
  return sql`select count(*)::int as n from ${spareRequests} hcr
    where (hcr.asker_user_id = ${viewerId} or hcr.holder_user_id = ${viewerId})
      and not (hcr.status = 'withdrawn' and (case when hcr.initiated_by = 'asker' then hcr.holder_user_id else hcr.asker_user_id end) = ${viewerId})
      and not exists (
        select 1 from ${friendLinks} hcl
        where hcl.user_id = ${viewerId}
          and hcl.friend_user_id = case when hcr.asker_user_id = ${viewerId} then hcr.holder_user_id else hcr.asker_user_id end)`;
}

/** When the request ended, by its state (README call 4: the kicker's date). */
export function endedAtOf(state: RequestState, r: { createdAt: Date; answeredAt: Date | null; withdrawnAt: Date | null }): Date | null {
  switch (state) {
    case "yes":
    case "no":
      return r.answeredAt;
    case "expired":
      return expiresAt(r.createdAt);
    case "withdrawn":
      return r.withdrawnAt;
    default:
      return r.createdAt;
  }
}

function faceOf(r: Pick<Row, "commander_oracle_id" | "commander_name" | "commander_art">): ProfileCommander | null {
  if (r.commander_oracle_id === null || r.commander_name === null) return null;
  return { oracleId: r.commander_oracle_id, name: r.commander_name, artCropUri: r.commander_art };
}

export async function loadRequestHistory(
  viewerId: string, direction: HistoryDirection, cursor: HistoryCursor | null = null, now = new Date(), q: Executor = db,
): Promise<HistoryPage> {
  const rows = (await q.execute<Row>(requestHistoryQuery(viewerId, direction, cursor))).rows as Row[];
  const page = rows.slice(0, HISTORY_PAGE);
  const entries = page.map((r): HistoryEntry => {
    const createdAt = new Date(r.created_at);
    const answeredAt = r.answered_at === null ? null : new Date(r.answered_at);
    const withdrawnAt = r.withdrawn_at === null ? null : new Date(r.withdrawn_at);
    const state = requestState({ status: r.status, createdAt }, now);
    return {
      id: r.id, oracleId: r.oracle_id, card: { name: r.card_name, imageUri: r.card_image }, copies: Number(r.copies),
      deckName: r.deck_name, other: { publicId: r.public_id, displayName: named(r.display_name), commander: faceOf(r) },
      state, createdAt, endedAt: endedAtOf(state, { createdAt, answeredAt, withdrawnAt }), offer: r.offer === true,
    };
  });
  const last = page[page.length - 1];
  const next = rows.length > HISTORY_PAGE && last ? { createdAt: last.cursor_at, id: last.id } : null;
  return { entries, next };
}

export async function hiddenHistoryCount(viewerId: string, q: Executor = db): Promise<number> {
  const rows = (await q.execute<{ n: number }>(hiddenHistoryCountQuery(viewerId))).rows as { n: number }[];
  return Number(rows[0]?.n ?? 0);
}

/** Whether the viewer has any request to show on `/friends/requests` (either side), for the Requests box's foot link. One row each, the same grant join. */
export async function hasRequestHistory(viewerId: string, q: Executor = db): Promise<boolean> {
  const [asked, received] = await Promise.all([
    q.execute(requestHistoryQuery(viewerId, "asked", null, 1)),
    q.execute(requestHistoryQuery(viewerId, "received", null, 1)),
  ]);
  return asked.rows.length > 0 || received.rows.length > 0;
}
