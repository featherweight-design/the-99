// One-off: give every account that already exists its `account_mailboxes` rows (migration 0278), so the invite and flyer
// hand-overs refuse an alias of an account made before the table existed. The migration cannot read Clerk, so the existing
// accounts' addresses are read here and only their keyed hashes are written; the webhook keeps the table true afterwards.
//
// - The rows are the webhook's own (`scripts/lib/account-mailboxes-backfill.mts`): every VERIFIED address of each Clerk user,
//   folded and keyed by `mailboxHash`. Same key precedence as the welcome claims (`SENTRY_USER_HASH_KEY`, else `ANON_KEY_SALT`).
// - Dry run by default: prints counts only, never an address or a hash. `--apply` writes, `on conflict do nothing`, so a second
//   run writes nothing. Read-only on Clerk. It only inserts: it never deletes a row.
// - Fails closed: no usable key, no Clerk key, or a production run on a development Clerk key refuses before any Clerk read or
//   any write. It runs on production by default and refuses any other database unless `--target` names it (production, staging,
//   local-dev, or a `br-…` id), checked against the database's own `neon.branch_id`.
// - `--apply` also refuses when the key looks wrong: the welcome claims table holds claims, and none of the accounts it
//   should name hash to one (`--no-key-check` skips only that).
//
//   pnpm db:backfill:account-mailboxes                  # dry run, production
//   pnpm db:backfill:account-mailboxes --apply
//   pnpm db:backfill:account-mailboxes --target=staging # staging
//
// First, and on its own line: the helper's import loads `.env`.
import { requireEnv } from "./lib/env.mjs";
import { createClerkClient } from "@clerk/nextjs/server";
import { Pool } from "@neondatabase/serverless";
import { inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";

import { accountMailboxes, welcomeEmailClaims } from "../src/db/schema";
import { hashKey } from "../src/lib/analytics/funnel-events";
import { primaryVerifiedEmail, welcomeEmailHash } from "../src/lib/payments/canonical-email";
import { chunks, clerkKeyFits, clerkPage, parseArgs, planMailboxes, resolveTarget, type ClerkUser } from "./lib/account-mailboxes-backfill.mjs";

const CLERK_PAGE = 100;
const WRITE_BATCH = 500;

function refuse(reason: string): never {
  console.error(`refused: ${reason}`);
  process.exit(1);
}

async function main() {
  let args;
  try { args = parseArgs(process.argv.slice(2)); } catch (e) { refuse((e as Error).message); }

  const keys = { SENTRY_USER_HASH_KEY: process.env.SENTRY_USER_HASH_KEY, ANON_KEY_SALT: process.env.ANON_KEY_SALT };
  if (!hashKey(keys)) refuse("no usable key: set SENTRY_USER_HASH_KEY (or ANON_KEY_SALT), 32+ characters, to the target's value");
  const { DATABASE_URL, CLERK_SECRET_KEY } = requireEnv(["DATABASE_URL", "CLERK_SECRET_KEY"]);

  const pool = new Pool({ connectionString: DATABASE_URL });
  const db = drizzle(pool);
  try {
    const [{ branch }] = (await db.execute(sql`select current_setting('neon.branch_id', true) as branch`)).rows as { branch: string | null }[];
    const target = resolveTarget(branch, args.target);
    if (!target.ok) refuse(target.reason);
    if (!clerkKeyFits(target.name, CLERK_SECRET_KEY)) refuse("a production run needs the production Clerk secret (sk_live_…)");

    const clerk = createClerkClient({ secretKey: CLERK_SECRET_KEY });
    const users: ClerkUser[] = [];
    for (let offset = 0; ; offset += CLERK_PAGE) {
      const got = await clerk.users.getUserList({ limit: CLERK_PAGE, offset, orderBy: "+created_at" });
      const result = clerkPage(got);
      if (!result.ok) refuse(result.reason);
      users.push(...result.users);
      if (offset + CLERK_PAGE >= got.totalCount || got.data.length === 0) break;
    }

    const plan = planMailboxes(users, keys);
    let present = 0;
    for (const part of chunks(plan.rows.map((r) => r.mailboxHash), WRITE_BATCH)) {
      present += (await db.select({ h: accountMailboxes.mailboxHash }).from(accountMailboxes).where(inArray(accountMailboxes.mailboxHash, part))).length;
    }

    // Key check: the welcome claims were written with the production key, so a right key matches at least one of them.
    const welcomeHashes = new Set<string>();
    for (const u of users) {
      const email = u.raw ? primaryVerifiedEmail(u.raw) : null;
      const h = email ? welcomeEmailHash(email, keys) : null;
      if (h) welcomeHashes.add(h);
    }
    let welcomeMatched = 0;
    for (const part of chunks([...welcomeHashes], WRITE_BATCH)) {
      welcomeMatched += (await db.select({ h: welcomeEmailClaims.emailHash }).from(welcomeEmailClaims).where(inArray(welcomeEmailClaims.emailHash, part))).length;
    }
    const [{ n: claims }] = (await db.execute(sql`select count(*)::int as n from ${welcomeEmailClaims}`)).rows as { n: number }[];
    const keyOk = welcomeMatched > 0 || claims === 0;

    console.log(`target                      ${target.name}`);
    console.log(`Clerk accounts              ${plan.users}`);
    console.log(`  no verified address       ${plan.withoutMailbox}`);
    console.log(`  addresses not hashable    ${plan.unhashed}`);
    console.log(`  sharing a mailbox         ${plan.sharedMailbox}`);
    console.log(`mailbox rows                ${plan.rows.length}`);
    console.log(`  already written           ${present}`);
    console.log(`  missing                   ${plan.rows.length - present}`);
    console.log(`key check                   ${keyOk ? "ok" : "wrong"}`);
    if (!keyOk) console.log("WARNING: the welcome claims table holds claims and none of this run's accounts match: the key is probably not the target's");

    if (!args.apply) {
      console.log(`dry run: ${plan.rows.length - present} row(s) would be written. Re-run with --apply to write.`);
      return;
    }
    if (!keyOk && args.keyCheck) refuse("key check wrong (above); fix the key, or pass --no-key-check once you are sure it is the target's");

    let written = 0;
    for (const part of chunks(plan.rows, WRITE_BATCH)) {
      written += (await db.insert(accountMailboxes).values(part).onConflictDoNothing().returning({ h: accountMailboxes.mailboxHash })).length;
    }
    console.log(`applied: ${written} row(s) written, ${plan.rows.length - written} already present`);
  } finally {
    await pool.end();
  }
}

main().catch((e: unknown) => {
  console.error(`failed: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
