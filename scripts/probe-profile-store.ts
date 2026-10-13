// The stored deck analysis, proved against a real Postgres.
//
// WHAT ONLY A DATABASE CAN ANSWER HERE. The hook's peek and the action's refusals are unit
// tested with this module mocked out; what those tests cannot reach is what the rows say after
// each step of the lifecycle (Hugh's rulings, 2026-09-23). Those are facts about SQL.
//
//   ONLY A WHOLE DECK IS ANALYZED (ruling 1). A body short of its size is refused, computing and
//     writing nothing.
//   A PRESS STORES WHAT IT COMPUTED, and the next read returns it FRESH without computing.
//   THE SAME LIST ANSWERS FROM THE STORE (ruling 5): a second press on an unchanged deck computes
//     nothing.
//   NOTHING LAPSES. A moved catalog generation and a row eight days old both still read fresh.
//   AN EDIT MAKES IT STALE, NOT ABSENT. `touchDeck` marks the row dirty in the edit's own
//     transaction, the reading reads back `fresh: false`, and both chip readers HOLD the bracket
//     (ruling 4).
//   A VERSION BUMP IS NOT AN EDIT (Hugh's condition at plan approval). A row an older
//     PROFILE_VERSION wrote, over an unchanged list, reads back FRESH: rebuilt quietly, never
//     marked dirty. The same row on a dirty or illegal deck reads as nothing, because an old
//     document's shape is never shown.
//   A COMMIT PINS THE READING (ruling 2) to the version it wrote, and a pin for a list the deck
//     no longer holds writes nothing.
//   ANOTHER READER CANNOT READ IT, a result overtaken by an edit is not written, the check
//     constraint refuses permits outside 1-5, and deleting the deck deletes the row.
//
// It calls the REAL `readStoredProfile` and `computeAndStoreProfile`, with the uncached readers
// beneath their request-time wrappers injected, since `unstable_cache` raises outside a request.
//
// It writes a fixture under a per-run `user_id` and deletes it in a `finally`. Point it at
// `local-dev` or a scratch Neon branch, NEVER production.
//
//   pnpm probe:profile-store
// First, and on its own line: the helper's import loads `.env`, and anything reading
// `DATABASE_URL` at module scope needs it already loaded.
import { requireEnv } from "./lib/env.mjs";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { sql } from "drizzle-orm";
import ws from "ws";

import { readCatalogGeneration } from "../src/lib/cache/catalog-generation";
import { loadDeckProfile } from "../src/lib/profile/load";
import { listDecksWithStats } from "../src/lib/decks/read";
import { commitVersion } from "../src/lib/decks/versions";
import { touchDeck } from "../src/lib/decks/touch";
import { db } from "../src/db";
import { listFingerprint, profileFingerprint } from "../src/lib/profile/fingerprint";
import { PROFILE_VERSION } from "../src/lib/profile/version";
import {
  clearDirty,
  computeAndStoreProfile,
  isNewestVersion,
  pinAnalysisToVersion,
  readStoredPermits,
  readStoredProfile,
  readStoredReading,
  type StoredProfileDeps,
} from "../src/lib/profile/stored";
// No signed-in reader here: every switch read takes the environment itself (`process.env`).

neonConfig.webSocketConstructor = ws;

const { DATABASE_URL } = requireEnv(["DATABASE_URL"]);

const pool = new Pool({ connectionString: DATABASE_URL });
const fixture = drizzle(pool);
const USER = `probe-profile-store-${Date.now()}`;

