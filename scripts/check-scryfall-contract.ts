/**
 * Canary for Scryfall's bulk-data contract. Touches no database and needs no secrets.
 *
 * The catalog refresh runs weekly, so a breaking upstream change would otherwise go unnoticed
 * for up to 7 days and then surface as a failed refresh (#103: `download_uri` became
 * `jsonl_download_uri` and the payload became gzipped JSONL). Running this daily turns that
 * into a same-day alert.
 */
import { fetchBulkIndex, streamBulkEntries, type BulkType } from "../src/lib/scryfall/bulk";
import { tokenContractFailures } from "../src/lib/tokens/contract";

// Fields the transforms read and cannot work around if they disappear. `layout` is on both
// lists because both transforms exclude on it — losing it would silently ingest tokens and
// emblems rather than fail, which is exactly the kind of quiet break this canary exists for.
const REQUIRED: Record<BulkType, readonly string[]> = {
  // `game_changer` is WotC's Game Changers list as Scryfall republishes it. NOTHING READS
  // THE COLUMN YET — the bracket slot that will treat it as authoritative membership is a
  // later PR — so this is a canary placed ahead of its consumer, deliberately: the field
  // disappearing is silent either way, and the cost of learning that on the day the slot
  // ships is a feature that under-slots every deck holding one of the ~53.
  //
  // The COUNT is deliberately not pinned: the list is maintained by WotC and is meant to
  // change, and a test that failed when they updated it would punish the ingest for
  // working. What is pinned is that the field still exists.
  oracle_cards: [
    "oracle_id", "id", "name", "cmc", "color_identity", "type_line", "legalities", "layout",
    "game_changer",
  ],
  // `booster` and `rarity` carry the set-collection feature: booster is the base-run
  // boundary and rarity is per-printing. The transform maps a missing one to null rather
  // than throwing, which is right for a single odd entry and wrong as a silent outcome for
  // a whole refresh — every set would go "not indexed yet" and the rarity filter would
  // quietly lose cards, with the ingest reporting success. This is where that gets caught.
  default_cards: [
    "oracle_id", "id", "name", "set", "collector_number", "layout", "digital",
    "booster", "rarity",
  ],
};

/** Never rejects: a thrown fetch/parse failure is reported as a type-prefixed failure. */
async function check(type: BulkType): Promise<string[]> {
  try {
    return await run(type);
  } catch (err) {
    return [`${type}: ${err instanceof Error ? err.message : String(err)}`];
  }
}

async function run(type: BulkType): Promise<string[]> {
  const failures: string[] = [];
  const index = await fetchBulkIndex(type);

  // One entry is enough: the bulk files are homogeneous, and downloading the whole thing daily
  // would move ~100MB for no extra signal. The generator is abandoned after the first yield.
  let first: Record<string, unknown> | undefined;
  for await (const entry of streamBulkEntries(index)) {
    first = entry;
    break;
  }
  if (!first) return [`${type}: bulk download decompressed to zero entries`];

  for (const field of REQUIRED[type]) {
    if (!(field in first)) failures.push(`${type}: entry missing required field \`${field}\``);
  }
  if (failures.length === 0) {
    const name = typeof first.name === "string" ? first.name : "<unnamed>";
    console.log(`${type}: ok (${index.compressedSize} bytes compressed, entry \`${name}\`)`);
  }
  // The token chain, separately from the first entry: see `tokenContractFailures`. A fresh stream,
  // because the first-entry read above abandoned its generator.
  if (type === "default_cards") failures.push(...(await tokenContractFailures(streamBulkEntries(index))));
  return failures;
}

async function main(): Promise<void> {
  // Both types are checked even when the first fails, so one alert reports the whole picture.
  const results = await Promise.all((Object.keys(REQUIRED) as BulkType[]).map(check));
  const failures = results.flat();

  if (failures.length > 0) {
    console.error("Scryfall bulk-data contract check FAILED:");
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log("Scryfall bulk-data contract check passed.");
}

main().catch((err) => { console.error(err); process.exit(1); });
