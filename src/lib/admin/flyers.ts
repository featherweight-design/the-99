import { sql } from "drizzle-orm";
import { db } from "../../db";
import type { InviteKind, ReservationState } from "../invites/rules";
import type { FlyersRead } from "./flyers-rule";
import { readStoredLaunchDate } from "../flyer/launch-date";
import { utc } from "./invites";

/**
 * The Flyer codes section's read (flyer trial PR 4a). SERVER-ONLY, ONE statement (plus the saved launch date, a second read of one row): every code with the sign-ups it
 * took, its group's name and the launch-list addresses it brought, the launch list's total, and the viewer's invite
 * stock with what holds one of his invites (his reservations and the claims holding on his codes), so the meta line's
 * "left" is the count every other surface reads. Each correlated count aliases its table and qualifies both sides.
 */
export async function readFlyerCodes(viewerId: string): Promise<FlyersRead> {
  const { rows } = await db.execute<{
    codes: {
      id: string;
      code: string;
      label: string;
      groupName: string | null;
      capacity: number;
      createdAt: string;
      revokedAt: string | null;
      taken: number;
      listed: number;
    }[];
    listed: number;
    held: number | null;
    open: { kind: InviteKind; state: ReservationState; qrExpiresAt: string | null; holdsUntil: string | null }[];
    holds: string[];
  }>(sql`select
    coalesce((select json_agg(json_build_object(
      'id', c.id, 'code', c.code, 'label', c.label, 'groupName', g.name, 'capacity', c.capacity,
      'createdAt', c.created_at, 'revokedAt', c.revoked_at,
      'taken', (select count(*) from flyer_claims fc where fc.code_id = c.id and fc.state = 'spent')::int,
      'listed', (select count(*) from launch_list ll where ll.code_id = c.id)::int
    ) order by c.created_at, c.id) from flyer_codes c left join flag_groups g on g.id = c.group_id), '[]'::json) as codes,
    (select count(*) from launch_list)::int as listed,
    (select b.held from invite_balances b where b.user_id = ${viewerId}) as held,
    coalesce((select json_agg(json_build_object(
      'kind', r.kind, 'state', r.state, 'qrExpiresAt', r.qr_expires_at, 'holdsUntil', r.holds_until
    )) from invite_reservations r where r.user_id = ${viewerId} and r.state in ('qr_open', 'claimed', 'reserved')), '[]'::json) as open,
    coalesce((select json_agg(h.holds_until) from flyer_claims h join flyer_codes hc on hc.id = h.code_id
      where hc.created_by = ${viewerId} and h.state in ('open', 'proven')), '[]'::json) as holds`);
  const [row] = rows;
  const launchDate = await readStoredLaunchDate();
  return {
    codes: row.codes.map((c) => ({ ...c, createdAt: utc(c.createdAt)!, revokedAt: utc(c.revokedAt) })),
    listed: row.listed,
    held: row.held ?? undefined,
    open: row.open.map((r) => ({ ...r, qrExpiresAt: utc(r.qrExpiresAt), holdsUntil: utc(r.holdsUntil) })),
    holds: row.holds.map((t) => utc(t)!),
    launchDate,
  };
}
