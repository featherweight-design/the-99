import { sql } from "drizzle-orm";
import { db } from "../../db";
import { explainForAccounts } from "../switches/explain";
import { isOverrideName } from "../switches/registry";
import type { OverrideRow, SwitchSnapshot } from "../switches/resolve";
import type { InviteKind, ReservationState } from "../invites/rules";
import { listAccounts, type Account } from "./accounts";
import {
  carried,
  groupHistory,
  groupsList,
  memberEffects,
  memberRows,
  type GroupCard,
  type GroupEvent,
  type GroupsList,
  type MemberRow,
  type SavedGroup,
} from "./groups-rule";
import { countFor, type OpenRow, type TopUpMember } from "./invites-rule";
import { accountNames } from "./names";
import type { HistoryItem } from "./switch-page-rule";
import { HISTORY_LIMIT } from "./switches";

/**
 * The Groups pages' reads (admin plan 9a). Read fresh, never through the 30-second memo, so a page
 * drawn after the admin's own save shows it. The groups, overrides, memberships and the group's
 * events come in ONE statement, so the page is one instant (the reason `SNAPSHOT_SQL` is one too).
 */
export type GroupHead = { id: string; name: string; description: string | null };

type RawState = {
  groups: (GroupHead & { dailyAllowance: number | null })[];
  overrides: OverrideRow[];
  members: { userId: string; groupId: string }[];
  events: (Omit<GroupEvent, "at"> & { at: string })[];
  inviteBalances: { userId: string; held: number }[];
  inviteOpen: { userId: string; kind: InviteKind; state: ReservationState; qrExpiresAt: string | null; holdsUntil: string | null }[];
};

// A timestamp inside json_build_object arrives as text, without a zone; the columns hold UTC.
const utc = (text: string) => new Date(`${text}Z`);

async function readState(groupId: string | null) {
  const { rows } = await db.execute<RawState>(sql`select
    coalesce((select json_agg(json_build_object(
      'id', g.id, 'name', g.name, 'description', g.description, 'dailyAllowance', g.daily_allowance
    )) from flag_groups g), '[]'::json) as groups,
    coalesce((select json_agg(json_build_object(
      'switchName', o."switch", 'scope', o.scope, 'groupId', o.group_id, 'userId', o.user_id, 'value', o.value
    )) from flag_overrides o), '[]'::json) as overrides,
    coalesce((select json_agg(json_build_object('userId', m.user_id, 'groupId', m.group_id)) from flag_group_members m), '[]'::json) as members,
    coalesce((select json_agg(json_build_object(
      'at', e.at, 'actorId', e.actor_id, 'kind', e.kind, 'switchName', e."switch", 'scope', e.scope, 'groupId', e.group_id,
      'userId', e.user_id, 'oldValue', e.old_value, 'newValue', e.new_value, 'note', e.note
    ) order by e.at desc, e.id desc) from (
      -- One past the limit, so the page can say the list is cut.
      select * from admin_events where ${groupId}::uuid is not null and group_id = ${groupId}::uuid
      order by at desc, id desc limit ${HISTORY_LIMIT + 1}
    ) e), '[]'::json) as events,
    -- The members' invite stock and open rows, for Top up invites (M3), in the same instant as the memberships.
    coalesce((select json_agg(json_build_object('userId', b.user_id, 'held', b.held)) from invite_balances b
      where b.user_id in (select user_id from flag_group_members where group_id = ${groupId}::uuid)), '[]'::json) as "inviteBalances",
    coalesce((select json_agg(json_build_object(
      'userId', r.user_id, 'kind', r.kind, 'state', r.state, 'qrExpiresAt', r.qr_expires_at, 'holdsUntil', r.holds_until
    )) from invite_reservations r where r.state in ('qr_open', 'claimed', 'reserved')
      and r.user_id in (select user_id from flag_group_members where group_id = ${groupId}::uuid)), '[]'::json) as "inviteOpen"`);
  const [row] = rows;
  const snapshot: SwitchSnapshot = {
    // An All features row outranks the group rung, so the resolver's snapshot keeps it.
    overrides: row.overrides.filter((o) => isOverrideName(o.switchName)),
    groupOf: new Map(row.members.map((m) => [m.userId, m.groupId])),
  };
  const maybe = (t: string | null) => (t === null ? null : utc(t));
  return {
    groups: row.groups,
    snapshot,
    events: row.events.map((e) => ({ ...e, at: utc(e.at) })),
    invites: {
      balances: new Map(row.inviteBalances.map((b) => [b.userId, b.held])),
      open: row.inviteOpen.map((r): OpenRow => ({ ...r, qrExpiresAt: maybe(r.qrExpiresAt), holdsUntil: maybe(r.holdsUntil) })),
    },
  };
}

