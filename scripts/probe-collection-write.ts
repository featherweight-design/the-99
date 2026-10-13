// probe:collection-write — the collection ledger's concurrency claims against a real Postgres
// (collection foundation, plan `2026-10-09-collection-write-path.md`, Probes).
//
// Every claim below is about what two transactions do to each other, which no unit test can
// reach. It proves:
//
//   1. A DOUBLE-SUBMITTED ADD APPLIES ONCE. Two concurrent calls with one action id: one is
//      `applied`, the other `alreadyApplied`, and the count rises once.
//   2. TWO TABS EDITING ONE ROW, each sending the count it saw: one `applied`, one `stale`.
//   3. TWO CONCURRENT REVERTS OF ONE ENTRY, under different ids: one `applied`, one
//      `alreadyReverted`, and one revert entry exists.
//   4. A LOWERING THAT SHORTS A COMMITTED DECK returns `wouldShort` naming it and writes
//      nothing (no row change, no entry); the same action with `confirmShort` then applies.
//   5. A ZERO DELETES THE ROW, a write clears the player's scores and moves the generation, an
//      old entry is PRUNED (rows null, entry kept), and an oracle id the catalog lacks is refused
//      as `missingCard` by name.
//
// It writes under a per-run user_id and deletes everything that id created in a `finally`.
// Refused on production and staging; point DATABASE_URL at local-dev or a scratch branch.
//
// Run: `pnpm probe:collection-write`
import { requireEnv } from "./lib/env.mjs";
import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { applyCollectionChange, type ChangeResult } from "../src/lib/collection/write";
import { collectionGeneration } from "../src/lib/recs/store";
import { commitVersion } from "../src/lib/decks/versions";
import { collectionTotals, editedKeysSinceUpload, editsSinceUpload, lastUploadConfirmedAt, getHistoryEntry, listHistory } from "../src/lib/collection/history";
import { collectionItemKey } from "../src/lib/collection/key";
import { replaceCollection } from "../src/lib/collection/import";
import { resolvePrintings } from "../src/lib/collection/catalog-read";
// No signed-in reader here: every switch read takes the environment itself (`process.env`).

neonConfig.webSocketConstructor = ws;

const { DATABASE_URL } = requireEnv(["DATABASE_URL"]);
const pool = new Pool({ connectionString: DATABASE_URL, max: 4 });
const USER = `probe-collection-write-${Date.now()}`;
const PRODUCTION = "br-noisy-violet-a6vw4ess";
const STAGING = "br-polished-pond-a6e63y0b";

