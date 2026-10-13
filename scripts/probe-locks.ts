// Locked (never cut), sub-project 5.1: the lock's STORAGE, proved against a real Postgres by calling
// the real `commitVersion`, `restoreDraftFromVersion`, `pruneOrphanLocks`, `reviveDormantLocks` and
// `liveLockedIds`. What no unit test here can reach is what the transactions and the trigger WROTE:
// the `after insert` trigger on `deck_cards` that ends a dormant lock, the discard that wakes one
// before its reinsert, and the commit that clears them (D2, and Hugh's Q1 ruling, 2026-09-25).
// Section 13 proves the other thing a commit clears: the `auto` flag (Hugh, 2026-09-28).
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
import {
  isLiveLocked, liveLockedIds, lockedOracleIds, notLiveLocked, pruneOrphanLocks, reviveDormantLocks,
} from "../src/lib/decks/locks";
import { applySwap, planSwap, restoreSwap } from "../src/lib/swaps/draft-swap";
import { loadAvailability } from "../src/lib/decks/availability-query";
import { deckCards } from "../src/db/schema";
import { and, eq } from "drizzle-orm";
// No signed-in reader here: every switch read takes the environment itself (`process.env`).

neonConfig.webSocketConstructor = ws;
// Every filter reads the switch (D3). Sections 9 and on turn it off for one step each to show the
// filters stand down with it.
process.env.NEVER_CUT_ENABLED = "true";

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
  // W is also a swap's ADD (sections 9 and 10), so it has to fit any commander: colorless and legal,
  // or `planSwap` refuses it as addIllegal and the section measures the wrong refusal.
  const { rows: [spare] } = await fixture.execute<{ oracle_id: string }>(sql`
    select oracle_id from cards
    where type_line !~ '\\mBasic\\M' and type_line !~ 'Legendary'
      and commander_legal and cardinality(color_identity) = 0
    order by oracle_id limit 1`);
  const { rows: body } = await fixture.execute<{ oracle_id: string }>(sql`
    select oracle_id from cards
    where type_line !~ '\\mBasic\\M' and type_line !~ 'Legendary'
      and oracle_id <> ${spare?.oracle_id ?? null}
    order by oracle_id limit 3`);
  if (legends.length < 1 || body.length < 3 || !spare) throw new Error("catalog is empty — seed it first");
  const commander = legends[0].oracle_id;
  const [X, Y, Z] = body.map((r) => r.oracle_id);
  const W = spare.oracle_id;

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
    const { version } = await commitVersion(deck.id, null, undefined, undefined, process.env);
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
      await commitVersion(d.id, null, undefined, undefined, process.env);
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

    // PR 2, THE FILTERS. Each one a filter inside the writer's own transaction (D4).
    // `planSwap` and `restoreSwap` take the src/db transaction type; the probe's is the same driver.
    type SwapTx = Parameters<typeof planSwap>[0];

    // 9. F4: tuning's Apply and the swap tools' Take both plan through `planSwap`, which refuses a
    //    locked cut. With the switch off the same swap plans.
    {
      const d = await freshDeck("swap-cut");
      await lock(d.id, X);
      const locked = await fixture.transaction((tx) => planSwap(tx as unknown as SwapTx, d.id, X, W, process.env));
      check("9 · a swap cutting a locked card is refused", locked.ok ? "ok" : locked.reason, "cutLocked");
      process.env.NEVER_CUT_ENABLED = "false";
      const off = await fixture.transaction((tx) => planSwap(tx as unknown as SwapTx, d.id, X, W, process.env));
      process.env.NEVER_CUT_ENABLED = "true";
      check("9 · with the switch off, the same swap plans (D3)", off.ok, true);
    }

    // 10. Undoing a swap whose ADD the player has locked since refuses, and writes nothing.
    {
      const d = await freshDeck("swap-undo");
      const snap = await fixture.transaction(async (tx) => {
        const plan = await planSwap(tx as unknown as SwapTx, d.id, Y, W, process.env);
        if (!plan.ok) throw new Error(`fixture swap refused: ${plan.reason}`);
        await applySwap(tx as unknown as SwapTx, d.id, Y, W, plan.snapshot);
        return plan.snapshot;
      });
      await lock(d.id, W);
      const undone = await fixture.transaction((tx) => restoreSwap(tx as unknown as SwapTx, d.id, Y, W, snap, process.env));
      check("10 · an undo that would take out a card locked since is refused", undone, false);
      check("10 · and the locked add is still in the deck", await rowOf(d.id, W), "live");
    }

    // 11. L3: the sweeps delete auto cards with `notLiveLocked()` in their own statement. A locked
    //     auto card stays, an unlocked one goes, and a DORMANT row protects nothing.
    {
      const d = await freshDeck("sweep");
      await fixture.execute(sql`update deck_cards set auto = true where deck_id = ${d.id}`);
      await lock(d.id, X);
      const swept = await fixture.delete(deckCards)
        .where(and(eq(deckCards.deckId, d.id), eq(deckCards.auto, true), notLiveLocked()))
        .returning({ oracleId: deckCards.oracleId });
      check("11 · the sweep leaves the locked auto card", swept.map((r) => r.oracleId).includes(X), false);
      check("11 · and takes the unlocked ones", swept.map((r) => r.oracleId).sort(), [Y, Z].sort());
    }

    // 12. L2: Pull it's read marks a claim from a deck holding the card locked, and the check the
    //     action asks (`isLiveLocked`) answers it against a real Postgres. The action itself needs a
    //     signed-in request this script does not have, so WHERE it asks (under the source deck's
    //     row lock, before any write) is pinned by `locks.test.ts`, which fails with it removed.
    {
      // The claim read reports claims on cards the account OWNS, so the fixture owns two copies.
      await fixture.execute(sql`
        insert into collection_items (user_id, oracle_id, quantity, set_code)
        values (${USER}, ${X}, 2, 'probe')`);
      const d = await freshDeck("pull");
      await lock(d.id, X);
      const claims = (await loadAvailability(USER, { oracleIds: [X], env: process.env })).get(X)?.claims ?? [];
      const mine = claims.find((c) => c.id === d.id);
      check("12 · the claim read marks the locked holder", mine?.locked, true);
      check("12 · the server's own check refuses it", await isLiveLocked(fixture, d.id, X), true);
      const other = await freshDeck("pull-other");
      const otherClaim = ((await loadAvailability(USER, { oracleIds: [X], env: process.env })).get(X)?.claims ?? [])
        .find((c) => c.id === other.id);
      check("12 · a deck that did not lock it is not marked", otherClaim?.locked, false);
    }

    // 13. A commit retires `auto` (Hugh, 2026-09-28), on every commit, the first included, and
    //     only on the deck it commits. Another deck's auto rows are a different player decision.
    {
      const d = await freshDeck("auto");
      const other = await freshDeck("auto-other");
      await fixture.execute(sql`update deck_cards set auto = true where deck_id in (${d.id}, ${other.id})`);
      const autoIds = async (deckId: string) => (await fixture.execute<{ oracle_id: string }>(sql`
        select oracle_id from deck_cards where deck_id = ${deckId} and auto order by oracle_id`)).rows
        .map((r) => r.oracle_id);
      check("13 · the fixture holds three auto rows", (await autoIds(d.id)).length, 3);
      await commitVersion(d.id, null, undefined, undefined, process.env);
      check("13 · the second commit leaves no auto row", await autoIds(d.id), []);
      check("13 · and leaves the other deck's auto rows alone", (await autoIds(other.id)).length, 3);
      check("13 · every row is still in the draft", (await fixture.execute(sql`
        select 1 from deck_cards where deck_id = ${d.id}`)).rows.length, 3);

      // The FIRST commit too, which has no previous version to compare against: a clear written
      // only on the path with a previous version would pass everything above.
      const { rows: [brew] } = await fixture.execute<{ id: string }>(sql`
        insert into decks (user_id, name, commander_oracle_id)
        values (${USER}, 'probe locks · auto-first', ${commander}) returning id`);
      for (const oid of [X, Y, Z]) await add(brew.id, oid);
      await fixture.execute(sql`update deck_cards set auto = true where deck_id = ${brew.id}`);
      check("13 · the unversioned fixture holds three auto rows", (await autoIds(brew.id)).length, 3);
      await commitVersion(brew.id, null, undefined, undefined, process.env);
      check("13 · the first commit leaves no auto row", await autoIds(brew.id), []);
    }
  } finally {
    await fixture.execute(sql`delete from decks where user_id = ${USER}`);
    await fixture.execute(sql`delete from collection_items where user_id = ${USER}`);
    await pool.end();
  }

  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} FAILED`);
  return failures;
}

main()
  .then((n) => process.exit(n === 0 ? 0 : 1))
  .catch((err) => { console.error(err); process.exit(1); });
