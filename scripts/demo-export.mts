// demo:export: the landing demo's committed data (plan 2026-11-08-public-landing-demo.md, PR 6). It runs the signed-in
// pages' own reads against the fictional fixture (Wren Calloway, `docs/agents/fictional-fixture.md`) and writes what the
// drawing halves take as props into `src/lib/demo/projected.generated.ts`, a committed file the demo reads instead of any
// table. Steps here: 1 collection, 2 commanders, 3 Help me choose (the stored read), 5 Analysis (the stored reading) and
// the Overview (the stored synopsis), 6 Suggested changes (the stored v2 run). The deck, cuts, Mana Balance, Top off,
// Shopping and Which deck steps (4, 7, 8) are PR 6b's. Steps 3, the Overview and 6 read the rows the paid run
// (`demo:generate`) stored, found by the ids its summary JSON names, so they need `--run`.
//
// A few reads here write on a scratch branch, as the signed-in page's do (`readSynopsisState` and `readTuningState` reap an
// abandoned run), so even the dry run is not read-only to the database; it never writes a file without `--write`.
// It needs a database, and takes it from THE SHELL ONLY, as `demo:generate` does:
//
//   DEMO_DATABASE_URL='<the fixture branch's connection string>' pnpm demo:export --run scripts/out/demo-generate-<ts>.json
//                                         # dry run: checks, prints, writes no file (without --run, steps 3, Overview, 6 are skipped)
//   DEMO_DATABASE_URL='<...>' pnpm demo:export --run scripts/out/demo-generate-<ts>.json --write   # writes src/lib/demo/projected.generated.ts
//
// It refuses, before the first read: a `.env` that sets `DEMO_DATABASE_URL`; a database whose `neon.branch_id` is
// production, staging or local-dev or is unknown (`assertScratchBranch`); a database that does not hold the fixture's
// five decks at their fixed ids (`ABOUT_DECK_IDS`). It refuses to WRITE without `--run`, when the name scan
// (`src/lib/demo/name-scan.ts`, with the fixture's own lists in `scripts/lib/demo-scan-rules.ts`) finds an email, a handle,
// an account id or a profile URL in the data (or a person or free text outside the fixture's invented names), when a stored
// read is not done, or when the collection stats and the list disagree. It never prints the connection string, and writes
// no id of a Clerk account: the owner is found from the played deck's own row and used only in memory.
import "./lib/env.mjs";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { neon } from "@neondatabase/serverless";
import { ENV_PATH } from "./lib/env.mjs";
import { ABOUT_DECK_IDS } from "./lib/fictional-fixture/rng";
import { assertScratchBranch } from "./lib/scratch-branch.mjs";
import { demoScanRules } from "./lib/demo-scan-rules";
import { scanNames } from "../src/lib/demo/name-scan";
import { encodeDemo } from "../src/lib/demo/wire";

const OUT = fileURLToPath(new URL("../src/lib/demo/projected.generated.ts", import.meta.url));
/** How many cards and commanders the demo shows: the boards draw a handful, and a longer list only costs the visitor bytes. */
const COLLECTION_WINDOW = 24;
const COMMANDER_WINDOW = 12;

const args = parseArgs({ options: { write: { type: "boolean", default: false }, run: { type: "string" } } }).values;

// `--run scripts/out/demo-generate-<timestamp>.json`: the paid run's summary, which names the stored row each model tool
// wrote (`steps[].stored`). Steps 3 (Help me choose), 5's Overview and 6 (Suggested changes) read those rows by id, so they
// need it; without it a dry run lists them as skipped and `--write` refuses (a file missing three steps would ship).
type RunSummary = { steps: { step: string; status: string; stored: Record<string, string | null> | null }[] };
const run: RunSummary | null = args.run ? (JSON.parse(readFileSync(args.run, "utf8")) as RunSummary) : null;
if (args.write && !run) throw new Error("demo:export --write needs --run <the paid run's summary JSON>: the model tools' stored rows are found by it.");
const storedId = (step: string, key: string): string | null => run?.steps.find((r) => r.step === step && r.status === "ok")?.stored?.[key] ?? null;
// Help me choose's wish is the one `demo:generate` typed; read from its source so the two cannot drift.
const generateSource = readFileSync(fileURLToPath(new URL("./demo-generate.mjs", import.meta.url)), "utf8");
const WISH = /const WISH = "([^"]+)";/.exec(generateSource)?.[1];
if (!WISH) throw new Error("demo:export: could not find `const WISH = \"...\"` in scripts/demo-generate.mjs.");

