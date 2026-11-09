"use server";

// The preview's launch action (`/preview/landing`): it re-checks admin and writes NOTHING, so an admin testing the form
// never adds a row to the launch list. It answers as the real `saveLandingLaunchEmailAction` does for a good or malformed address (no throttle).

import { requireAdmin } from "../../../lib/admin/access";
import { isEmailShape } from "../../../lib/invites/rules";
import type { LandingLaunchOutcome } from "../../landing-actions";

export async function previewLaunchEmailAction(email: unknown): Promise<LandingLaunchOutcome> {
  await requireAdmin();
  // The same shape check as the real action, so the admin sees the field's refusal. Nothing is saved either way.
  if (typeof email !== "string" || !isEmailShape(email)) return { ok: false, reason: "invalid" };
  return { ok: true };
}
