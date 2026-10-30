import { sql } from "drizzle-orm";
import { db } from "../../db";
import { flyerHoldRow } from "../flyer/rules";
import type { InviteKind, ReservationState } from "../invites/rules";
import type { Edge, FlyerEdge, FlyerNodeRow, InviteEvent, OpenRow, ReservationRow } from "./invites-rule";

/**
 * The admin's invite reads (plan `2026-10-16-invites.md`, PR 6). SERVER-ONLY. Each is ONE statement, so a page is
 * one instant of the stock, the rows holding and the edges (a spend commits all three together), and none is a
 * transaction, so Clerk is never called while a connection is held. The open rows are every row in a state that can
 * hold; whether each still does is `holdsInvite`'s call, from the clock, as on the sender's own count line.
 */

// A timestamp inside json_build_object arrives as text, without a zone; the columns hold UTC.
export const utc = (text: string | null) => (text === null ? null : new Date(`${text}Z`));

type RawOpen = { userId: string; kind: InviteKind; state: ReservationState; qrExpiresAt: string | null; holdsUntil: string | null };
type RawEdge = { inviter: string | null; invitee: string | null; kind: InviteKind; joinedAt: string };

const toOpen = (r: RawOpen): OpenRow => ({ ...r, qrExpiresAt: utc(r.qrExpiresAt), holdsUntil: utc(r.holdsUntil) });
const toEdge = (e: RawEdge): Edge => ({ ...e, joinedAt: utc(e.joinedAt)! });
// A claim holding on a flyer code holds one of the code creator's invites, so the count reads it as waiting (`flyerHoldRow`).
type RawFlyer = { userId: string; holdsUntil: string };
const toFlyer = (f: RawFlyer): OpenRow => ({ ...flyerHoldRow(utc(f.holdsUntil)!), userId: f.userId });

type RawFlyerCode = { id: string; code: string; label: string; capacity: number; createdBy: string; createdAt: string };
type RawFlyerEdge = { codeId: string; invitee: string; joinedAt: string };

/** `flyerCodes` and `flyerEdges` are the SPENT claims: the codes that took a sign-up and the accounts they made. */
export type EveryInvite = { balances: Map<string, number>; open: ReservationRow[]; flyer: OpenRow[]; flyerCodes: FlyerNodeRow[]; flyerEdges: FlyerEdge[]; edges: Edge[] };

/**
 * M1 and M4: every account's stock, open rows (with the address, which only the admin sees) and every edge, a
 * deleted side included (the tree draws it), in one statement.
 */
export async function readEveryInvite(): Promise<EveryInvite> {
  const { rows } = await db.execute<{
    balances: { userId: string; held: number }[];
    open: (RawOpen & { id: string; email: string | null })[];
    flyer: RawFlyer[];
    flyerCodes: RawFlyerCode[];
    flyerEdges: RawFlyerEdge[];
    edges: RawEdge[];
  }>(sql`select
    coalesce((select json_agg(json_build_object('userId', b.user_id, 'held', b.held)) from invite_balances b), '[]'::json) as balances,
    coalesce((select json_agg(json_build_object(
      'id', r.id, 'userId', r.user_id, 'kind', r.kind, 'state', r.state, 'qrExpiresAt', r.qr_expires_at,
      'holdsUntil', r.holds_until, 'email', r.email
    )) from invite_reservations r where r.state in ('qr_open', 'claimed', 'reserved')), '[]'::json) as open,
    coalesce((select json_agg(json_build_object('userId', c.created_by, 'holdsUntil', f.holds_until))
      from flyer_claims f join flyer_codes c on c.id = f.code_id where f.state in ('open', 'proven')), '[]'::json) as flyer,
    coalesce((select json_agg(json_build_object(
      'id', c.id, 'code', c.code, 'label', c.label, 'capacity', c.capacity, 'createdBy', c.created_by, 'createdAt', c.created_at
    )) from flyer_codes c where exists (select 1 from flyer_claims s where s.code_id = c.id and s.state = 'spent')), '[]'::json) as "flyerCodes",
    coalesce((select json_agg(json_build_object('codeId', s.code_id, 'invitee', s.user_id, 'joinedAt', s.resolved_at))
      from flyer_claims s where s.state = 'spent'), '[]'::json) as "flyerEdges",
    coalesce((select json_agg(json_build_object(
      'inviter', e.inviter_user_id, 'invitee', e.invitee_user_id, 'kind', e.kind, 'joinedAt', e.joined_at
    )) from invite_edges e), '[]'::json) as edges`);
  const [row] = rows;
  return {
    balances: new Map(row.balances.map((b) => [b.userId, b.held])),
    open: row.open.map((r) => ({ ...toOpen(r), id: r.id, email: r.email })),
    flyer: row.flyer.map(toFlyer),
    flyerCodes: row.flyerCodes.map((c) => ({ ...c, createdAt: utc(c.createdAt)! })),
    flyerEdges: row.flyerEdges.map((e) => ({ ...e, joinedAt: utc(e.joinedAt)! })),
    edges: row.edges.map(toEdge),
  };
}

