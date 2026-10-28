// A carried-over precon overview counts toward nothing that counts model calls, proved against a
// real Postgres.
//
// A deck started from a precon can carry over that precon's pre-written overview as its own
// synopsis (`deck_synopses.precon_file` set). No model was called for that deck, so the row holds no
// allowance unit: `model_call_id` is null, and no `model_calls` row is written. This probe writes one
// such row for a real started deck and reads every figure that counts calls before and after:
//   THE PLAYER'S ALLOWANCE: `readAllowance` (used, limit and credits), the figure Credits draws.
//   THE FREE METHOD REWRITE: `freeRunsFor`, whose attempts decide whether the deck may rewrite free.
//   THE ADMIN COSTS PAGE: the month's runs by day and origin, and its run rows (`dayRowsQuery`,
//   `callRowsQuery`).
//   THE LEDGER: `model_calls`, counted whole.
// Each must be unchanged, while the deck's shown overview IS the carried row (or the check has
// proved nothing). It also checks the schema refuses a run with neither a call nor a precon.
//
// It writes one deck under a per-run user id and deletes it in a `finally`. It runs on a scratch
// branch only (`assertScratchBranch`), named by `PROBE_DB_URL`. No model is called.
//
//   PROBE_DB_URL=<scratch> pnpm probe:precon-overview-ledger
import { requireEnv } from "./lib/env.mjs";
import { assertScratchBranch } from "./lib/scratch-branch.mjs";
import { eq, sql } from "drizzle-orm";

requireEnv(["PROBE_DB_URL"]);
// After the env import, which overrides DATABASE_URL from `.env`; the client is loaded dynamically
// below so it reads this value.
process.env.DATABASE_URL = process.env.PROBE_DB_URL;

const USER = `probe-precon-ledger-${Date.now()}`;

let failures = 0;
const check = (label: string, ok: boolean, detail: string) => {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} — ${detail}`);
};

async function main() {
  const { db } = await import("../src/db");
  const { decks, deckSynopses } = await import("../src/db/schema");
  const { startPreconDeck, preparePreconDeck } = await import("../src/lib/precons/start");
  const { listFingerprint } = await import("../src/lib/profile/fingerprint");
  const { readAllowance } = await import("../src/lib/model/allowance");
  const { freeRunsFor } = await import("../src/lib/synopsis/method-notice");
  const { readShownSynopsis } = await import("../src/lib/synopsis/generate");
  const { SYNOPSIS_CONTRACT_VERSION_V2_BENCHMARKS } = await import("../src/lib/synopsis/limits");
  const { callRowsQuery, dayRowsQuery } = await import("../src/lib/admin/costs");

  const { rows: [branch] } = await db.execute<{ id: string | null }>(sql`select current_setting('neon.branch_id', true) as id`);
  assertScratchBranch(branch?.id ?? null, "probe:precon-overview-ledger");

  const { rows: [precon] } = await db.execute<{ file_name: string }>(sql`
    select file_name from precons where twin_of is null order by release_date desc, file_name limit 1`);
  if (!precon) throw new Error("no precon on this branch");

  const deckId = await startPreconDeck(USER, precon.file_name, "probe:precon-overview-ledger", process.env);
  try {
    const prepared = await preparePreconDeck(precon.file_name);
    const monthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));
    const monthEnd = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() + 1, 1));
    const figures = async () => ({
      allowance: await readAllowance(USER, new Date(), "synopsis"),
      freeRuns: await freeRunsFor(db, deckId),
      costDays: (await dayRowsQuery(monthStart, monthEnd)).map((r) => [r.day, r.origin, r.runs, String(r.micro)]).sort(),
      costRuns: (await callRowsQuery(monthStart, monthEnd)).length,
      ledger: (await db.execute<{ n: number }>(sql`select count(*)::int as n from model_calls`)).rows[0].n,
      mine: (await db.execute<{ n: number }>(sql`select count(*)::int as n from model_calls where user_id = ${USER}`)).rows[0].n,
    });
    const before = await figures();

    // The carry-over's own shape: done, survived, no unit, the precon named. The content is the
    // smallest the shown-overview read accepts (an ok Overview verdict); the probe is about the
    // ledger, not the words.
    const [carried] = await db.insert(deckSynopses).values({
      deckId,
      userId: USER,
      fingerprint: listFingerprint(prepared),
      contractVersion: SYNOPSIS_CONTRACT_VERSION_V2_BENCHMARKS,
      model: "probe",
      modelCallId: null,
      preconFile: precon.file_name,
      status: "done",
      outcome: "survived",
      content: { verdicts: [{ section: "overview", status: "ok" }] } as never,
    }).returning({ id: deckSynopses.id });

    const after = await figures();
    const shown = await readShownSynopsis(deckId, USER);
    check("the deck shows the carried-over overview", shown?.id === carried.id, `shown ${shown?.id ?? "none"}, carried ${carried.id}`);
    check("the allowance is unchanged", JSON.stringify(after.allowance) === JSON.stringify(before.allowance), `used ${before.allowance.used} -> ${after.allowance.used}, limit ${before.allowance.limit} -> ${after.allowance.limit}`);
    check("freeRunsFor counts no attempt", after.freeRuns.attempts === 0 && !after.freeRuns.succeeded, JSON.stringify(after.freeRuns));
    check("the Costs page's day figures are unchanged", JSON.stringify(after.costDays) === JSON.stringify(before.costDays), `${before.costDays.length} -> ${after.costDays.length} rows`);
    check("the Costs page's run rows are unchanged", after.costRuns === before.costRuns, `${before.costRuns} -> ${after.costRuns}`);
    check("no model_calls row was written", after.ledger === before.ledger && after.mine === 0, `ledger ${before.ledger} -> ${after.ledger}, this user's ${after.mine}`);

    let refused = false;
    try {
      await db.insert(deckSynopses).values({
        deckId, userId: USER, fingerprint: "x", contractVersion: 12, model: "probe", modelCallId: null, preconFile: null, status: "done", outcome: "survived",
      });
    } catch (e) {
      refused = String((e as { cause?: unknown }).cause ?? e).includes("deck_synopses_call_or_precon_check");
    }
    check("the schema refuses a run with neither a call nor a precon", refused, refused ? "refused by deck_synopses_call_or_precon_check" : "accepted");
  } finally {
    await db.delete(decks).where(eq(decks.id, deckId));
  }
  console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
