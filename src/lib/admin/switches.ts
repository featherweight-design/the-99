import { sql } from "drizzle-orm";
import { db } from "../../db";
import { explainForAccounts, switchEnvValues } from "../switches/explain";
import { isSwitchName, type SwitchName } from "../switches/registry";
import type { SwitchSnapshot } from "../switches/resolve";
import { readSwitchSnapshot } from "../switches/snapshot";
import { listAccounts } from "./accounts";
import { switchPage, type GroupInfo, type OverrideDetail, type SwitchEvent, type SwitchPage } from "./switch-page-rule";
import { switchRows, type SwitchRow } from "./switches-rule";

/** The history the switch page lists, newest first (admin plan 8b). */
export const HISTORY_LIMIT = 100;

/** `clerk` is "down" when the accounts are the stored ids (no names), so the page can say so (STATES A3). */
export type SwitchPageData = { page: SwitchPage; overridesRead: boolean; clerk: "ok" | "down" };
export type SwitchesList = { rows: SwitchRow[]; total: number; overridesRead: boolean; clerk: "ok" | "down" };

/**
 * The Switches list's data (admin STATES L1). The overrides are read fresh, never through the
 * 30-second memo, so the page shows the admin's own write at once. `overridesRead` is false when the
 * read failed: every row then resolves from the environment alone, which is what readers are served
 * in that state too (`snapshot.ts`).
 */
export async function loadSwitchesList(): Promise<SwitchesList> {
  const [snapshot, { accounts, clerk }] = await Promise.all([readSwitchSnapshot(), listAccounts()]);
  const verdicts = explainForAccounts(snapshot, accounts.map((a) => a.id));
  return {
    rows: switchRows({ env: switchEnvValues(), overrides: snapshot?.overrides ?? [], verdicts }),
    total: accounts.length,
    overridesRead: snapshot !== null,
    clerk,
  };
}

/**
 * Every override with its note and author, every membership, every group and this switch's last
 * events, in ONE statement, so the ladder's verdicts, the rows it draws and the history are one
 * instant: an override and its `admin_events` row commit together, and two reads could fall either
 * side of that commit (the reason `SNAPSHOT_SQL` is one statement too). Null when the read fails.
 */
type RawState = {
  overrides: (Omit<OverrideDetail, "updatedAt"> & { switchName: string; updatedAt: string })[];
  members: { userId: string; groupId: string }[];
  groups: GroupInfo[];
  events: (Omit<SwitchEvent, "at"> & { at: string })[];
};

// A timestamp inside json_build_object arrives as text, without a zone; the columns hold UTC.
const utc = (text: string) => new Date(`${text}Z`);

async function readSwitchState(name: SwitchName) {
  try {
    const { rows } = await db.execute<RawState>(sql`select
      coalesce((select json_agg(json_build_object(
        'switchName', o."switch", 'scope', o.scope, 'groupId', o.group_id, 'userId', o.user_id, 'value', o.value,
        'note', o.note, 'updatedBy', o.updated_by, 'updatedAt', o.updated_at
      )) from flag_overrides o), '[]'::json) as overrides,
      coalesce((select json_agg(json_build_object('userId', m.user_id, 'groupId', m.group_id)) from flag_group_members m), '[]'::json) as members,
      coalesce((select json_agg(json_build_object(
        'id', g.id, 'name', g.name, 'members', (select count(*) from flag_group_members gm where gm.group_id = g.id)
      )) from flag_groups g), '[]'::json) as groups,
      coalesce((select json_agg(json_build_object(
        'at', e.at, 'actorId', e.actor_id, 'kind', e.kind, 'scope', e.scope, 'groupId', e.group_id, 'userId', e.user_id,
        'oldValue', e.old_value, 'newValue', e.new_value, 'note', e.note
      ) order by e.at desc, e.id desc) from (
        -- One past the limit, so the page can say the list is cut.
        select * from admin_events where "switch" = ${name} order by at desc, id desc limit ${HISTORY_LIMIT + 1}
      ) e), '[]'::json) as events`);
    const [row] = rows;
    const overrides = row.overrides.filter((o) => isSwitchName(o.switchName)).map((o) => ({ ...o, updatedAt: utc(o.updatedAt) }));
    return {
      snapshot: {
        overrides: overrides.map(({ switchName, scope, groupId, userId, value }) => ({ switchName: switchName as SwitchName, scope, groupId, userId, value })),
        groupOf: new Map(row.members.map((m) => [m.userId, m.groupId])),
      } satisfies SwitchSnapshot,
      overrides,
      groups: row.groups,
      events: row.events.map((e) => ({ ...e, at: utc(e.at) })),
    };
  } catch (error) {
    console.error("admin: switch overrides could not be read; drawing the env var alone", error);
    return null;
  }
}

/**
 * One switch's page (admin STATES F1 to F13): the state above and the account universe. Read fresh,
 * as the list is.
 */
export async function loadSwitchPage(name: SwitchName, viewerId: string): Promise<SwitchPageData> {
  const [state, { accounts, clerk }] = await Promise.all([readSwitchState(name), listAccounts()]);
  const page = switchPage({
    name,
    env: switchEnvValues(),
    // A failed read resolves every account from the env var alone, with no rows: one consistent
    // world under the page's "Overrides didn't load" line.
    overrides: state?.overrides.filter((o) => o.switchName === name) ?? [],
    verdicts: explainForAccounts(state?.snapshot ?? null, accounts.map((a) => a.id)),
    accounts,
    groups: state?.groups ?? [],
    events: state?.events ?? [],
    historyLimit: HISTORY_LIMIT,
    viewerId,
  });
  return { page, overridesRead: state !== null, clerk };
}
