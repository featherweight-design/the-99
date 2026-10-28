// The precon Overview carry-over, against a real Postgres, through the real start and the real
// reads (no model is called). A precon's Overview is written by the build's stub first. Then:
//   THE START: a deck started from that precon carries over its bracket reading (a fresh
//   `deck_profiles` row with its permits) and its Overview: the deck's shown synopsis IS the carried
//   row (`precon_file` set, no allowance unit), `readSynopsisState` calls it fresh, and v0 names it.
//   ONCE: a second carry-over attaches nothing (`has_synopsis`).
//   THE FIRST EDIT: one card added through `touchDeck` makes the same read call it stale.
//   NOT CURRENT: a deck started from a precon whose row is not current gets the reading, no Overview.
//   ANOTHER BASIS: an owner counting roles by the other basis gets no Overview built at this one.
//   SWITCH OFF: with the Analysis tab off, nothing at all.
// It writes decks under a per-run user id and deletes them, and the precon row it wrote, in a
// `finally`. Scratch branch only (`assertScratchBranch`), named by `PROBE_DB_URL`.
//
//   PROBE_DB_URL=<scratch> pnpm probe:precon-overview-carry
import { requireEnv } from "./lib/env.mjs";
import { assertScratchBranch } from "./lib/scratch-branch.mjs";
import { execFileSync } from "node:child_process";
import { and, eq, inArray, sql } from "drizzle-orm";

requireEnv(["PROBE_DB_URL"]);
process.env.DATABASE_URL = process.env.PROBE_DB_URL;

const USER = `probe-precon-carry-${Date.now()}`;
// The owner's switches: the Analysis tab, and contract 12 (v2 with the benchmarks), what production writes.
// The classifier role basis, the one the build below is told: a row of the other basis would not be attached.
const ON = { ...process.env, ANALYSIS_TAB_ENABLED: "true", OVERVIEW_V2_ENABLED: "true", DECK_BENCHMARKS_ENABLED: "true", LABEL_ROLE_COUNTS_ENABLED: "" } as NodeJS.ProcessEnv;
const OFF = { ...ON, ANALYSIS_TAB_ENABLED: "" } as NodeJS.ProcessEnv;

