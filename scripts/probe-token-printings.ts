// WHICH PRINTINGS OF A TOKEN A PLAYER HOLDS (token printings TP1), proved against a real Postgres by
// calling the real `writeUploadTokens`, `syncPreconTokens` and `purgeAccount`. The sums are unit tested
// in `ownership.test.ts`; only a database can say the rows land, follow Replace, Add and a precon's
// revert, that a deck keeps one pick per token, and that a pick names only a held printing of its own token.
//
// Its own fixtures: two tokens and three printings under per-run ids (local-dev holds no token catalog),
// one account, one deck. Everything is deleted in a `finally`.
//
// Cases:
//   a  a Replace upload writes its printings as `upload` rows, beside the token-level ownership row
//   b  an Add accumulates onto them and adds a new printing
//   c  a later Replace removes every upload printing it does not read
//   d  a standing precon add's printings land as `precon` rows, leaving the upload rows alone
//   e  reverting that add takes its printing rows away
//   f  a deck keeps one pick per token (whether the printing is OF that token is the writer's and the
//      reader's check, TP2: no key enforces it, so the token ingest can re-file a printing)
//   h  the deck pick's writer refuses another token's printing (held) and an unheld one, and takes a held
//      printing of the token, which the deck's row then pictures (TP2)
//   i  a row naming another token's printing, written past the writer, is read as no pick
//   j  a pick the player stops holding is ignored and kept, and shows again once the printing is back
//   g  the purge removes the account's printing rows and its deck's picks
//
// Mutations, each run against it (file copied to the scratchpad, broken by an exact replace, run,
// restored by copying back), and each fails it:
//   - the Replace's delete of `upload` printing rows dropped (`writeUploadTokens`): fails c, d and e.
//   - `syncPreconPrintings` not called from `syncPreconTokens`: fails d.
//   - the writer's printing-of-token check dropped (`writeDeckTokenPrintingIn`): fails h.
//   - the reader's join on the token dropped (`loadDeckTokenPicks`): fails i.
//
// It WRITES, so it fails closed: `PROBE_DB_BRANCH` must name the branch `DATABASE_URL` reports, and
// staging and production are refused by id. Point it at a scratch branch migrated to 0118.
//
//   PROBE_DB_BRANCH=br-… pnpm probe:token-printings
// First, and on its own line: the helper's import loads `.env`, and anything reading
// `DATABASE_URL` at module scope needs it already loaded.
import { requireEnv } from "./lib/env.mjs";
import { randomUUID } from "node:crypto";
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { sql } from "drizzle-orm";

import { db } from "../src/db";
import { syncPreconTokens, writeUploadTokens, type TokenHolding } from "../src/lib/tokens/ownership";
import { purgeAccount } from "../src/lib/account/purge";
import { loadDeckTokenPicks, writeDeckTokenPrintingIn } from "../src/lib/tokens/deck-printings";
import { loadDeckTokens } from "../src/lib/tokens/read";

const STAGING_BRANCH = "br-polished-pond-a6e63y0b";
const PRODUCTION_BRANCH = "br-noisy-violet-a6vw4ess";

const { DATABASE_URL, PROBE_DB_BRANCH } = requireEnv(["DATABASE_URL", "PROBE_DB_BRANCH"]);
const pool = new Pool({ connectionString: DATABASE_URL });
const fixture = drizzle(pool);
const rows = async <T>(text: ReturnType<typeof sql>): Promise<T[]> => (await fixture.execute(text)).rows as T[];

