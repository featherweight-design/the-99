// Improve my mana's trade write and its Undo (`src/lib/tuning/mana-trade.ts`), proved against a real
// Postgres by calling the real transactions. What no unit test reaches: the list re-keyed under the deck
// lock refusing a list that moved since the offer was read, another player's deck refused, one copy out
// and one in with the snapshot stored, Undo restoring exactly and refusing a second time, and each apply
// pruning the player's day-old snapshots.
//
// It writes a fixture deck under a per-run user id and deletes it in a finally (the snapshots cascade).
// Point it at local-dev or a scratch branch migrated to 0098, NEVER production. Run: `pnpm probe:mana-trade`
import { requireEnv } from "./lib/env.mjs";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { sql } from "drizzle-orm";
import ws from "ws";
import { applyTrade, undoTrade } from "../src/lib/tuning/mana-trade";
import { listKeyOf } from "../src/lib/tuning/list-key";
import { PRODUCTION_BRANCH_ID, STAGING_BRANCH_ID } from "./lib/spend-target";

neonConfig.webSocketConstructor = ws;

const { DATABASE_URL } = requireEnv(["DATABASE_URL"]);
const pool = new Pool({ connectionString: DATABASE_URL });
const fixture = drizzle(pool);
const USER = `probe-mana-trade-${Date.now()}`;

let failures = 0;
// Set only once the branch is verified: the cleanup in `finally` is itself a write.
let verified = false;
let deck: string | null = null;
const check = (label: string, actual: unknown, expected: unknown) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} — got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
};

const rows = async <T>(q: ReturnType<typeof sql>): Promise<T[]> => (await fixture.execute(q)).rows as T[];
const one = async <T>(q: ReturnType<typeof sql>): Promise<T> => (await rows<T>(q))[0];

async function main() {
  const branchId = (await one<{ id: string | null }>(sql`select current_setting('neon.branch_id', true) as id`)).id;
  // Fail closed: an unknown branch (a primary, or a non-Neon database) is refused as well as the two named ones.
  if (!branchId || branchId === PRODUCTION_BRANCH_ID || branchId === STAGING_BRANCH_ID || process.env.VERCEL_ENV === "production") {
    throw new Error(`refusing to write a fixture to ${branchId ?? "(unknown)"}: point DATABASE_URL at local-dev or a scratch branch`);
  }
  verified = true;
  console.log(`branch ${branchId}`);

  // A white-green commander, so both a Plains and a Forest are legal in the deck; the trade cuts a Plains
  // for a Forest (a basic is never refused for being held already, so no staple fixture is needed).
  const commander = (await one<{ oracle_id: string }>(sql`select oracle_id from cards where type_line ~ 'Legendary Creature' and color_identity @> array['W','G']::text[] order by oracle_id limit 1`)).oracle_id;
  const basic = async (name: string) => (await one<{ oracle_id: string }>(sql`select oracle_id from cards where name = ${name} limit 1`)).oracle_id;
  const [plains, forest] = [await basic("Plains"), await basic("Forest")];
  deck = (await one<{ id: string }>(sql`insert into decks (user_id, name, commander_oracle_id) values (${USER}, ${USER}, ${commander}::uuid) returning id`)).id;
  await fixture.execute(sql`insert into deck_cards (deck_id, oracle_id, quantity) values (${deck}::uuid, ${plains}::uuid, 3), (${deck}::uuid, ${forest}::uuid, 3)`);

  const list = async () => rows<{ oracleId: string; quantity: number }>(sql`select oracle_id as "oracleId", quantity from deck_cards where deck_id = ${deck}::uuid`);
  const key = async () => listKeyOf({ commanderOracleId: commander, partnerOracleId: null, cards: await list() });
  // Always in one key order, so a comparison reads the figures and never the row order.
  const counts = async () => {
    const q = new Map((await list()).map((r) => [r.oracleId, r.quantity]));
    return { Plains: q.get(plains) ?? 0, Forest: q.get(forest) ?? 0 };
  };
  const snapshots = async () => (await one<{ n: number }>(sql`select count(*)::int as n from mana_trade_applies where user_id = ${USER}`)).n;
  const trade = { cutOracleId: plains, addOracleId: forest };
  const before = await counts();

  check("a list that moved since the offer was read is refused, nothing written",
    [await applyTrade(deck, USER, trade, "a-key-from-another-list"), await counts(), await snapshots()], [null, before, 0]);
  check("another player's deck is refused", await applyTrade(deck, `${USER}-other`, trade, await key()), null);

  const applyId = await applyTrade(deck, USER, trade, await key());
  check("the current list applies: one Plains out, one Forest in, one snapshot", [typeof applyId, await counts(), await snapshots()], ["string", { Plains: 2, Forest: 4 }, 1]);
  check("another player cannot undo it", await undoTrade(applyId!, `${USER}-other`), null);
  check("Undo restores the deck exactly and clears its snapshot", [await undoTrade(applyId!, USER), await counts(), await snapshots()], [deck, before, 0]);
  check("a second Undo refuses", await undoTrade(applyId!, USER), null);

  const moved = await applyTrade(deck, USER, trade, await key());
  await fixture.execute(sql`update deck_cards set quantity = quantity + 1 where deck_id = ${deck}::uuid and oracle_id = ${forest}::uuid`);
  check("Undo refuses over a deck that moved since the apply", await undoTrade(moved!, USER), null);
  await fixture.execute(sql`update deck_cards set quantity = quantity - 1 where deck_id = ${deck}::uuid and oracle_id = ${forest}::uuid`);
  check("and succeeds once it is back as the apply left it", await undoTrade(moved!, USER), deck);

  await fixture.execute(sql`insert into mana_trade_applies (deck_id, user_id, cut_oracle_id, add_oracle_id, undo_snapshot, created_at) values (${deck}::uuid, ${USER}, ${plains}::uuid, ${forest}::uuid, '{"cut":null,"add":null}'::jsonb, now() - interval '2 days')`);
  const fresh = await applyTrade(deck, USER, trade, await key());
  check("an apply prunes the player's day-old snapshots and keeps its own",
    (await one<{ old: number; all: number }>(sql`select count(*) filter (where created_at < now() - interval '1 day')::int as old, count(*)::int as "all" from mana_trade_applies where user_id = ${USER}`)), { old: 0, all: 1 });
  await undoTrade(fresh!, USER);
  check("the deck ends as it began", await counts(), before);
}

main()
  .catch((error) => {
    failures += 1;
    console.error(error);
  })
  .finally(async () => {
    if (verified && deck) await fixture.execute(sql`delete from decks where id = ${deck}::uuid`);
    await pool.end();
    console.log(failures === 0 ? "\nall checks passed" : `\n${failures} check(s) failed`);
    process.exit(failures === 0 ? 0 : 1);
  });
