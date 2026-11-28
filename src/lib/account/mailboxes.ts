// The mailboxes an account answers to (`account_mailboxes`): the gate that stops an alias of an existing account redeeming
// an invite as a second person, and the sync that keeps it true. SERVER-ONLY: the hash reads a secret.
//
// What it compares is `mailboxHash` (the fold in `email/fold.ts`, keyed with the welcome claims' key), so a row names
// nobody without the key. With no usable key the gate skips itself and the literal Clerk check (`hasAccount`) still runs:
// never an unkeyed hash.
import { and, eq, notInArray } from "drizzle-orm";
import { db } from "../../db";
import { accountMailboxes } from "../../db/schema";
import { mailboxHash, verifiedEmails } from "../payments/canonical-email";

type Env = Parameters<typeof mailboxHash>[1];

/** The key's two variables, named (never `process.env` handed on: `pnpm check:flag-reads`). */
export function mailboxEnv(): Env {
  return { SENTRY_USER_HASH_KEY: process.env.SENTRY_USER_HASH_KEY, ANON_KEY_SALT: process.env.ANON_KEY_SALT };
}

/**
 * Whether an account already answers to this address's mailbox. False for an address with no mailbox or with no key to
 * hash it under. A refusal built on this answers exactly as an exact-address account does (`reason: "account"`), so it
 * reveals nothing the literal Clerk check does not.
 */
export async function mailboxTaken(email: string, env: Env = mailboxEnv()): Promise<boolean> {
  const hash = mailboxHash(email, env);
  if (hash === null) return false;
  const [row] = await db.select({ userId: accountMailboxes.userId }).from(accountMailboxes)
    .where(eq(accountMailboxes.mailboxHash, hash)).limit(1);
  return row !== undefined;
}

/** What a sync should hold for one account: the distinct hashes of its verified addresses, and how many it could not hash. */
export function mailboxPlan(data: { email_addresses?: unknown }, env: Env): { hashes: string[]; unhashed: number } {
  const hashes = new Set<string>();
  let unhashed = 0;
  for (const email of verifiedEmails(data)) {
    const h = mailboxHash(email, env);
    if (h === null) unhashed += 1;
    else hashes.add(h);
  }
  return { hashes: [...hashes], unhashed };
}

/**
 * Make the account's rows match its verified addresses: insert what is new, delete what it dropped. One transaction, and
 * idempotent, so a redelivery repeats it harmlessly. A hash another account already holds is left to that account
 * (`on conflict do nothing`): two people cannot share a mailbox, and the first to hold it keeps it.
 *
 * With verified addresses but none hashable (no key), nothing changes: a missing key must not wipe the account's rows.
 * A payload with no verified address at all empties them, as the account no longer answers to any.
 */
export async function syncAccountMailboxes(userId: string, plan: { hashes: string[]; unhashed: number }): Promise<void> {
  const { hashes } = plan;
  await db.transaction(async (tx) => {
    if (hashes.length > 0) {
      await tx.insert(accountMailboxes).values(hashes.map((mailboxHash) => ({ userId, mailboxHash }))).onConflictDoNothing();
      await tx.delete(accountMailboxes).where(and(eq(accountMailboxes.userId, userId), notInArray(accountMailboxes.mailboxHash, hashes)));
    } else if (plan.unhashed === 0) {
      await tx.delete(accountMailboxes).where(eq(accountMailboxes.userId, userId));
    }
  });
}
