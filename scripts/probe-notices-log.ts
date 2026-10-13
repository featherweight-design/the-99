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
// captured first and upserted back in a `finally`, the log entries it wrote are deleted by their
// exact sequence numbers, and the
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
import { cardBracketFlags, cards, spellbookVariantCards, spellbookVariants } from "../src/db/schema";
import { readCatalogGeneration } from "../src/lib/cache/catalog-generation";
import { readLogHead, type LogReport } from "../src/lib/notices/log";
import { neonRulesEntryDb, recordRulesVersion } from "../src/lib/notices/rules-entry";
import { loadDeckProfile } from "../src/lib/profile/load";
import { isInfiniteOrGameEnding } from "../src/lib/spellbook/combo-features";
import { readStoredReading, type StoredProfileDeps } from "../src/lib/profile/stored";
import { PROFILE_VERSION } from "../src/lib/profile/version";
import { upsertCardBatch } from "../src/lib/scryfall/seed";
import { FLOORS, ingestCombos, publishFlags, publishVariants } from "../src/lib/spellbook/seed";
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

/** The log head, which the probe needs to read; an unreadable head is a failed run, not a 0. */
const logHead = async (): Promise<number> => {
  const head = await readLogHead(db);
  if (head === null) throw new Error("the change log head is unreadable");
  return head;
};

/** Every report the probe hands a writer, so the cleanup can delete EXACTLY the entries it wrote
 *  (`LogReport.seqs`) and nothing a concurrent ingest published meanwhile. */
