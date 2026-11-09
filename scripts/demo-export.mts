// demo:export, the fixture-projection half of the landing demo's data (plan 2026-11-08-public-landing-demo.md, PR 6a).
// It runs the signed-in pages' own reads against the fictional fixture (Wren Calloway, `docs/agents/fictional-fixture.md`)
// and writes what the drawing halves take as props into `src/lib/demo/projected.generated.ts`, a committed file the
// demo reads instead of any table. Steps 1 (collection) and 2 (commanders) here; the deck, Analysis, Shopping and the
// rest follow in PR 6b, and the stored model outputs come from `demo:generate`'s run.
//
// READ-ONLY IN INTENT: every call is a read the signed-in page makes. (A few of the page reads reap or count on a scratch
// branch; these two do not.) It needs a database, and takes it from THE SHELL ONLY, as `demo:generate` does:
//
//   DEMO_DATABASE_URL='<the fixture branch's connection string>' pnpm demo:export           # dry run: checks, prints, writes nothing
//   DEMO_DATABASE_URL='<...>' pnpm demo:export --write                                      # writes src/lib/demo/projected.generated.ts
//
// It refuses, before the first read: a `.env` that sets `DEMO_DATABASE_URL`; a database whose `neon.branch_id` is
// production, staging or local-dev or is unknown (`assertScratchBranch`); a database that does not hold the fixture's
// five decks at their fixed ids (`ABOUT_DECK_IDS`). It refuses to WRITE when the name scan (`src/lib/demo/name-scan.ts`, with
// the fixture's own lists in `scripts/lib/demo-scan-rules.ts`) finds an email, a handle, an account id or a profile URL in
// the data, or a person or free text outside the fixture's invented names (the two steps here carry none yet). It never prints the connection string, and
// writes no id of a Clerk account: the owner is found from the played deck's own row and used only in memory.
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

const args = parseArgs({ options: { write: { type: "boolean", default: false } } }).values;

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
const { projectCollection, projectCommanders } = await import("../src/lib/demo/project");

const env = await resolveFlagsStrict(userId);
const [{ cards }, stats, availability] = await Promise.all([loadBrowseCards(userId), getCollectionStats(userId), loadAvailability(userId)]);
// The two reads are the page's own and must agree: a place head counting one set of cards over a grid drawn from another is wrong.
if (stats.uniqueCards !== cards.length) {
  throw new Error(`demo:export: the collection stats count ${stats.uniqueCards} distinct cards but the list holds ${cards.length}; nothing written.`);
}
const rankings = await loadCommanderRankings(userId, env);

const projected = {
  format: 1,
  collection: projectCollection({ cards, availability, stats, window: COLLECTION_WINDOW }),
  commanders: projectCommanders({ rankings, window: COMMANDER_WINDOW }),
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
console.log(`name scan: clean. ${text.length} bytes.`);
if (!args.write) {
  console.log("dry run: nothing written. Re-run with --write to write src/lib/demo/projected.generated.ts.");
} else {
  writeFileSync(OUT, text);
  console.log(`wrote ${OUT}`);
}
process.exit(0);