let failures = 0;
const check = (label: string, ok: boolean, detail: string) => {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} — ${detail}`);
};

const one = async <T>(text: string, params: unknown[] = []) =>
  (await pool.query(text, params)).rows[0] as T;

const statuses = (rs: ChangeResult[]) => rs.map((r) => r.status).sort().join(",");

async function main() {
  const { branch } = await one<{ branch: string | null }>(
    "select current_setting('neon.branch_id', true) as branch",
  );
  if (!branch || branch === PRODUCTION || branch === STAGING) {
    throw new Error(`refusing branch ${branch ?? "(unknown)"}; point DATABASE_URL at local-dev or a scratch branch`);
  }
  const picked = (await pool.query(
    "select oracle_id, name from cards where type_line not like '%Basic%' order by oracle_id limit 3",
  )).rows as { oracle_id: string; name: string }[];
  if (picked.length < 3) throw new Error("the catalog holds fewer than three cards");
  const [A, B, C] = picked.map((p) => p.oracle_id);
  const at = (oracleId: string) => ({ oracleId, setCode: "prb", collectorNumber: "1", finish: "nonfoil" as const });
  const count = async (oracleId: string) => Number((await one<{ q: number } | undefined>(
    "select quantity as q from collection_items where user_id = $1 and oracle_id = $2", [USER, oracleId],
  ))?.q ?? 0);
  const entries = async () => Number((await one<{ n: string }>(
    "select count(*) as n from collection_history where user_id = $1", [USER],
  )).n);
  console.log(`branch ${branch} · fixture ${USER} · cards ${picked.map((p) => p.name).join(", ")}`);

  try {
    // ---- 1. Double submit ----------------------------------------------------------------
    const addId = randomUUID();
    const add = { kind: "add" as const, items: [{ ...at(A), condition: "NM", quantity: 2 }] };
    const both = await Promise.all([
      applyCollectionChange(USER, add, { id: addId, env: process.env }),
      applyCollectionChange(USER, add, { id: addId, env: process.env }),
    ]);
    check("a double-submitted add applies once", statuses(both) === "alreadyApplied,applied" && await count(A) === 2,
      `${statuses(both)}; count ${await count(A)}`);
    const again = await applyCollectionChange(USER, add, { id: addId, env: process.env });
    const first = both.find((r) => r.status === "applied");
    check("a late retry of the same id is still alreadyApplied, carrying the committed entry",
      again.status === "alreadyApplied" && first?.status === "applied"
        && isDeepStrictEqual(again.entry, first.entry),
      again.status === "alreadyApplied" ? JSON.stringify(again.entry) : again.status);

    // ---- 2. Two tabs, one row ------------------------------------------------------------
    const tabs = await Promise.all([
      applyCollectionChange(USER, { kind: "edit", rows: [{ ...at(A), quantity: 1, expected: 2 }] }, { id: randomUUID(), env: process.env }),
      applyCollectionChange(USER, { kind: "edit", rows: [{ ...at(A), quantity: 3, expected: 2 }] }, { id: randomUUID(), env: process.env }),
    ]);
    const stale = tabs.find((t) => t.status === "stale");
    check("two tabs editing one row: one applies, one is stale", statuses(tabs) === "applied,stale",
      `${statuses(tabs)}; count ${await count(A)}`);
    check("the stale tab is told today's count",
      stale?.status === "stale" && stale.current[0].quantity === await count(A),
      JSON.stringify(stale && stale.status === "stale" ? stale.current : null));

    // ---- 3. Two concurrent reverts -------------------------------------------------------
    const target = randomUUID();
    await applyCollectionChange(USER, { kind: "add", items: [{ ...at(B), condition: null, quantity: 3 }] }, { id: target, env: process.env });
    const reverts = await Promise.all([
      applyCollectionChange(USER, { kind: "revert", entryId: target }, { id: randomUUID(), env: process.env }),
      applyCollectionChange(USER, { kind: "revert", entryId: target }, { id: randomUUID(), env: process.env }),
    ]);
    const revertRows = Number((await one<{ n: string }>(
      "select count(*) as n from collection_history where user_id = $1 and reverts_id = $2", [USER, target],
    )).n);
    check("two reverts of one entry: one applies, one is refused",
      statuses(reverts) === "alreadyReverted,applied" && revertRows === 1 && await count(B) === 0,
      `${statuses(reverts)}; revert entries ${revertRows}; count ${await count(B)}`);
    check("the reverted row is DELETED, not stored at zero", !(await one(
      "select 1 from collection_items where user_id = $1 and oracle_id = $2", [USER, B],
    )), "no row");

    // ---- 4. A lowering that shorts a committed deck ---------------------------------------
    await applyCollectionChange(USER, { kind: "edit", rows: [{ ...at(A), quantity: 1 }] }, { id: randomUUID(), env: process.env });
    const deck = await one<{ id: string }>(
      `insert into decks (user_id, name, commander_oracle_id) values ($1, 'probe collection write', $2) returning id`,
      [USER, B],
    );
    await pool.query("insert into deck_cards (deck_id, oracle_id, quantity) values ($1, $2, 1)", [deck.id, A]);
    await commitVersion(deck.id, null, undefined, undefined, process.env);
    const entriesBefore = await entries();
    const lowerId = randomUUID();
    const lower = { kind: "edit" as const, rows: [{ ...at(A), quantity: 0, expected: 1 }] };
    const warned = await applyCollectionChange(USER, lower, { id: lowerId, env: process.env });
    check("a lowering that shorts a committed deck warns and names it",
      warned.status === "wouldShort" && warned.decks.some((d) => d.deckId === deck.id && d.short === 1),
      JSON.stringify(warned));
    check("…and writes nothing", await count(A) === 1 && await entries() === entriesBefore,
      `count ${await count(A)}; entries ${await entries()} (was ${entriesBefore})`);
    const shown = warned.status === "wouldShort" ? warned.decks : [];
    const understated = await applyCollectionChange(USER, lower, {
      id: lowerId, confirmShort: shown.map((d) => ({ ...d, short: d.short - 1 })),
      env: process.env,
    });
    check("a confirm whose warning no longer covers the change comes back redrawn",
      understated.status === "wouldShort" && await count(A) === 1, `${understated.status}; count ${await count(A)}`);
    const confirmed = await applyCollectionChange(USER, lower, { id: lowerId, confirmShort: shown, env: process.env });
    check("the same action confirmed applies", confirmed.status === "applied" && await count(A) === 0,
      `${confirmed.status}; count ${await count(A)}`);
    check("the applied result carries the decks the warning named, for the receipt",
      confirmed.status === "applied" && JSON.stringify(confirmed.short) === JSON.stringify(shown),
      confirmed.status === "applied" ? JSON.stringify(confirmed.short) : confirmed.status);

    // A revert whose inverse is a no-op today still records itself and marks its target: add one
    // card, take it off again by hand, then revert the add, which has nothing left to take.
    const noop = randomUUID();
    // C, because B is the probe deck's commander and lowering it would warn.
    await applyCollectionChange(USER, { kind: "add", items: [{ ...at(C), condition: null, quantity: 1 }] }, { id: noop, env: process.env });
    await applyCollectionChange(USER, { kind: "edit", rows: [{ ...at(C), quantity: 0 }] }, { id: randomUUID(), env: process.env });
    const noopRevert = await applyCollectionChange(USER, { kind: "revert", entryId: noop }, { id: randomUUID(), env: process.env });
    const marked = await one<{ reverted_by: string | null }>(
      "select reverted_by from collection_history where id = $1", [noop],
    );
    check("a revert with nothing left to undo still records itself and marks its target",
      noopRevert.status === "applied" && noopRevert.entry.rows.length === 0 && marked.reverted_by === noopRevert.entry.id,
      `${noopRevert.status}; reverted_by ${marked.reverted_by}`);

    // ---- 5. Scores, the generation, retention, a missing card -------------------------------
    await pool.query(
      `insert into commander_scores (user_id, oracle_id, slug, score, fit_pool, fit_roles,
         synergy_state, receipts, color_pool_size, role_counts)
       values ($1, $2, 'probe', 1, 0, 0, 'absent', '', 0, '{}'::jsonb)`,
      [USER, B],
    );
    const genBefore = await collectionGeneration(USER);
    await pool.query(
      "update collection_history set created_at = now() - interval '91 days' where id = $1", [addId],
    );
    await applyCollectionChange(USER, { kind: "add", items: [{ ...at(A), condition: null, quantity: 1 }] }, { id: randomUUID(), env: process.env });
    const scores = Number((await one<{ n: string }>(
      "select count(*) as n from commander_scores where user_id = $1", [USER],
    )).n);
    check("a write clears the player's scores", scores === 0, `${scores} left`);
    const genAfter = await collectionGeneration(USER);
    check("a write moves the collection generation", genAfter !== genBefore, `${genBefore} → ${genAfter}`);
    const pruned = await one<{ rows: unknown; pruned_at: Date | null }>(
      "select rows, pruned_at from collection_history where id = $1", [addId],
    );
    check("an entry past the window is pruned, not deleted", pruned.rows === null && pruned.pruned_at !== null,
      JSON.stringify(pruned));
    const missing = await applyCollectionChange(USER, {
      kind: "add",
      items: [{ ...at(randomUUID()), condition: null, quantity: 1, name: "Nonexistent Probe Card" }],
    }, { id: randomUUID(), env: process.env });
    check("an oracle id the catalog lacks is refused by name",
      missing.status === "missingCard" && missing.names[0] === "Nonexistent Probe Card", JSON.stringify(missing));
    const lastAdd = await one<{ rows: { oracleId: string; name: string }[] }>(
      "select rows from collection_history where user_id = $1 and kind = 'add' order by seq desc limit 1", [USER],
    );
    check("an entry stores the card's name", lastAdd.rows[0]?.name === picked[0].name, JSON.stringify(lastAdd.rows));

    // ---- 6. Uploads through the ledger ----------------------------------------------------
    const upload = async (items: unknown[]) => (await one<{ id: string }>(
      `insert into csv_uploads (user_id, filename, row_count, unmatched_count, preview_payload)
       values ($1, 'probe.csv', 1, 0, $2) returning id`, [USER, JSON.stringify({ pendingItems: items })],
    )).id;
    const replaceItems = [{ ...at(C), condition: null, quantity: 1 }];
    const u1 = await upload(replaceItems);
    const editsBefore = await editsSinceUpload(USER);
    check("with no upload yet, every hand change counts", editsBefore > 0, `${editsBefore}`);
    const previewed = await applyCollectionChange(USER, { kind: "replace", items: replaceItems, uploadId: u1 },
      { id: randomUUID(), dryRun: true, env: process.env });
    const stillOpen = await one<{ confirmed_at: Date | null }>("select confirmed_at from csv_uploads where id = $1", [u1]);
    check("a Replace preview names the committed deck it would short, and writes nothing",
      previewed.status === "preview" && previewed.decks.some((d) => d.deckId === deck.id)
        && await count(A) === 1 && stillOpen.confirmed_at === null,
      `${previewed.status === "preview" ? JSON.stringify(previewed.decks) : previewed.status}; count ${await count(A)}`);
    const shownDecks = previewed.status === "preview" ? previewed.decks : [];
    const confirms = await Promise.all([1, 2].map(() => applyCollectionChange(
      USER, { kind: "replace", items: replaceItems, uploadId: u1 }, { id: randomUUID(), confirmShort: shownDecks, env: process.env },
    )));
    const replaceEntry = await one<{ kind: string; source: string }>(
      "select kind, source from collection_history where user_id = $1 order by seq desc limit 1", [USER],
    );
    check("a double-confirmed Replace upload applies once and records itself",
      statuses(confirms) === "alreadyConfirmed,applied" && await count(A) === 0 && await count(C) === 1
        && replaceEntry.kind === "upload_replace" && replaceEntry.source === `csv_uploads:${u1}`,
      `${statuses(confirms)}; A ${await count(A)} C ${await count(C)}; ${JSON.stringify(replaceEntry)}`);
    const editsAfter = await editsSinceUpload(USER);
    await applyCollectionChange(USER, { kind: "edit", rows: [{ ...at(C), quantity: 2 }] }, { id: randomUUID(), env: process.env });
    const editsLater = await editsSinceUpload(USER);
    check("edits since the upload count from the upload's own entry", editsAfter === 0 && editsLater === 1,
      `${editsAfter} then ${editsLater}`);
    const editedKeys = await editedKeysSinceUpload(USER);
    const totals = await collectionTotals(USER);
    const truth = await one<{ n: string; q: string }>(
      "select count(*) as n, coalesce(sum(quantity), 0) as q from collection_items where user_id = $1", [USER]);
    check("the keys of what was edited since the upload are the edited holding's, and the totals count it",
      editedKeys.size === 1 && editedKeys.has(collectionItemKey({ ...at(C), finish: at(C).finish as never }))
        && totals.holdings === Number(truth.n) && totals.copies === Number(truth.q),
      `${[...editedKeys]}; ${JSON.stringify(totals)} vs ${JSON.stringify(truth)}`);
    const lastAt = await lastUploadConfirmedAt(USER);
    const lastTruth = await one<{ at: Date }>("select max(confirmed_at) as at from csv_uploads where user_id = $1 and confirmed_at is not null", [USER]);
    check("the last upload's time is the newest confirmed one", lastAt?.getTime() === new Date(lastTruth.at).getTime(), `${lastAt?.toISOString()}`);
    // An entry past the retention window whose rows the lazy prune has not reached yet names nothing,
    // while still counting as a hand change since the upload.
    const aged = await one<{ id: string; created_at: Date }>(
      "select id, created_at from collection_history where user_id = $1 and kind = 'edit' order by seq desc limit 1", [USER]);
    await pool.query("update collection_history set created_at = now() - interval '100 days' where id = $1", [aged.id]);
    const agedKeys = await editedKeysSinceUpload(USER);
    const agedCount = await editsSinceUpload(USER);
    await pool.query("update collection_history set created_at = $2 where id = $1", [aged.id, aged.created_at]);
    check("an entry past the retention window, not yet pruned, names no holding but still counts",
      agedKeys.size === 0 && agedCount === 1, `${agedKeys.size} keys; count ${agedCount}`);
    const u2 = await upload(replaceItems);
    const added = await applyCollectionChange(USER, { kind: "add", items: replaceItems, uploadId: u2 },
      { id: randomUUID(), ownedCounts: true, env: process.env });
    check("an Add upload adds to what is held", added.status === "applied" && added.entry.kind === "upload_add"
      && await count(C) === 3, `${added.status}; C ${await count(C)}`);
    check("its owned counts, read under the lock, differ by exactly the Add",
      added.status === "applied" && added.owned?.before[C] === 2 && added.owned?.after[C] === 3,
      added.status === "applied" ? JSON.stringify(added.owned && { before: added.owned.before[C], after: added.owned.after[C] }) : "");

    // A switch-off upload writes no entry, so "since" falls back to its confirm time against the
    // entries' times: both read off the database clock after the lock.
    const u3 = await upload(replaceItems);
    await applyCollectionChange(USER, { kind: "edit", rows: [{ ...at(C), quantity: 5 }] }, { id: randomUUID(), env: process.env });
    await replaceCollection(USER, replaceItems, { confirmUploadId: u3 });
    const legacyAfter = await editsSinceUpload(USER);
    await applyCollectionChange(USER, { kind: "edit", rows: [{ ...at(C), quantity: 4 }] }, { id: randomUUID(), env: process.env });
    const legacyLater = await editsSinceUpload(USER);
    check("after a switch-off upload, edits count from its confirm time, on one clock",
      legacyAfter === 0 && legacyLater === 1, `${legacyAfter} then ${legacyLater}`);

    // ---- 7. History reads ------------------------------------------------------------------
    const page = await listHistory(USER);
    const seqs = page.entries.map((e) => e.seq);
    check("history lists newest first, inside the window, and never a pruned entry",
      seqs.every((x, i) => i === 0 || x < seqs[i - 1]) && !page.entries.some((e) => e.id === addId),
      `${page.entries.length} entries; seqs ${seqs.slice(0, 5).join(",")}…`);
    const older = await listHistory(USER, { before: seqs[1] });
    check("a page read from a cursor holds only what is older than it",
      older.entries.length === page.entries.length - 2 && older.entries.every((e) => e.seq < seqs[1]),
      `${older.entries.length} of ${page.entries.length}`);
    const reverted = page.entries.find((e) => e.id === noop);
    const itsRevert = page.entries.find((e) => e.revertsId === noop);
    check("a reverted entry and its revert link to each other while both are in the window",
      reverted?.revertedBy === itsRevert?.id && reverted?.revertedByVisible === true && itsRevert?.revertsVisible === true,
      JSON.stringify({ reverted: reverted?.revertedByVisible, revert: itsRevert?.revertsVisible }));
    await pool.query("update collection_history set created_at = now() - interval '91 days' where id = $1", [noop]);
    const later = (await listHistory(USER)).entries.find((e) => e.revertsId === noop);
    check("once the reverted entry ages out, its revert still reads as one, with no link drawn",
      later?.revertsId === noop && later?.revertsVisible === false && await getHistoryEntry(USER, noop) === null,
      JSON.stringify({ revertsId: later?.revertsId, visible: later?.revertsVisible }));
    // A pruned entry is never listed or linked, even inside the window: null one directly, since
    // the prune itself only ever reaches entries the window already hides.
    const target2 = randomUUID();
    await applyCollectionChange(USER, { kind: "add", items: [{ ...at(C), condition: null, quantity: 1 }] }, { id: target2, env: process.env });
    await applyCollectionChange(USER, { kind: "revert", entryId: target2 }, { id: randomUUID(), env: process.env });
    await pool.query("update collection_history set rows = null, pruned_at = now() where id = $1", [target2]);
    const afterPrune = await listHistory(USER);
    const linkToPruned = afterPrune.entries.find((e) => e.revertsId === target2);
    check("an entry pruned inside the window is neither listed nor linked to",
      !afterPrune.entries.some((e) => e.id === target2) && linkToPruned?.revertsVisible === false,
      JSON.stringify({ listed: afterPrune.entries.some((e) => e.id === target2), visible: linkToPruned?.revertsVisible }));
    const removal = page.entries.find((e) => e.id === lowerId);
    check("an edit that ends every row at nothing reads as a removal in the list",
      removal?.removesOnly === true && page.entries.filter((e) => e.kind === "add").every((e) => !e.removesOnly),
      JSON.stringify({ removesOnly: removal?.removesOnly }));
    const reusedId = await applyCollectionChange(USER, { kind: "revert", entryId: target2 }, { id: target2, env: process.env })
      .then((r) => r.status, (e: Error) => e.message);
    check("a revert sent under its own target's id is refused, never answered as already applied",
      reusedId === "collection change id is already in use", reusedId);
    const own = await getHistoryEntry(USER, page.entries[0].id);
    check("one entry reads whole for its owner and not at all for anyone else",
      own !== null && own.rows.length === own.rowCount && await getHistoryEntry(`${USER}-other`, page.entries[0].id) === null,
      `${own?.rows.length} rows`);

    // ---- 8. The copies figure, and a row an edit creates -----------------------------------
    // The list's copies figure is SQL over the stored rows; each entry's rows, read straight off
    // the table, are the answer it must reproduce. Not through `getHistoryEntry`: section 7 aged
    // one of these entries out of the window, and pruned another, since `page` was read.
    const figured = await Promise.all(page.entries.map(async (e) => {
      type Side = { quantity: number } | null;
      const { rows } = await one<{ rows: { before: Side; after: Side }[] | null }>(
        "select rows from collection_history where id = $1", [e.id],
      );
      // Pruned by section 7 since `page` was read: nothing left to sum, and nothing to check.
      if (rows === null) return { ok: true, id: e.id, list: [e.copiesUp, e.copiesDown], rows: [] };
      const q = (s: { quantity: number } | null) => s?.quantity ?? 0;
      const up = rows.reduce((n, r) => n + Math.max(q(r.after) - q(r.before), 0), 0);
      const down = rows.reduce((n, r) => n + Math.max(q(r.before) - q(r.after), 0), 0);
      return { ok: e.copiesUp === up && e.copiesDown === down, id: e.id, list: [e.copiesUp, e.copiesDown], rows: [up, down] };
    }));
    const wrong = figured.filter((f) => !f.ok);
    check("every listed entry's copies figure is the sum of its own rows",
      wrong.length === 0 && figured.some((f) => f.list[0] > 1 || f.list[1] > 1),
      wrong.length === 0 ? `${figured.length} entries` : JSON.stringify(wrong.slice(0, 3)));
    const printing = randomUUID();
    const fixed = { ...at(C), collectorNumber: "2" };
    await applyCollectionChange(USER, { kind: "edit", rows: [{ ...fixed, quantity: 2, scryfallId: printing, condition: "LP" }] }, { id: randomUUID(), env: process.env });
    const created = await one<{ scryfall_id: string | null; condition: string | null } | undefined>(
      "select scryfall_id, condition from collection_items where user_id = $1 and oracle_id = $2 and collector_number = '2'",
      [USER, C],
    );
    const real = await one<{ scryfall_id: string; set_code: string; collector_number: string; finishes: string[] }>(
      "select scryfall_id, set_code, collector_number, finishes from printings where oracle_id = $1 limit 1", [C],
    );
    const resolved = await resolvePrintings([
      { oracleId: C, setCode: real.set_code, collectorNumber: real.collector_number },
      { oracleId: C, setCode: real.set_code, collectorNumber: "no-such-number" },
      { oracleId: A, setCode: real.set_code, collectorNumber: real.collector_number },
    ]);
    const hit = resolved.get(`${C}|${real.set_code}|${real.collector_number}`);
    check("a printing resolves by its exact card, set and number, and nothing else does",
      resolved.size === 1 && hit?.scryfallId === real.scryfall_id && isDeepStrictEqual(hit?.finishes, real.finishes),
      JSON.stringify([...resolved.keys()]));
    check("a row an edit creates stores the printing and condition the edit named",
      created?.scryfall_id === printing && created?.condition === "LP", JSON.stringify(created));
  } finally {
    // One statement for the ledger: its two self-references are checked at the statement's end.
    await pool.query("delete from collection_history where user_id = $1", [USER]);
    await pool.query("delete from csv_uploads where user_id = $1", [USER]);
    await pool.query("delete from collection_items where user_id = $1", [USER]);
    await pool.query("delete from commander_scores where user_id = $1", [USER]);
    await pool.query("delete from decks where user_id = $1", [USER]);
    await pool.query("delete from user_data_stamps where user_id = $1", [USER]);
  }
}

main()
  .catch((error) => {
    failures += 1;
    console.error(error);
  })
  .finally(async () => {
    await pool.end();
    console.log(failures === 0 ? "\nall checks passed" : `\n${failures} check(s) failed`);
    process.exit(failures === 0 ? 0 : 1);
  });
