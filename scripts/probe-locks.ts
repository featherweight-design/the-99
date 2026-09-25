// Locked (never cut), sub-project 5.1: the lock's STORAGE, proved against a real Postgres by calling
// the real `commitVersion`, `restoreDraftFromVersion`, `pruneOrphanLocks`, `reviveDormantLocks` and
// `liveLockedIds`. What no unit test here can reach is what the transactions and the trigger WROTE:
// the `after insert` trigger on `deck_cards` that ends a dormant lock, the discard that wakes one
// before its reinsert, and the commit that clears them (D2, and Hugh's Q1 ruling, 2026-09-25).
//
// It writes a fixture under a per-run user_id and deletes it in a finally (deck_locks, deck_cards
// and deck_versions all cascade off decks). No begin/rollback: the functions under test go through
// the src/db singleton, a different connection from the one this script opens.
//
// Run it against a scratch Neon branch or local-dev — NEVER production.
//
// Run: `pnpm probe:locks`

import { requireEnv } from "./lib/env.mjs";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { sql } from "drizzle-orm";
import ws from "ws";
import { commitVersion, restoreDraftFromVersion } from "../src/lib/decks/versions";
import { liveLockedIds, lockedOracleIds, pruneOrphanLocks, reviveDormantLocks } from "../src/lib/decks/locks";

neonConfig.webSocketConstructor = ws;

const { DATABASE_URL } = requireEnv(["DATABASE_URL"]);
const pool = new Pool({ connectionString: DATABASE_URL });
const fixture = drizzle(pool);
const USER = `probe-locks-${Date.now()}`;

let failures = 0;
const check = (label: string, actual: unknown, expected: unknown) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} — got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
};

