import { desc, eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { adminEvents, flagGroupMembers, flagGroups, flagOverrides } from "../../db/schema";
import { explainForAccounts, switchEnvValues } from "../switches/explain";
import type { SwitchName } from "../switches/registry";
import { readSwitchSnapshot } from "../switches/snapshot";
import { listAccounts } from "./accounts";
import { switchPage, type OverrideDetail, type SwitchPage } from "./switch-page-rule";
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
 * One switch's page (admin STATES F1 to F13): the snapshot every account is explained through, the
 * switch's own override rows with their notes, the groups, its last 100 events and the account
 * universe. Read fresh, as the list is.
 */
export async function loadSwitchPage(name: SwitchName, viewerId: string): Promise<SwitchPageData> {
  const [snapshot, { accounts, clerk }, overrides, groups, events] = await Promise.all([
    readSwitchSnapshot(),
    listAccounts(),
    db
      .select({
        scope: flagOverrides.scope,
        groupId: flagOverrides.groupId,
        userId: flagOverrides.userId,
        value: flagOverrides.value,
        note: flagOverrides.note,
        updatedBy: flagOverrides.updatedBy,
        updatedAt: flagOverrides.updatedAt,
      })
      .from(flagOverrides)
      .where(eq(flagOverrides.switchName, name)),
    db
      .select({ id: flagGroups.id, name: flagGroups.name, members: sql<number>`(select count(*) from ${flagGroupMembers} m where m.group_id = ${flagGroups}.id)::int` })
      .from(flagGroups),
    db
      .select({
        at: adminEvents.at,
        actorId: adminEvents.actorId,
        kind: adminEvents.kind,
        scope: adminEvents.scope,
        groupId: adminEvents.groupId,
        userId: adminEvents.userId,
        oldValue: adminEvents.oldValue,
        newValue: adminEvents.newValue,
        note: adminEvents.note,
      })
      .from(adminEvents)
      .where(eq(adminEvents.switchName, name))
      .orderBy(desc(adminEvents.at), desc(adminEvents.id))
      // One past the limit, so the page can say the list is cut.
      .limit(HISTORY_LIMIT + 1),
  ]);
  const page = switchPage({
    name,
    env: switchEnvValues(),
    // A failed snapshot read resolves every account from the env var alone, so the rows are left out
    // too: the page then draws one consistent world under its "Overrides didn't load" line.
    overrides: snapshot ? (overrides as OverrideDetail[]) : [],
    verdicts: explainForAccounts(snapshot, accounts.map((a) => a.id)),
    accounts,
    groups,
    events,
    historyLimit: HISTORY_LIMIT,
    viewerId,
  });
  return { page, overridesRead: snapshot !== null, clerk };
}
