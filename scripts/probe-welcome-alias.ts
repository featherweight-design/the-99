// One welcome lot per mailbox, against a real database: the claim table's primary key is what serialises two sign-ups on one
// address, which a mocked transaction cannot show. Runs the REAL `grantWelcome` and writes only rows of its own per-run user ids
// and its own claim hashes, deleted in a `finally`. Fails closed: `PROBE_DB_BRANCH` must name the branch `DATABASE_URL` reports,
// and staging and production are refused by id. Point it at a scratch branch made from local-dev.
//
//   PROBE_DB_BRANCH=br-… pnpm probe:welcome-alias
// First, and on its own line: the helper's import loads `.env`.
import { requireEnv } from "./lib/env.mjs";
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { sql } from "drizzle-orm";

import { canonicalEmail, welcomeEmailHash } from "../src/lib/payments/canonical-email";
import { grantWelcome } from "../src/lib/payments/welcome";

const STAGING_BRANCH = "br-polished-pond-a6e63y0b";
const PRODUCTION_BRANCH = "br-noisy-violet-a6vw4ess";

const { DATABASE_URL, PROBE_DB_BRANCH } = requireEnv(["DATABASE_URL", "PROBE_DB_BRANCH"]);
const fixture = drizzle(new Pool({ connectionString: DATABASE_URL }));
const PREFIX = `probe-welcome-alias-${Date.now()}`;
const env = { PAYMENTS_ENABLED: "true", WELCOME_CREDITS_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;
const keys = { SENTRY_USER_HASH_KEY: "p".repeat(48) };
const made: string[] = [];
const hashes: string[] = [];
const user = (n: string) => { const u = `${PREFIX}-${n}`; made.push(u); return u; };
const hashOf = (email: string) => { const h = welcomeEmailHash(email, keys); if (!h) throw new Error("no hash"); hashes.push(h); return h; };

let failures = 0;
const check = (label: string, actual: unknown, expected: unknown) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} — got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
};
const lots = async (u: string) => ((await fixture.execute(sql`select count(*)::int as n from credit_grants where user_id = ${u} and source = 'welcome'`)).rows[0] as { n: number }).n;
const reason = (r: { granted: boolean } & { reason?: string }) => (r.granted ? "granted" : r.reason);

async function run() {
  const [{ branch }] = (await fixture.execute(sql`select current_setting('neon.branch_id', true) as branch`)).rows as { branch: string | null }[];
  if (!branch || branch !== PROBE_DB_BRANCH || branch === STAGING_BRANCH || branch === PRODUCTION_BRANCH) {
    throw new Error(`refusing to run against ${branch}: this probe writes the ledger. Name the scratch branch DATABASE_URL reports as PROBE_DB_BRANCH.`);
  }
  console.log(`branch ${branch}`);
  const now = new Date();

  check("the folds name one mailbox", [canonicalEmail("a.b+x@googlemail.com"), canonicalEmail("AB@gmail.com")], ["ab@gmail.com", "ab@gmail.com"]);

  // a · the first sign-up gets its lot; an alias of it (a different account) does not; the first one's redelivery is `already`.
  const first = user("a1"), alias = user("a2");
  const h = hashOf("pat.smith@gmail.com");
  check("a · first sign-up is granted", reason(await grantWelcome(first, now, env, h, now)), "granted");
  check("a · an alias on a second account gets `alias`", reason(await grantWelcome(alias, now, env, hashOf("patsmith+deals@googlemail.com"), now)), "alias");
  check("a · and no lot row", [await lots(first), await lots(alias)], [1, 0]);
  check("a · the first account's redelivery is `already`, not `alias`", reason(await grantWelcome(first, now, env, h, now)), "already");

  // b · two sign-ups on one address at the same moment: exactly one lot.
  const [b1, b2] = [user("b1"), user("b2")];
  const hb = hashOf("race@example.com");
  const both = await Promise.all([grantWelcome(b1, now, env, hb, now), grantWelcome(b2, now, env, hb, now)]);
  check("b · exactly one of two simultaneous sign-ups is granted", both.map(reason).sort(), ["alias", "granted"]);
  check("b · one lot row in all", (await lots(b1)) + (await lots(b2)), 1);

  // c · the claim outlives the account: delete the lot's owner's rows (as a purge does), the address stays claimed.
  await fixture.execute(sql`delete from credit_grants where user_id = ${first}`);
  check("c · after the account's rows are gone, a new account on the address is `alias`", reason(await grantWelcome(user("c1"), now, env, h, now)), "alias");

  // d · no hash grants nothing and writes nothing.
  const d = user("d1");
  check("d · no address hash is `unclaimable`", reason(await grantWelcome(d, now, env, null, now)), "unclaimable");
  check("d · and no lot", await lots(d), 0);
}

(async () => {
  try {
    await run();
  } catch (err) {
    failures += 1;
    console.error(err);
  } finally {
    for (const u of made) await fixture.execute(sql`delete from credit_grants where user_id = ${u}`).catch(() => { failures += 1; });
    for (const h of hashes) await fixture.execute(sql`delete from welcome_email_claims where email_hash = ${h}`).catch(() => { failures += 1; });
  }
  console.log(failures === 0 ? "ALL PASS" : `${failures} FAILED`);
  process.exit(failures === 0 ? 0 : 1);
})();
