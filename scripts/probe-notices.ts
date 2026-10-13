// probe:notices — the deck notices READ and H1's recompute, against a real Postgres.
//
// `touches`, the group order and the rules violations are pure and unit-tested. What only a
// database can answer: whether the read's SQL (`<@` against the analyzed list, the rules window)
// hands `touches` the right rows, whether a press on an unchanged list really recomputes when an
// entry touches the reading and really does not when none does, whether a commit's pin keeps the
// held reading, and whether the overview's data-moved check (plan D11) counts only entries that
// touch this deck.
//
// It builds its own whole deck under a per-run `user_id`, plants the log entries it needs, and
// deletes both in a `finally` (the entries by their exact sequence numbers). It refuses the staging
// and production branches. Point it at `local-dev` or a scratch branch, NEVER production.
//
//   pnpm probe:notices
//
// Mutations run against it, each failing it:
//   - the read's `<@` reduced to `&&` (overlap): the half-held combo is reported;
//   - H1's cache bypass removed (`computeFresh` never called): "the recompute went past the cache";
//   - the press-only guard removed: the commit's pin recomputes;
//   - `overviewDataMoved` answering from the marks alone: the unrelated-deck case reads stale;
//   - a changed-list press taking the cache again: "a press on a changed list computes fresh";
//   - the overview's reuse ignoring the data check: "Write a new overview writes one".
import "./lib/env.mjs";
// The notices switch (src/lib/notices/flag.ts) gates H1 and D11; this probe proves them ON, and
// case 13 turns it off once to prove the switch does.
process.env.NOTICES_ENABLED = "true";
import { Pool } from "@neondatabase/serverless";
import { eq, sql } from "drizzle-orm";

import { db } from "../src/db";
import { decks } from "../src/db/schema";
import { readCatalogGeneration } from "../src/lib/cache/catalog-generation";
import { commitVersion } from "../src/lib/decks/versions";
import { markNoticesRead } from "../src/lib/notices/mark";
import { loadDeckNotices } from "../src/lib/notices/read";
import { noticeSummarySql } from "../src/lib/notices/summary-sql";
import { listFingerprint, profileFingerprint } from "../src/lib/profile/fingerprint";
import { loadDeckProfile, readProfileHead } from "../src/lib/profile/load";
import { computeAndStoreProfile, type StoredProfileDeps } from "../src/lib/profile/stored";
import { overviewDataMoved } from "../src/lib/notices/overview";
import { readSynopsisState } from "../src/lib/synopsis/read";
import { writeSynopsisFor, type GenerateDeps } from "../src/lib/synopsis/generate";
import { STUB_MODEL, stubReply } from "../src/lib/synopsis/stub";
// No signed-in reader here: every switch read takes the environment itself (`process.env`).

const STAGING_BRANCH = "br-polished-pond-a6e63y0b";
const PRODUCTION_BRANCH = "br-noisy-violet-a6vw4ess";
const USER = `probe-notices-${Date.now()}`;

