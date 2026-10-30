/**
 * The launch list (flyer trial PR 3): an address left by a reader a used-up, revoked or unknown flyer turned away.
 * SERVER-ONLY. One row per address, case-folded; the code it came through is recorded when it names one. The address
 * is a stranger's, so nothing here links it to an account, and it is emailed once at launch and then purged.
 */
import { db } from "../../db";
import { launchList } from "../../db/schema";
import { isEmailShape, normalizeEmail } from "../invites/rules";
import { findFlyerCode } from "./claim";

export type SaveLaunchEmail = { ok: true } | { ok: false; reason: "invalid" };

export async function saveLaunchEmail(codeRaw: string, rawEmail: string): Promise<SaveLaunchEmail> {
  if (!isEmailShape(rawEmail)) return { ok: false, reason: "invalid" };
  const code = await findFlyerCode(codeRaw);
  // The first source stands: a second press, or the same address through another flyer, changes nothing.
  await db.insert(launchList).values({ email: normalizeEmail(rawEmail), codeId: code?.id ?? null }).onConflictDoNothing();
  return { ok: true };
}
