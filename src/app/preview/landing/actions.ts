"use server";

// The preview's launch action (`/preview/landing`): it re-checks admin and writes NOTHING, so an admin testing the form
// never adds a row to the launch list. It answers the same `{ ok: true }` the real `saveLandingLaunchEmailAction` does.

import { requireAdmin } from "../../../lib/admin/access";
import type { LandingLaunchOutcome } from "../../landing-actions";

export async function previewLaunchEmailAction(_email: unknown): Promise<LandingLaunchOutcome> {
  await requireAdmin();
  return { ok: true };
}
