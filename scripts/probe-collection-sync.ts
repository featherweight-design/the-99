// probe:collection-sync — Collection Sync's write against a real Postgres (plan
// `2026-10-15-collection-sync.md`, PR 1), through the real `applyCollectionChange` (kind `sync`), the real
// `readSyncBase` under its lock and the real token writes. The merge itself is pure and unit tested
// (`sync.test.ts`); what only a database can show is the base read, the lock, the refusals writing nothing,
// the summary on the upload, the tokens, and Revert.
//
// Cases:
//   a  Hugh's shape: a Replace of file F, three hand entries (2 new holdings, 1 raised), then a Sync of F
//      with tokens: 0 taken, 3 kept, 0 removed, and the tokens recorded as `upload` rows. A re-sync of the
//      same file: nothing to sync, no entry written, the upload left unconfirmed.
//   b  A conflict: the app raises X to 3 and the file says 2. Undecided refuses; a confirm with no digest,
//      or another one, refuses as stale; answered app keeps 3 (nothing to sync); answered file writes 2. A
//      bulk File decides a conflict past the 500 the review lists.
//   c  Everything removes: a file-side removal of an untouched holding is taken, and a committed deck it
//      would leave short asks first.
//   d  Revert: a Sync's entry holds only its taken and file-answered rows; reverting it puts them back and
//      leaves the kept rows alone; the tokens it recorded stay (G3).
//   e  Anchors: after reverting the last Sync, the base is the one before it; after an Add, it does not move.
//   f  Only what it adds: no removal or lowering is written, tokens are upserted to the greater count and
//      none is deleted, and the base does not move.
//
// The thresholds staleness reads are printed, not asserted (G2: unmeasured).
//
// Mutations to run against it before believing a green (each should fail the case named):
//   - `planSync` taking every file change regardless of the app (`a = b` check dropped): fails a and d.
//   - the `undecided` refusal dropped from `applyCollectionChange`: fails b.
//   - the digest comparison dropped: fails b's stale checks.
//   - `syncTokenMode` returning "replace" for additions: fails f (T1, recorded in d and absent from the file, deleted).
//   - the `syncSummary` write dropped: fails a (the summary) and every later case (no Sync anchors).
//   - `readSyncBase` admitting `reverted_by is not null`: fails e.
//
// It writes under a per-run `user_id` and its own token catalog rows, and purges both in a `finally`, after
// the branch guard: `PROBE_DB_BRANCH` must name the branch `DATABASE_URL` reports, and staging and production
// are refused by id. Point it at a scratch branch from local-dev migrated to 0125.
//
//   PROBE_DB_BRANCH=br-… pnpm probe:collection-sync
import { requireEnv } from "./lib/env.mjs";
import { randomUUID } from "node:crypto";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

import { applyCollectionChange, type ChangeResult, type CollectionChange } from "../src/lib/collection/write";
import { readSyncBase } from "../src/lib/collection/sync-base";
import { STALE_REVERSAL_SHARE, type SyncAnswers, type SyncPick } from "../src/lib/collection/sync";
import type { PendingItem } from "../src/lib/collection/pending";
import type { TokenHolding } from "../src/lib/tokens/ownership";
import { commitVersion } from "../src/lib/decks/versions";
import { purgeAccount } from "../src/lib/account/purge";

neonConfig.webSocketConstructor = ws;

const STAGING_BRANCH = "br-polished-pond-a6e63y0b";
const PRODUCTION_BRANCH = "br-noisy-violet-a6vw4ess";

const { DATABASE_URL, PROBE_DB_BRANCH } = requireEnv(["DATABASE_URL", "PROBE_DB_BRANCH"]);
const pool = new Pool({ connectionString: DATABASE_URL, max: 4 });
const USER = `probe-collection-sync-${Date.now()}`;
// A script has no signed-in reader: it decides switches from the environment, saying so.
const ENV = process.env;
const T: string[] = [randomUUID(), randomUUID(), randomUUID()];
const P: string[] = [randomUUID(), randomUUID(), randomUUID()];
let failures = 0;
let guarded = false;
let tokensMade = false;

