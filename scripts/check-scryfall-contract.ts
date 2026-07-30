/**
 * Canary for Scryfall's bulk-data contract. Touches no database and needs no secrets.
 *
 * The catalog refresh runs monthly, so a breaking upstream change used to go unnoticed for up
 * to 30 days and then surface as a failed refresh (#103: `download_uri` became
 * `jsonl_download_uri` and the payload became gzipped JSONL). Running this daily turns that
 * into a same-day alert.
 */
import { fetchBulkIndex, streamBulkEntries, type BulkType } from "../src/lib/scryfall/bulk";

// Fields the transforms read and cannot work around if they disappear.
const REQUIRED: Record<BulkType, readonly string[]> = {
  oracle_cards: ["oracle_id", "id", "name", "cmc", "color_identity", "type_line", "legalities"],
  default_cards: ["oracle_id", "id", "name", "set", "collector_number", "layout", "digital"],
};

async function check(type: BulkType): Promise<string[]> {
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
  console.log(`${type}: ok (${index.compressedSize} bytes compressed, entry \`${first.name}\`)`);
  return failures;
}

async function main(): Promise<void> {
  const results = await Promise.allSettled(
    (Object.keys(REQUIRED) as BulkType[]).map((t) => check(t)),
  );
  const failures = results.flatMap((r) =>
    r.status === "fulfilled"
      ? r.value
      : [String(r.reason instanceof Error ? r.reason.message : r.reason)],
  );

  if (failures.length > 0) {
    console.error("Scryfall bulk-data contract check FAILED:");
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log("Scryfall bulk-data contract check passed.");
}

main().catch((err) => { console.error(err); process.exit(1); });
