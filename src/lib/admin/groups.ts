import { sql } from "drizzle-orm";
import { db } from "../../db";
import { explainForAccounts } from "../switches/explain";
import { isOverrideName } from "../switches/registry";
import type { OverrideRow, SwitchSnapshot } from "../switches/resolve";
import { listAccounts } from "./accounts";
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
    ) e), '[]'::json) as events`);
  const [row] = rows;
  const snapshot: SwitchSnapshot = {
    // An All features row outranks the group rung, so the resolver's snapshot keeps it.
    overrides: row.overrides.filter((o) => isOverrideName(o.switchName)),
    groupOf: new Map(row.members.map((m) => [m.userId, m.groupId])),
  };
  return { groups: row.groups, snapshot, events: row.events.map((e) => ({ ...e, at: utc(e.at) })) };
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
  clerk: "ok" | "down";
};

/** `/admin/groups/<id>` (G2, G4), or `/admin/groups/new` with a null id (G3). Null: no such group. */
export async function loadGroupPage(groupId: string | null, viewerId: string): Promise<GroupPage | null> {
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
    history: groupHistory(state.events.slice(0, HISTORY_LIMIT), accounts, viewerId),
    historyCut: state.events.length > HISTORY_LIMIT,
    clerk,
  };
}