// --- The database: the shell's, never `.env`'s. -------------------------------------------------------------------
const dotenvText = existsSync(ENV_PATH) ? readFileSync(ENV_PATH, "utf8") : "";
if (/^\s*(export\s+)?DEMO_DATABASE_URL\s*=/m.test(dotenvText)) {
  throw new Error("demo:export: .env sets DEMO_DATABASE_URL. Take it out; it is read from the shell only.");
}
const DB_URL = process.env.DEMO_DATABASE_URL?.trim();
if (!DB_URL) throw new Error("demo:export: set DEMO_DATABASE_URL in this shell to the fixture branch's connection string (never read from .env).");
const sql = neon(DB_URL);
const [{ branch }] = (await sql`select current_setting('neon.branch_id', true) as branch`) as { branch: string | null }[];
assertScratchBranch(branch, "demo:export");
console.log(`database: neon branch ${branch} (not production, staging or local-dev)`);

// The fixture: the five decks at their fixed ids, all one owner. The owner's id stays in memory.
const ids = Object.values(ABOUT_DECK_IDS);
const owners = (await sql`select distinct user_id from decks where id = any(${ids}::uuid[])`) as { user_id: string }[];
const have = (await sql`select count(*)::int as n from decks where id = any(${ids}::uuid[])`) as { n: number }[];
if (have[0].n !== ids.length || owners.length !== 1) {
  throw new Error(`demo:export: this database does not hold the fictional fixture (${have[0].n} of ${ids.length} decks, ${owners.length} owners). Run pnpm fixtures:about on a scratch branch first.`);
}
const userId = owners[0].user_id;

// `src/db` reads DATABASE_URL at import, so it is set (over `.env`'s) before any loader is imported. Every loader and every
// module that reaches `src/db` is imported dynamically below, after this line; a static import of one would read `.env`'s.
process.env.DATABASE_URL = DB_URL;
const { loadBrowseCards } = await import("../src/lib/collection/browse-read");
const { loadAvailability } = await import("../src/lib/decks/availability-query");
const { getCollectionStats } = await import("../src/lib/home/summary");
const { loadCommanderRankings } = await import("../src/lib/commanders/rankings");
const { resolveFlagsStrict } = await import("../src/lib/flags/snapshot");
const { projectAnalysis, projectChoose, projectCollection, projectCommanders, projectOverview, projectSuggested } = await import("../src/lib/demo/project");
const { loadTheRead } = await import("../src/lib/intake/run-store");
const { loadResultsPage } = await import("../src/lib/intake/rows");
const { loadReadDecks } = await import("../src/lib/intake/the-read-load");
const { loadIntakeThemes } = await import("../src/lib/intake/search");
const { answersOf, emptyParams } = await import("../src/lib/intake/params");
const { trialFigureRows } = await import("../src/lib/intake/trial-rows");
const { readStoredReading } = await import("../src/lib/profile/stored");
const { loadDeckProfile } = await import("../src/lib/profile/load");
const { computeReadingBenchmarks } = await import("../src/lib/benchmarks/reading");
const { readSynopsisState } = await import("../src/lib/synopsis/read");
const { readTuningState, tuningInputs } = await import("../src/lib/decks/tuning-read");

const env = await resolveFlagsStrict(userId);
const [{ cards }, stats, availability] = await Promise.all([loadBrowseCards(userId), getCollectionStats(userId), loadAvailability(userId)]);
// The two reads are the page's own and must agree: a place head counting one set of cards over a grid drawn from another is wrong.
if (stats.uniqueCards !== cards.length) {
  throw new Error(`demo:export: the collection stats count ${stats.uniqueCards} distinct cards but the list holds ${cards.length}; nothing written.`);
}
const rankings = await loadCommanderRankings(userId, env);

const PLAYED = ABOUT_DECK_IDS.played;
const skipped: string[] = [];
/** Anything that would make a committed file wrong rather than merely short: `--write` refuses while there is one. */
const failures: string[] = [];

// Step 3, Help me choose: the stored read's picks order the results; the rows' ownership figures are counted as the list does.
let choose: unknown = null;
const readId = storedId("help-me-choose", "intake_reads");
if (readId) {
  const read = await loadTheRead(readId, userId);
  if (read.kind !== "done") throw new Error(`demo:export: the stored Help me choose read is ${read.kind}, not done.`);
  const params = { ...emptyParams(), words: WISH, readId, results: true };
  const page = await loadResultsPage(userId, answersOf(params), 0, read.result);
  const [decks, themes] = await Promise.all([loadReadDecks(userId), loadIntakeThemes()]);
  // One slice of twelve, as the signed-in list counts them.
  const trials = await trialFigureRows(userId, env, params, page.rows.slice(0, 12).map((r) => r.oracleId));
  const unfilled = page.rows.slice(0, 12).filter((r) => !trials[r.oracleId]).map((r) => r.name);
  if (unfilled.length > 0) failures.push(`Help me choose: no ownership figure for ${unfilled.join(", ")}`);
  choose = projectChoose({ params, page, decks, themes, trials });
} else skipped.push("help-me-choose (needs --run)");

