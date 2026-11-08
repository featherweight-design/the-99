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

/**
 * The one write: the address, case-folded, against `codeId` or none. The first source stands: a second press, or the same
 * address through another flyer or the landing page, changes nothing, and answers `ok` all the same, so the answer never
 * says whether an address was already listed.
 */
async function insertLaunchEmail(rawEmail: string, codeId: string | null): Promise<SaveLaunchEmail> {
  await db.insert(launchList).values({ email: normalizeEmail(rawEmail), codeId }).onConflictDoNothing();
  return { ok: true };
}

export async function saveLaunchEmail(codeRaw: string, rawEmail: string): Promise<SaveLaunchEmail> {
  if (!isEmailShape(rawEmail)) return { ok: false, reason: "invalid" };
  const code = await findFlyerCode(codeRaw);
  return insertLaunchEmail(rawEmail, code?.id ?? null);
}

/**
 * An address left with no flyer behind it (the public landing's "Tell me at launch", plan
 * `2026-11-08-public-landing-demo.md`): the same row as a flyer's, with `code_id` null. No code is looked up or faked.
 */
export async function saveLaunchEmailNoCode(rawEmail: string): Promise<SaveLaunchEmail> {
  if (!isEmailShape(rawEmail)) return { ok: false, reason: "invalid" };
  return insertLaunchEmail(rawEmail, null);
}
