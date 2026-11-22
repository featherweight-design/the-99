// One-off: give every account that already holds a welcome lot the mailbox claim `grantWelcome` writes today (migration 0260,
// #3098). Accounts welcomed before the claim table existed have no claim, so each could collect a second lot by signing up
// again under an alias of the same address (`a.b+x@gmail.com` after `ab@gmail.com`). This closes that for them.
//
// - The claim is the webhook's own (`scripts/lib/welcome-claims-backfill.mts`): the account's VERIFIED primary address read
//   from Clerk, folded and keyed by `welcomeEmailHash`. Same key precedence (`SENTRY_USER_HASH_KEY`, else `ANON_KEY_SALT`).
// - Dry run by default: prints counts only, never an address or a hash. `--apply` writes, `on conflict do nothing`, so a
//   second run writes nothing and two accounts on one mailbox write one claim.
// - Fails closed: no usable key, no Clerk key, or a production run on a development Clerk key refuses before
//   any Clerk read or any write.
//   It runs on production by default and refuses any other database unless `--target` names it (production, staging,
//   local-dev, or a `br-…` id), checked against the database's own `neon.branch_id`. `--apply` also refuses when none of this run's
//   claims match one already in the table (the key is not production's, or the table is empty and nothing can confirm it);
//   `--no-key-check` skips only that.
// - Accounts already purged hold no lot and are not read; a purged account's address cannot be recovered.
//
//   pnpm db:backfill:welcome-claims                  # dry run, production
//   pnpm db:backfill:welcome-claims --apply
//   pnpm db:backfill:welcome-claims --target=br-…    # a scratch branch
//
// First, and on its own line: the helper's import loads `.env`.
import { requireEnv } from "./lib/env.mjs";
import { createClerkClient } from "@clerk/nextjs/server";
import { Pool } from "@neondatabase/serverless";
import { eq, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";

import { creditGrants, welcomeEmailClaims } from "../src/db/schema";
import { hashKey } from "../src/lib/analytics/funnel-events";
import { chunks, clerkKeyFits, clerkPage, keyCheck, parseArgs, planClaims, resolveTarget, type ClerkUser } from "./lib/welcome-claims-backfill.mjs";

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
  if (!hashKey(keys)) refuse("no usable claim key: set SENTRY_USER_HASH_KEY (or ANON_KEY_SALT), 32+ characters, to production's value");
  const { DATABASE_URL, CLERK_SECRET_KEY } = requireEnv(["DATABASE_URL", "CLERK_SECRET_KEY"]);

  const pool = new Pool({ connectionString: DATABASE_URL });
  const db = drizzle(pool);
  try {
    const [{ branch }] = (await db.execute(sql`select current_setting('neon.branch_id', true) as branch`)).rows as { branch: string | null }[];
    const target = resolveTarget(branch, args.target);
    if (!target.ok) refuse(target.reason);
    if (!clerkKeyFits(target.name, CLERK_SECRET_KEY)) refuse("a production run needs the production Clerk secret (sk_live_…)");

    const ids = (await db.selectDistinct({ id: creditGrants.userId }).from(creditGrants).where(eq(creditGrants.source, "welcome"))).map((r) => r.id);

    const clerk = createClerkClient({ secretKey: CLERK_SECRET_KEY });
    const users: ClerkUser[] = [];
    for (const page of chunks(ids, CLERK_PAGE)) {
      const result = clerkPage(await clerk.users.getUserList({ userId: page, limit: CLERK_PAGE }));
      if (!result.ok) refuse(result.reason);
      users.push(...result.users);
    }

    const plan = planClaims(ids, users, keys);
    let matched = 0;
    for (const part of chunks(plan.hashes, WRITE_BATCH)) {
      matched += (await db.select({ h: welcomeEmailClaims.emailHash }).from(welcomeEmailClaims).where(inArray(welcomeEmailClaims.emailHash, part))).length;
    }
    const [{ n: existing }] = (await db.execute(sql`select count(*)::int as n from ${welcomeEmailClaims}`)).rows as { n: number }[];

    console.log(`target                      ${target.name}`);
    console.log(`welcomed accounts           ${plan.accounts}`);
    console.log(`  not found in Clerk        ${plan.notInClerk}`);
    console.log(`  no verified primary       ${plan.unclaimable}`);
    console.log(`  sharing a mailbox         ${plan.sharedMailbox}`);
    console.log(`mailbox claims              ${plan.hashes.length}`);
    console.log(`  already claimed           ${matched}`);
    console.log(`  missing                   ${plan.hashes.length - matched}`);
    console.log(`claims in the table         ${existing}`);

    const check = keyCheck(existing, matched, plan.hashes.length);
    console.log(`key check                   ${check}`);
    if (check === "wrong") console.log("WARNING: the table holds claims and none of this run's match: the key is probably not production's");
    if (check === "unverifiable") console.log("WARNING: the table is empty, so nothing confirms this key is production's");

    if (!args.apply) {
      console.log(`dry run: ${plan.hashes.length - matched} claim(s) would be written. Re-run with --apply to write.`);
      return;
    }
    if (check !== "ok" && args.keyCheck) refuse(`key check ${check} (above); fix the key, or pass --no-key-check once you are sure it is production's`);

    let written = 0;
    for (const part of chunks(plan.hashes, WRITE_BATCH)) {
      written += (await db.insert(welcomeEmailClaims).values(part.map((emailHash) => ({ emailHash })))
        .onConflictDoNothing().returning({ h: welcomeEmailClaims.emailHash })).length;
    }
    console.log(`applied: ${written} claim(s) written, ${plan.hashes.length - written} already present`);
  } finally {
    await pool.end();
  }
}

main().catch((e: unknown) => {
  console.error(`failed: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
