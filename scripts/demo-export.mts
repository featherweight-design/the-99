// demo:export: the landing demo's committed data (plan 2026-11-08-public-landing-demo.md, PR 6). It runs the signed-in
// pages' own reads against the fictional fixture (Wren Calloway, `docs/agents/fictional-fixture.md`) and writes what the
// drawing halves take as props into `src/lib/demo/projected.generated.ts`, a committed file the demo reads instead of any
// table. Steps here: 1 collection, 2 commanders, 3 Help me choose (the stored read), 4 the three decks (Ashling, Giada,
// Zimone), 5 Analysis (the stored reading) and the Overview (the stored synopsis), 6 Suggested changes (the stored v2 run),
// 7 Giada's Proposed cuts and Zimone's Mana Balance and Top off, 8 Which deck needs it most?. Shopping is still to come.
// Steps 3, the Overview, 6, 7's cuts and 8 read or check the rows the paid run (`demo:generate`) stored, found by the ids its
// summary JSON names, so they need `--run`. The name scan also holds every deck name the source database has (`withSourceDeckNames`).
//
// NO MODEL CALL AND NO CREDIT: never `pressFitsReadAction`, never a run. But some reads here WRITE on the scratch branch, as
// the signed-in surface's do when a player opens it, so even the dry run is not read-only to the database; it never writes
// a file without `--write`. The reads that write:
//   - `readTuningState` and `readSynopsisState`: reap an abandoned run.
//   - `readStoredReading`: rebuilds and stores a reading an older PROFILE_VERSION wrote, as the page does.
//   - `loadCutsPanel` (`readCutsPanel`'s read): reaps the deck's stale cuts runs (refunding their pending calls) and records
//     History's count row (`recordToolCount`, `deck_tool_counts`).
//   - `loadManaPanel` (`readManaBalance`'s read): records History's count row (`recordToolCount`).
//   - `readFitsRead` (`readFitsReadAction`'s read): reaps the reader's stale reads of the card (`reapFitsReads`).
// It needs a database, and takes it from THE SHELL ONLY, as `demo:generate` does:
//
//   DEMO_DATABASE_URL='<the fixture branch's connection string>' pnpm demo:export --run scripts/out/demo-generate-<ts>.json
//                                         # dry run: checks, prints, writes no file (without --run, steps 3, Overview, 6, 7's cuts and 8 are skipped)
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
import { SHARED } from "./lib/fictional-fixture/cast";
import { assertScratchBranch } from "./lib/scratch-branch.mjs";
import { withSourceDeckNames } from "./lib/demo-scan-rules";
import { scanNames } from "../src/lib/demo/name-scan";
import { encodeDemo } from "../src/lib/demo/wire";

const OUT = fileURLToPath(new URL("../src/lib/demo/projected.generated.ts", import.meta.url));
/** How many cards and commanders the demo shows: the boards draw a handful, and a longer list only costs the visitor bytes. */
const COLLECTION_WINDOW = 24;
const COMMANDER_WINDOW = 12;

const args = parseArgs({ options: { write: { type: "boolean", default: false }, run: { type: "string" } } }).values;

// `--run scripts/out/demo-generate-<timestamp>.json`: the paid run's summary, which names the stored row each model tool
// wrote (`steps[].stored`). Steps 3 (Help me choose), 5's Overview, 6 (Suggested changes), 7's Proposed cuts and 8 (Which
// deck) read or check those rows by id, so they need it; without it a dry run lists them as skipped and `--write` refuses.
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

// --- Step 4: the three decks, read as `/decks/[id]` reads each (src/app/decks/[id]/page.tsx). -------------------------
// Ashling (played, exactly 100), Giada (over) and Zimone (under): the cast's decks (`fictional-fixture/cast.ts`). The page's
// cached wrappers (`loadInDeckPartnersCached`, `readDeckSynergy`) need Next's data cache, which a script has not got, so
// their uncached loaders are called with the same arguments. The price read takes the deck's rows and commanders, plus
// Zimone's unowned Top off candidates, as the page's does; not the Add panel's suggestions, which the demo does not draw.
const { getDeckDetail } = await import("../src/lib/decks/read");
const { loadPrices } = await import("../src/lib/decks/price-query");
const { readHeldPricePicks } = await import("../src/lib/decks/printings");
const { loadInDeckPartners, loadCompletionPartners } = await import("../src/lib/combos/near-miss");
const { readSynergyCards } = await import("../src/app/commanders/[slug]/synergy-read");
const { chainArt } = await import("../src/lib/cards/chain-art");
const { loadCandidateFacts } = await import("../src/lib/profile/candidate-facts");
const { comboLookupIds } = await import("../src/lib/combos/attach");
const { listLastSlotsCandidates } = await import("../src/lib/decks/last-slots");
const { deckBodySize } = await import("../src/lib/decks/deck-size");
const { projectDeck, projectTopOff } = await import("../src/lib/demo/project-decks");

