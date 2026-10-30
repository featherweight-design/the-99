"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../../../lib/admin/access";
import { isGroupId } from "../../../lib/admin/groups-rule";
import { writeGroup } from "../../../lib/admin/group-writes";
import { makeFlyerCode, revokeFlyerCode, type MakeFlyerCodeResult } from "../../../lib/flyer/admin";
import { FLYER_GROUP_ALLOWANCE, flyerGroupName, parseStore } from "../../../lib/flyer/admin-rule";
import { flyerTrialEnabled } from "../../../lib/flyer/flag";
import { requestSwitchEnv } from "../../../lib/switches/request";

// The admin's flyer-code writes (flyer trial PR 4b; handoff Admin-Desktop A2 and A3). Every export calls `requireAdmin()`
// on its first line (`src/app/admin/actions.test.ts` reads every action module under src/app/admin); the actor is the
// gate's own `userId`, never an argument. Both refuse while the trial's switch is off for the admin, as the section is
// hidden then.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** A name another group holds is retried with `-2`, `-3`, ... before giving up. */
const NAME_TRIES = 6;

export type MakeResult =
  | { ok: true; code: string }
  | { ok: false; error: "store" | "group" | "off" | "failed" };

/**
 * Makes a code for `store`. `groupId` null is the form's default: a NEW group named from the store, with daily credits 3;
 * otherwise the sign-ups join that existing group. The group write and the code write are two commits, so a code that
 * fails after a new group leaves that (empty, nameable) group behind.
 */
export async function makeCode(store: string, groupId: string | null): Promise<MakeResult> {
  const { userId } = await requireAdmin();
  if (!flyerTrialEnabled(await requestSwitchEnv(userId))) return { ok: false, error: "off" };
  const label = parseStore(store);
  if (label === null) return { ok: false, error: "store" };
  if (groupId !== null && (typeof groupId !== "string" || !UUID.test(groupId))) return { ok: false, error: "group" };

  let target = groupId;
  if (target === null) {
    for (let n = 1; target === null; n++) {
      const name = n <= NAME_TRIES ? flyerGroupName(label, n) : null;
      if (name === null) return { ok: false, error: n === 1 ? "store" : "failed" };
      const made = await writeGroup(userId, null, { name, dailyAllowance: FLYER_GROUP_ALLOWANCE, members: [] });
      if (made.ok) target = made.id;
      else if (made.error !== "name") return { ok: false, error: "failed" };
    }
  } else if (!isGroupId(target)) {
    return { ok: false, error: "group" };
  }

  const result: MakeFlyerCodeResult = await makeFlyerCode(userId, { store: label, groupId: target });
  if (!result.ok) return { ok: false, error: result.reason === "invalid" ? "store" : result.reason };
  revalidatePath("/admin", "layout");
  return { ok: true, code: result.code };
}

export type RevokeCodeResult = { ok: true; changed: boolean } | { ok: false; error: "off" };

/** Ends a code to new sign-ups; who joined keeps everything. A code already revoked reads as done. */
export async function revokeCode(codeId: string): Promise<RevokeCodeResult> {
  const { userId } = await requireAdmin();
  if (!flyerTrialEnabled(await requestSwitchEnv(userId))) return { ok: false, error: "off" };
  if (typeof codeId !== "string" || !UUID.test(codeId)) return { ok: true, changed: false };
  const result = await revokeFlyerCode(userId, codeId);
  if (result.changed) revalidatePath("/admin", "layout");
  return result;
}
