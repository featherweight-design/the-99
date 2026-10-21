// WHICH DECKS WANT THIS, drafts included (Hugh, 2026-10-20), proved against a real Postgres by calling the real
// `loadCardDetail`, the read card details draws "In your decks" from.
//
// The bug: Maddening Cacophony added to a DRAFT of a committed deck ("HD Tune - Mutant Menace") and in a brew
// ("HD - Horrors Test"); card details named only the brew. Claims read a committed deck's newest version, so a draft
// add claims nothing, rightly for who HOLDS a copy and wrongly for who WANTS it. `loadDraftWants` is the second read.
//
// Cases:
//   a  the repro: the brew is a claim (`wants 1`), the committed deck is a draft want, and neither list names the
//      other's deck
//   b  a card in the committed deck's version AND its draft is a claim and not a draft want: no deck twice
//   c  a card the version lists and the draft removed is still a claim (still sleeved) and not a draft want
//   d  a draft add the deck PRINTS (a proxy) is not a draft want, as it is not a claim
//   e  a draft whose live commander moved to the card wants it; the version's commander is a claim, not a want
//   f  a basic land added in a draft is not a draft want, as basics are never claims
//   g  another player's committed deck with the card in its draft is never named
//   h  a card the reader owns NONE of still names every deck that wants it (d9 follow-up, 2026-10-21): the brew and
//      the committed version from `unownedAvailability`, the draft add from `draftWants`, and `availability` stays
//      unset, because every other reader takes it to mean the collection holds the card
//   i  an unowned card no deck wants reads as wanted by nobody, so card details draws no block
//
// It writes under two per-run `user_id`s and purges both in a `finally`, after the branch guard: `PROBE_DB_BRANCH`
// must name the branch `DATABASE_URL` reports, and staging and production are refused by id. Point it at a scratch
// branch made from local-dev.
//
//   PROBE_DB_BRANCH=br-… pnpm probe:draft-wants
import { requireEnv } from "./lib/env.mjs";
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { sql } from "drizzle-orm";

import { loadCardDetail } from "../src/lib/collection/card-detail";
import { loadDraftWants } from "../src/lib/decks/draft-wants";
import { purgeAccount } from "../src/lib/account/purge";

const STAGING_BRANCH = "br-polished-pond-a6e63y0b";
const PRODUCTION_BRANCH = "br-noisy-violet-a6vw4ess";

const { DATABASE_URL, PROBE_DB_BRANCH } = requireEnv(["DATABASE_URL", "PROBE_DB_BRANCH"]);
const pool = new Pool({ connectionString: DATABASE_URL });
const fixture = drizzle(pool);
const USER = `probe-draft-wants-${Date.now()}`;
const OTHER = `${USER}-other`;
// A script has no signed-in reader: it decides switches from the environment, saying so.
const ENV = process.env;
let failures = 0;
let guarded = false;