/** The head's names for `/admin/groups/<id>` (design table, Page head). Empty when the read fails. */
export async function loadGroupHeads(): Promise<GroupHead[]> {
  try {
    const { rows } = await db.execute<GroupHead>(sql`select id, name, description from flag_groups`);
    return rows.map((r) => ({ id: r.id, name: r.name, description: r.description }));
  } catch (error) {
    console.error("admin: the group names could not be read", error);
    return [];
  }
}

export type GroupsListData = GroupsList & { clerk: "ok" | "down" };

/** `/admin/groups` (STATES G1, G5). */
export async function loadGroupsList(): Promise<GroupsListData> {
  const [state, { accounts, clerk }] = await Promise.all([readState(null), listAccounts()]);
  return { ...groupsList({ groups: state.groups, snapshot: state.snapshot, accounts }), clerk };
}

export type GroupPage = {
  saved: SavedGroup | null;
  rows: MemberRow[];
  overrides: GroupCard["overrides"];
  history: HistoryItem[];
  historyCut: boolean;
  /** Top up invites (M3): each member's name and invites left now. Empty on the new-group page. */
  topUp: TopUpMember[];
  clerk: "ok" | "down";
};

function topUpMembers(groupId: string, state: Awaited<ReturnType<typeof readState>>, accounts: readonly Account[], now: Date): TopUpMember[] {
  const { userName } = accountNames(accounts, "");
  const ids = [...state.snapshot.groupOf].filter(([, g]) => g === groupId).map(([u]) => u);
  return ids.map((id) => ({
    id,
    name: userName(id),
    left: countFor(state.invites.balances.get(id), state.invites.open.filter((r) => r.userId === id), now).left,
  }));
}

/** `/admin/groups/<id>` (G2, G4), or `/admin/groups/new` with a null id (G3). Null: no such group. */
export async function loadGroupPage(groupId: string | null, viewerId: string, now: Date = new Date()): Promise<GroupPage | null> {
  const [state, { accounts, clerk }] = await Promise.all([readState(groupId), listAccounts()]);
  const group = groupId === null ? null : state.groups.find((g) => g.id === groupId);
  if (group === undefined) return null;
  const saved = group && { id: group.id, name: group.name, description: group.description, dailyAllowance: group.dailyAllowance };
  const groupNames = new Map(state.groups.map((g) => [g.id, g.name]));
  const ids = [...new Set([...accounts.map((a) => a.id), ...[...state.snapshot.groupOf].filter(([, g]) => g === groupId).map(([u]) => u)])];
  const effects = memberEffects(state.snapshot, groupId, ids, (snapshot, id) => explainForAccounts(snapshot, [id]).get(id)!);
  return {
    saved,
    rows: memberRows({ accounts, snapshot: state.snapshot, groupId, groupNames, effects }),
    overrides: groupId ? carried(state.snapshot.overrides, groupId) : [],
    history: groupHistory(state.events.slice(0, HISTORY_LIMIT), accounts, viewerId, group?.name ?? ""),
    historyCut: state.events.length > HISTORY_LIMIT,
    topUp: groupId ? topUpMembers(groupId, state, accounts, now) : [],
    clerk,
  };
}