let failures = 0;
const check = (label: string, actual: unknown, expected: unknown) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  const ok = a === e;
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} — got ${a}, expected ${e}`);
};
const fail = (label: string, why: string) => {
  failures += 1;
  console.log(`FAIL  ${label} — ${why}`);
};

const rows = async <T>(text: ReturnType<typeof sql>): Promise<T[]> =>
  (await fixture.execute(text)).rows as T[];

/** Counts every compute the module asked for, so "read without computing" is observable. */
let computes = 0;
let generation: string | null = null;
const deps: StoredProfileDeps = {
  generation: async () => generation ?? readCatalogGeneration(),
  compute: async (deckId, userId) => {
    computes += 1;
    return loadDeckProfile(deckId, userId);
  },
};

type Row = { n: number; permits: number[]; dirty: boolean; profile_version: number;
  version_id: string | null; fingerprint: string; computed_at: string };
const storedRow = async (deckId: string) =>
  (await rows<Row>(sql`
    select count(*) over ()::int as n, permits, dirty, profile_version, version_id, fingerprint,
      computed_at::text as computed_at
    from deck_profiles where deck_id = ${deckId}::uuid`))[0] ?? null;

/** An edit the way the app makes one: the list write and `touchDeck` in one transaction. */
const edit = (deckId: string, write: ReturnType<typeof sql>) =>
  db.transaction(async (tx) => {
    await tx.execute(write);
    await touchDeck(tx, deckId);
  });

async function run() {
  const [legend] = await rows<{ oracle_id: string }>(sql`
    select oracle_id from cards where type_line ilike '%Legendary Creature%'
    order by oracle_id limit 1`);
  if (!legend) return fail("a legend to lead the fixture", "the catalog is empty");
  // 99 for the body and two spares to swap in, all distinct, none the commander.
  const pool101 = await rows<{ oracle_id: string }>(sql`
    select oracle_id from cards where type_line not ilike '%Land%'
      and oracle_id <> ${legend.oracle_id}::uuid
    order by oracle_id limit 101`);
  if (pool101.length < 101) return fail("101 cards for the fixture", `found ${pool101.length}`);
  const body = pool101.slice(0, 99);
  const [spareA, spareB] = pool101.slice(99);
  /** The fixture's whole list, as `listFingerprint` and `profileFingerprint` take it. */
  const legacyHeadOf = () => ({ commanderOracleId: legend.oracle_id, partnerOracleId: null,
    cards: body.map((c) => ({ oracleId: c.oracle_id, quantity: 1 })) });

  const [deck] = await rows<{ id: string }>(sql`
    insert into decks (user_id, name, commander_oracle_id)
    values (${USER}, 'probe profile store', ${legend.oracle_id}::uuid) returning id`);
  // One statement: a row per round trip is ~100 of them against a serverless Postgres.
  await fixture.execute(sql`
    insert into deck_cards (deck_id, oracle_id, quantity) values ${sql.join(
      body.slice(0, 98).map((c) => sql`(${deck.id}::uuid, ${c.oracle_id}::uuid, 1)`), sql`, `)}`);

  // 1 · RULING 1: a body of 98 is refused, and nothing is computed or written.
  const short = await computeAndStoreProfile(deck.id, USER, deps);
  check("a 98-card body is refused as illegal", short, { kind: "illegal", built: 98, size: 99 });
  check("and nothing was computed", computes, 0);
  check("and nothing was written", await storedRow(deck.id), null);
  check("a deck never analyzed reads as absent", await readStoredReading(deck.id, USER, deps), null);

  await fixture.execute(sql`
    insert into deck_cards (deck_id, oracle_id, quantity) values (${deck.id}::uuid, ${body[98].oracle_id}::uuid, 1)`);

  // 2 · A press on the whole deck stores, and the next read returns it fresh without computing.
  const pressed = await computeAndStoreProfile(deck.id, USER, deps);
  if (pressed?.kind !== "ok") return fail("the press", `answered ${JSON.stringify(pressed)}`);
  check("the press computed once", computes, 1);
  const first = await storedRow(deck.id);
  check("the press wrote one clean row at this version, pinned to nothing",
    first && { n: first.n, dirty: first.dirty, v: first.profile_version, pin: first.version_id },
    { n: 1, dirty: false, v: PROFILE_VERSION, pin: null });
  const fresh = await readStoredReading(deck.id, USER, deps);
  check("the next read returns it fresh", fresh && { fresh: fresh.fresh, fp: fresh.profile.fingerprint },
    { fresh: true, fp: pressed.reading.profile.fingerprint });
  check("and computed nothing to do it", computes, 1);
  check("the permits are stored sorted and in range",
    first ? first.permits.every((p, i, a) => p >= 1 && p <= 5 && (i === 0 || a[i - 1] < p)) : false, true);

  // 3 · RULING 5: the same list answers from the store.
  const again = await computeAndStoreProfile(deck.id, USER, deps);
  check("a second press on an unchanged deck computes nothing", computes, 1);
  check("and answers with the stored reading", again?.kind === "ok" && again.reading.fresh, true);

  // 4 · The chip readers, and what they draw with no bracket asked for.
  const tile = async () =>
    (await listDecksWithStats(USER, "name", { includeBracket: true, env: process.env })).find((d) => d.id === deck.id)
      ?.bracket?.permits ?? null;
  check("the header reads the stored permits", await readStoredPermits(deck.id, USER), first?.permits);
  check("the deck list reads the same permits", await tile(), first?.permits);
  check("a list read with no bracket asked for reads none",
    (await listDecksWithStats(USER, "name", { env: process.env })).find((d) => d.id === deck.id)?.bracket ?? null, null);

  // 5 · Another reader cannot read it.
  check("another reader reads it as absent", await readStoredReading(deck.id, `${USER}-other`, deps), null);
  check("and another reader's header reads no permits", await readStoredPermits(deck.id, `${USER}-other`), null);

  // 6 · NOTHING LAPSES: a moved catalog and an old row both still read fresh.
  generation = "probe-another-catalog";
  check("a moved catalog generation leaves it fresh", (await readStoredReading(deck.id, USER, deps))?.fresh, true);
  generation = null;
  await fixture.execute(sql`
    update deck_profiles set computed_at = now() - interval '8 days' where deck_id = ${deck.id}::uuid`);
  check("a row eight days old is still fresh", (await readStoredReading(deck.id, USER, deps))?.fresh, true);
  check("and the tile still draws it", await tile(), first?.permits);

  // 7 · AN EDIT MAKES IT STALE, and the chip holds.
  await edit(deck.id, sql`update deck_cards set oracle_id = ${spareA.oracle_id}::uuid
    where deck_id = ${deck.id}::uuid and oracle_id = ${body[0].oracle_id}::uuid`);
  check("touchDeck marks the row dirty", (await storedRow(deck.id))?.dirty, true);
  const stale = await readStoredReading(deck.id, USER, deps);
  check("the reading reads back stale, not absent", stale && { fresh: stale.fresh, has: !!stale.profile }, { fresh: false, has: true });
  check("the fresh-only reader answers nothing", await readStoredProfile(deck.id, USER, deps), null);
  check("the header's chip holds the last bracket", await readStoredPermits(deck.id, USER), first?.permits);
  check("so does the tile's", await tile(), first?.permits);
  check("and reading it computed nothing", computes, 1);

  // 8 · Undone: the list is the analyzed one again but the row is still dirty, so still stale;
  // a press answers from the store and clears it.
  await edit(deck.id, sql`update deck_cards set oracle_id = ${body[0].oracle_id}::uuid
    where deck_id = ${deck.id}::uuid and oracle_id = ${spareA.oracle_id}::uuid`);
  check("an undone edit still reads stale while dirty", (await readStoredReading(deck.id, USER, deps))?.fresh, false);
  await computeAndStoreProfile(deck.id, USER, deps);
  check("re-analyzing the same list computes nothing", computes, 1);
  check("and clears dirty", (await storedRow(deck.id))?.dirty, false);
  check("so the reading is fresh again", (await readStoredReading(deck.id, USER, deps))?.fresh, true);

  // 8b · THE CLEAR IS GUARDED ON THE EDIT STAMP. An edit landing between a press's read and its
  // clear — here an edit and its undo, back to the analyzed list — must leave the row dirty.
  {
    await edit(deck.id, sql`update deck_cards set quantity = quantity where deck_id = ${deck.id}::uuid and false`);
    const [{ stamp }] = await rows<{ stamp: string }>(sql`select last_edited_at::text as stamp from decks where id = ${deck.id}::uuid`);
    await edit(deck.id, sql`update deck_cards set oracle_id = ${spareA.oracle_id}::uuid
      where deck_id = ${deck.id}::uuid and oracle_id = ${body[0].oracle_id}::uuid`);
    await edit(deck.id, sql`update deck_cards set oracle_id = ${body[0].oracle_id}::uuid
      where deck_id = ${deck.id}::uuid and oracle_id = ${spareA.oracle_id}::uuid`);
    await clearDirty(deck.id, listFingerprint(legacyHeadOf()), stamp);
    check("a clear read before an edit and its undo leaves the row dirty", (await storedRow(deck.id))?.dirty, true);
    await computeAndStoreProfile(deck.id, USER, deps);
    check("and a press made after them clears it", (await storedRow(deck.id))?.dirty, false);
  }

  // 9 · HUGH'S CONDITION: a version bump over an unchanged list reads clean.
  const listBefore = (await storedRow(deck.id))?.fingerprint;
  await fixture.execute(sql`
    update deck_profiles set profile_version = ${PROFILE_VERSION - 1} where deck_id = ${deck.id}::uuid`);
  const bumped = await readStoredReading(deck.id, USER, deps);
  check("a row an older version wrote reads back FRESH over an unchanged list", bumped?.fresh, true);
  check("rebuilt quietly: one compute", computes, 2);
  const rebuilt = await storedRow(deck.id);
  check("stored at the current version, not dirty, same list fingerprint",
    rebuilt && { v: rebuilt.profile_version, dirty: rebuilt.dirty, same: rebuilt.fingerprint === listBefore },
    { v: PROFILE_VERSION, dirty: false, same: true });
  // The same old row on a DIRTY deck reads as nothing: an old document's shape is never shown,
  // and rebuilding it would describe a list the reader never analyzed.
  await fixture.execute(sql`
    update deck_profiles set profile_version = ${PROFILE_VERSION - 1}, dirty = true where deck_id = ${deck.id}::uuid`);
  check("an old version on a dirty deck reads as nothing", await readStoredReading(deck.id, USER, deps), null);
  check("and computes nothing", computes, 2);
  check("while the chip still holds its bracket", await readStoredPermits(deck.id, USER), first?.permits);
  await computeAndStoreProfile(deck.id, USER, deps);
  check("a press rebuilds it", computes, 3);

  // 9b · A LEGACY row, written before 0054: `profile_version` 0, not dirty, and the fingerprint
  // it stored is `profileFingerprint`. Over the list it was taken from it is rebuilt fresh; over a
  // list edited before the deploy it reads as nothing — `dirty` could not have seen that edit, so
  // the list itself is what has to be compared.
  const legacyHead = legacyHeadOf();
  await fixture.execute(sql`update deck_profiles set profile_version = 0, dirty = false,
    fingerprint = ${profileFingerprint(legacyHead)} where deck_id = ${deck.id}::uuid`);
  check("a legacy row over its own list reads back fresh", (await readStoredReading(deck.id, USER, deps))?.fresh, true);
  check("rebuilt quietly: one compute", computes, 4);
  await fixture.execute(sql`update deck_profiles set profile_version = 0, dirty = false,
    fingerprint = ${profileFingerprint({ ...legacyHead, cards: legacyHead.cards.slice(1) })}
    where deck_id = ${deck.id}::uuid`);
  check("a legacy row over a list edited before the deploy reads as nothing",
    await readStoredReading(deck.id, USER, deps), null);
  check("and is not rebuilt", computes, 4);
  await computeAndStoreProfile(deck.id, USER, deps);
  check("a press rebuilds that one", computes, 5);

  // 10 · RULING 2: a commit pins the reading to the version it wrote.
  const head = { commanderOracleId: legend.oracle_id, partnerOracleId: null,
    cards: body.map((c) => ({ oracleId: c.oracle_id, quantity: 1 })) };
  const { version } = await commitVersion(deck.id, null, undefined, undefined, process.env);
  // The REAL version id with the wrong list: a made-up id fails the foreign key, the pin swallows
  // that, and the row reads null whether or not the list guard ran. That version measured nothing.
  await pinAnalysisToVersion(deck.id, USER, { versionId: version.id, list: "not-this-list" }, deps);
  check("a pin for a list the deck no longer holds writes nothing", (await storedRow(deck.id))?.version_id, null);
  await pinAnalysisToVersion(deck.id, USER, { versionId: version.id, list: listFingerprint(head) }, deps);
  check("a pin for the committed list sets the version", (await storedRow(deck.id))?.version_id, version.id);
  check("and answered from the store", computes, 5);
  check("the pinned reading names its version", (await readStoredReading(deck.id, USER, deps))?.versionId, version.id);

  // 10b · A QUIET REBUILD KEEPS THE PIN: a version bump changes the document, never which version
  // the list belongs to.
  await fixture.execute(sql`update deck_profiles set profile_version = ${PROFILE_VERSION - 1} where deck_id = ${deck.id}::uuid`);
  const kept = await readStoredReading(deck.id, USER, deps);
  check("a rebuild over a pinned list keeps its version", kept && { fresh: kept.fresh, pin: kept.versionId }, { fresh: true, pin: version.id });
  check("rebuilt: one compute", computes, 6);

  // 10c · A REBUILD FOR A LIST THE DECK NO LONGER HOLDS writes nothing (an edit landed between the
  // read that decided on it and the rebuild).
  await fixture.execute(sql`update deck_profiles set profile_version = ${PROFILE_VERSION - 1} where deck_id = ${deck.id}::uuid`);
  check("a rebuild for another list is refused",
    await computeAndStoreProfile(deck.id, USER, deps, { rebuildOf: { list: "not-this-list", versionId: null, versionNumber: null, marks: { seenSeq: 0, rulesVersion: 1, analyzedOracleIds: [] } } }), null);
  check("and computed and wrote nothing",
    { computes, v: (await storedRow(deck.id))?.profile_version }, { computes: 6, v: PROFILE_VERSION - 1 });
  await computeAndStoreProfile(deck.id, USER, deps);

  // 10c2 · A COMMIT OF A CHANGED LIST PINS NOTHING AND COMPUTES NOTHING (H32, Hugh's walk). The
  // stored reading describes an older list (an edit since the last press), and the commit's pin
  // must leave it stale and unpinned, so the banner offers the press, rather than quietly
  // re-analyzing the new list and reading fresh.
  {
    await fixture.execute(sql`update deck_profiles set fingerprint = 'an-older-list', dirty = true, version_id = null
      where deck_id = ${deck.id}::uuid`);
    const { version: changed } = await commitVersion(deck.id, null, undefined, undefined, process.env);
    const before = computes;
    await pinAnalysisToVersion(deck.id, USER, { versionId: changed.id, list: listFingerprint(head) }, deps);
    const after = await readStoredReading(deck.id, USER, deps);
    check("a commit of a changed list computes nothing and pins nothing",
      { computed: computes - before, pin: (await storedRow(deck.id))?.version_id ?? null },
      { computed: 0, pin: null });
    check("and the reading stays stale, so the banner offers the press", after?.fresh, false);
    // Put the reading back as a press would, for the steps after this one.
    await computeAndStoreProfile(deck.id, USER, deps);
  }

  // 10c3 · A DEPLOY BETWEEN THE PRESS AND THE COMMIT. The reading is of this list under an older
  // PROFILE_VERSION: a version bump is not an edit, so the commit's pin rebuilds it and pins it,
  // where a reading of ANOTHER list (10c2) is left alone.
  {
    // A REBUILD STILL, so the analysis date and the notice mark are the press's, never the deploy's
    // (review round 2): both are set to values no write would produce, and must survive the pin.
    await fixture.execute(sql`update deck_profiles set profile_version = ${PROFILE_VERSION - 1}, version_id = null,
      computed_at = now() - interval '3 days', seen_seq = 1 where deck_id = ${deck.id}::uuid`);
    const marksOf = async () => (await rows<{ at: string; seq: number }>(sql`
      select computed_at::text as at, seen_seq::int as seq from deck_profiles where deck_id = ${deck.id}::uuid`))[0];
    const marksBefore = await marksOf();
    const { version: bumped } = await commitVersion(deck.id, null, undefined, undefined, process.env);
    const before = computes;
    await pinAnalysisToVersion(deck.id, USER, { versionId: bumped.id, list: listFingerprint(head) }, deps);
    const row = await storedRow(deck.id);
    check("a commit over this list's older-version reading rebuilds it and pins it",
      { computed: computes - before, v: row?.profile_version, pin: row?.version_id },
      { computed: 1, v: PROFILE_VERSION, pin: bumped.id });
    check("and keeps the analysis date and the notice mark it replaced", await marksOf(), marksBefore);

    // A PRESS LANDING WHILE THAT REBUILD COMPUTES (review round 4): the press writes the current
    // version, and the rebuild finishing after it must not put the old marks and date back.
    await fixture.execute(sql`update deck_profiles set profile_version = ${PROFILE_VERSION - 1}, version_id = null,
      computed_at = now() - interval '3 days', seen_seq = 1 where deck_id = ${deck.id}::uuid`);
    const { version: racedCommit } = await commitVersion(deck.id, null, undefined, undefined, process.env);
    const pressFirst: StoredProfileDeps = {
      generation: deps.generation,
      compute: async (id, user) => {
        const built = await loadDeckProfile(id, user);
        await computeAndStoreProfile(deck.id, USER, deps);
        return built;
      },
    };
    const pressed = await marksOf();
    await pinAnalysisToVersion(deck.id, USER, { versionId: racedCommit.id, list: listFingerprint(head) }, pressFirst);
    const afterRace = await marksOf();
    check("a press landing mid-rebuild keeps its own date and mark",
      { stale: afterRace.at === pressed.at, seq: afterRace.seq === 1 },
      { stale: false, seq: false });

    // AND THE LOSING REBUILD ANSWERS WITH THE PRESS (review round 5). A quiet rebuild raced the
    // same way returns what the store holds, never the computation its guard threw away: the date
    // it hands back is the stored one, not one minted after the press.
    await fixture.execute(sql`update deck_profiles set profile_version = ${PROFILE_VERSION - 1},
      computed_at = now() - interval '3 days', seen_seq = 1, dirty = false where deck_id = ${deck.id}::uuid`);
    const answered = await readStoredReading(deck.id, USER, pressFirst);
    const storedAt = (await marksOf()).at;
    check("a rebuild that lost to a press answers with the stored reading",
      answered ? Math.abs(new Date(answered.analyzedAt).getTime() - new Date(`${storedAt}Z`).getTime()) < 5 : "none",
      true);

    // AN EDIT AWAY AND BACK WHILE A REBUILD COMPUTES (review round 7): the list matches again, so
    // only `dirty` records it, and the rebuild must not clear it.
    await fixture.execute(sql`update deck_profiles set profile_version = ${PROFILE_VERSION - 1}, dirty = false
      where deck_id = ${deck.id}::uuid`);
    const editFirst: StoredProfileDeps = {
      generation: deps.generation,
      compute: async (id, user) => {
        const built = await loadDeckProfile(id, user);
        await db.transaction((tx) => touchDeck(tx, deck.id));
        return built;
      },
    };
    const answeredStale = await readStoredReading(deck.id, USER, editFirst);
    check("an edit landing mid-rebuild leaves the reading dirty", (await storedRow(deck.id))?.dirty, true);
    check("and the rebuild's own answer says stale, as the row does", answeredStale?.fresh, false);

    // A REBUILD THAT ARRIVES TO A CURRENT ROW (round 11): a press wrote this version after the
    // reader's read, so the rebuild changes nothing, its stale pin included.
    await computeAndStoreProfile(deck.id, USER, deps);
    const pinBefore = (await storedRow(deck.id))?.version_id ?? null;
    const beforeLate = computes;
    await computeAndStoreProfile(deck.id, USER, deps, {
      rebuildOf: { list: listFingerprint(head), versionId: version.id, versionNumber: 1,
        marks: { seenSeq: 0, rulesVersion: 1, analyzedOracleIds: [] } },
    });
    check("a rebuild arriving to a current row changes nothing",
      { computed: computes - beforeLate, pin: (await storedRow(deck.id))?.version_id ?? null },
      { computed: 0, pin: pinBefore });
    await computeAndStoreProfile(deck.id, USER, deps);

    // A ROW A NEWER DEPLOYMENT WROTE (review round 8, REBUILD RULES 1): older code neither reads,
    // rebuilds nor pins it, so a rolling deploy never downgrades it.
    await fixture.execute(sql`update deck_profiles set profile_version = ${PROFILE_VERSION + 1}, version_id = null
      where deck_id = ${deck.id}::uuid`);
    const beforeNewer = computes;
    const newerRead = await readStoredReading(deck.id, USER, deps);
    const { version: newerCommit } = await commitVersion(deck.id, null, undefined, undefined, process.env);
    await pinAnalysisToVersion(deck.id, USER, { versionId: newerCommit.id, list: listFingerprint(head) }, deps);
    const newerRow = await storedRow(deck.id);
    check("a newer deployment's row is not read, rebuilt or pinned by older code",
      { read: newerRead, computed: computes - beforeNewer, v: newerRow?.profile_version, pin: newerRow?.version_id },
      { read: null, computed: 0, v: PROFILE_VERSION + 1, pin: null });
    await computeAndStoreProfile(deck.id, USER, deps);

    // THE LEGACY FORM of the same case: a row written before 0054 stores `profileFingerprint`, so a
    // raw comparison with the commit's list misreads it as another list (review round 1).
    await fixture.execute(sql`update deck_profiles set profile_version = 0, version_id = null,
      fingerprint = ${profileFingerprint(legacyHeadOf())} where deck_id = ${deck.id}::uuid`);
    const { version: legacyCommit } = await commitVersion(deck.id, null, undefined, undefined, process.env);
    const beforeLegacy = computes;
    await pinAnalysisToVersion(deck.id, USER, { versionId: legacyCommit.id, list: listFingerprint(head) }, deps);
    const legacyRow = await storedRow(deck.id);
    check("and so does a commit over a legacy reading of this list",
      { computed: computes - beforeLegacy, v: legacyRow?.profile_version, pin: legacyRow?.version_id },
      { computed: 1, v: PROFILE_VERSION, pin: legacyCommit.id });
  }

  // 10d · ONLY THE NEWEST VERSION IS PINNED: an older commit's `after()` pin landing last is refused.
  const { version: v2 } = await commitVersion(deck.id, null, undefined, undefined, process.env);
  await pinAnalysisToVersion(deck.id, USER, { versionId: v2.id, list: listFingerprint(head) }, deps);
  await pinAnalysisToVersion(deck.id, USER, { versionId: version.id, list: listFingerprint(head) }, deps);
  check("an older version's pin landing last does not replace the newer one", (await storedRow(deck.id))?.version_id, v2.id);

  // 10e · A PRESS NAMES ITS VERSION when the draft is the newest version (C2's amendment). The
  // commit's `after()` pin is taken as failed (version_id null), and a press repairs it, from the
  // store, with the version's number for the date line.
  await fixture.execute(sql`update deck_profiles set version_id = null, dirty = true where deck_id = ${deck.id}::uuid`);
  const before10e = computes;
  const named = await computeAndStoreProfile(deck.id, USER, deps);
  check("a press on the newest version's own list names that version",
    named?.kind === "ok" && { id: named.reading.versionId, n: named.reading.versionNumber },
    { id: v2.id, n: v2.number });
  check("and wrote it, from the store", { pin: (await storedRow(deck.id))?.version_id, computed: computes - before10e }, { pin: v2.id, computed: 0 });
  check("the stored reading reads its number back", (await readStoredReading(deck.id, USER, deps))?.versionNumber, v2.number);

  // 10f · A SAME-LIST COMMIT LANDING WHILE A PRESS BUILDS. The press saw v2 as the newest and
  // holding the list; a commit mid-build makes v3 the newest of the same list. The write re-checks
  // in its own snapshot and stores the reading unpinned rather than naming v2.
  {
    await fixture.execute(sql`update deck_profiles set profile_version = ${PROFILE_VERSION - 1}, version_id = null
      where deck_id = ${deck.id}::uuid`);
    let v3: { id: string } | null = null;
    const racing: StoredProfileDeps = {
      generation: deps.generation,
      compute: async (id, user) => {
        const built = await loadDeckProfile(id, user);
        v3 = (await commitVersion(deck.id, null, undefined, undefined, process.env)).version;
        return built;
      },
    };
    const raced = await computeAndStoreProfile(deck.id, USER, racing);
    check("a commit landing mid-build leaves the reading unpinned",
      { pin: (await storedRow(deck.id))?.version_id ?? null, answered: raced?.kind === "ok" ? raced.reading.versionId : "none" },
      { pin: null, answered: null });
    check("and the commit it raced did land", v3 !== null, true);
  }

  // 10g · THE PIN TAKES THE COMMIT'S LOCK. A commit holding the deck row (as `commitVersion` does)
  // makes the pin WAIT, and once it commits the pin reads the version it wrote: pinning the version
  // that was newest before is refused. A snapshot older than the lock would pin it.
  {
    const [held] = await rows<{ id: string; stamp: string; fp: string }>(sql`
      select (select id from deck_versions where deck_id = ${deck.id}::uuid order by number desc limit 1) as id,
        d.last_edited_at::text as stamp, p.fingerprint as fp
      from decks d join deck_profiles p on p.deck_id = d.id where d.id = ${deck.id}::uuid`);
    let waited = false;
    let pinnedOld: boolean | null = null;
    await fixture.transaction(async (tx) => {
      await commitVersion(deck.id, null, tx as never, undefined, process.env);
      const pin = clearDirty(deck.id, held.fp, held.stamp, held.id, isNewestVersion(deck.id, held.id))
        .then((r) => (pinnedOld = r));
      await new Promise((r) => setTimeout(r, 1500));
      waited = pinnedOld === null;
      void pin;
    });
    for (let i = 0; i < 50 && pinnedOld === null; i += 1) await new Promise((r) => setTimeout(r, 100));
    check("a pin waits on a commit holding the deck", waited, true);
    check("and then refuses the version that commit superseded", pinnedOld, false);
  }

  // 11 · A result that no longer describes the deck is not stored. The deck is edited between this
  // build and its write, as an older press would see it, and the row must keep what it held.
  {
    await edit(deck.id, sql`update deck_cards set oracle_id = ${spareB.oracle_id}::uuid
      where deck_id = ${deck.id}::uuid and oracle_id = ${body[1].oracle_id}::uuid`);
    const before = await storedRow(deck.id);
    const late: StoredProfileDeps = {
      generation: deps.generation,
      compute: async (id, user) => {
        const built = await loadDeckProfile(id, user);
        await fixture.execute(sql`update deck_cards set oracle_id = ${body[1].oracle_id}::uuid
          where deck_id = ${deck.id}::uuid and oracle_id = ${spareB.oracle_id}::uuid`);
        return built;
      },
    };
    await computeAndStoreProfile(deck.id, USER, late);
    const after = await storedRow(deck.id);
    // What the write would CHANGE, not the fingerprint: the writer stores the head's list, which
    // the late edit has put back, so a stale write lands with the same fingerprint it replaced.
    check("a result overtaken by an edit is not written over the row",
      after && { dirty: after.dirty, at: after.computed_at },
      before && { dirty: before.dirty, at: before.computed_at });
  }

  // 12 · The check constraint.
  try {
    await fixture.execute(sql`
      update deck_profiles set permits = array[0, 6] where deck_id = ${deck.id}::uuid`);
    fail("the permits check constraint", "a permits array of [0, 6] was accepted");
  } catch {
    check("the permits check constraint refuses [0, 6]", true, true);
  }

  // 13 · Deleting the deck deletes the row.
  await fixture.execute(sql`delete from decks where id = ${deck.id}::uuid`);
  check("deleting the deck deletes its stored analysis", await storedRow(deck.id), null);
}

async function main() {
  let thrown: unknown = null;
  try {
    await run();
  } catch (error) {
    thrown = error;
  } finally {
    await fixture.execute(sql`delete from decks where user_id = ${USER}`);
    await pool.end();
  }
  // Reported AFTER the `finally`, never from inside it: an exit there swallows the throw and
  // prints a pass over a case that never ran.
  if (thrown) {
    console.error(thrown);
    process.exit(1);
  }
  console.log(failures ? `\n${failures} check(s) failed.` : "\nAll checks passed.");
  process.exit(failures ? 1 : 0);
}

void main();
