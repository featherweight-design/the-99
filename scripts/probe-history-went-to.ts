// probe:history-went-to — an Add Cards save keeps where its copies went on the history entry (History deck
// line, PR 2; Hugh 2026-10-13), against a real Postgres. It proves:
//
//   1. A card two committed decks want goes to the SENIOR deck, and the entry's row says so.
//   2. A card only a brew wants is a soft read: the row carries `soft`.
//   3. A card no deck wants carries no `wentTo`.
//   4. A later move changes nothing: a second deck deleted afterwards leaves the stored row as it was.
//   5. The same save made with Where-a-copy-goes off (`placements` not asked for) stores none.
//   6. An UPLOAD's entry gets the same, stamped from the arrivals receipt after the confirm.
//
// It writes under a per-run user_id and deletes everything that id created in a `finally`.
// Refused on production and staging; point DATABASE_URL at local-dev or a scratch branch.
//
// Run: `pnpm probe:history-went-to`
import { requireEnv } from "./lib/env.mjs";
import { randomUUID } from "node:crypto";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { applyCollectionChange } from "../src/lib/collection/write";
import { commitVersion } from "../src/lib/decks/versions";
import { writeArrivalsReceipt } from "../src/lib/collection/arrivals-write";
// No signed-in reader here: every switch read takes the environment itself (`process.env`).

neonConfig.webSocketConstructor = ws;

const { DATABASE_URL } = requireEnv(["DATABASE_URL"]);
const pool = new Pool({ connectionString: DATABASE_URL, max: 4 });
const USER = `probe-went-to-${Date.now()}`;
const PRODUCTION = "br-noisy-violet-a6vw4ess";
const STAGING = "br-polished-pond-a6e63y0b";

let failures = 0;
const check = (label: string, ok: boolean, detail: string) => {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} — ${detail}`);
};

type Row = { oracleId: string; wentTo?: { soft?: true; decks: { deckId: string; copies: number }[] } };
const one = async <T>(text: string, params: unknown[] = []) => (await pool.query(text, params)).rows[0] as T;
const rowsOf = async (entryId: string) =>
  (await one<{ rows: Row[] }>("select rows from collection_history where id = $1", [entryId])).rows;

const add = (oracleIds: string[], placements: boolean, id = randomUUID()) =>
  applyCollectionChange(
    USER,
    { kind: "add", items: oracleIds.map((oracleId, i) => ({ oracleId, setCode: "prb", collectorNumber: String(i + 1), finish: "nonfoil", quantity: 1, scryfallId: null, condition: null })) },
    { id, ...(placements ? { placements: true } : {}), env: process.env },
  ).then((r) => ({ id, r }));

async function main() {
  const { branch } = await one<{ branch: string | null }>("select current_setting('neon.branch_id', true) as branch");
  if (!branch || branch === PRODUCTION || branch === STAGING) {
    throw new Error(`refusing branch ${branch ?? "(unknown)"}; point DATABASE_URL at local-dev or a scratch branch`);
  }
  const picked = (await pool.query(
    "select oracle_id from cards where type_line not like '%Basic%' order by oracle_id limit 8",
  )).rows as { oracle_id: string }[];
  const [A, B, C, CMD1, CMD2, NOBODY, A2] = picked.map((p) => p.oracle_id);
  console.log(`branch ${branch} · fixture ${USER}`);

  const deck = async (name: string, commander: string, cards: string[], commit: boolean) => {
    const { id } = await one<{ id: string }>(
      "insert into decks (user_id, name, commander_oracle_id) values ($1, $2, $3) returning id", [USER, name, commander]);
    for (const c of cards) await pool.query("insert into deck_cards (deck_id, oracle_id, quantity) values ($1, $2, 1)", [id, c]);
    if (commit) await commitVersion(id, null, undefined, undefined, process.env);
    return id;
  };

  try {
    const senior = await deck("probe senior", CMD1, [A], true);
    const junior = await deck("probe junior", CMD2, [A], true);
    const brew = await deck("probe brew", CMD1, [B], false);

    const { id, r } = await add([A, B, C], true);
    check("the save applied", r.status === "applied", r.status);
    const rows = await rowsOf(id);
    const of = (o: string) => rows.find((x) => x.oracleId === o);
    check("1. a card two committed decks want is kept as the senior deck's",
      JSON.stringify(of(A)?.wentTo?.decks.map((d) => d.deckId)) === JSON.stringify([senior]), JSON.stringify(of(A)?.wentTo));
    check("2. a card only a brew wants is a soft read of that brew",
      of(B)?.wentTo?.soft === true && of(B)?.wentTo?.decks[0]?.deckId === brew, JSON.stringify(of(B)?.wentTo));
    check("3. a card no deck wants carries nothing", of(C)?.wentTo === undefined, JSON.stringify(of(C)));

    await pool.query("delete from decks where id = $1", [senior]);
    const later = await rowsOf(id);
    check("4. deleting the deck afterwards leaves the stored row as it was",
      JSON.stringify(later.find((x) => x.oracleId === A)?.wentTo?.decks.map((d) => d.deckId)) === JSON.stringify([senior]),
      "still names the deleted deck's id");
    void junior;

    await deck("probe senior 2", CMD1, [A2], true);
    const off = await add([A2], false);
    check("5. made with Where-a-copy-goes off, nothing is stored",
      off.r.status === "applied" && (await rowsOf(off.id)).every((x) => x.wentTo === undefined), off.r.status);
    void NOBODY;

    // ---- 6. An upload ------------------------------------------------------------------------
    const upload = randomUUID();
    await pool.query(
      "insert into csv_uploads (id, user_id, filename, row_count, unmatched_count, preview_payload) values ($1, $2, 'probe.csv', 1, 0, '{}'::jsonb)",
      [upload, USER]);
    const wanted = (await pool.query("select oracle_id from cards where type_line not like '%Basic%' order by oracle_id limit 1 offset 20")).rows[0].oracle_id as string;
    const upDeck = await deck("probe upload deck", CMD2, [wanted], true);
    const entryId = randomUUID();
    const up = await applyCollectionChange(
      USER,
      { kind: "add", uploadId: upload, items: [{ oracleId: wanted, setCode: "prb", collectorNumber: "77", finish: "nonfoil", quantity: 1, scryfallId: null, condition: null }] },
      { id: entryId, env: process.env },
    );
    await writeArrivalsReceipt({
      userId: USER, uploadId: upload, ownedBefore: {}, ownedAfter: { [wanted]: 1 }, buyBefore: [], unmatched: [], parseErrorCount: 0,
      env: { ...process.env, ADDED_COPY_ENABLED: "true", COLLECTION_EDIT_ENABLED: "true" },
    });
    const upRow = (await rowsOf(entryId)).find((x) => x.oracleId === wanted);
    check("6. an upload's entry keeps the deck its copy went to",
      up.status === "applied" && upRow?.wentTo?.decks[0]?.deckId === upDeck, `${up.status}; ${JSON.stringify(upRow?.wentTo)}`);
  } finally {
    await pool.query("delete from collection_history where user_id = $1", [USER]);
    await pool.query("delete from collection_items where user_id = $1", [USER]);
    await pool.query("delete from commander_scores where user_id = $1", [USER]);
    await pool.query("delete from card_assignments where user_id = $1", [USER]);
    await pool.query("delete from csv_uploads where user_id = $1", [USER]);
    await pool.query("delete from decks where user_id = $1", [USER]);
    await pool.query("delete from user_data_stamps where user_id = $1", [USER]);
  }
  console.log(failures === 0 ? "\nall checks passed" : `\n${failures} check(s) failed`);
  if (failures > 0) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