const DECK_ROLES = ["played", "over", "under"] as const;
/** The page swallows a failed read and draws the row without it; the export may not: a file with no prices, combos or
 *  facts would ship degraded. Each is recorded, so `--write` refuses. */
const soft = <T,>(what: string, read: Promise<T>): Promise<T | null> =>
  read.catch(() => {
    failures.push(`${what}: the read failed`);
    return null;
  });
const deckReads = await Promise.all(DECK_ROLES.map(async (role) => {
  const deckId = ABOUT_DECK_IDS[role];
  // ONE availability read per deck, from its own vantage, handed to the detail as the page hands it.
  const availabilityRead = soft(`${role} deck availability`, loadAvailability(userId, { excludeDeckId: deckId }));
  const detail = await getDeckDetail(deckId, userId, availabilityRead);
  if (!detail) throw new Error(`demo:export: the ${role} deck reads as no deck for its owner; nothing written.`);
  const commanderIds = [detail.commander.oracleId, ...(detail.partner ? [detail.partner.oracleId] : [])];
  const deckOracleIds = detail.cards.map((c) => c.oracleId);
  // Top off's ranked pool, read only when the strip can render (the page's own condition).
  const openSlots = deckBodySize(detail.partner !== null) - detail.total;
  const ranked = openSlots > 0 ? await readSynergyCards(userId, commanderIds, [], true) : [];
  const candidateCards = listLastSlotsCandidates({ ranked, inDeckOracleIds: new Set(deckOracleIds) });
  const [priced, inDeckCombos, ownedArt, candidateFacts, completions, availability] = await Promise.all([
    soft(`${role} deck prices`, loadPrices(
      [...new Set([...deckOracleIds, ...commanderIds, ...candidateCards.filter((c) => !c.owned).map((c) => c.oracleId)])],
      await readHeldPricePicks(userId, [deckId]),
    )),
    soft(`${role} deck combo marks`, loadInDeckPartners({ deckOracleIds, commanderOracleIds: commanderIds })),
    ranked.length > 0 ? chainArt(userId, null, ranked.map((c) => c.oracleId)) : new Map<string, string>(),
    candidateCards.length > 0 ? soft(`${role} deck Top off facts`, loadCandidateFacts(candidateCards.map((c) => c.oracleId), deckOracleIds)) : new Map(),
    candidateCards.length > 0
      ? soft(`${role} deck Top off combos`, loadCompletionPartners({ deckOracleIds, commanderOracleIds: commanderIds, candidateOracleIds: comboLookupIds(candidateCards, []) }))
      : new Map(),
    availabilityRead,
  ]);
  return { role, deckId, detail, priced, inDeckCombos, ranked, candidateCards, ownedArt, candidateFacts, completions, availability };
}));
const deckOf = (role: (typeof DECK_ROLES)[number]) => {
  const r = deckReads.find((d) => d.role === role)!;
  return { read: r, deck: projectDeck({ deckId: r.deckId, detail: r.detail, priced: r.priced, inDeckCombos: r.inDeckCombos }) };
};

// Steps 5 and 6 on the played deck: what the builder derives from its rows (`builder-figures.ts`). The label rows and the mix
// as the page settles them: the Jobs card's labels over the deck's cards (`settleLabelRead`), and the mix the shelves count
// against. The page takes that mix from its suggestions read (`resolveSuggestionBasis`), which computes the whole owned
// pool to get it; `loadDeckMix` with the labels basis is the same answer without the pool: both call
// `loadSkeletonForCommanders` on the deck's commander and partner, the union of their color identities and the "labels"
// basis (`resolveSuggestionBasis` takes "labels" unless its pool label read throws, `loadPoolRoleBasis`), and both hand
// the skeleton to `recommendedMix` with the deck's partner flag. When the deck's own label read failed, the page and this
// both take the classifier's (`loadDeckMix(..., "classifier")`). The permits are the header's stored read
// (`readStoredPermits`).
const { loadStatsLabels } = await import("../src/lib/decks/stats-labels");
const { loadJobRows } = await import("../src/lib/decks/job-rows");
const { settleLabelRead } = await import("../src/lib/decks/label-read-settle");
const { loadDeckMix } = await import("../src/lib/decks/deck-mix");
const { readStoredPermits } = await import("../src/lib/profile/stored");
const { projectPlayedDeck } = await import("../src/lib/demo/project-decks");
const played = deckOf("played");
const playedCards = played.read.detail.cards;
const labelRead = await loadJobRows(playedCards, await loadStatsLabels(playedCards));
const settled = settleLabelRead([labelRead], playedCards.map((c) => c.oracleId));
if (labelRead === null) failures.push("played deck labels: the read failed (the run figures would count by the classifier)");
const playedMix = await loadDeckMix(played.read.deckId, userId, settled.classifierTargets ? "classifier" : "labels");
const decks = {
  played: projectPlayedDeck(played.deck, {
    detail: played.read.detail,
    labelRows: settled.rows,
    mix: playedMix,
    permits: await readStoredPermits(played.read.deckId, userId),
  }),
  over: deckOf("over").deck,
  under: deckOf("under").deck,
};