async function main() {
  const { rows: legends } = await fixture.execute<{ oracle_id: string }>(sql`
    select oracle_id from cards
    where type_line ~ 'Legendary Creature' and type_line !~ '\\mBasic\\M'
    order by oracle_id limit 1`);
  const { rows: body } = await fixture.execute<{ oracle_id: string }>(sql`
    select oracle_id from cards
    where type_line !~ '\\mBasic\\M' and type_line !~ 'Legendary'
    order by oracle_id limit 4`);
  if (legends.length < 1 || body.length < 4) throw new Error("catalog is empty — seed it first");
  const commander = legends[0].oracle_id;
  const [X, Y, Z, W] = body.map((r) => r.oracle_id);

  // The lock, as `setCardLocked` writes it: an upsert that wakes a dormant row.
  const lock = (deckId: string, oid: string) => fixture.execute(sql`
    insert into deck_locks (deck_id, oracle_id) values (${deckId}, ${oid})
    on conflict (deck_id, oracle_id) do update set removed_at = null`);
  // A removal, as every remove path writes it: the delete, then the reconcile beside it.
  const remove = (deckId: string, oid: string) => fixture.transaction(async (tx) => {
    await tx.execute(sql`delete from deck_cards where deck_id = ${deckId} and oracle_id = ${oid}`);
    await pruneOrphanLocks(tx, deckId);
  });
  // A plain add: the add panel, the fill, a Take. Nothing revives first.
  const add = (deckId: string, oid: string) => fixture.execute(sql`
    insert into deck_cards (deck_id, oracle_id, quantity) values (${deckId}, ${oid}, 1)`);
  const live = async (deckId: string) => [...(await liveLockedIds(fixture, deckId))].sort();
  const rowOf = async (deckId: string, oid: string) => {
    const { rows } = await fixture.execute<{ dormant: boolean }>(sql`
      select removed_at is not null as dormant from deck_locks where deck_id = ${deckId} and oracle_id = ${oid}`);
    return rows.length === 0 ? "none" : rows[0].dormant ? "dormant" : "live";
  };

  // A fresh deck holding X, Y and Z, committed as v1. Each section takes its own, so no case reads
  // another's leftovers.
  const freshDeck = async (label: string) => {
    const { rows: [deck] } = await fixture.execute<{ id: string }>(sql`
      insert into decks (user_id, name, commander_oracle_id)
      values (${USER}, ${`probe locks · ${label}`}, ${commander}) returning id`);
    for (const oid of [X, Y, Z]) await add(deck.id, oid);
    const { version } = await commitVersion(deck.id, null);
    return { id: deck.id, versionId: version.id };
  };

  try {
    // 1. F1: a discard deletes and reinserts every row, and a card that never left keeps its lock.
    {
      const d = await freshDeck("F1");
      await lock(d.id, X);
      await remove(d.id, Y);
      check("1 · an edit elsewhere leaves X's lock live", await rowOf(d.id, X), "live");
      await restoreDraftFromVersion(d.id, d.versionId);
      check("1 · after the discard, X is still locked (F1)", await live(d.id), [X]);
    }

    // 2. Hugh's Q1 ruling: a discard brings a removed locked card back LOCKED.
    {
      const d = await freshDeck("Q1");
      await lock(d.id, X);
      await remove(d.id, X);
      check("2 · removing X leaves its lock DORMANT, not deleted", await rowOf(d.id, X), "dormant");
      await restoreDraftFromVersion(d.id, d.versionId);
      check("2 · the discard brings X back LOCKED", await live(d.id), [X]);
    }

    // 3. A card the version does not hold: added and locked in the draft, then removed. The discard
    //    does not bring it back, so its lock is over and no dormant row is left.
    {
      const d = await freshDeck("draft-only");
      await add(d.id, W);
      await lock(d.id, W);
      await remove(d.id, W);
      await restoreDraftFromVersion(d.id, d.versionId);
      check("3 · a draft-only card's lock is gone after the discard", await rowOf(d.id, W), "none");
    }

    // 4. F2, the trigger: any other way back arrives unlocked.
    {
      const d = await freshDeck("F2");
      await lock(d.id, X);
      await remove(d.id, X);
      await add(d.id, X);
      check("4 · re-added by a plain insert, X arrives UNLOCKED (the trigger)", await rowOf(d.id, X), "none");
    }

    // 5. L1: Undo and Put back wake the lock BEFORE the insert, in one transaction.
    {
      const d = await freshDeck("L1");
      await lock(d.id, X);
      await remove(d.id, X);
      await fixture.transaction(async (tx) => {
        await reviveDormantLocks(tx, d.id, [X]);
        await tx.execute(sql`insert into deck_cards (deck_id, oracle_id, quantity) values (${d.id}, ${X}, 1)`);
      });
      check("5 · woken before the re-add, X comes back LOCKED (L1)", await live(d.id), [X]);
    }

    // 6. A commit keeps a live lock and ends a dormant one.
    {
      const d = await freshDeck("commit");
      await lock(d.id, X);
      await lock(d.id, Z);
      await remove(d.id, Z);
      await commitVersion(d.id, null);
      check("6 · a commit leaves a live lock alone", await rowOf(d.id, X), "live");
      check("6 · a commit ends a removed card's lock (the removal stayed)", await rowOf(d.id, Z), "none");
    }

    // 7. The trigger never touches a LIVE lock: an insert of a card still locked in ANOTHER deck.
    {
      const a = await freshDeck("live-a");
      const b = await freshDeck("live-b");
      await lock(a.id, X);
      await lock(b.id, X);
      await remove(b.id, X);
      await add(b.id, X);
      check("7 · the trigger ends deck b's dormant lock", await rowOf(b.id, X), "none");
      check("7 · and leaves deck a's live lock on the same card alone", await rowOf(a.id, X), "live");
    }

    // 8. Membership and ownership scope every read.
    {
      const d = await freshDeck("scope");
      await fixture.execute(sql`insert into deck_locks (deck_id, oracle_id) values (${d.id}, ${commander})`);
      check("8 · a row naming the commander (not a deck_cards row) is not a live lock", await live(d.id), []);
      await lock(d.id, X);
      check("8 · another account reads no locks on this deck", [...(await lockedOracleIds(d.id, `${USER}-other`))], []);
      check("8 · the owner reads its lock", [...(await lockedOracleIds(d.id, USER))], [X]);
    }
  } finally {
    await fixture.execute(sql`delete from decks where user_id = ${USER}`);
    await pool.end();
  }

  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} FAILED`);
  return failures;
}

main()
  .then((n) => process.exit(n === 0 ? 0 : 1))
  .catch((err) => { console.error(err); process.exit(1); });