let failures = 0;
const check = (label: string, ok: boolean, detail: string) => {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} — ${detail}`);
};

async function main() {
  const { db } = await import("../src/db");
  const { deckCards, deckProfiles, deckSynopses, deckVersionSynopses, deckVersions, decks, precons, preconSynopses, cards } = await import("../src/db/schema");
  const { startPreconDeck } = await import("../src/lib/precons/start");
  const { carryOverPreconOverview } = await import("../src/lib/precons/carry-over");
  const { readShownSynopsis } = await import("../src/lib/synopsis/generate");
  const { readSynopsisState } = await import("../src/lib/synopsis/read");
  const { touchDeck } = await import("../src/lib/decks/touch");

  const { rows: [branch] } = await db.execute<{ id: string | null }>(sql`select current_setting('neon.branch_id', true) as id`);
  assertScratchBranch(branch?.id ?? null, "probe:precon-overview-carry");

  // The first plain precon the build orders by, and the second, each with a stub-written Overview.
  const files = (await db.select({ f: precons.fileName }).from(precons).where(sql`${precons.twinOf} is null`).orderBy(precons.fileName).limit(2)).map((r) => r.f);
  const mine = and(eq(preconSynopses.contractVersion, 12), eq(preconSynopses.roleBasis, "classifier"), inArray(preconSynopses.preconFile, files));
  await db.delete(preconSynopses).where(mine);
  execFileSync("pnpm", ["-s", "db:build:precon-overviews", "--stub", "--limit", "2"], {
    encoding: "utf8", env: { ...process.env, PRECON_OVERVIEW_DB_URL: process.env.PROBE_DB_URL, PRECON_OVERVIEW_TARGET_BRANCH: branch!.id!, PRECON_OVERVIEW_ROLE_BASIS: "classifier" },
  });
  const made: string[] = [];
  const start = async (file: string) => {
    const id = await startPreconDeck(USER, file, `probe:carry ${file}`, ON);
    made.push(id);
    return id;
  };
  try {
    const deckId = await start(files[0]);
    const r = await carryOverPreconOverview(deckId, USER, ON);
    check("a started deck carries over its precon's Overview", r.attached, JSON.stringify(r));
    const [reading] = await db.select().from(deckProfiles).where(eq(deckProfiles.deckId, deckId));
    check("and its bracket reading, fresh, with its permits", !!reading && !reading.dirty && Array.isArray(reading.permits) && reading.permits.length > 0, `dirty ${reading?.dirty}, permits ${JSON.stringify(reading?.permits)}`);
    const shown = await readShownSynopsis(deckId, USER);
    const [row] = await db.select().from(deckSynopses).where(eq(deckSynopses.deckId, deckId));
    check("the shown synopsis is the carried row, with no allowance unit", shown?.id === row?.id && row.preconFile === files[0] && row.modelCallId === null, `shown ${shown?.id}, precon ${row?.preconFile}, call ${row?.modelCallId}`);
    const fresh = await readSynopsisState(deckId, USER, undefined, new Date(), ON);
    check("the deck page's read calls it fresh", fresh?.stale === false, `stale ${fresh?.stale}`);
    const [v0] = await db.select({ id: deckVersions.id }).from(deckVersions).where(eq(deckVersions.deckId, deckId));
    const [pin] = await db.select().from(deckVersionSynopses).where(eq(deckVersionSynopses.versionId, v0.id));
    check("v0 names the carried Overview", pin?.synopsisId === row.id, `pin ${pin?.synopsisId}`);

    const again = await carryOverPreconOverview(deckId, USER, ON);
    check("a second carry-over attaches nothing", !again.attached && again.reason === "has_synopsis", JSON.stringify(again));

    // One edit: a card the deck does not hold, added as every list edit is, through `touchDeck`.
    const [extra] = await db.select({ id: cards.oracleId }).from(cards)
      .where(sql`${cards.oracleId} not in (select oracle_id from deck_cards where deck_id = ${deckId}::uuid)`).limit(1);
    await db.transaction(async (tx) => {
      await tx.insert(deckCards).values({ deckId, oracleId: extra.id, quantity: 1 });
      await touchDeck(tx, deckId);
    });
    const edited = await readSynopsisState(deckId, USER, undefined, new Date(), ON);
    check("after the first edit the same read calls it stale", edited?.stale === true, `stale ${edited?.stale}`);

    await db.update(preconSynopses).set({ current: false }).where(and(mine, eq(preconSynopses.preconFile, files[1])));
    const second = await start(files[1]);
    const nc = await carryOverPreconOverview(second, USER, ON);
    const [ncReading] = await db.select().from(deckProfiles).where(eq(deckProfiles.deckId, second));
    check("a precon whose row is not current: the reading, no Overview", !nc.attached && nc.reason === "not_current" && !!ncReading, `${JSON.stringify(nc)}, reading ${!!ncReading}`);

    // An owner on the OTHER role basis: the reading is theirs, and the classifier's Overview is not attached.
    const labelsDeck = await start(files[0]);
    const lb = await carryOverPreconOverview(labelsDeck, USER, { ...ON, LABEL_ROLE_COUNTS_ENABLED: "true" } as NodeJS.ProcessEnv);
    check("an owner on the other role basis gets no Overview", !lb.attached && lb.reason === "none", JSON.stringify(lb));

    const third = await start(files[0]);
    const off = await carryOverPreconOverview(third, USER, OFF);
    const [offReading] = await db.select().from(deckProfiles).where(eq(deckProfiles.deckId, third));
    const [offRow] = await db.select().from(deckSynopses).where(eq(deckSynopses.deckId, third));
    check("with the Analysis tab off, nothing at all", !off.attached && off.reason === "off" && !offReading && !offRow, JSON.stringify(off));
  } finally {
    if (made.length > 0) await db.delete(decks).where(inArray(decks.id, made));
    await db.execute(sql`delete from user_data_stamps where user_id = ${USER}`);
    await db.delete(preconSynopses).where(mine);
  }
  console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
