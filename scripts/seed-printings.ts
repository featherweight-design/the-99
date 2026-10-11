import "./lib/env.mjs";
import { withCatalogIngestLock } from "../src/lib/catalog/ingest-lock";
import { seedPrintings, unsizedRunFailure } from "../src/lib/scryfall/seed-printings";
import type { TokenPublishReport } from "../src/lib/tokens/publish";

function tokenSummary(t: TokenPublishReport): string {
  if (t.status === "skipped") return `Tokens: skipped, ${t.reason}.`;
  const s = t.stats;
  const head = t.status === "published" ? "Tokens: published" : "Tokens: REFUSED";
  return `${head} ${s.tokens} tokens, ${s.tokenPrintings} printings, ${s.links} links from ${s.makers} cards `
    + `(${s.resolvedRefs} of ${s.partRefs} part ids resolved, ${s.unknownMakers} makers not in the catalog).`;
}

// Held for the whole ingest, so a catalog copy can never publish between this run's check and
// its writes, or mid-run (plan `2026-09-28-card-data-replicate.md`, §3 item 8).
withCatalogIngestLock(process.env.DATABASE_URL!, () => seedPrintings())
  .then((r) => {
    console.log(
      `Seeded ${r.upserted} printings (${r.representatives} representative, ` +
      `${r.baseSetSizes} sets sized); ` +
      `skipped ${r.skippedLayout} non-card (tokens, emblems, fronts, planes), ${r.skippedReversible} reversible, ` +
      `${r.skippedOrphan} orphan.`,
    );
    // A run that ingested printings and sized no set is a failed refresh, and it used to
    // report success — the summary said `0 sets sized` in passing and the job went green,
    // while every set on the site read `not indexed yet` (#704). The data is intact either
    // way now; what this adds is that somebody finds out.
    console.log(tokenSummary(r.tokens));
    // A token catalog refused under a floor fails the run too, for the same reason: the printings
    // are intact, and somebody has to find out the token tables did not move.
    const failure = [unsizedRunFailure(r), r.tokens.status === "refused" ? r.tokens.reason : null]
      .filter(Boolean).join("\n\n") || null;
    if (!failure) {
      // Explicitly, as every sibling seed script does: the Neon pool can hold a socket open
      // and the refresh step would sit on it until the workflow's 180-minute timeout.
      process.exit(0);
    }
    // EXITS FROM THE WRITE'S OWN CALLBACK. The explanation is the only thing that tells the
    // next person which remedy to reach for, and `process.exit()` can kill the process
    // before a piped stderr write has drained — a failed job whose reason is missing from
    // the log. Waiting for the flush and then exiting keeps both the message and the
    // termination the pool needs.
    process.stderr.write(`\n${failure}\n`, () => process.exit(1));
  })
  .catch((err) => { console.error(err); process.exit(1); });