// --- Step 7: Giada's Proposed cuts, Zimone's Mana Balance and Top off. ----------------------------------------------------
// The panels' own reads behind their actions (`readCutsPanel`, `readManaBalance`), called with the owner since a script has
// no session. Both WRITE (see the header). Top off is the page's assembly over the under deck's reads above.
const { loadCutsPanel } = await import("../src/lib/tuning/cuts-panel-read");
const { loadManaPanel } = await import("../src/lib/tuning/mana-panel-read");
const { projectCuts, projectMana } = await import("../src/lib/demo/project-decks");
const cuts = projectCuts(await loadCutsPanel(ABOUT_DECK_IDS.over, userId, env));
// The named cuts are the paid run's (`demo:generate`'s look-deeper step): the panel's newest run must be that run, settled ok.
const lookDeeperRun = storedId("look-deeper", "deck_suggestion_runs");
if (!lookDeeperRun) skipped.push("look-deeper (needs --run)");
else if (cuts.run?.id !== lookDeeperRun || cuts.run.status !== "ok") failures.push(`Proposed cuts: the panel's newest run is not the stored run ${lookDeeperRun}, settled ok`);
if (cuts.items.length === 0) failures.push("Proposed cuts: the panel names no cuts");
if (cuts.over <= 0) throw new Error(`demo:export: the over deck is not over (${cuts.total} cards); nothing written.`);
const mana = projectMana(await loadManaPanel(ABOUT_DECK_IDS.under, userId));
const under = deckReads.find((r) => r.role === "under")!;
const topOff = projectTopOff({
  cards: decks.under.cards,
  detail: under.detail,
  ranked: under.ranked,
  candidateCards: under.candidateCards,
  ownedArt: under.ownedArt,
  priced: under.priced,
  availability: under.availability,
  candidateFacts: under.candidateFacts,
  completions: under.completions,
});
if (topOff.openSlots <= 0) throw new Error("demo:export: the under deck has no open slots, so Top off draws nothing; nothing written.");

// --- Step 8: Which deck needs it most?, on the card the fixture shares (`SHARED`, Swords to Plowshares). ------------------
// The two reads the view makes when it opens (`loadFitsAction`, `readFitsReadAction`), called with the owner. Never the
// press (`pressFitsReadAction`): that starts a paid model read. `readFitsRead` WRITES (it reaps; see the header).
const { loadFits } = await import("../src/lib/swaps/fits");
const { readFitsRead } = await import("../src/lib/swaps/fits-read-run");
const { projectFits } = await import("../src/lib/demo/project-decks");
const shared = cards.find((c) => c.name === SHARED);
if (!shared) throw new Error(`demo:export: the collection holds no ${SHARED}, the card step 8 opens; nothing written.`);
const [fitsList, fitsPanel] = await Promise.all([loadFits(userId, shared.oracleId), readFitsRead(userId, shared.oracleId, undefined, env)]);
// The stored read is the paid run's (`demo:generate`'s which-deck step), found by its `fits_reads` id.
const fitsReadId = storedId("which-deck", "fits_reads");
if (!fitsReadId) skipped.push("which-deck (needs --run)");
else if (fitsPanel?.view.stored?.readId !== fitsReadId) failures.push(`Which deck: the stored read is not the run's ${fitsReadId}`);
if (!fitsPanel?.view.stored) failures.push("Which deck: the panel holds no stored read");
if (!fitsList) failures.push("Which deck: the free list did not read");
const fits = projectFits({
  card: { ...shared, availability: availability?.get(shared.oracleId) ?? null },
  panel: fitsPanel,
  read: fitsList,
});

const projected = {
  format: 2,
  collection: projectCollection({ cards, availability, stats, window: COLLECTION_WINDOW }),
  commanders: projectCommanders({ rankings, window: COMMANDER_WINDOW }),
  choose,
  analysis,
  overview,
  suggested,
  decks,
  cuts,
  mana,
  topOff,
  fits,
};
const json = encodeDemo(projected);

// Every deck name the source database holds outside the fixture's: none may reach the file, under any key or inside a
// model's sentence (`withSourceDeckNames`). Read into memory only; a finding prints its path, never the name.
const sourceDeckNames = ((await sql`select distinct name from decks`) as { name: string }[]).map((r) => r.name);
const findings = scanNames(json, withSourceDeckNames(sourceDeckNames));
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
for (const role of DECK_ROLES) console.log(`deck ${role}: ${decks[role].cards.length} rows, ${decks[role].siblings.length} siblings`);
console.log(`cuts: ${cuts.over} over, ${cuts.items.length} named cuts`);
console.log(`mana: ${mana.balance.colors.length} colors counted`);
console.log(`top off: ${topOff.candidates.length} candidates for ${topOff.openSlots} open slots`);
console.log(`fits: ${fits.list.read?.fits.length ?? 0} decks it fits, ${fits.panel?.view.stored ? "a stored read" : "no stored read"}`);
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
