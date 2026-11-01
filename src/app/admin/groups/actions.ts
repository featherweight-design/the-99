"use server";

import { requireAdmin } from "../../../lib/admin/access";
import { removeEmptyGroup, writeGroup, type GroupDeleteResult, type GroupWriteResult } from "../../../lib/admin/group-writes";
import type { GroupInput } from "../../../lib/admin/groups-rule";

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

/** Delete an empty group (small items 9, item 7). The lib re-checks emptiness in the delete's own statement. */
export async function deleteGroup(id: string): Promise<GroupDeleteResult> {
  const { userId } = await requireAdmin();
  return removeEmptyGroup(userId, typeof id === "string" ? id : "");
}
