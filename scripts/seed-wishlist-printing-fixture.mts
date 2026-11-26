// Seeds (or removes) three wishlist lines that each NAME a printing other than the card's default art, on the audit account,
// so the card swipe's neighbors can be checked against the chosen printing (card swipe bugs PR). Picks cards the account does
// not hold (a held line is swept) with at least two printings whose art differs.
//   pnpm tsx scripts/seed-wishlist-printing-fixture.mts [seed|remove]   (the audit account, found through Clerk by its email)
// Prints the lines it wrote as JSON; `remove` deletes exactly those oracle ids, read back from the file named by WL_FIXTURE_FILE
// (default: the OS temp dir). It refuses production and staging by `neon.branch_id`, and refuses an account that already has wishlist lines.
import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { requireEnv } from "./lib/env.mjs";
const env = requireEnv(["DATABASE_URL", "CLERK_SECRET_KEY", "E2E_AUDIT_USER_EMAIL"]);
import { PRODUCTION_BRANCH, STAGING_BRANCH } from "./lib/scratch-branch.mjs";
const lookup = await fetch(`https://api.clerk.com/v1/users?email_address=${encodeURIComponent(env.E2E_AUDIT_USER_EMAIL)}`, {
  headers: { Authorization: `Bearer ${env.CLERK_SECRET_KEY}` },
});
const user = ((await lookup.json()) as { id?: string }[])[0]?.id;
if (!user) throw new Error("the audit account was not found in Clerk");
const mode = process.argv[2] ?? "seed";
const file = process.env.WL_FIXTURE_FILE ?? `${tmpdir()}/wishlist-printing-fixture.json`;
const { db } = await import("../src/db");
const { sql } = await import("drizzle-orm");
const { rows: b } = await db.execute<{ b: string | null }>(sql`select current_setting('neon.branch_id', true) as b`);
if (!b[0]?.b || b[0].b === PRODUCTION_BRANCH || b[0].b === STAGING_BRANCH) throw new Error(`refusing branch ${b[0]?.b}`);
if (mode === "remove") {
  const lines = JSON.parse(readFileSync(file, "utf8")) as { oracleId: string }[];
  for (const l of lines) await db.execute(sql`delete from wishlist_items where user_id = ${user} and oracle_id = ${l.oracleId}::uuid`);
  console.log("removed", lines.length);
} else {
  const { rows: had } = await db.execute<{ n: number }>(sql`select count(*)::int as n from wishlist_items where user_id = ${user}`);
  if ((had[0]?.n ?? 0) > 0) throw new Error("the account already has wishlist lines; refusing to mix fixtures with them");
  const { rows } = await db.execute<{ oracle_id: string; name: string; scryfall_id: string; set_code: string; collector_number: string }>(sql`
    select c.oracle_id, c.name, p.scryfall_id, p.set_code, p.collector_number
    from cards c
    join lateral (select p.* from printings p where p.oracle_id = c.oracle_id and p.image_uri is not null and p.image_uri <> c.image_uri
                  order by p.set_code, p.collector_number limit 1) p on true
    where c.image_uri is not null
      and not exists (select 1 from collection_items ci where ci.user_id = ${user} and ci.oracle_id = c.oracle_id)
    order by c.name limit 3 offset 400`);
  if (rows.length < 3) throw new Error("not enough cards with a second printing");
  for (const r of rows)
    await db.execute(sql`insert into wishlist_items (user_id, oracle_id, quantity, scryfall_id) values (${user}, ${r.oracle_id}::uuid, 1, ${r.scryfall_id}::uuid)`);
  const lines = rows.map((r) => ({ oracleId: r.oracle_id, name: r.name, printingId: r.scryfall_id, set: r.set_code, number: r.collector_number }));
  writeFileSync(file, JSON.stringify(lines));
  console.log(JSON.stringify(lines));
}
process.exit(0);