let failures = 0;
const check = (label: string, actual: unknown, expected: unknown) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  const ok = a === e;
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} — got ${a}, expected ${e}`);
};
const rows = async <T>(q: ReturnType<typeof sql>): Promise<T[]> => (await db.execute(q)).rows as T[];

/** The fixture deck's id, for `agree`. */
let fixtureDeck = "";
let computes = 0;
let freshComputes = 0;
const deps: StoredProfileDeps = {
  generation: readCatalogGeneration,
  compute: async (d, u) => { computes += 1; return loadDeckProfile(d, u, process.env); },
  computeFresh: async (d, u) => { freshComputes += 1; return loadDeckProfile(d, u, process.env); },
  env: process.env,
};

const planted: number[] = [];
const plant = async (kind: string, oracleIds: string[], detail: Record<string, unknown> = {}, direction = "added") => {
  const [r] = await rows<{ seq: string }>(sql`
    insert into deck_data_changes (kind, direction, oracle_ids, detail)
    values (${kind}, ${direction}, ${`{${oracleIds.join(",")}}`}::uuid[], ${JSON.stringify(detail)}::jsonb)
    returning seq`);
  planted.push(Number(r.seq));
  return Number(r.seq);
};

const reading = async (deckId: string) => (await rows<{ seen: string; rules: number; at: string }>(sql`
  select seen_seq as seen, rules_version as rules, computed_at::text as at
  from deck_profiles where deck_id = ${deckId}::uuid`))[0];

async function run() {
  const [{ branch }] = await rows<{ branch: string | null }>(sql`select current_setting('neon.branch_id', true) as branch`);
  if (!branch || branch === STAGING_BRANCH || branch === PRODUCTION_BRANCH || process.env.VERCEL_ENV === "production") {
    throw new Error(`probe:notices writes fixtures and refuses branch ${branch ?? "(unknown)"}.`);
  }

  // A mono-green legend and 99 legal green-or-colorless non-land cards, so the fixture starts with
  // no rules violation; plus spares outside the deck, and a card that is NOT legal in Commander.
  const [legend] = await rows<{ oracle_id: string }>(sql`
    select oracle_id from cards
    where type_line ilike '%Legendary Creature%' and color_identity = '{G}' and commander_legal
    order by oracle_id limit 1`);
  const pool = await rows<{ oracle_id: string }>(sql`
    select oracle_id from cards
    where type_line not ilike '%Land%' and commander_legal and color_identity <@ '{G}'::text[]
      and oracle_id <> ${legend.oracle_id}::uuid
    order by oracle_id limit 101`);
  const [banned] = await rows<{ oracle_id: string }>(sql`
    select oracle_id from cards
    where not commander_legal
      -- Inside the legend's colors, so the card breaks ONE rule: an off-identity ban is listed in
      -- both groups, which is right and is not what this case counts.
      and color_identity <@ (select color_identity from cards where oracle_id = ${legend.oracle_id}::uuid)
    order by oracle_id limit 1`);
  if (!legend || pool.length < 101 || !banned) throw new Error("the catalog cannot build the fixture");
  const body = pool.slice(0, 99).map((c) => c.oracle_id);
  const [spare, outsider] = pool.slice(99).map((c) => c.oracle_id);

  const [deck] = await rows<{ id: string }>(sql`
    insert into decks (user_id, name, commander_oracle_id)
    values (${USER}, 'probe notices', ${legend.oracle_id}::uuid) returning id`);
  fixtureDeck = deck.id;
  await db.execute(sql`insert into deck_cards (deck_id, oracle_id, quantity) values ${sql.join(
    body.map((id) => sql`(${deck.id}::uuid, ${id}::uuid, 1)`), sql`, `)}`);

  // 1 · A deck never analyzed has no data notices, and no violations to start with.
  const before = await loadDeckNotices(deck.id, USER, process.env);
  check("1 · no reading, no data notices", before && { data: before.dataCount, v: before.violationCount }, { data: 0, v: 0 });
  await agree("no reading");

  const analyzed = await computeAndStoreProfile(deck.id, USER, deps);
  check("1 · the fixture analyzes", analyzed?.kind, "ok");

  // 2 · Which entries reach the deck.
  const gc = await plant("gameChanger", [body[0]]);
  await plant("gameChanger", [outsider]);
  await plant("combo", [body[1], outsider].sort(), { variantId: "probe-half", produces: ["Infinite mana"] });
  await plant("combo", [body[1], body[2]].sort(), { variantId: "probe-cmd-99", produces: ["Infinite mana"], mustBeCommander: [body[1]] });
  const combo = await plant("combo", [legend.oracle_id, body[3]].sort(), {
    variantId: "probe-cmd", produces: ["Infinite mana"], mustBeCommander: [legend.oracle_id],
  });
  const seen = await loadDeckNotices(deck.id, USER, process.env);
  check("2 · only the held Game Changer and the commander-led combo reach the deck",
    seen?.groups.map((g) => [g.group, g.items.map((i) => (i.kind === "data" ? i.seq : -1))]),
    [["gameChangers", [gc]], ["twoCardCombos", [combo]]]);
  check("2 · both unread", seen && { count: seen.dataCount, unread: seen.dataUnread }, { count: 2, unread: 2 });
  // Every card a notice names previews art: this fixture user owns no copies, so it is the catalog's (`chainArt` named ids only).
  const named = [...new Set((seen?.groups ?? []).flatMap((g) => g.items.flatMap((i) => (i.kind === "data" ? i.cards : [i.card]))).map((c) => c.oracleId))];
  const catalogArt = new Map((await rows<{ oracle_id: string; image_uri: string | null }>(sql`select oracle_id, image_uri from cards where oracle_id in (${sql.join(named.map((id) => sql`${id}::uuid`), sql`, `)})`)).map((r) => [r.oracle_id, r.image_uri] as const));
  check("2 · every named card carries the art the catalog holds", (seen?.groups ?? []).flatMap((g) => g.items.flatMap((i) => (i.kind === "data" ? i.cards : [i.card]))).map((c) => [c.oracleId, c.imageUri]).sort(), named.map((id) => [id, catalogArt.get(id) ?? null]).sort());
  await agree("unread 2");

  // 3 · A card added AFTER the analysis is the dirty flag's to report, not this read's.
  await db.execute(sql`insert into deck_cards (deck_id, oracle_id, quantity) values (${deck.id}::uuid, ${spare}::uuid, 1)`);
  await plant("gameChanger", [spare]);
  check("3 · a card added since the analysis is not reported", (await loadDeckNotices(deck.id, USER, process.env))?.dataCount, 2);
  check("3 · and the reading reads stale, so the foot sends the player to the tab", (await loadDeckNotices(deck.id, USER, process.env))?.readingStale, true);
  await agree("a card added since");
  await db.execute(sql`delete from deck_cards where deck_id = ${deck.id}::uuid and oracle_id = ${spare}::uuid`);

  // 4 · Opening quiets them (the mark PR 6's action moves), and a new entry brings the dot back.
  await db.execute(sql`update deck_profiles set notices_read_seq = ${seen!.readMarks.seq} where deck_id = ${deck.id}::uuid`);
  check("4 · read: still listed, none unread", await loadDeckNotices(deck.id, USER, process.env).then((n) => n && [n.dataCount, n.dataUnread]), [2, 0]);
  await agree("read data");
  await plant("extraTurns", [body[4]]);
  check("4 · a new entry is unread again", await loadDeckNotices(deck.id, USER, process.env).then((n) => n && [n.dataCount, n.dataUnread]), [3, 1]);
  await agree("unread 1");

  // 5 · H1: a press on the unchanged list RECOMPUTES, past the cache, and clears them.
  const at0 = (await reading(deck.id)).at;
  computes = 0; freshComputes = 0;
  await computeAndStoreProfile(deck.id, USER, deps);
  const r5 = await reading(deck.id);
  check("5 · the recompute went past the cache", { computes, freshComputes }, { computes: 0, freshComputes: 1 });
  check("5 · the mark moved past every entry", Number(r5.seen) >= Math.max(...planted), true);
  check("5 · and the reading is fresh again", (await loadDeckNotices(deck.id, USER, process.env))?.readingStale, false);
  check("5 · the analysis date moved", r5.at !== at0, true);
  check("5 · and the notices cleared", (await loadDeckNotices(deck.id, USER, process.env))?.dataCount, 0);

  // 6 · With nothing pending, a press answers from the store, as ruling 5 always did.
  computes = 0; freshComputes = 0;
  await computeAndStoreProfile(deck.id, USER, deps);
  check("6 · nothing pending: no compute, same date", { computes, freshComputes, at: (await reading(deck.id)).at },
    { computes: 0, freshComputes: 0, at: r5.at });

  // 7 · A commit's pin keeps the held reading even with an entry pending (H1 is a press only).
  const pending = await plant("gameChanger", [body[5]], {}, "removed");
  const { version } = await commitVersion(deck.id, null, undefined, undefined, process.env);
  const head = await db.transaction((tx) => readProfileHead(tx, deck.id, USER));
  computes = 0; freshComputes = 0;
  await computeAndStoreProfile(deck.id, USER, deps, { pinTo: { versionId: version.id, list: listFingerprint(head!) } });
  check("7 · the pin computed nothing", { computes, freshComputes }, { computes: 0, freshComputes: 0 });
  check("7 · and the entry is still pending", (await loadDeckNotices(deck.id, USER, process.env))?.groups.flatMap((g) => g.items)
    .map((i) => (i.kind === "data" ? i.seq : -1)), [pending]);

  // 8 · A rules entry touches a reading computed under an older version, and the recompute clears it.
  await computeAndStoreProfile(deck.id, USER, deps);
  await db.execute(sql`update deck_profiles set rules_version = 0 where deck_id = ${deck.id}::uuid`);
  const rules = await plant("rules", [], { rulesVersion: "1", rule: "Probe rule", reads: "what it reads" }, "moved");
  const n8 = await loadDeckNotices(deck.id, USER, process.env);
  check("8 · the rules entry is listed, last", n8?.groups.map((g) => g.group), ["rules"]);
  check("8 · with its words", n8?.groups[0]?.items[0]?.kind === "data" && n8.groups[0].items[0].detail, { rule: "Probe rule", reads: "what it reads" });
  await agree("a rules entry above the reading's version");
  await computeAndStoreProfile(deck.id, USER, deps);
  check("8 · re-analyzing clears it", { rules: (await reading(deck.id)).rules, count: (await loadDeckNotices(deck.id, USER, process.env))?.dataCount },
    { rules: 1, count: 0 });
  void rules;

  // 9 · Violations are live: a banned card in the deck is listed until it leaves; reading it does
  //     not clear it, and the read state is the SET the player saw (F11).
  await db.execute(sql`insert into deck_cards (deck_id, oracle_id, quantity) values (${deck.id}::uuid, ${banned.oracle_id}::uuid, 1)`);
  const n9 = await loadDeckNotices(deck.id, USER, process.env);
  check("9 · a banned card is listed first, unread", n9 && [n9.groups[0]?.group, n9.violationCount, n9.violationsUnread], ["notLegal", 1, true]);
  await agree("notLegalUnread");
  // The real mark, the one opening the sheet writes.
  await markNoticesRead(deck.id, USER, n9!.readMarks);
  const n9r = await loadDeckNotices(deck.id, USER, process.env);
  check("9 · reading quiets it and keeps it listed", n9r && [n9r.violationCount, n9r.violationsUnread], [1, false]);
  await agree("notLegalRead");
  // Both kinds at once (the tile marker addendum, F20): the summary keeps the legality kind and
  // carries the unread data count beside it, which the tile's tooltip and spoken name both use.
  const both = await plant("gameChanger", [body[0]]);
  const n9b = await loadDeckNotices(deck.id, USER, process.env);
  check("9 · with data pending too, the sheet reads both", n9b && [n9b.violationCount > 0, n9b.dataUnread > 0], [true, true]);
  await agree("notLegalRead, with data");
  await db.execute(sql`delete from deck_data_changes where seq = ${both}`);
  await db.execute(sql`delete from deck_cards where deck_id = ${deck.id}::uuid and oracle_id = ${banned.oracle_id}::uuid`);
  check("9 · the card leaving clears it", (await loadDeckNotices(deck.id, USER, process.env))?.violationCount, 0);
  await agree("none");

  // 10 · The overview's data-moved check (plan D11) counts only entries touching THIS deck.
  const deckIds = { analyzed: [legend.oracle_id, ...body], commanders: [legend.oracle_id] };
  check("10 · an entry about this deck in the window moves it", await overviewDataMoved(gc - 1, Math.max(...planted), deckIds), true);
  const other = await plant("gameChanger", [outsider]);
  check("10 · entries about other cards alone do not", await overviewDataMoved(other - 1, other, deckIds), false);
  check("10 · nor does an empty window", await overviewDataMoved(other, other, deckIds), false);

  // 11 · EVERY press computes past the cache, not only a same-list one. The cache key carries
  //      neither the log head nor the rules version, so a press on a list analyzed before an entry
  //      (edit away, edit back) would otherwise store the old answer under the new marks.
  await db.execute(sql`update deck_cards set quantity = quantity where deck_id = ${deck.id}::uuid`);
  await db.execute(sql`update deck_profiles set fingerprint = 'probe-other-list' where deck_id = ${deck.id}::uuid`);
  computes = 0; freshComputes = 0;
  await computeAndStoreProfile(deck.id, USER, deps);
  check("11 · a press on a changed list computes fresh", { computes, freshComputes }, { computes: 0, freshComputes: 1 });

  // 12 · The overview's WRITE side (D11). A notice-driven re-analysis marks the overview stale, and
  //      its *Write a new overview* writes one rather than handing back the one it marked. The
  //      model is the stub the dev server uses, so nothing is spent.
  const generate: GenerateDeps = {
    modelName: STUB_MODEL,
    model: async (req, facts) => stubReply(facts, "survived", false, !!req.v2),
    now: () => new Date(),
    profile: deps,
  };
  const overview = async () => (await readSynopsisState(deck.id, USER, deps, undefined, process.env))!;
  check("12 · the first overview is written", (await writeSynopsisFor(deck.id, USER, generate, process.env)).kind, "written");
  await plant("gameChanger", [body[6]]);
  await computeAndStoreProfile(deck.id, USER, deps);
  const s12 = await overview();
  check("12 · the re-analysis marks it stale, and a press would write", [s12.stale, s12.wouldSpend], [true, true]);
  check("12 · Write a new overview writes one", (await writeSynopsisFor(deck.id, USER, generate, process.env)).kind, "written");
  check("12 · which is current", (await overview()).stale, false);

  // 13 · A ban moves the reading too (H1): the stored profile carries `legality.banned`. It is never
  //      LISTED as data (the live legality read names the card), but a press recomputes past it.
  const ban = await plant("notLegal", [body[8]]);
  const listed = (await loadDeckNotices(deck.id, USER, process.env))?.groups.flatMap((g) => g.items)
    .some((i) => i.kind === "data" && i.seq === ban);
  check("13 · a ban entry is not listed as data", listed, false);
  computes = 0; freshComputes = 0;
  await computeAndStoreProfile(deck.id, USER, deps);
  check("13 · but a press on the unchanged list recomputes past it", { computes, freshComputes }, { computes: 0, freshComputes: 1 });
  // With the switch off, H1 is not there: a press over a new entry answers from the store (ruling 5).
  await plant("gameChanger", [body[7]]);
  process.env.NOTICES_ENABLED = "false";
  computes = 0; freshComputes = 0;
  await computeAndStoreProfile(deck.id, USER, deps);
  check("13 · with notices switched off, the press keeps ruling 5", freshComputes, 0);
  process.env.NOTICES_ENABLED = "true";
  // ...and the overview written from the reading before the ban describes a deck that is no longer
  // there (D11 by H1's rule), while a ban on a card this deck does not hold moves nothing.
  check("13 · which marks the overview stale", (await overview()).stale, true);
  const otherBan = await plant("notLegal", [outsider]);
  check("13 · a ban on another card does not move it", await overviewDataMoved(otherBan - 1, otherBan, deckIds), false);

  // 14 · The foot reads freshness by the stored reading's own rule (`sameList`): a row written
  //      before migration 0054 stores `profileFingerprint`, and over an unchanged, clean list the
  //      Analysis tab reads it fresh, so Notices must not send the player there as though it were
  //      stale.
  await computeAndStoreProfile(deck.id, USER, deps);
  const head14 = (await db.transaction((tx) => readProfileHead(tx, deck.id, USER)))!;
  await db.execute(sql`update deck_profiles set profile_version = 0, dirty = false,
    fingerprint = ${profileFingerprint(head14)} where deck_id = ${deck.id}::uuid`);
  check("14 · a pre-0054 reading over an unchanged list reads fresh in Notices", (await loadDeckNotices(deck.id, USER, process.env))?.readingStale, false);
  await db.execute(sql`update deck_profiles set fingerprint = 'probe-other-list' where deck_id = ${deck.id}::uuid`);
  check("14 · and stale once its list is another", (await loadDeckNotices(deck.id, USER, process.env))?.readingStale, true);

  // 15 · The legality mark is written only while it is still the deck's set. An open that read the
  //      banned card, finishing after the card left (and after a later open marked the empty set),
  //      must not write its older set back: the dot would return over a set already seen.
  const legalSeen = async () => (await db.select({ s: decks.noticesLegalSeen }).from(decks).where(eq(decks.id, deck.id)))[0]?.s ?? [];
  await db.execute(sql`insert into deck_cards (deck_id, oracle_id, quantity) values (${deck.id}::uuid, ${banned.oracle_id}::uuid, 1)`);
  const early = (await loadDeckNotices(deck.id, USER, process.env))!.readMarks;
  await db.execute(sql`delete from deck_cards where deck_id = ${deck.id}::uuid and oracle_id = ${banned.oracle_id}::uuid`);
  const later = (await loadDeckNotices(deck.id, USER, process.env))!.readMarks;
  check("15 · the later open records its set", await markNoticesRead(deck.id, USER, later), true);
  check("15 · the late open says it recorded nothing", await markNoticesRead(deck.id, USER, early), false);
  check("15 · a late open's older legality set is not written back", await legalSeen(), []);
  check("15 · and the deck reads quiet", (await loadDeckNotices(deck.id, USER, process.env))?.violationsUnread, false);
  await db.execute(sql`insert into deck_cards (deck_id, oracle_id, quantity) values (${deck.id}::uuid, ${banned.oracle_id}::uuid, 1)`);
  await markNoticesRead(deck.id, USER, (await loadDeckNotices(deck.id, USER, process.env))!.readMarks);
  check("15 · a mark of the deck's own set is written", await legalSeen(), [banned.oracle_id]);
  await db.execute(sql`delete from deck_cards where deck_id = ${deck.id}::uuid and oracle_id = ${banned.oracle_id}::uuid`);

  // 16 · The check before the overview (HANDOFF §6, plan D10): with a card that is not legal in the
  //      deck, the write refuses BEFORE its reservation, so no run row is written and no call is
  //      recorded; the read says so (`illegal`, nothing would spend); the saved overview stays.
  const runs = async () => (await rows<{ n: number }>(sql`
    select (select count(*) from deck_synopses where deck_id = ${deck.id}::uuid)::int
         + (select count(*) from model_calls where user_id = ${USER})::int as n`))[0].n;
  await db.execute(sql`insert into deck_cards (deck_id, oracle_id, quantity) values (${deck.id}::uuid, ${banned.oracle_id}::uuid, 1)`);
  const before14 = await runs();
  check("16 · the write refuses as illegal", (await writeSynopsisFor(deck.id, USER, generate, process.env)).kind, "illegal");
  check("16 · and writes no run and records no call", await runs(), before14);
  const s14 = await overview();
  check("16 · the read says illegal, keeps the saved overview, and would spend nothing", [s14.illegal, s14.synopsis !== null, s14.wouldSpend], [true, true, false]);
  process.env.NOTICES_ENABLED = "false";
  check("16 · with notices switched off, the read does not say illegal", (await overview()).illegal, false);
  process.env.NOTICES_ENABLED = "true";
  await db.execute(sql`delete from deck_cards where deck_id = ${deck.id}::uuid and oracle_id = ${banned.oracle_id}::uuid`);
  check("16 · the card leaving lifts the check", (await overview()).illegal, false);

  // 17 · The check is made AGAIN under the deck row's lock, inside the reservation's transaction: a
  //      card that lands after the first check and before the reservation still refuses the write.
  //      Two connections, because a lock is invisible in every value the write returns: a second
  //      one holds the deck row, the write passes its first check and waits on the lock, and the
  //      holder adds the banned card and commits while it waits.
  await computeAndStoreProfile(deck.id, USER, deps);
  await db.execute(sql`delete from deck_synopses where deck_id = ${deck.id}::uuid`);
  const lockPool = new Pool({ connectionString: process.env.DATABASE_URL });
  const holder = await lockPool.connect();
  try {
    await holder.query("begin");
    await holder.query("select 1 from decks where id = $1 for update", [deck.id]);
    const before17 = await runs();
    const racing = writeSynopsisFor(deck.id, USER, generate, process.env);
    let waiting = false;
    for (let i = 0; i < 100 && !waiting; i += 1) {
      const [w] = await rows<{ n: number }>(sql`select count(*)::int as n from pg_stat_activity
        where wait_event_type = 'Lock' and query ilike '%"decks"%for update%'`);
      waiting = w.n > 0;
      if (!waiting) await new Promise((r) => setTimeout(r, 100));
    }
    check("17 · the write waits on the deck row", waiting, true);
    await holder.query("insert into deck_cards (deck_id, oracle_id, quantity) values ($1, $2, 1)", [deck.id, banned.oracle_id]);
    await holder.query("commit");
    check("17 · a card landing while it waits still refuses the write", (await racing).kind, "illegal");
    check("17 · and it reserved nothing", await runs(), before17);
  } finally {
    await holder.query("rollback").catch(() => {});
    holder.release();
    await lockPool.end();
    await db.execute(sql`delete from deck_cards where deck_id = ${deck.id}::uuid and oracle_id = ${banned.oracle_id}::uuid`);
  }
}

/**
 * The tile's notice (`noticeSummarySql`, one correlated subquery for the whole list) against the
 * sheet's read (`loadDeckNotices`): the same two rules written twice, once in SQL and once in
 * TypeScript, so they are asserted to agree at every state this fixture passes through.
 */
async function agree(state: string) {
  const [row] = await db.select({ n: noticeSummarySql() }).from(decks).where(eq(decks.id, fixtureDeck));
  const d = await loadDeckNotices(fixtureDeck, USER, process.env);
  const expected = !d ? null : d.violationCount > 0
    ? { kind: d.violationsUnread ? "notLegalUnread" : "notLegalRead", count: d.readMarks.violations.length, dataUnread: d.dataUnread }
    : d.dataUnread > 0 ? { kind: "unread", count: d.dataUnread } : null;
  check(`summary · the tile agrees with the sheet (${state})`, row?.n ?? null, expected);
}

run()
  .catch((error) => {
    failures += 1;
    console.error(error);
  })
  .finally(async () => {
    // Each on its own, so one failing cannot skip the other. Decks cascade to their cards, their
    // reading and their versions.
    await db.execute(sql`delete from deck_data_changes where seq = any(${`{${planted.join(",")}}`}::bigint[])`)
      .catch((e) => { failures += 1; console.error("planted entries not deleted", e); });
    await db.execute(sql`delete from decks where user_id = ${USER}`)
      .catch((e) => { failures += 1; console.error("fixture deck not deleted", e); });
    // After the deck: its overviews reference these allowance units.
    await db.execute(sql`delete from model_calls where user_id = ${USER}`)
      .catch((e) => { failures += 1; console.error("allowance units not deleted", e); });
    console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
    process.exit(failures === 0 ? 0 : 1);
  });