const reports: LogReport[] = [];
const track = (): LogReport => {
  const r: LogReport = { written: 0, lost: 0, seqs: [] };
  reports.push(r);
  return r;
};
const counts = (r: LogReport) => ({ written: r.written, lost: r.lost });

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
  let constraintAdded = false;
  let rulesProbeVersion: number | null = null;
  let release: null | (() => Promise<void>) = null;
  // The Combo refresh's tables, captured whole before any case below replaces them, and published
  // back (with logging off) in the `finally`. A run killed between leaves a set one combo away
  // from the original, which the next Combo refresh replaces.
  const flagsBefore = await db.select().from(cardBracketFlags);
  let variantsBefore: (typeof spellbookVariants.$inferSelect)[] | null = null;
  let membersBefore: (typeof spellbookVariantCards.$inferSelect)[] | null = null;
  let flagsTouched = false;
  let variantsTouched = false;

  try {
    // 1 · A batch that moves a Game Changer writes one entry, in the same transaction.
    await db.update(cards).set({ gameChanger: true }).where(eq(cards.oracleId, a.oracleId));
    let head = await logHead();
    const log1 = track();
    await upsertCardBatch([a], true, log1);
    check("1 · the card is back to the catalog's value", (await cardRow(a.oracleId)).gameChanger, false);
    check("1 · one entry, a Game Changer leaving", await entriesSince(head),
      [{ kind: "gameChanger", direction: "removed", oracle_ids: [a.oracleId] }]);
    check("1 · the report counts it", counts(log1), { written: 1, lost: 0 });

    // 2 · A ban is dated; an unban writes nothing (legality is derived live, plan D6).
    head = await logHead();
    await upsertCardBatch([{ ...a, commanderLegal: false }], true, track());
    await upsertCardBatch([a], true, track());
    check("2 · the ban is logged and the unban is not", await entriesSince(head),
      [{ kind: "notLegal", direction: "added", oracle_ids: [a.oracleId] }]);

    // 3 · A batch that throws after its read writes NEITHER the upsert nor an entry.
    await db.update(cards).set({ gameChanger: true }).where(eq(cards.oracleId, a.oracleId));
    head = await logHead();
    let threw = false;
    try {
      // `name` is NOT NULL: the second row fails the statement after the before-read has run.
      await upsertCardBatch([a, { ...b, name: null as unknown as string }], true, track());
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
    const log4 = track();
    let threw4 = false;
    try {
      await upsertCardBatch([a], true, log4);
    } catch {
      threw4 = true;
    }
    check("4 · a rejected log write does not fail the batch", threw4, false);
    check("4 · the batch still published", (await cardRow(a.oracleId)).gameChanger, false);
    check("4 · the loss is counted", counts(log4), { written: 0, lost: 1 });
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
    const deps: StoredProfileDeps = { generation: readCatalogGeneration, compute: (d, u) => loadDeckProfile(d, u, process.env), env: process.env };
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
    // ---- The Combo refresh (plan PR 3) ------------------------------------------------------

    // 6 · A flag moving writes one entry, inside the flag publish.
    const quiet = flagsBefore.find((f) => !f.massLandDenial && !f.extraTurn);
    if (!quiet) throw new Error("no flag row without mass land denial or extra turns to flip");
    head = await logHead();
    const flipped = flagsBefore.map((f) => f.oracleId === quiet.oracleId
      ? { ...f, massLandDenial: true, massLandDenialSources: ["oracle_rule"] } : f);
    flagsTouched = true;
    const log6 = track();
    await publishFlags(flipped, true, log6);
    check("6 · a flag moving is logged, with its direction", await entriesSince(head),
      [{ kind: "massLandDenial", direction: "added", oracle_ids: [quiet.oracleId] }]);
    check("6 · and counted", counts(log6), { written: 1, lost: 0 });
    head = await logHead();
    await publishFlags(flipped.map((f) => ({ ...f, tutor: !f.tutor, tutorSources: f.tutor ? [] : ["oracle_rule"] })), true, track());
    check("6 · a TUTOR flag moving writes nothing", await entriesSince(head), []);

    // 7 · A rejected log write inside the flag publish still publishes the flags.
    await db.execute(sql`alter table deck_data_changes add constraint probe_notices_reject check (false) not valid`);
    constraintAdded = true;
    const log7 = track();
    await publishFlags(flagsBefore, true, log7);
    const [{ mld }] = await rows<{ mld: boolean }>(sql`
      select mass_land_denial as mld from card_bracket_flags where oracle_id = ${quiet.oracleId}::uuid`);
    check("7 · the flags still published", mld, false);
    check("7 · the loss is counted", counts(log7), { written: 0, lost: 1 });
    await db.execute(sql`alter table deck_data_changes drop constraint probe_notices_reject`);
    constraintAdded = false;

    // 8 · Only a COUNTED combo appearing or disappearing is logged, with its names and result.
    variantsBefore = await db.select().from(spellbookVariants);
    membersBefore = await db.select().from(spellbookVariantCards);
    const members = new Map<string, typeof membersBefore>();
    for (const m of membersBefore) members.set(m.variantId, [...(members.get(m.variantId) ?? []), m]);
    const counted = variantsBefore.find((v) => v.cardCount === 2 && v.requiresTemplateIds.length === 0
      && (members.get(v.variantId)?.length ?? 0) === 2 && isInfiniteOrGameEnding(v.produces));
    const mundane = variantsBefore.find((v) => v.cardCount === 2 && v.requiresTemplateIds.length === 0
      && (members.get(v.variantId)?.length ?? 0) === 2 && !isInfiniteOrGameEnding(v.produces));
    if (!counted || !mundane) throw new Error("the combo index holds no counted or no mundane two-card variant");
    const probeId = `probe-notices-${Date.now()}`;
    const [c1, c2] = picked.map((p) => p.oracle_id);
    const nextVariants = [
      ...variantsBefore.filter((v) => v.variantId !== counted.variantId && v.variantId !== mundane.variantId),
      { ...counted, variantId: probeId },
    ];
    const nextMembers = [
      ...membersBefore.filter((m) => m.variantId !== counted.variantId && m.variantId !== mundane.variantId),
      { variantId: probeId, oracleId: c1, mustBeCommander: true },
      { variantId: probeId, oracleId: c2, mustBeCommander: false },
    ];
    head = await logHead();
    variantsTouched = true;
    const log8 = track();
    await publishVariants(nextVariants, nextMembers, true, log8, (id) => `name:${id.slice(0, 4)}`);
    const combos = await rows<{ direction: string; oracle_ids: string[]; detail: Record<string, unknown> }>(sql`
      select direction, oracle_ids, detail from deck_data_changes where seq > ${head} and kind = 'combo' order by seq`);
    check("8 · the removed counted combo and the added one are logged, and the mundane one is not",
      combos.map((c) => [c.direction, c.detail.variantId]).sort(),
      [["added", probeId], ["removed", counted.variantId]]);
    const added = combos.find((c) => c.direction === "added");
    check("8 · an entry keeps its pieces, names, result and commander piece", added && {
      ids: added.oracle_ids, names: added.detail.names, produces: added.detail.produces, cmd: added.detail.mustBeCommander,
    }, {
      ids: [c1, c2].sort(), names: [c1, c2].sort().map((id) => `name:${id.slice(0, 4)}`),
      produces: counted.produces, cmd: [c1],
    });
    check("8 · nothing else was logged", (await entriesSince(head)).length, 2);

    // 9 · The Combo refresh's three stopping points, through the real ingest.
    const noSweep = async () => ({ cards: [] });
    const emptyBulk = async () => new Response('{"variants": []}').body!;
    //   a · Refused before the flag publish (the classifier floors): nothing is written.
    head = await logHead();
    const flagCount = async () => Number((await rows<{ n: string }>(sql`select count(*) n from card_bracket_flags`))[0].n);
    const flagsAtA = await flagCount();
    // Each refusal is identified by its OWN message: a bare catch passes whatever threw.
    let refusedA = "";
    try {
      await ingestCombos({ fetchSweep: noSweep, fetchBulk: emptyBulk, log: () => {}, notices: track() });
    } catch (e) {
      refusedA = String(e);
    }
    check("9a · refused before the flags, by the classifier floors", /REFUSED — below floor, nothing written/.test(refusedA), true);
    check("9a · and wrote no entries, and no flags", { entries: (await entriesSince(head)).length, flags: await flagCount() },
      { entries: 0, flags: flagsAtA });
    //   b · Refused after the flag publish (the variant floor): the flag entries stand, and no
    //       combo entry is written. Every classifier floor is lowered so the flags publish.
    head = await logHead();
    const open = Object.fromEntries(Object.entries(FLOORS).map(([k]) => [k, 0])) as unknown as typeof FLOORS;
    let refusedB = "";
    try {
      await ingestCombos({ fetchSweep: noSweep, fetchBulk: emptyBulk, floors: { ...open, variantsKept: 1 } as unknown as typeof FLOORS, log: () => {}, notices: track() });
    } catch (e) {
      refusedB = String(e);
    }
    const kinds = [...new Set((await entriesSince(head)).map((e) => e.kind))].sort();
    check("9b · refused at the variant floor", /variants kept, below the floor/.test(refusedB), true);
    check("9b · the flag entries stand and no combo entry was written",
      { flagKinds: kinds.length > 0 && kinds.every((k) => k === "massLandDenial" || k === "extraTurns"), combo: kinds.includes("combo") },
      { flagKinds: true, combo: false });
    //   c · A run that publishes both writes combo entries inside the variant publish: case 8.

    // 10 · The deploy's rules entry through the REAL client (`neonRulesEntryDb`): the SQL, the
    //      partial unique index that makes it idempotent, and the detail's shape. A version far
    //      above any shipped one, so it never collides with a real entry; deleted by version below.
    rulesProbeVersion = 900_000 + (Date.now() % 90_000);
    const openRules = () => neonRulesEntryDb(process.env.DATABASE_URL!);
    const probeWords = { [rulesProbeVersion]: { rule: "Probe rule", reads: "what it reads" } };
    const first = await recordRulesVersion(openRules, rulesProbeVersion, undefined, probeWords);
    const second = await recordRulesVersion(openRules, rulesProbeVersion, undefined, probeWords);
    const direct = openRules();
    await direct.insert(rulesProbeVersion, { rule: "again" });
    await direct.close();
    const ruleRows = await rows<{ direction: string; oracle_ids: string[]; detail: Record<string, unknown> }>(sql`
      select direction, oracle_ids, detail from deck_data_changes
      where kind = 'rules' and detail->>'rulesVersion' = ${String(rulesProbeVersion)}`);
    check("10 · written once, then unchanged", [first, second], ["written", "unchanged"]);
    check("10 · a second insert of the same version is refused by the index", ruleRows.length, 1);
    check("10 · the entry names no cards, moves, and keeps its version as a string",
      ruleRows[0] && [ruleRows[0].direction, ruleRows[0].oracle_ids, ruleRows[0].detail.rulesVersion],
      ["moved", [], String(rulesProbeVersion)]);
  } finally {
    if (rulesProbeVersion !== null) {
      await db.execute(sql`delete from deck_data_changes where kind = 'rules' and detail->>'rulesVersion' = ${String(rulesProbeVersion)}`)
        .catch((e) => { failures += 1; console.error("probe rules entry not deleted", e); });
    }
    // Each step on its own, so one failing cannot skip the rest.
    if (constraintAdded) {
      await db.execute(sql`alter table deck_data_changes drop constraint if exists probe_notices_reject`)
        .catch((e) => { failures += 1; console.error("constraint not dropped", e); });
    }
    if (flagsTouched) {
      await publishFlags(flagsBefore, false, track())
        .catch((e) => { failures += 1; console.error("flags not restored", e); });
    }
    if (variantsTouched && variantsBefore && membersBefore) {
      await publishVariants(variantsBefore, membersBefore, false, track(), (id) => id)
        .catch((e) => { failures += 1; console.error("variants not restored", e); });
    }
    for (const card of originals) {
      await upsertCardBatch([card], false, track())
        .catch((e) => { failures += 1; console.error(`card ${card.oracleId} not restored`, e); });
    }
    // EXACTLY what this run wrote, by sequence number: a concurrent ingest's entries survive.
    const mine = reports.flatMap((r) => r.seqs ?? []);
    await db.execute(sql`delete from deck_data_changes where seq = any(${`{${mine.join(",")}}`}::bigint[])`)
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
