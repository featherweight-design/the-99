// probe:notices-log — the deck notices change log's WRITE half, against a real Postgres.
//
// The diff is pure and unit-tested (`src/lib/notices/log.test.ts`). What no unit test here can
// reach is what a transaction wrote: that a card batch writes its entry, that a batch which
// throws writes neither, that a log write which throws still lets the batch publish
// (the ingest runs weekly against production, and a failed log write must never fail it), and
// that a quiet rebuild of an old-format reading keeps the notices marks and the analysis date.
//
// It calls the REAL `upsertCardBatch` (one batch of `seedCards`, without the bulk download) and
// the real `readStoredReading`. It writes to the shared catalog, so every card it touches is
// captured first and upserted back in a `finally`, the log entries it wrote are deleted (only
// entries after its start about a card it touched), and the
// one reading it rebuilds is held on disk by `scripts/lib/profile-hold.mjs`.
//
// It refuses the staging and production branches before its first write, by the Neon branch the
// database reports. Point it at `local-dev` or a scratch branch, NEVER production.
//
//   pnpm probe:notices-log
//
// Mutations run against it, each failing it:
//   - the savepoint in `writeEntries` removed (the insert on the outer transaction): the rejected
//     log write aborts the batch, and "the batch still published" reads the flipped value. That
//     is also the proof the upsert and its entries share ONE transaction: without it, the rejected
//     insert could not have undone the upsert. Case 3 cannot show that, because its failure is
//     inside the upsert statement itself and would roll back with or without a transaction;
//   - the rebuild's `seenSeq` carry removed from `computeAndStoreProfile`: the rebuilt row reads
//     the log head instead of 4242.
//   - the rebuild's date carry removed (`computed_at = now()` on every write): the date reads the
//     run's own clock. Its first version carried the date through a JS Date, which this probe
//     caught dropping the column's microseconds, so the write now keeps the row's own column.
import "./lib/env.mjs";
import { neon } from "@neondatabase/serverless";
import { eq, sql } from "drizzle-orm";

import { db } from "../src/db";
import { cards } from "../src/db/schema";
import { readCatalogGeneration } from "../src/lib/cache/catalog-generation";
import { emptyLogReport, readLogHead } from "../src/lib/notices/log";
import { loadDeckProfile } from "../src/lib/profile/load";
import { readStoredReading, type StoredProfileDeps } from "../src/lib/profile/stored";
import { PROFILE_VERSION } from "../src/lib/profile/version";
import { upsertCardBatch } from "../src/lib/scryfall/seed";
import type { CardRow } from "../src/lib/scryfall/transform";
import { holdProfile } from "./lib/profile-hold.mjs";

const SENTINEL_ID = "00000000-0000-4000-8000-0000000000aa";
const SENTINEL_IDS = `{${SENTINEL_ID}}`;
const STAGING_BRANCH = "br-polished-pond-a6e63y0b";
const PRODUCTION_BRANCH = "br-noisy-violet-a6vw4ess";

