// The commander write and the candidate loader, proved against a real Postgres by calling the real
// `writeCommanderChange` and `loadChangeCandidates` (change commander, plan decisions 6, 8 and 10).
//
// The rules are unit tested where they are pure: the fit figure, the grouping and the order. What
// only a database answers is what the write WROTE (the live columns, the three-entry trade, and
// nothing at all on a refusal) and what the loader READ (exact identity and size in SQL, the
// sample floor, the fit against the real support list).
//
// WHAT IT CANNOT REACH. The Server Action `changeCommander` calls `requireUserId()`; the probe
// calls the transaction beneath it, which is everything the action does but the switch, the auth
// and the revalidation.
//
// It writes a fixture under a per-run user_id and deletes it in a finally; deck cards cascade. It
// refuses production, staging and any branch it cannot name.
//
// Run: `pnpm tsx scripts/probe-change-commander-write.ts` (no package.json entry: that file is
// outside this lane's fence).
// First, and on its own line: src/db reads DATABASE_URL at module scope.
import { requireEnv } from "./lib/env.mjs";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { sql } from "drizzle-orm";
import ws from "ws";
import { db } from "../src/db";
import { loadChangeCandidates } from "../src/lib/commander-change/candidates";
import { MIN_CANDIDATE_DECKS } from "../src/lib/commander-change/fit";
import { writeCommanderChange } from "../src/lib/commander-change/write";
import { isCommanderCandidate } from "../src/lib/recs/score";
import { partnerAbility } from "../src/lib/decks/partner";
import { loadUniversalStaples } from "../src/lib/staples/universal";

neonConfig.webSocketConstructor = ws;

const PRODUCTION = "br-noisy-violet-a6vw4ess";
const STAGING = "br-polished-pond-a6e63y0b";

const { DATABASE_URL } = requireEnv(["DATABASE_URL"]);
const pool = new Pool({ connectionString: DATABASE_URL });
const fixture = drizzle(pool);
const USER = `probe-change-commander-write-${Date.now()}`;

let failures = 0;
/** Set once the branch guard has passed. The cleanup writes too, so it runs only after it. */
let verified = false;
const check = (label: string, actual: unknown, expected: unknown) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
};

type Legend = { oracle_id: string; name: string; type_line: string; oracle_text: string | null; mana_cost: string | null; layout: string | null };

/** Legends of one exact identity that can lead a deck, ordered so a failing run names the same
 *  fixture the next one will. Picked THROUGH `isCommanderCandidate`, the rule the write applies. */
const legends = async (identity: string, n: number): Promise<Legend[]> => {
  const { rows } = await fixture.execute<Legend>(sql`
    select c.oracle_id, c.name, c.type_line, c.oracle_text, c.mana_cost, c.layout
    from cards c
    where c.commander_legal and c.type_line ilike 'Legendary Creature%'
      and c.color_identity = ${identity}::text[]
    order by c.oracle_id limit 60
  `);
  const ok = rows.filter((r) => isCommanderCandidate({
    typeLine: r.type_line, oracleText: r.oracle_text, manaCost: r.mana_cost, layout: r.layout,
  }));
  if (ok.length < n) throw new Error(`catalog holds fewer than ${n} legends of ${identity}`);
  return ok.slice(0, n);
};

const makeDeck = async (commander: string, partner: string | null = null) => {
  const { rows } = await fixture.execute<{ id: string }>(sql`
    insert into decks (user_id, name, commander_oracle_id, partner_oracle_id)
    values (${USER}, ${`${USER} deck`}, ${commander}::uuid, ${partner}::uuid) returning id
  `);
  return rows[0].id;
};

const addCard = (deckId: string, oracleId: string) => fixture.execute(sql`
  insert into deck_cards (deck_id, oracle_id, quantity) values (${deckId}::uuid, ${oracleId}::uuid, 1)
`);