let failures = 0;
const check = (label: string, actual: unknown, expected: unknown) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  const ok = a === e;
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} — got ${a}, expected ${e}`);
};

const USER = `probe-token-printings-${Date.now()}`;
const A = randomUUID();
const B = randomUUID();
const A1 = randomUUID();
const A2 = randomUUID();
const B1 = randomUUID();
const A3 = randomUUID();
let cardId: string | null = null;
let deckId: string | null = null;

const held = async () => rows<{ p: string; source: string; quantity: number }>(sql`
  select token_printing_id::text as p, source, quantity from token_printing_holdings
  where user_id = ${USER} order by source, token_printing_id`);
const name = (id: string) => ({ [A1]: "A1", [A2]: "A2", [A3]: "A3", [B1]: "B1" })[id] ?? id;
const shown = async () => (await held()).map((h) => `${h.source}:${name(h.p)}=${h.quantity}`).sort();
const upload = (mode: "replace" | "add", holdings: TokenHolding[]) =>
  db.transaction(async (tx) => { await writeUploadTokens(tx, USER, randomUUID(), mode, holdings); });

async function run() {
  const [{ branch }] = await rows<{ branch: string | null }>(sql`select current_setting('neon.branch_id', true) as branch`);
  if (!branch || branch !== PROBE_DB_BRANCH || branch === STAGING_BRANCH || branch === PRODUCTION_BRANCH) {
    throw new Error(`refusing to run against ${branch}: this probe writes. Name the scratch branch DATABASE_URL reports as PROBE_DB_BRANCH.`);
  }
  console.log(`branch ${branch}`);
  for (const [id, n] of [[A, "Probe Soldier"], [B, "Probe Treasure"]] as const) {
    await fixture.execute(sql`insert into tokens (oracle_id, name, type_line, colors, layout) values (${id}::uuid, ${n}, 'Token Creature', '{}', 'token')`);
  }
  for (const [id, token, cn] of [[A1, A, "1"], [A2, A, "2"], [B1, B, "3"], [A3, A, "4"]] as const) {
    // Each with art, so the deck's row chooses among the held printings rather than falling to the catalog's.
    await fixture.execute(sql`insert into token_printings (scryfall_id, token_oracle_id, set_code, collector_number, finishes, image_uri)
      values (${id}::uuid, ${token}::uuid, 'tprb', ${cn}, '{nonfoil}', ${`https://probe.invalid/${cn}.jpg`})`);
  }

  // a · Replace.
  await upload("replace", [{ tokenOracleId: A, quantity: 3, printings: [{ tokenPrintingId: A1, quantity: 2 }, { tokenPrintingId: A2, quantity: 1 }] }]);
  check("a · a Replace writes each printing it read", await shown(), ["upload:A1=2", "upload:A2=1"]);
  const [own] = await rows<{ quantity: number }>(sql`select quantity from token_ownership where user_id = ${USER} and token_oracle_id = ${A}::uuid`);
  check("a · beside the token's own ownership row", own?.quantity, 3);

  // b · Add.
  await upload("add", [
    { tokenOracleId: A, quantity: 1, printings: [{ tokenPrintingId: A1, quantity: 1 }] },
    { tokenOracleId: B, quantity: 1, printings: [{ tokenPrintingId: B1, quantity: 1 }] },
  ]);
  check("b · an Add accumulates and adds", await shown(), ["upload:A1=3", "upload:A2=1", "upload:B1=1"]);

  // c · A later Replace.
  await upload("replace", [{ tokenOracleId: B, quantity: 2, printings: [{ tokenPrintingId: B1, quantity: 2 }] }]);
  check("c · a Replace removes every printing it does not read", await shown(), ["upload:B1=2"]);

  // d · A standing precon add.
  const [entry] = await rows<{ id: string }>(sql`
    insert into collection_history (id, user_id, kind, raised, lowered, source, precon_tokens)
    values (gen_random_uuid(), ${USER}, 'add', 0, 0, 'precon:ProbeBox', ${JSON.stringify([{ tokenOracleId: A, quantity: 1, printings: [{ tokenPrintingId: A2, quantity: 1 }] }])}::jsonb)
    returning id::text as id`);
  await db.transaction(async (tx) => { await syncPreconTokens(tx, USER, entry.id); });
  check("d · a precon add's printing lands as a precon row, and the upload's stands", await shown(), ["precon:A2=1", "upload:B1=2"]);

  // e · Reverting it.
  const [revert] = await rows<{ id: string }>(sql`
    insert into collection_history (id, user_id, kind, raised, lowered, reverts_id) values (gen_random_uuid(), ${USER}, 'revert', 0, 0, ${entry.id}::uuid)
    returning id::text as id`);
  await fixture.execute(sql`update collection_history set reverted_by = ${revert.id}::uuid where id = ${entry.id}::uuid`);
  await db.transaction(async (tx) => { await syncPreconTokens(tx, USER); });
  check("e · reverting the add takes its printing away", await shown(), ["upload:B1=2"]);

  // f · A deck's pick, cascading with its deck and gone with the account.
  const [card] = await rows<{ oracle_id: string }>(sql`select oracle_id::text from cards limit 1`);
  const [deck] = await rows<{ id: string }>(sql`insert into decks (user_id, name, commander_oracle_id) values (${USER}, 'Probe deck', ${card.oracle_id}::uuid) returning id::text as id`);
  deckId = deck.id;
  cardId = card.oracle_id;
  await fixture.execute(sql`insert into deck_token_printings (deck_id, token_oracle_id, token_printing_id, user_id) values (${deckId}::uuid, ${A}::uuid, ${A2}::uuid, ${USER})`);
  check("f · a deck keeps one pick per token", (await rows(sql`select 1 from deck_token_printings where deck_id = ${deckId}::uuid`)).length, 1);

  // h · The writer (TP2): a printing of another token is refused, so is one the player holds no copy of.
  await fixture.execute(sql`insert into card_tokens (card_oracle_id, token_oracle_id) values (${cardId}::uuid, ${A}::uuid) on conflict do nothing`);
  // B1 is HELD here, so only the token check can refuse it.
  await upload("replace", [
    { tokenOracleId: A, quantity: 4, printings: [{ tokenPrintingId: A1, quantity: 1 }, { tokenPrintingId: A2, quantity: 3 }] },
    { tokenOracleId: B, quantity: 1, printings: [{ tokenPrintingId: B1, quantity: 1 }] },
  ]);
  const write = (p: string) => db.transaction((tx) => writeDeckTokenPrintingIn(tx, { deckId: deckId!, userId: USER, tokenOracleId: A, tokenPrintingId: p }));
  check("h · the writer refuses another token's printing", await write(B1), "notOfToken");
  check("h · and a printing the player holds no copy of", await write(A3), "notHeld");
  check("h · and takes a held printing of the token", await write(A1), "ok");
  const pictured = async () => {
    const r = await loadDeckTokens(deckId!, USER);
    const t = r.status === "ok" ? r.tokens.find((x) => x.oracleId === A) : undefined;
    return t ? `${t.picture ? name(t.picture.scryfallId) : "none"}${t.printingPick ? " (picked)" : ""}` : r.status;
  };
  check("h · the deck's row pictures the pick", await pictured(), "A1 (picked)");

  // i · A row naming another token's printing, written past the writer, is read as no pick.
  await fixture.execute(sql`update deck_token_printings set token_printing_id = ${B1}::uuid where deck_id = ${deckId}::uuid and token_oracle_id = ${A}::uuid`);
  check("i · the reader ignores a mismatched pick", [...(await loadDeckTokenPicks(deckId!, USER)).keys()], []);
  check("i · and the row pictures the most-held printing", await pictured(), "A2");

  // j · A pick the player stops holding is ignored, not deleted.
  check("j · a held pick again", await write(A1), "ok");
  await upload("replace", [{ tokenOracleId: A, quantity: 2, printings: [{ tokenPrintingId: A2, quantity: 2 }] }]);
  check("j · a Replace without the picked printing falls back to the most-held", await pictured(), "A2");
  check("j · and leaves the deck's pick standing", (await rows(sql`select 1 from deck_token_printings where deck_id = ${deckId}::uuid and token_printing_id = ${A1}::uuid`)).length, 1);
  await upload("replace", [{ tokenOracleId: A, quantity: 3, printings: [{ tokenPrintingId: A1, quantity: 1 }, { tokenPrintingId: A2, quantity: 2 }] }]);
  check("j · which shows again once the printing is back", await pictured(), "A1 (picked)");

  // g · The purge.
  await purgeAccount(USER);
  check("g · the purge leaves no printing row", (await held()).length, 0);
  check("g · and no deck pick", (await rows(sql`select 1 from deck_token_printings where user_id = ${USER}`)).length, 0);
}

// Each step runs on its own, so one that throws (the purge is under test too) never leaves the catalog
// fixtures behind. The direct deletes cover what the purge should have removed, in child-first order.
async function cleanup() {
  const steps: [string, () => Promise<unknown>][] = [
    ["purge", () => purgeAccount(USER)],
    ["deck picks", () => fixture.execute(sql`delete from deck_token_printings where user_id = ${USER}`)],
    ["decks", () => fixture.execute(sql`delete from decks where user_id = ${USER}`)],
    ["printing rows", () => fixture.execute(sql`delete from token_printing_holdings where user_id = ${USER}`)],
    ["ownership", () => fixture.execute(sql`delete from token_ownership where user_id = ${USER}`)],
    ["reads", () => fixture.execute(sql`delete from token_reads where user_id = ${USER}`)],
    ["history", () => fixture.execute(sql`delete from collection_history where user_id = ${USER}`)],
    ["card tokens", () => fixture.execute(sql`delete from card_tokens where token_oracle_id in (${A}::uuid, ${B}::uuid)`)],
    ["token printings", () => fixture.execute(sql`delete from token_printings where scryfall_id in (${A1}::uuid, ${A2}::uuid, ${A3}::uuid, ${B1}::uuid)`)],
    ["tokens", () => fixture.execute(sql`delete from tokens where oracle_id in (${A}::uuid, ${B}::uuid)`)],
  ];
  for (const [name, step] of steps) {
    try {
      await step();
    } catch (err) {
      failures += 1;
      console.error(`cleanup: ${name} failed`, err);
    }
  }
}

run()
  .catch((err) => { failures += 1; console.error(err); })
  .finally(async () => {
    await cleanup();
    await pool.end();
    console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} failure(s).`);
    process.exit(failures === 0 ? 0 : 1);
  });