let failures = 0;
const check = (label: string, actual: unknown, expected: unknown) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  const ok = a === e;
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} — got ${a}, expected ${e}`);
};

const rows = async <T>(q: ReturnType<typeof sql>): Promise<T[]> => (await db.execute(q)).rows as T[];

const cardRow = async (oracleId: string): Promise<CardRow> => {
  const [r] = await db.select().from(cards).where(eq(cards.oracleId, oracleId));
  return {
    oracleId: r.oracleId, scryfallId: r.scryfallId, name: r.name, manaCost: r.manaCost, cmc: r.cmc,
    colorIdentity: r.colorIdentity, typeLine: r.typeLine, oracleText: r.oracleText, keywords: r.keywords,
    commanderLegal: r.commanderLegal, imageUri: r.imageUri, artCropUri: r.artCropUri, rarity: r.rarity,
    layout: r.layout, backImageUri: r.backImageUri, gameChanger: r.gameChanger,
  };
};

const entriesSince = (head: number) =>
  rows<{ kind: string; direction: string; oracle_ids: string[] }>(sql`
    select kind, direction, oracle_ids from deck_data_changes where seq > ${head} order by seq`);

async function main() {
  const [{ branch }] = await rows<{ branch: string | null }>(sql`select current_setting('neon.branch_id', true) as branch`);
  if (!branch || branch === STAGING_BRANCH || branch === PRODUCTION_BRANCH || process.env.VERCEL_ENV === "production") {
    throw new Error(`probe:notices-log writes the catalog and refuses branch ${branch ?? "(unknown)"}.`);
  }

  // Two ordinary cards, chosen by query and ordered so the fixture is the same every run.
  const picked = await rows<{ oracle_id: string }>(sql`
    select oracle_id from cards where layout = 'normal' and commander_legal and not game_changer
    order by oracle_id limit 2`);
  if (picked.length < 2) throw new Error("no fixture cards: the catalog is empty");
  const [a, b] = await Promise.all(picked.map((p) => cardRow(p.oracle_id)));
  const originals = [a, b];
  const startHead = await readLogHead(db);
  let constraintAdded = false;
  let release: null | (() => Promise<void>) = null;

  try {
    // 1 · A batch that moves a Game Changer writes one entry, in the same transaction.
    await db.update(cards).set({ gameChanger: true }).where(eq(cards.oracleId, a.oracleId));
    let head = await readLogHead(db);
    const log1 = emptyLogReport();
    await upsertCardBatch([a], true, log1);
    check("1 · the card is back to the catalog's value", (await cardRow(a.oracleId)).gameChanger, false);
    check("1 · one entry, a Game Changer leaving", await entriesSince(head),
      [{ kind: "gameChanger", direction: "removed", oracle_ids: [a.oracleId] }]);
    check("1 · the report counts it", log1, { written: 1, lost: 0 });

    // 2 · A ban is dated; an unban writes nothing (legality is derived live, plan D6).
    head = await readLogHead(db);
    await upsertCardBatch([{ ...a, commanderLegal: false }], true, emptyLogReport());
    await upsertCardBatch([a], true, emptyLogReport());
    check("2 · the ban is logged and the unban is not", await entriesSince(head),
      [{ kind: "notLegal", direction: "added", oracle_ids: [a.oracleId] }]);

    // 3 · A batch that throws after its read writes NEITHER the upsert nor an entry.
    await db.update(cards).set({ gameChanger: true }).where(eq(cards.oracleId, a.oracleId));
    head = await readLogHead(db);
    let threw = false;
    try {
      // `name` is NOT NULL: the second row fails the statement after the before-read has run.
      await upsertCardBatch([a, { ...b, name: null as unknown as string }], true, emptyLogReport());
    } catch {
      threw = true;
    }
    check("3 · the batch threw", threw, true);
    check("3 · its upsert rolled back", (await cardRow(a.oracleId)).gameChanger, true);
    check("3 · and it logged nothing", await entriesSince(head), []);

    // 4 · A log write that throws leaves the batch PUBLISHED and counts the loss. The constraint
    //     rejects every new row and is dropped in the `finally`.
    await db.execute(sql`alter table deck_data_changes add constraint probe_notices_reject check (false) not valid`);
    constraintAdded = true;
    const log4 = emptyLogReport();
    let threw4 = false;
    try {
      await upsertCardBatch([a], true, log4);
    } catch {
      threw4 = true;
    }
    check("4 · a rejected log write does not fail the batch", threw4, false);
    check("4 · the batch still published", (await cardRow(a.oracleId)).gameChanger, false);
    check("4 · the loss is counted", log4, { written: 0, lost: 1 });
    await db.execute(sql`alter table deck_data_changes drop constraint probe_notices_reject`);
    constraintAdded = false;

    // 5 · A quiet rebuild keeps the notices marks and the analysis date (plan D4, readiness F4).
    const [reading] = await rows<{ deck_id: string; user_id: string }>(sql`
      select p.deck_id, p.user_id from deck_profiles p
      where not p.dirty and p.profile_version = ${PROFILE_VERSION}
      order by p.deck_id limit 1`);
    if (!reading) throw new Error("no clean current reading on this database to rebuild");
    release = await holdProfile(neon(process.env.DATABASE_URL!), reading.deck_id);
    const stamp = "2026-01-02 03:04:05.123456";
    await db.execute(sql`
      update deck_profiles set seen_seq = 4242, rules_version = 0, computed_at = ${stamp}::timestamp,
        analyzed_oracle_ids = ${SENTINEL_IDS}::uuid[], profile_version = ${PROFILE_VERSION - 1}
      where deck_id = ${reading.deck_id}::uuid`);
    const deps: StoredProfileDeps = { generation: readCatalogGeneration, compute: loadDeckProfile };
    const rebuilt = await readStoredReading(reading.deck_id, reading.user_id, deps);
    const [after] = await rows<{ v: number; seen: number; rules: number; at: string; ids: string[] }>(sql`
      select profile_version as v, seen_seq::int as seen, rules_version as rules,
        computed_at::text as at, analyzed_oracle_ids as ids
      from deck_profiles where deck_id = ${reading.deck_id}::uuid`);
    check("5 · the rebuild ran", after.v, PROFILE_VERSION);
    check("5 · it kept the mark", after.seen, 4242);
    // Each mark is planted at a value a recompute would NOT write (rules 0 against the current
    // version's 1, a list of one id the deck does not hold), so a dropped carry reads differently.
    check("5 · it kept the rules version", after.rules, 0);
    check("5 · it kept the analyzed list", after.ids, [SENTINEL_ID]);
    check("5 · it kept the analysis date", after.at, stamp);
    // 5b · A LEGACY row (the columns' defaults, written by a pre-0058 deployment during the
    //      cutover) has an empty analyzed list. A rebuild fills it rather than carrying it.
    await db.execute(sql`
      update deck_profiles set analyzed_oracle_ids = '{}'::uuid[], profile_version = ${PROFILE_VERSION - 1}
      where deck_id = ${reading.deck_id}::uuid`);
    await readStoredReading(reading.deck_id, reading.user_id, deps);
    const [legacy] = await rows<{ n: number }>(sql`
      select cardinality(analyzed_oracle_ids) as n from deck_profiles where deck_id = ${reading.deck_id}::uuid`);
    check("5b · a rebuild fills a legacy row's empty analyzed list", legacy.n > 0, true);
    check("5 · and reports that date to the reader",
      rebuilt?.analyzedAt.toISOString().slice(0, 19), "2026-01-02T03:04:05");
  } finally {
    // Each step on its own, so one failing cannot skip the rest.
    if (constraintAdded) {
      await db.execute(sql`alter table deck_data_changes drop constraint if exists probe_notices_reject`)
        .catch((e) => { failures += 1; console.error("constraint not dropped", e); });
    }
    for (const card of originals) {
      await upsertCardBatch([card], false, emptyLogReport())
        .catch((e) => { failures += 1; console.error(`card ${card.oracleId} not restored`, e); });
    }
    // ONLY what this run could have written: after its start AND about a card it touched. A
    // concurrent ingest's entries about other cards are left alone.
    await db.execute(sql`
      delete from deck_data_changes
      where seq > ${startHead} and oracle_ids && ${`{${originals.map((c) => c.oracleId).join(",")}}`}::uuid[]`)
      .catch((e) => { failures += 1; console.error("probe entries not deleted", e); });
    if (release) await release().catch((e: unknown) => { failures += 1; console.error("reading not restored", e); });
  }
}

main()
  .catch((error) => {
    failures += 1;
    console.error(error);
  })
  .then(() => {
    console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
    process.exit(failures === 0 ? 0 : 1);
  });