export type OneAccountInvites = {
  held: number | undefined;
  open: ReservationRow[];
  flyer: OpenRow[];
  edges: Edge[];
  events: InviteEvent[];
  holdsUntil: Date[];
};

/**
 * M2: one account's stock, its open reservations, every edge naming it on either side (all of them: Spent counts
 * them), and its history's other two sources (its invite events and the moments its reservations began to hold),
 * each cut at `limit + 1` so the merge can say the history is cut. One statement.
 */
export async function readAccountInvites(userId: string, limit: number): Promise<OneAccountInvites> {
  const { rows } = await db.execute<{
    held: number | null;
    open: (RawOpen & { id: string; email: string | null })[];
    flyer: RawFlyer[];
    edges: RawEdge[];
    events: (Omit<InviteEvent, "at"> & { at: string })[];
    sent: string[];
  }>(sql`select
    (select b.held from invite_balances b where b.user_id = ${userId}) as held,
    coalesce((select json_agg(json_build_object(
      'id', r.id, 'userId', r.user_id, 'kind', r.kind, 'state', r.state, 'qrExpiresAt', r.qr_expires_at,
      'holdsUntil', r.holds_until, 'email', r.email
    )) from invite_reservations r
      where r.user_id = ${userId} and r.state in ('qr_open', 'claimed', 'reserved')), '[]'::json) as open,
    coalesce((select json_agg(json_build_object('userId', c.created_by, 'holdsUntil', f.holds_until))
      from flyer_claims f join flyer_codes c on c.id = f.code_id
      where c.created_by = ${userId} and f.state in ('open', 'proven')), '[]'::json) as flyer,
    coalesce((select json_agg(json_build_object(
      'inviter', e.inviter_user_id, 'invitee', e.invitee_user_id, 'kind', e.kind, 'joinedAt', e.joined_at
    ) order by e.joined_at desc) from (
      select * from invite_edges where invitee_user_id = ${userId} or inviter_user_id = ${userId}
    ) e), '[]'::json) as edges,
    coalesce((select json_agg(json_build_object(
      'at', a.at, 'actorId', a.actor_id, 'kind', a.kind, 'userId', a.user_id, 'oldValue', a.old_value, 'newValue', a.new_value
    ) order by a.at desc, a.id desc) from (
      select * from admin_events where user_id = ${userId} and kind in ('invites_set', 'invite_revoked', 'account_revealed')
      order by at desc, id desc limit ${limit + 1}
    ) a), '[]'::json) as events,
    coalesce((select json_agg(s.holds_until order by s.holds_until desc) from (
      select holds_until from invite_reservations where user_id = ${userId} and holds_until is not null
      order by holds_until desc limit ${limit + 1}
    ) s), '[]'::json) as sent`);
  const [row] = rows;
  return {
    held: row.held ?? undefined,
    open: row.open.map((r) => ({ ...toOpen(r), id: r.id, email: r.email })),
    flyer: row.flyer.map(toFlyer),
    edges: row.edges.map(toEdge),
    events: row.events.map((e) => ({ ...e, at: utc(e.at)! })),
    holdsUntil: row.sent.map((t) => utc(t)!),
  };
}