function check(label: string, actual: unknown, expected: unknown): boolean {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${ok ? "" : `: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`}`);
  if (!ok) failures += 1;
  return ok;
}
const rows = async <R>(text: string, params: unknown[] = []) => (await pool.query(text, params)).rows as R[];

async function run() {
  const [{ branch }] = await rows<{ branch: string | null }>("select current_setting('neon.branch_id', true) as branch");
  if (!branch || branch !== PROBE_DB_BRANCH || branch === STAGING_BRANCH || branch === PRODUCTION_BRANCH) {
    throw new Error(`refusing to run against ${branch}: this probe writes a collection. Name the scratch branch DATABASE_URL reports as PROBE_DB_BRANCH.`);
  }
  console.log(`branch ${branch} · fixture ${USER}`);
  console.log(`staleness: reversal share over ${STALE_REVERSAL_SHARE}, or nearer an earlier upload (unmeasured, G2)`);
  guarded = true;

  const cards = await rows<{ oracle_id: string; name: string }>(
    "select oracle_id::text, name from cards where type_line not like '%Basic%' order by oracle_id limit 9",
  );
  if (cards.length < 9) throw new Error("the catalog holds fewer than nine cards");
  const [A, B, C, D, E, G, H, X, BULK] = cards.map((c) => c.oracle_id);

  for (let i = 0; i < 3; i += 1) {
    await pool.query("insert into tokens (oracle_id, name, type_line, colors, layout) values ($1, $2, 'Token Creature', '{}', 'token')", [T[i], `Probe Sync ${i}`]);
    await pool.query("insert into token_printings (scryfall_id, token_oracle_id, set_code, collector_number, finishes) values ($1, $2, 'tsyn', $3, '{nonfoil}')", [P[i], T[i], String(i + 1)]);
  }
  tokensMade = true;
  const tok = (i: number, quantity: number): TokenHolding => ({ tokenOracleId: T[i], quantity, printings: [{ tokenPrintingId: P[i], quantity }] });

  const at = (oracleId: string, quantity: number, cn = "1"): PendingItem =>
    ({ oracleId, setCode: "prb", collectorNumber: cn, finish: "nonfoil", condition: "NM", quantity });
  const id = (oracleId: string, cn = "1") => ({ oracleId, setCode: "prb", collectorNumber: cn, finish: "nonfoil" as const });
  const count = async (oracleId: string, cn = "1") => (await rows<{ q: number }>(
    "select quantity::int q from collection_items where user_id = $1 and oracle_id = $2 and set_code = 'prb' and collector_number = $3",
    [USER, oracleId, cn],
  ))[0]?.q ?? 0;
  const entries = async () => (await rows<{ n: number }>("select count(*)::int n from collection_history where user_id = $1", [USER]))[0].n;
  const confirmed = async (uploadId: string) => (await rows<{ c: boolean }>(
    "select confirmed_at is not null c from csv_uploads where id = $1", [uploadId]))[0].c;
  const tokenRows = async () => (await rows<{ t: string; q: number; s: string }>(
    "select token_oracle_id::text t, quantity::int q, source s from token_ownership where user_id = $1 order by token_oracle_id", [USER],
  )).map((r) => `${T.indexOf(r.t)}:${r.s}=${r.q}`).sort();
  const anchorId = async () => {
    const base = await readSyncBase(USER);
    return "anchor" in base ? base.anchor.uploadId : base.unavailable;
  };

  const newUpload = async (items: PendingItem[], tokens?: TokenHolding[]) => {
    const uploadId = randomUUID();
    await pool.query(
      "insert into csv_uploads (id, user_id, filename, row_count, unmatched_count, preview_payload) values ($1, $2, 'probe-sync.csv', $3, 0, $4::jsonb)",
      [uploadId, USER, items.length, JSON.stringify({ pendingItems: items, ...(tokens ? { tokens } : {}) })],
    );
    return uploadId;
  };
  const replace = async (items: PendingItem[], tokens?: TokenHolding[]) => {
    const uploadId = await newUpload(items, tokens);
    const r = await applyCollectionChange(USER, { kind: "replace", items, uploadId, tokens }, { id: randomUUID(), env: ENV });
    if (r.status !== "applied") throw new Error(`replace refused: ${r.status}`);
    return uploadId;
  };
  const edit = (rowsToSet: { oracleId: string; quantity: number; cn?: string }[]) =>
    applyCollectionChange(USER, { kind: "edit", rows: rowsToSet.map((r) => ({ ...id(r.oracleId, r.cn), quantity: r.quantity })) }, { id: randomUUID(), env: ENV });
  type SyncChange = Extract<CollectionChange, { kind: "sync" }>;
  const syncChange = (uploadId: string, items: PendingItem[], o: { tokens?: TokenHolding[]; pick?: SyncPick; answers?: SyncAnswers } = {}): SyncChange =>
    ({ kind: "sync", items, uploadId, tokens: o.tokens, pick: o.pick ?? "everything", answers: o.answers });
  const preview = async (change: SyncChange) => {
    const r = await applyCollectionChange(USER, change, { id: randomUUID(), dryRun: true, env: ENV });
    if (r.status !== "preview" || !r.sync) throw new Error(`preview refused: ${r.status}`);
    return r;
  };
  const confirm = async (change: SyncChange, digest: string | undefined, confirmShort?: Extract<ChangeResult, { status: "wouldShort" }>["decks"]) =>
    applyCollectionChange(USER, { ...change, expectedPlan: digest }, { id: randomUUID(), env: ENV, confirmShort });
  const sync = async (items: PendingItem[], o: { tokens?: TokenHolding[]; pick?: SyncPick; answers?: SyncAnswers } = {}) => {
    const uploadId = await newUpload(items, o.tokens);
    const change = syncChange(uploadId, items, o);
    const p = await preview(change);
    return { uploadId, change, preview: p, result: await confirm(change, p.sync!.planDigest) };
  };

  // ---- a. Hugh's shape ------------------------------------------------------------------------------
  check("setup · Sync has no base before any upload", await anchorId(), "neverUploaded");
  const F = [at(A, 1), at(B, 2), at(C, 1)];
  await replace(F);
  await edit([{ oracleId: D, quantity: 1 }]);
  await edit([{ oracleId: E, quantity: 2 }]);
  await edit([{ oracleId: B, quantity: 3 }]);
  const entriesBeforeA = await entries();
  const a = await sync(F, { tokens: [tok(0, 2)] });
  check("a · the preview: 0 taken, 3 kept, 0 conflicts, noNewer",
    { ...a.preview.sync!.counts, stale: a.preview.sync!.stale, rows: a.preview.rows.length },
    { taken: 0, kept: 3, agreed: 0, unchanged: 2, conflicts: 0, undecided: 0, answeredFile: 0, ignored: 0, stale: "noNewer", rows: 0 });
  check("a · the confirm applies, writing one upload_sync entry with no card rows",
    a.result.status === "applied" ? [a.result.entry.kind, a.result.entry.rows.length, await entries() - entriesBeforeA] : a.result.status,
    ["upload_sync", 0, 1]);
  check("a · nothing removed and the hand entries kept", [await count(A), await count(B), await count(C), await count(D), await count(E)], [1, 3, 1, 1, 2]);
  check("a · the tokens are recorded as upload rows", await tokenRows(), ["0:upload=2"]);
  const [summaryA] = await rows<{ s: unknown }>("select preview_payload -> 'syncSummary' s from csv_uploads where id = $1", [a.uploadId]);
  check("a · the upload carries its summary", summaryA.s, { kept: 3, pick: "everything", decided: 0, answeredFile: 0 });
  check("a · and anchors the next sync", await anchorId(), a.uploadId);

  const again = await sync(F, { tokens: [tok(0, 2)] });
  check("a · a re-sync of the same file previews nothing to sync", again.preview.sync!.nothing, true);
  check("a · and its confirm writes nothing: no entry, the upload unconfirmed",
    [again.result.status, await entries() - entriesBeforeA, await confirmed(again.uploadId)], ["nothingToSync", 1, false]);
  check("a · the base is still the first sync", await anchorId(), a.uploadId);

  // ---- b. A conflict --------------------------------------------------------------------------------
  // The base holds no X: a sync of a file with one takes it (a = b = 0), so the app's 3 and the file's 2
  // below both move from 1.
  const base1 = [...F, at(X, 1)];
  const bBase = await sync(base1);
  check("b · setup: X taken into the base at 1", [bBase.result.status, await count(X)], ["applied", 1]);
  await edit([{ oracleId: X, quantity: 3 }]);
  const F2 = [at(A, 1), at(B, 2), at(C, 1), at(X, 2)];
  const bUpload = await newUpload(F2);
  const undecided = syncChange(bUpload, F2);
  const pu = await preview(undecided);
  check("b · undecided: the preview counts it", [pu.sync!.counts.conflicts, pu.sync!.counts.undecided], [1, 1]);
  const before = await entries();
  check("b · undecided: the confirm refuses and writes nothing",
    [(await confirm(undecided, pu.sync!.planDigest)).status, await count(X), await entries() - before, await confirmed(bUpload)],
    ["undecided", 3, 0, false]);
  const asFile = syncChange(bUpload, F2, { answers: { byKey: { [`${X}|prb|1|nonfoil`]: "file" } } });
  const pf = await preview(asFile);
  check("b · a confirm with no digest is refused as stale", (await confirm(asFile, undefined)).status, "stale");
  check("b · and one with another digest", (await confirm(asFile, pu.sync!.planDigest)).status, "stale");
  check("b · neither wrote anything", [await count(X), await entries() - before, await confirmed(bUpload)], [3, 0, false]);
  const asApp = syncChange(bUpload, F2, { answers: { all: "app" } });
  const pa = await preview(asApp);
  check("b · answered app keeps 3: nothing to sync",
    [(await confirm(asApp, pa.sync!.planDigest)).status, await count(X)], ["nothingToSync", 3]);
  check("b · answered file writes 2",
    [(await confirm(asFile, pf.sync!.planDigest)).status, await count(X)], ["applied", 2]);

  // A bulk File over more conflicts than the review lists.
  const N = 501;
  const cns = Array.from({ length: N }, (_, i) => String(i + 1));
  const bulkBase = [...F2, ...cns.map((cn) => at(BULK, 1, cn))];
  const bulkSeed = await sync(bulkBase);
  check("b · setup: 501 holdings taken into the base", [bulkSeed.result.status, await count(BULK, "501")], ["applied", 1]);
  const raised = await edit(cns.map((cn) => ({ oracleId: BULK, quantity: 3, cn })));
  check("b · setup: the app raises all 501", [raised.status, await count(BULK, "501")], ["applied", 3]);
  const bulk = await sync([...F2, ...cns.map((cn) => at(BULK, 2, cn))], { answers: { all: "file" } });
  check("b · a bulk File decides all 501, the last past the 500 shown",
    [bulk.preview.sync!.counts.conflicts, bulk.preview.sync!.counts.undecided, bulk.result.status, await count(BULK, "501"), await count(BULK, "1")],
    [501, 0, "applied", 2, 2]);

  // ---- c. Everything removes ------------------------------------------------------------------------
  const deck = (await rows<{ id: string }>(
    "insert into decks (user_id, name, commander_oracle_id) values ($1, 'probe collection sync', $2) returning id::text", [USER, H],
  ))[0];
  await pool.query("insert into deck_cards (deck_id, oracle_id, quantity) values ($1, $2, 1)", [deck.id, C]);
  await commitVersion(deck.id, null, undefined, undefined, ENV);
  const F3 = [at(A, 1), at(B, 2), at(X, 2), ...cns.map((cn) => at(BULK, 2, cn))];
  const cUpload = await newUpload(F3);
  const cChange = syncChange(cUpload, F3);
  const pc = await preview(cChange);
  check("c · the file's removal of untouched C is taken", [pc.sync!.counts.taken, pc.rows.map((r) => r.oracleId === C && r.after === null)], [1, [true]]);
  check("c · the preview names the deck it would short", pc.decks.map((d) => d.deckId), [deck.id]);
  const warned = await confirm(cChange, pc.sync!.planDigest);
  check("c · the confirm asks first, writing nothing", [warned.status, await count(C)], ["wouldShort", 1]);
  const removed = await confirm(cChange, pc.sync!.planDigest, warned.status === "wouldShort" ? warned.decks : []);
  check("c · confirmed, C is removed", [removed.status, await count(C)], ["applied", 0]);
  const cAnchor = cUpload;

  // ---- d. Revert ------------------------------------------------------------------------------------
  // The base is F3. A untouched (taken to 1 -> 3), B kept at 3, E kept at 2, G new (taken), D a conflict answered file.
  const F4 = [at(A, 3), at(B, 2), at(X, 2), at(D, 2), at(G, 1), ...cns.map((cn) => at(BULK, 2, cn))];
  const d = await sync(F4, { tokens: [tok(0, 2), tok(1, 1)], answers: { byKey: { [`${D}|prb|1|nonfoil`]: "file" } } });
  check("d · the sync applies", d.result.status, "applied");
  const dRows = d.result.status === "applied" ? d.result.entry.rows.map((r) => [r.oracleId, r.before?.quantity ?? 0, r.after?.quantity ?? 0]) : [];
  check("d · its entry holds only the taken and file-answered rows",
    dRows.sort((x, y) => String(x[0]).localeCompare(String(y[0]))),
    [[A, 1, 3], [D, 1, 2], [G, 0, 1]].sort((x, y) => String(x[0]).localeCompare(String(y[0]))));
  check("d · and records the second token", await tokenRows(), ["0:upload=2", "1:upload=1"].sort());
  if (d.result.status !== "applied") throw new Error("d did not apply");
  const reverted = await applyCollectionChange(USER, { kind: "revert", entryId: d.result.entry.id }, { id: randomUUID(), env: ENV });
  check("d · Revert restores the taken and answered rows",
    [reverted.status, await count(A), await count(D), await count(G)], ["applied", 1, 1, 0]);
  check("d · and leaves the kept rows alone", [await count(B), await count(E)], [3, 2]);
  check("d · the tokens it recorded stay (G3)", await tokenRows(), ["0:upload=2", "1:upload=1"].sort());

  // ---- e. Anchors -----------------------------------------------------------------------------------
  check("e · after reverting the last sync, the base is the one before it", await anchorId(), cAnchor);
  const addUpload = await newUpload([at(H, 1)]);
  const added = await applyCollectionChange(USER, { kind: "add", items: [at(H, 1)], uploadId: addUpload }, { id: randomUUID(), env: ENV });
  check("e · after an Add, the base does not move", [added.status, await anchorId()], ["applied", cAnchor]);

  // ---- f. Only what it adds -------------------------------------------------------------------------
  // The base is F3 (A1 B2 X2 BULK2). The file drops A (untouched: a = b = 1) and lowers X, adds G.
  const F5 = [at(B, 2), at(X, 1), at(G, 1), ...cns.map((cn) => at(BULK, 2, cn))];
  const f = await sync(F5, { pick: "additions", tokens: [tok(0, 1), tok(2, 1)] });
  check("f · the sync applies", f.result.status, "applied");
  check("f · no removal or lowering is written; the addition is", [await count(A), await count(X), await count(G)], [1, 2, 1]);
  check("f · tokens take the greater, add the new, delete none", await tokenRows(), ["0:upload=2", "1:upload=1", "2:upload=1"].sort());
  check("f · the base does not move", await anchorId(), cAnchor);
}

run()
  .catch((err) => { failures += 1; console.error(err); })
  .finally(async () => {
    if (guarded) {
      await purgeAccount(USER).catch((err) => { failures += 1; console.error("purge failed", err); });
      if (tokensMade) {
        await pool.query("delete from token_printings where scryfall_id = any($1::uuid[])", [P]).catch((err) => { failures += 1; console.error(err); });
        await pool.query("delete from tokens where oracle_id = any($1::uuid[])", [T]).catch((err) => { failures += 1; console.error(err); });
      }
    }
    await pool.end();
    console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} failure(s).`);
    process.exit(failures === 0 ? 0 : 1);
  });