// Step 5, Analysis: the played deck's STORED reading (never a press), with its benchmarks. Plain readers stand in for the
// request's cached ones (`requestProfileDeps`), which need a request.
const profileDeps = { generation: async () => "demo-export", compute: (d: string, u: string) => loadDeckProfile(d, u, env), computeFresh: (d: string, u: string) => loadDeckProfile(d, u, env), env };
const storedReading = await readStoredReading(PLAYED, userId, profileDeps);
if (!storedReading) throw new Error("demo:export: the played deck has no stored analysis; run the fixture's analysis step first.");
const analysis = projectAnalysis({ deckId: PLAYED, stored: storedReading, benchmarks: await computeReadingBenchmarks(storedReading.profile) });

// Step 5, the Overview: the played deck's stored overview (`readSynopsisState` reaps an abandoned run: a write the page makes too).
let overview: unknown = null;
if (storedId("overview", "deck_synopses")) {
  const state = await readSynopsisState(PLAYED, userId, profileDeps, new Date(), env);
  if (!state) throw new Error("demo:export: the played deck's overview state did not read.");
  if (state.lastFailed) failures.push("Overview: the deck's newest run failed after the stored overview");
  overview = projectOverview({ deckId: PLAYED, state });
} else skipped.push("overview (needs --run)");

// Step 6, Suggested changes: the stored v2 run, re-opened by its id as History does (`readTuningPanel`'s own two reads).
let suggested: unknown = null;
const runId = storedId("suggested-changes", "deck_suggestion_runs");
if (runId) {
  const inputs = await tuningInputs(PLAYED, userId, env);
  if (!inputs) throw new Error("demo:export: the played deck's tuning inputs did not read.");
  const state = await readTuningState(PLAYED, userId, inputs.fingerprint, new Date(), { allLocked: inputs.allLocked, runId, head: inputs.head }, env);
  // The lines are the NAMED run's: a reopened run carries its ask (`itemsAsk`); anything else is another run or none.
  if (state.itemsAsk?.runId !== runId) failures.push(`Suggested changes: the lines read are not run ${runId}`);
  suggested = projectSuggested({ deckId: PLAYED, runId, state });
} else skipped.push("suggested-changes (needs --run)");

const projected = {
  format: 1,
  collection: projectCollection({ cards, availability, stats, window: COLLECTION_WINDOW }),
  commanders: projectCommanders({ rankings, window: COMMANDER_WINDOW }),
  choose,
  analysis,
  overview,
  suggested,
};
const json = encodeDemo(projected);

const findings = scanNames(json, demoScanRules);
if (findings.length > 0) {
  for (const f of findings) console.error(`name scan: ${f.path}: ${f.why}`);
  throw new Error(`demo:export: the name scan found ${findings.length} problem(s); nothing written.`);
}

const text =
  `// GENERATED by \`pnpm demo:export\` (scripts/demo-export.mts) from the fictional fixture. Do not edit by hand.\n` +
  `// Dates, Maps and Sets are tagged (\`src/lib/demo/wire.ts\`); read it through \`src/lib/demo/projected.ts\`.\n` +
  `export const projectedJson: unknown = ${JSON.stringify(json, null, 1)};\n`;
console.log(`collection: ${projected.collection.cards.length} of ${stats.uniqueCards} cards shown, ${projected.collection.setCount} sets`);
console.log(`commanders: ${projected.commanders.rows.length} of ${projected.commanders.total} shown`);
console.log(`analysis: ${(analysis.reading.profile as { cardCount?: number }).cardCount ?? "?"}-card profile${analysis.reading.benchmarks ? " with benchmarks" : ""}`);
if (skipped.length > 0) console.log(`skipped: ${skipped.join("; ")}`);
console.log(`name scan: clean. ${text.length} bytes.`);
if (args.write && (skipped.length > 0 || failures.length > 0)) {
  for (const f of [...skipped.map((s) => `skipped ${s}`), ...failures]) console.error(`demo:export: ${f}`);
  throw new Error("demo:export: refusing to write a file with a missing or failed step; nothing written.");
}
if (failures.length > 0) for (const f of failures) console.log(`WOULD REFUSE --write: ${f}`);
if (!args.write) {
  console.log("dry run: nothing written. Re-run with --write to write src/lib/demo/projected.generated.ts.");
} else {
  writeFileSync(OUT, text);
  console.log(`wrote ${OUT}`);
}
process.exit(0);
