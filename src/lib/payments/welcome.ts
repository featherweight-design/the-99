import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import { accountTombstones, creditGrants, welcomeEmailClaims } from "../../db/schema";
import { tombstoneHash } from "../account/purge";
import { lockSenderIn } from "../invites/send";
import { welcomeCreditsEnabled } from "./flag";

/** The welcome grant (launch epic D1, ruling L5): 15 credits, gone 30 days after the account was created. */
export const WELCOME_UNITS = 15;
export const WELCOME_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/** When a welcome lot for an account created at `createdAt` stops funding runs. */
export function welcomeExpiry(createdAt: Date): Date {
  return new Date(createdAt.getTime() + WELCOME_DAYS * DAY_MS);
}

export type WelcomeResult =
  | { granted: true; expiresAt: Date }
  | { granted: false; reason: "switch" | "deleted" | "expired" | "already" | "alias" | "unclaimable" };

/**
 * Give a new account its one welcome lot. Idempotent: a partial unique index holds one lot per account ever, and the
 * insert is `on conflict do nothing`, so a webhook redelivery, a backfill and a second path all answer `already`.
 *
 * - The lot is born from the ACCOUNT's creation time, not from `now`, so a late or repeated call cannot extend it, and an
 *   account whose 30 days are already over gets nothing (`expired`). That one rule also keeps a backfill off old accounts.
 * - It is written under the account's invite lock, the lock `purgeAccount` and `spendInviteOnSignUp` take, with the
 *   deletion's tombstone read under it: a `user.created` that arrives after `user.deleted` either sees the tombstone, or
 *   commits before the purge's delete and is deleted by it. A plain read-then-insert could leave an orphan lot.
 * - One lot per MAILBOX, not only per account: `emailHash` is the keyed hash of the account's canonical primary address
 *   (`welcomeEmailHash`). The claim row is written in the same transaction as the lot, so two sign-ups under aliases of one
 *   address cannot both win (the second waits on the primary key, then finds it taken) and a failed lot leaves no claim.
 *   An address already claimed gets `alias` and no lot; no address or no key (`null`) gets `unclaimable`: fail closed, never
 *   an unkeyed or unchecked grant. An account that already holds its lot is answered `already` BEFORE the claim, so a
 *   redelivery is not mistaken for an alias. Claims outlive the account (no purge), so deleting and re-signing-up fails too.
 * - It reads `WELCOME_CREDITS_ENABLED` from `env` (the account's resolved switches), and only to decide whether to WRITE.
 */
export async function grantWelcome(userId: string, createdAt: Date, env: NodeJS.ProcessEnv, emailHash: string | null, now: Date = new Date()): Promise<WelcomeResult> {
  if (!welcomeCreditsEnabled(env)) return { granted: false, reason: "switch" };
  const expiresAt = welcomeExpiry(createdAt);
  if (expiresAt.getTime() <= now.getTime()) return { granted: false, reason: "expired" };
  if (!emailHash) return { granted: false, reason: "unclaimable" };
  return db.transaction(async (tx): Promise<WelcomeResult> => {
    await lockSenderIn(tx, userId);
    const [gone] = await tx.select({ id: accountTombstones.idHash }).from(accountTombstones)
      .where(eq(accountTombstones.idHash, tombstoneHash(userId)));
    if (gone) return { granted: false, reason: "deleted" };
    const [held] = await tx.select({ id: creditGrants.id }).from(creditGrants)
      .where(and(eq(creditGrants.userId, userId), eq(creditGrants.source, "welcome")));
    if (held) return { granted: false, reason: "already" };
    const claimed = await tx.insert(welcomeEmailClaims).values({ emailHash }).onConflictDoNothing().returning({ h: welcomeEmailClaims.emailHash });
    if (claimed.length === 0) return { granted: false, reason: "alias" };
    const inserted = await tx.insert(creditGrants)
      .values({ userId, source: "welcome", units: WELCOME_UNITS, expiresAt, externalId: `welcome:${userId}` })
      .onConflictDoNothing().returning({ id: creditGrants.id });
    if (inserted.length === 0) {
      // The lot exists under another path (its external id): give the claim back, so a mailbox is never burned for nothing.
      await tx.delete(welcomeEmailClaims).where(eq(welcomeEmailClaims.emailHash, emailHash));
      return { granted: false, reason: "already" };
    }
    return { granted: true, expiresAt };
  });
}