const live = async (deckId: string) => {
  const { rows } = await fixture.execute<{ c: string; p: string | null }>(sql`
    select commander_oracle_id::text as c, partner_oracle_id::text as p from decks where id = ${deckId}::uuid
  `);
  return rows[0];
};

const bodyOf = async (deckId: string) => {
  const { rows } = await fixture.execute<{ id: string; q: number }>(sql`
    select oracle_id::text as id, quantity as q from deck_cards where deck_id = ${deckId}::uuid order by oracle_id
  `);
  return rows.map((r) => `${r.id}x${r.q}`);
};

const write = (deckId: string, commander: string, partner: string | null = null) =>
  db.transaction((tx) => writeCommanderChange(tx, deckId, USER, {
    commanderOracleId: commander, partnerOracleId: partner,
  }));

async function main() {
  const { rows: branch } = await fixture.execute<{ id: string | null }>(
    sql`select current_setting('neon.branch_id', true) as id`,
  );
  const branchId = branch[0]?.id ?? null;
  // Fail closed: an unknown branch (a primary, or a non-Neon database) is refused as well as the
  // two named ones, and so is any production deployment's environment.
  if (!branchId || branchId === PRODUCTION || branchId === STAGING || process.env.VERCEL_ENV === "production") {
    throw new Error(`refusing to write a fixture to ${branchId ?? "(unknown)"}: point DATABASE_URL at local-dev`);
  }
  verified = true;
  console.log(`branch ${branchId}`);

  const [a, b, c] = await legends("{G}", 3);
  const [blue] = await legends("{U}", 1);
  const { rows: fillers } = await fixture.execute<{ oracle_id: string }>(sql`
    select oracle_id from cards
    where commander_legal and color_identity = '{}'::text[] and type_line = 'Artifact'
    order by oracle_id limit 2
  `);

  // ── The plain swap: B arrives from outside the 99, A leaves ───────────────
  const deck = await makeDeck(a.oracle_id);
  for (const f of fillers) await addCard(deck, f.oracle_id);
  const before = await bodyOf(deck);
  check("swap: accepted", await write(deck, b.oracle_id), { ok: true });
  check("swap: the live commander moved", await live(deck), { c: b.oracle_id, p: null });
  check("swap: the 99 did not change", await bodyOf(deck), before);

  // ── The trade: C comes out of the 99, B takes its slot ────────────────────
  await addCard(deck, c.oracle_id);
  check("trade: accepted", await write(deck, c.oracle_id), { ok: true });
  check("trade: C leads", await live(deck), { c: c.oracle_id, p: null });
  const traded = await bodyOf(deck);
  check("trade: C left the 99", traded.some((r) => r.startsWith(c.oracle_id)), false);
  check("trade: B took its slot", traded.includes(`${b.oracle_id}x1`), true);
  check("trade: the 99 stayed the same size", traded.length, before.length + 1);

  // ── Refusals write nothing ─────────────────────────────────────────────────
  const held = await bodyOf(deck);
  check("refused: another identity", await write(deck, blue.oracle_id), { ok: false, reason: "mismatch" });
  check("refused: a pair for a single", await write(deck, a.oracle_id, b.oracle_id), { ok: false, reason: "mismatch" });
  check("refused: the same commander", await write(deck, c.oracle_id), { ok: false, reason: "unchanged" });
  check("refused: a card that cannot lead", await write(deck, fillers[0].oracle_id), { ok: false, reason: "illegal" });
  check("refused: nothing moved", [await live(deck), await bodyOf(deck)], [{ c: c.oracle_id, p: null }, held]);
  const { rows: other } = await fixture.execute<{ id: string }>(sql`
    insert into decks (user_id, name, commander_oracle_id)
    values (${`${USER}-other`}, 'someone else', ${a.oracle_id}::uuid) returning id
  `);
  check("refused: another player's deck", await write(other[0].id, b.oracle_id), { ok: false, reason: "unavailable" });

  // ── The loader: exact identity, the floor, and the figure ─────────────────
  // A figure of 0 against a body of 0 hits proves nothing, so the body is given three cards a
  // real candidate's decks run: non-land, no staple, inside the deck's identity.
  const { rows: [target] } = await fixture.execute<{ id: string }>(sql`
    select cs.commander_oracle_id::text as id from commander_support cs
    join cards c on c.oracle_id = cs.commander_oracle_id
    where cs.synergy_state = 'ok' and cs.deck_count >= ${MIN_CANDIDATE_DECKS}
      and c.color_identity = '{G}'::text[] and c.commander_legal
      and cs.commander_oracle_id <> ${c.oracle_id}::uuid
    order by cs.deck_count desc, cs.commander_oracle_id limit 1
  `);
  if (!target) throw new Error("the index holds no {G} commander over the floor");
  const { rows: hits } = await fixture.execute<{ id: string }>(sql`
    select sc.oracle_id::text as id from commander_support_cards sc
    join cards k on k.oracle_id = sc.oracle_id
    where sc.commander_oracle_id = ${target.id}::uuid
      and k.color_identity <@ '{G}'::text[] and k.type_line not ilike '%Land%'
      and sc.oracle_id not in (select oracle_id from format_staples)
      and sc.oracle_id not in (select oracle_id from deck_cards where deck_id = ${deck}::uuid)
    order by sc.oracle_id limit 3
  `);
  if (hits.length < 3) throw new Error("the target's support list holds fewer than 3 usable cards");
  for (const h of hits) await addCard(deck, h.id);

  const loaded = await loadChangeCandidates(deck, USER);
  check("loader: reads the reader's deck", loaded !== null, true);
  const all = [...(loaded?.yours ?? []), ...(loaded?.toBuy ?? [])];
  const { rows: identities } = await fixture.execute<{ id: string; ci: string[]; n: number | null }>(sql`
    select c.oracle_id::text as id, c.color_identity as ci, cs.deck_count as n
    from cards c join commander_support cs on cs.commander_oracle_id = c.oracle_id
    where c.oracle_id = any(${sql.param(all.map((x) => x.halves[0].oracleId))}::uuid[])
  `);
  check("loader: offers candidates at all", all.length > 0, true);
  check("loader: every candidate is exactly the deck's identity",
    identities.every((r) => r.ci.join() === "G"), true);
  check(`loader: every candidate clears the ${MIN_CANDIDATE_DECKS}-deck floor`,
    identities.every((r) => (r.n ?? 0) >= MIN_CANDIDATE_DECKS), true);
  check("loader: the current commander is not offered", all.some((x) => x.key === c.oracle_id), false);
  // The figure against a count the probe makes itself, off the same support table and the body
  // as it now stands: distinct non-basic cards other than staples, as `fitBody` defines it.
  const picked = all.find((x) => x.key === target.id);
  check("loader: the fixture's target is offered", picked !== undefined, true);
  // The same universal-staple set `fitBody` excludes (a card in 3 of 4 conditions), never every
  // `format_staples` row: a condition-specific staple still counts.
  const universal = await loadUniversalStaples();
  const { rows: bodyRows } = await fixture.execute<{ id: string }>(sql`
    select distinct dc.oracle_id::text as id from deck_cards dc join cards k on k.oracle_id = dc.oracle_id
    where dc.deck_id = ${deck}::uuid and k.type_line not ilike 'Basic Land%'
  `);
  const counted = bodyRows.map((r) => r.id).filter((id) => !universal.has(id));
  const { rows: support } = await fixture.execute<{ id: string }>(sql`
    select oracle_id::text as id from commander_support_cards where commander_oracle_id = ${target.id}::uuid
  `);
  const supportIds = new Set(support.map((r) => r.id));
  const truth = { n: counted.filter((id) => supportIds.has(id)).length, of: counted.length };
  check("loader: the figure is at least the three planted hits", (picked?.fit.n ?? 0) >= 3, true);
  check("loader: the figure matches the support list's hits in the body", picked?.fit, truth);
  // A sub-floor legend of the same identity, if the index holds one, must not appear.
  const { rows: small } = await fixture.execute<{ id: string }>(sql`
    select cs.commander_oracle_id::text as id from commander_support cs
    join cards c on c.oracle_id = cs.commander_oracle_id
    where cs.synergy_state = 'ok' and cs.deck_count < ${MIN_CANDIDATE_DECKS}
      and c.color_identity = '{G}'::text[] and c.commander_legal
    order by cs.commander_oracle_id limit 1
  `);
  // A FAILURE when the index holds none: without a sub-floor commander the floor's clause is
  // untested, and removing it would pass every check here.
  check("loader: the index holds a sub-floor {G} commander to hide", small.length > 0, true);
  if (small[0]) check("loader: a sub-floor commander is hidden", all.some((x) => x.key === small[0].id), false);

  // ── A pair: swap one half, trade one out of the 98, refuse an illegal pairing ──
  const { rows: partnerRows } = await fixture.execute<Legend & { ci: string[] }>(sql`
    select c.oracle_id, c.name, c.type_line, c.oracle_text, c.mana_cost, c.layout, c.color_identity as ci
    from cards c
    where c.commander_legal and c.type_line ilike 'Legendary Creature%' and c.oracle_text ilike '%Partner%'
    order by c.oracle_id
  `);
  const generic = partnerRows.filter((r) => partnerAbility(r.oracle_text)?.kind === "generic"
    && isCommanderCandidate({ typeLine: r.type_line, oracleText: r.oracle_text, manaCost: r.mana_cost, layout: r.layout }));
  // Two halves of one identity, so either can replace the other without moving the pair's identity.
  const byIdentity = new Map<string, typeof generic>();
  for (const r of generic) {
    const key = [...r.ci].sort().join();
    byIdentity.set(key, [...(byIdentity.get(key) ?? []), r]);
  }
  const twins = [...byIdentity.values()].find((list) => list.length >= 2);
  const anchor = generic.find((r) => twins && !twins.includes(r));
  if (!twins || !anchor) throw new Error("catalog holds no generic-partner fixture for the pair section");
  const [p2, p3] = twins;
  const pairDeck = await makeDeck(anchor.oracle_id, p2.oracle_id);
  for (const f of fillers) await addCard(pairDeck, f.oracle_id);
  check("pair swap: accepted", await write(pairDeck, anchor.oracle_id, p3.oracle_id), { ok: true });
  check("pair swap: one half moved", await live(pairDeck), { c: anchor.oracle_id, p: p3.oracle_id });
  await addCard(pairDeck, p2.oracle_id);
  check("pair trade: accepted", await write(pairDeck, anchor.oracle_id, p2.oracle_id), { ok: true });
  const pairBody = await bodyOf(pairDeck);
  check("pair trade: the arriving half left the 98", pairBody.some((r) => r.startsWith(p2.oracle_id)), false);
  check("pair trade: the departing half took its slot", pairBody.includes(`${p3.oracle_id}x1`), true);
  check("pair refused: a half that cannot partner", await write(pairDeck, anchor.oracle_id, a.oracle_id),
    { ok: false, reason: "illegal" });
  check("pair refused: a single for a pair", await write(pairDeck, anchor.oracle_id), { ok: false, reason: "mismatch" });
}

main()
  .catch((error) => {
    failures += 1;
    console.error(error);
  })
  .finally(async () => {
    try {
      if (verified) {
        await fixture.execute(sql`delete from decks where user_id in (${USER}, ${`${USER}-other`})`);
      }
    } catch (error) {
      failures += 1;
      console.error("cleanup failed", error);
    }
    await pool.end();
    console.log(failures === 0 ? "\nall checks passed" : `\n${failures} check(s) failed`);
    // exitCode, not process.exit: an exit here would swallow a throw from above.
    process.exitCode = failures === 0 ? 0 : 1;
  });
