"use server";

import { requireAdmin } from "../../../lib/admin/access";
import { writeOverride, type WriteResult } from "../../../lib/admin/switch-writes";
import type { WriteInput } from "../../../lib/admin/switch-writes-rule";

// The Switches writes (admin plan 8c). Every export calls `requireAdmin()` on its first line, so a
// stranger's press is the app's 404 (STATES D4); `actions.test.ts` reads every action module under
// src/app/admin and fails on an export that does not. The input is re-checked by the lib, never
// trusted from the page.

/** Set an override to On or Off at app-wide, group or account scope. */
export async function setSwitchOverride(input: WriteInput): Promise<WriteResult> {
  const { userId } = await requireAdmin();
  return writeOverride(userId, "set", input);
}

/** Clear an override; app-wide `Not set` is this. */
export async function clearSwitchOverride(input: WriteInput): Promise<WriteResult> {
  const { userId } = await requireAdmin();
  return writeOverride(userId, "clear", input);
}
