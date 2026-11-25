// Seeds (or removes) ONE new-combo feed item on the audit account, so Home's What's new draws the See your combos press
// (Collection quick filters PR 5). The row carries a marker dedupe key; `remove` deletes only that row. It reads the
// account's own-both pairs through the loader, so the item names a pair the combos view really draws.
//   pnpm tsx scripts/seed-combo-feed-fixture.mts [seed|remove]   (the audit account, found through Clerk by its email)
// Prints the variant id it seeded. It refuses production and staging by `neon.branch_id`; `remove` also drops the `combo` stamp `seed` wrote (recognised by its sentinel value, so a real stamp stays).
import { requireEnv } from "./lib/env.mjs";
const env = requireEnv(["DATABASE_URL", "CLERK_SECRET_KEY", "E2E_AUDIT_USER_EMAIL"]);
import { PRODUCTION_BRANCH, STAGING_BRANCH } from "./lib/scratch-branch.mjs";
const lookup = await fetch(`https://api.clerk.com/v1/users?email_address=${encodeURIComponent(env.E2E_AUDIT_USER_EMAIL)}`, {
  headers: { Authorization: `Bearer ${env.CLERK_SECRET_KEY}` },
});
const user = ((await lookup.json()) as { id?: string }[])[0]?.id;
if (!user) throw new Error("the audit account was not found in Clerk");
const mode = process.argv[2] ?? "seed";
const { db } = await import("../src/db");
const { sql } = await import("drizzle-orm");
const { rows: b } = await db.execute<{ b: string | null }>(sql`select current_setting('neon.branch_id', true) as b`);
if (!b[0]?.b || b[0].b === PRODUCTION_BRANCH || b[0].b === STAGING_BRANCH) throw new Error(`refusing branch ${b[0]?.b}`);
const MARK = "quick-filters-pr5-probe";
const STAMP = "2026-01-01T00:00:00Z";
if (mode === "remove") {
  await db.execute(sql`delete from feed_items where user_id = ${user} and dedupe_key = ${MARK}`);
  await db.execute(sql`update user_prefs set feed_kinds = feed_kinds - 'combo' where user_id = ${user} and feed_kinds->>'combo' = ${STAMP}`);
  console.log("removed");
} else {
  const { loadCollectionCombos } = await import("../src/lib/combos/collection-combos");
  const both = await loadCollectionCombos({ userId: user, store: "manapool", side: "both" });
  const pair = both.pairs[0];
  if (!pair) throw new Error("the account owns no two-card combo");
  await db.execute(sql`delete from feed_items where user_id = ${user} and dedupe_key = ${MARK}`);
  await db.execute(sql`insert into feed_items (user_id, kind, dedupe_key, oracle_id, variant_id, data)
    values (${user}, 'combo', ${MARK}, ${pair.a.oracleId}::uuid, ${pair.variantId}, ${JSON.stringify({ cards: [{ oracleId: pair.a.oracleId, name: pair.a.name }, { oracleId: pair.b.oracleId, name: pair.b.name }], added: [pair.b.oracleId] })}::jsonb)`);
  await db.execute(sql`update user_prefs set feed_kinds = feed_kinds || ${JSON.stringify({ combo: STAMP })}::jsonb where user_id = ${user} and not (feed_kinds ? 'combo')`);
  console.log(JSON.stringify({ variantId: pair.variantId, a: pair.a.name, b: pair.b.name }));
}
process.exit(0);
