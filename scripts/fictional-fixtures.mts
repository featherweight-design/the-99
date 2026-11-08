// fictional-fixtures — the ONE fixture About's captures and the landing demo are made from: an invented player, Wren
// Calloway, with a mid-size Commander collection, five decks, a friend, games and an all-decks cart, built from the
// CATALOG alone. Deterministic: the same catalog and seed give the same ids and the same collection.
// SCRATCH BRANCH ONLY: `assertScratchBranch` runs before the first write, and stage 0 EMPTIES every user-keyed table for
// every user, so a scratch branch off local-dev carries no snapshot data. See docs/agents/fictional-fixture.md.
//
//   pnpm fixtures:about            base stage (purge + build). The account: E2E_AUDIT_USER_EMAIL read through Clerk's
//                                  development instance, or ABOUT_FIXTURE_USER=user_...
//   pnpm fixtures:about:cart       the cart's friends, pods and asks, once, after the Friends frames are shot
//   pnpm fixtures:about:export     writes the fixture as JSON (default scripts/out/fictional-fixture.json; FIXTURE_EXPORT_PATH)
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { requireEnv } from "./lib/env.mjs";
import { assertScratchBranch } from "./lib/scratch-branch.mjs";
import { baseStage } from "./lib/fictional-fixture/base-stage";
import { cartStage } from "./lib/fictional-fixture/cart-stage";
import { buildExport } from "./lib/fictional-fixture/export";
import type { Ctx, FixtureSql } from "./lib/fictional-fixture/context";

const STAGE = process.env.ABOUT_FIXTURE_STAGE ?? "base";
if (STAGE !== "base" && STAGE !== "cart" && STAGE !== "export") throw new Error(`ABOUT_FIXTURE_STAGE=${STAGE}: base, cart or export`);
const { DATABASE_URL, CLERK_SECRET_KEY } = requireEnv(["DATABASE_URL", "CLERK_SECRET_KEY"]);
const { neon } = await import("@neondatabase/serverless");
const sql = neon(DATABASE_URL) as unknown as FixtureSql;

const [{ b: branch }] = (await sql`select current_setting('neon.branch_id', true) as b`) as { b: string | null }[];
assertScratchBranch(branch, "fictional-fixtures");

/** The account: named, or the headless one resolved by its email through Clerk's development instance. */
async function resolveUser(): Promise<string> {
  if (process.env.ABOUT_FIXTURE_USER) return process.env.ABOUT_FIXTURE_USER;
  const email = requireEnv(["E2E_AUDIT_USER_EMAIL"]).E2E_AUDIT_USER_EMAIL;
  if (!CLERK_SECRET_KEY.startsWith("sk_test_")) throw new Error("refusing: CLERK_SECRET_KEY is not a development instance's");
  const res = await fetch(`https://api.clerk.com/v1/users?email_address=${encodeURIComponent(email)}`, {
    headers: { Authorization: `Bearer ${CLERK_SECRET_KEY}` },
  });
  if (!res.ok) throw new Error(`Clerk answered ${res.status} reading the account`);
  const users = (await res.json()) as { id: string }[];
  if (users.length !== 1) throw new Error(`Clerk holds ${users.length} accounts for E2E_AUDIT_USER_EMAIL`);
  return users[0].id;
}
const viewer = await resolveUser();
const ctx: Ctx = { sql, viewer, branch: branch! };
console.log(`branch ${branch} · account ${viewer.slice(0, 10)}… · stage ${STAGE}`);

if (STAGE === "base") await baseStage(ctx);
else if (STAGE === "cart") await cartStage(ctx);
else {
  const path = process.env.FIXTURE_EXPORT_PATH ?? "scripts/out/fictional-fixture.json";
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(await buildExport(ctx), null, 1)}\n`);
  console.log(`wrote ${path}`);
}
process.exit(0);
