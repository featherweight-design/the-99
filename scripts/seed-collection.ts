import "dotenv/config";
import { eq, sql } from "drizzle-orm";

/**
 * `pnpm db:seed:collection` — import a ManaBox-shaped CSV straight into collection_items.
 *
 *   --file <path>     default data/the-vault.csv
 *   --user <clerkId>  required
 *   --dry-run         parse, match and report; write nothing
 *
 * Exists because migration 0008 re-keys every collection_items row, so the collection has to
 * be re-imported, and doing that through /collection/replace needs a browser and a Clerk
 * session. It runs the same parse → match → aggregate → delete-then-insert path the server
 * action runs, so it is a test of that path rather than a parallel one.
 */

type Args = { file: string; user: string | null; dryRun: boolean };

function parseArgs(argv: string[]): Args {
  const args: Args = { file: "data/the-vault.csv", user: null, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--file") args.file = argv[++i] ?? "";
    else if (argv[i] === "--user") args.user = argv[++i] ?? null;
    else if (argv[i] === "--dry-run") args.dryRun = true;
    else throw new Error(`unknown argument "${argv[i]}"`);
  }
  return args;
}

/** Host only — the connection string carries the password. */
function databaseHost(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  try {
    return new URL(url).host;
  } catch {
    return "<unparseable DATABASE_URL>";
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  // Wiping the wrong branch's collection is the only destructive thing this script can do.
  if (!args.user) {
    throw new Error("--user <clerkId> is required (the collection belongs to exactly one user)");
  }

  const { parseCollectionCsv } = await import("../src/lib/manabox/parse");
  const { loadMatchInputs, replaceCollection } = await import("../src/lib/collection/import");
  const { matchRows } = await import("../src/lib/collection/match");
  const { aggregatePendingItems, totalQuantity } = await import("../src/lib/collection/pending");
  const { readCsv } = await import("../src/lib/collection/seed-collection");
  const { db } = await import("../src/db");
  const { collectionItems } = await import("../src/db/schema");

  const { rows, errors } = parseCollectionCsv(readCsv(args.file));
  const { catalog, indexes } = await loadMatchInputs(rows);
  const { matched, skipped, unmatched } = matchRows(rows, catalog, indexes);
  const items = aggregatePendingItems(matched);

  const [{ count: existing }] = await db
    .select({ count: sql<number>`coalesce(sum(${collectionItems.quantity}), 0)::int` })
    .from(collectionItems)
    .where(eq(collectionItems.userId, args.user));

  console.log(`database:   ${databaseHost()}`);
  console.log(`user:       ${args.user} (currently ${existing} cards)`);
  console.log(`file:       ${args.file} — ${rows.length + errors.length} rows read`);
  console.log(`imported:   ${totalQuantity(items)} cards in ${items.length} holdings`);
  console.log(`skipped:    ${skipped.length} token and emblem rows (by design)`);
  console.log(`unmatched:  ${unmatched.length} rows`);
  console.log(`parse errs: ${errors.length} rows`);

  if (args.dryRun) {
    console.log("dry run — nothing written.");
    return;
  }
  if (items.length === 0) {
    throw new Error("no matched cards; refusing to replace the collection");
  }
  await replaceCollection(args.user, items);
  console.log(`replaced ${existing} cards with ${totalQuantity(items)}.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => { console.error(err); process.exit(1); });