function check(label: string, actual: unknown, expected: unknown): boolean {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${ok ? "" : `: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`}`);
  if (!ok) failures += 1;
  return ok;
}
async function rows<T>(q: ReturnType<typeof sql>): Promise<T[]> {
  return (await fixture.execute(q)).rows as T[];
}

async function deck(user: string, name: string, commander: string): Promise<string> {
  const [{ id }] = await rows<{ id: string }>(sql`
    insert into decks (user_id, name, commander_oracle_id) values (${user}, ${name}, ${commander}) returning id`);
  return id;
}
async function draft(deckId: string, ...oracleIds: string[]) {
  for (const o of oracleIds) await fixture.execute(sql`insert into deck_cards (deck_id, oracle_id, quantity) values (${deckId}, ${o}, 1)`);
}
async function commit(deckId: string, commander: string, ...oracleIds: string[]) {
  const [{ id }] = await rows<{ id: string }>(sql`
    insert into deck_versions (deck_id, number, commander_oracle_id) values (${deckId}, 1, ${commander}) returning id`);
  for (const o of oracleIds) await fixture.execute(sql`insert into deck_version_cards (version_id, oracle_id, quantity) values (${id}, ${o}, 1)`);
}
async function own(oracleId: string, quantity = 1) {
  const [p] = await rows<{ set_code: string; collector_number: string }>(sql`
    select set_code, collector_number from printings where oracle_id = ${oracleId} limit 1`);
  await fixture.execute(sql`
    insert into collection_items (user_id, oracle_id, quantity, set_code, collector_number)
    values (${USER}, ${oracleId}, ${quantity}, ${p.set_code}, ${p.collector_number})`);
}
/** What card details draws: the claim rows' names, and the draft wants' names. */
async function receipt(oracleId: string) {
  const card = await loadCardDetail(USER, oracleId, undefined, ENV);
  return {
    claims: (card?.availability?.claims ?? []).map((c) => c.name),
    drafts: card?.draftWants === undefined ? "absent" : card.draftWants === null ? "failed" : card.draftWants.map((d) => d.name),
  };
}

async function run() {
  const [{ branch }] = await rows<{ branch: string | null }>(sql`select current_setting('neon.branch_id', true) as branch`);
  if (!branch || branch !== PROBE_DB_BRANCH || branch === STAGING_BRANCH || branch === PRODUCTION_BRANCH) {
    throw new Error(`refusing to run against ${branch}: this probe writes decks. Name the scratch branch DATABASE_URL reports as PROBE_DB_BRANCH.`);
  }
  console.log(`branch ${branch}`);
  guarded = true;

  const names = ["Maddening Cacophony", "Sol Ring", "Arcane Signet", "Swords to Plowshares", "Forest",
    "Atraxa, Praetors' Voice", "Kykar, Wind's Fury", "Rhystic Study", "Counterspell"];
  const ids = new Map((await rows<{ id: string; name: string }>(sql`
    select oracle_id::text id, name from cards where name in (${sql.join(names.map((n) => sql`${n}`), sql`, `)})`))
    .map((r) => [r.name, r.id]));
  const missing = names.filter((n) => !ids.has(n));
  if (missing.length) throw new Error(`catalog lacks ${missing.join(", ")}`);
  const id = (n: string) => ids.get(n)!;
  // RHYSTIC and COUNTERSPELL are never owned (h, i).
  const [CACOPHONY, SOL, SIGNET, SWORDS, FOREST, ATRAXA, KYKAR, RHYSTIC, COUNTERSPELL] = names.map(id);

  for (const o of [CACOPHONY, SOL, SIGNET, SWORDS, FOREST, KYKAR]) await own(o);

  // Mutant Menace: committed v1 lists Sol Ring and Arcane Signet. Its draft adds Cacophony (a), keeps Sol Ring (b),
  // drops Arcane Signet (c), adds Swords as a proxy (d) and a Forest (f).
  const menace = await deck(USER, "HD Tune - Mutant Menace", ATRAXA);
  await commit(menace, ATRAXA, SOL, SIGNET, RHYSTIC);
  await draft(menace, CACOPHONY, SOL, SWORDS, FOREST, RHYSTIC);
  await fixture.execute(sql`insert into deck_proxies (deck_id, oracle_id) values (${menace}, ${SWORDS})`);
  // Horrors Test: a brew with Cacophony and Sol Ring.
  const horrors = await deck(USER, "HD - Horrors Test", ATRAXA);
  await draft(horrors, CACOPHONY, SOL, RHYSTIC);
  // A committed deck whose live commander moved from Atraxa to Kykar (e).
  const moved = await deck(USER, "Commander Swap", KYKAR);
  await commit(moved, ATRAXA);
  await draft(moved, RHYSTIC);
  // Another player's committed deck with Cacophony in its draft (g).
  const theirs = await deck(OTHER, "Not Yours", ATRAXA);
  await commit(theirs, ATRAXA);
  await draft(theirs, CACOPHONY);

  check("a · the repro: the brew claims, the committed deck's draft wants, and the other player is absent (g)",
    await receipt(CACOPHONY), { claims: ["HD - Horrors Test"], drafts: ["HD Tune - Mutant Menace"] });
  check("b · in the version and the draft: a claim only",
    await receipt(SOL), { claims: ["HD - Horrors Test", "HD Tune - Mutant Menace"], drafts: [] });
  check("c · in the version, cut from the draft: still a claim, not a draft want",
    await receipt(SIGNET), { claims: ["HD Tune - Mutant Menace"], drafts: [] });
  check("d · a proxied draft add is not a draft want", await receipt(SWORDS), { claims: [], drafts: [] });
  check("e · a draft's moved commander is a draft want", (await receipt(KYKAR)).drafts, ["Commander Swap"]);
  check("e · and the version's commander is not", (await loadDraftWants(USER, ATRAXA))?.map((d) => d.name), []);
  check("f · a basic added in a draft is not a draft want", (await loadDraftWants(USER, FOREST))?.map((d) => d.name), []);
  const unowned = await loadCardDetail(USER, RHYSTIC, undefined, ENV);
  check("h · an unowned card: every deck that wants it, claims and draft",
    {
      availability: unowned?.availability ?? "unset",
      claims: (unowned?.unownedAvailability?.claims ?? []).map((c) => c.name),
      drafts: (unowned?.draftWants ?? []).map((d) => d.name),
    },
    { availability: "unset", claims: ["HD - Horrors Test", "HD Tune - Mutant Menace"], drafts: ["Commander Swap"] });
  // The figures the receipt prints `1 wanted · you own 0` from: the committed version is hard, the brew soft.
  const ua = unowned?.unownedAvailability;
  check("h · and owns none of it, one hard and one soft",
    ua ? { owned: ua.owned, hard: ua.hard, soft: ua.soft, free: ua.free } : null,
    { owned: 0, hard: 1, soft: 1, free: -1 });
  const nobody = await loadCardDetail(USER, COUNTERSPELL, undefined, ENV);
  check("i · an unowned card no deck wants: nobody",
    { claims: nobody?.unownedAvailability?.claims ?? "unread", drafts: nobody?.draftWants ?? "unread" },
    { claims: [], drafts: [] });
  check("g · the other player's own read names their deck, so its absence above is the scope",
    (await loadDraftWants(OTHER, CACOPHONY))?.map((d) => d.name), ["Not Yours"]);
}

run()
  .catch((err) => { failures += 1; console.error(err); })
  .finally(async () => {
    if (guarded) {
      for (const u of [USER, OTHER]) await purgeAccount(u).catch((err) => { failures += 1; console.error("purge failed", err); });
    }
    await pool.end();
    console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} failure(s).`);
    process.exit(failures === 0 ? 0 : 1);
  });
