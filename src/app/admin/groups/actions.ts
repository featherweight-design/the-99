"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "../../../lib/admin/access";
import { removeEmptyGroup, writeGroup, type GroupDeleteResult, type GroupWriteResult } from "../../../lib/admin/group-writes";
import { deletedHref, type GroupInput } from "../../../lib/admin/groups-rule";

// The Groups writes (admin plan 9a). Every export calls `requireAdmin()` on its first line, so a
// stranger's press is the app's 404 (STATES D4); `actions.test.ts` reads every action module under
// src/app/admin and fails on an export that does not. The input is the group's whole desired state,
// re-checked by the lib, never trusted from the page.

/** Create a group from its name, description, daily credits and members (STATES G3). */
export async function createGroup(input: GroupInput): Promise<GroupWriteResult> {
  const { userId } = await requireAdmin();
  return writeGroup(userId, null, input);
}

/** Save a group's fields and members (STATES G2, G4, G7). */
export async function saveGroup(id: string, input: GroupInput): Promise<GroupWriteResult> {
  const { userId } = await requireAdmin();
  return writeGroup(userId, typeof id === "string" ? id : "", input);
}

/**
 * Delete an empty group (small items 9, item 7). The lib re-checks emptiness in the delete's own statement. A delete
 * that lands redirects to Groups with the name for the toast, so the action's response carries that page rather than
 * a re-render of the deleted group's (which is a 404). `redirect` throws, so it runs after the write, outside any
 * try. A refusal returns its result for the dialog.
 */
export async function deleteGroup(id: string): Promise<Exclude<GroupDeleteResult, { ok: true }>> {
  const { userId } = await requireAdmin();
  const result = await removeEmptyGroup(userId, typeof id === "string" ? id : "");
  if (!result.ok) return result;
  redirect(deletedHref(result.name));
}
