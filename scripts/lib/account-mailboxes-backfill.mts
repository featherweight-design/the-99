// The pure half of `scripts/backfill-account-mailboxes.ts`: turning Clerk's users into the `account_mailboxes` rows the webhook
// writes on `user.created` / `user.updated`. No database, no network, so the tests run it as is. The arguments, the target check
// and the Clerk page check are the welcome-claims backfill's (`welcome-claims-backfill.mts`), reused rather than copied.
//
// The rows are exactly the webhook's: `mailboxPlan` over Clerk's raw user JSON (every VERIFIED address, folded and keyed by
// `mailboxHash`). No crypto of its own, and no address leaves this module: only the hash.
import { mailboxPlan } from "../../src/lib/account/mailboxes";
import type { ClerkUser } from "./welcome-claims-backfill.mjs";

export { chunks, clerkKeyFits, clerkPage, parseArgs, resolveTarget } from "./welcome-claims-backfill.mjs";
export type { ClerkUser } from "./welcome-claims-backfill.mjs";

type KeyEnv = Parameters<typeof mailboxPlan>[1];

export type Row = { userId: string; mailboxHash: string };
export type Plan = {
  users: number;
  /** Users with no verified address that could be hashed. */
  withoutMailbox: number;
  /** Addresses Clerk verified but that could not be hashed (a malformed address). */
  unhashed: number;
  /** Rows to write: one per mailbox, the first account to hold it keeping it. */
  rows: Row[];
  /** Mailboxes two accounts already share: the second is not written (the unique key would refuse it). */
  sharedMailbox: number;
};

/** One row per distinct mailbox over every Clerk user, in the order given. Pure and deterministic. */
export function planMailboxes(users: readonly ClerkUser[], keys: KeyEnv): Plan {
  const owner = new Map<string, string>();
  const rows: Row[] = [];
  let withoutMailbox = 0, unhashed = 0, sharedMailbox = 0;
  for (const u of users) {
    const plan = u.raw ? mailboxPlan(u.raw, keys) : { hashes: [], unhashed: 0 };
    unhashed += plan.unhashed;
    if (plan.hashes.length === 0) { withoutMailbox += 1; continue; }
    for (const mailboxHash of plan.hashes) {
      if (owner.has(mailboxHash)) { sharedMailbox += 1; continue; }
      owner.set(mailboxHash, u.id);
      rows.push({ userId: u.id, mailboxHash });
    }
  }
  return { users: users.length, withoutMailbox, unhashed, rows, sharedMailbox };
}
