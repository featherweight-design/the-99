// The precon Overview carry-over, against a real Postgres, through the real start and the real
// reads (no model is called). A precon's Overview is written by the build's stub first. Then:
//   THE START: a deck started from that precon carries over its bracket reading (a fresh
//   `deck_profiles` row with its permits) and its Overview: the deck's shown synopsis IS the carried
//   row (`precon_file` set, no allowance unit), `readSynopsisState` calls it fresh, and v0 names it.
//   ONCE: a second carry-over attaches nothing (`has_synopsis`), and a double ARRIVAL (`carryOnArrival`,
//   the landing's inline run, twice) writes nothing more: one reading as stored, one Overview.
//   THE DATE LINE: the carried reading is v0's (number 0), which the verdict says is the precon list's.
//   THE STORED COPY (PR 6): the arrival copies the precon's stored reading (written by the stub build) and
//   its Overview with no compute: the same permits and profile a compute gives, v0's pin, the deck's own
//   id, dated when the Overview was written; a second arrival does nothing; a stored reading that is not
//   fresh copies nothing and says to fall back.
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
// The owner's switches: the Analysis tab, and contract 13 (the stages shape), what production writes.
// The classifier role basis, the one the build below is told: a row of the other basis would not be attached.
const ON = { ...process.env, ANALYSIS_TAB_ENABLED: "true", OVERVIEW_V2_ENABLED: "true", LABEL_ROLE_COUNTS_ENABLED: "" } as NodeJS.ProcessEnv;
const OFF = { ...ON, ANALYSIS_TAB_ENABLED: "" } as NodeJS.ProcessEnv;

let failures = 0;
const check = (label: string, ok: boolean, detail: string) => {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} — ${detail}`);
};

async function main() {
  const { db } = await import("../src/db");
  const { deckCards, deckDataChanges, deckProfiles, deckSynopses, deckVersionSynopses, deckVersions, decks, precons, preconSynopses, cards } = await import("../src/db/schema");
  const { startPreconDeck } = await import("../src/lib/precons/start");
  const { carryOverPreconOverview } = await import("../src/lib/precons/carry-over");
  const { readShownSynopsis } = await import("../src/lib/synopsis/generate");
  const { readSynopsisState } = await import("../src/lib/synopsis/read");
  const { touchDeck } = await import("../src/lib/decks/touch");
  const { overviewDataMovedFor } = await import("../src/lib/notices/overview");
  const { carryOnArrival } = await import("../src/lib/precons/arrival-carry");
  const { readStoredReading, requestProfileDeps } = await import("../src/lib/profile/stored");
  const { analyzedLine } = await import("../src/components/decks/verdict-block");
  const { carryStoredOnArrival } = await import("../src/lib/precons/stored-carry");

  const { rows: [branch] } = await db.execute<{ id: string | null }>(sql`select current_setting('neon.branch_id', true) as id`);
  assertScratchBranch(branch?.id ?? null, "probe:precon-overview-carry");

  // The first plain precon the build orders by, and the second, each with a stub-written Overview.
  const files = (await db.select({ f: precons.fileName }).from(precons).where(sql`${precons.twinOf} is null`).orderBy(precons.fileName).limit(2)).map((r) => r.f);
  const mine = and(eq(preconSynopses.contractVersion, 13), eq(preconSynopses.roleBasis, "classifier"), inArray(preconSynopses.preconFile, files));
  await db.delete(preconSynopses).where(mine);
  // The cleanup's trackers come first, so a setup or build that fails is cleaned up too.
  const made: string[] = [];
  const logged: number[] = [];
  const start = async (file: string) => {
    const id = await startPreconDeck(USER, file, `probe:carry ${file}`);
    made.push(id);
    return id;
  };
  try {
    // A deck data change published BEFORE the build checks its rows: one the carried Overview has seen.
    const [anyCard] = await db.select({ id: cards.oracleId }).from(cards).limit(1);
    const [prior] = await db.insert(deckDataChanges).values({ kind: "gameChanger", direction: "added", oracleIds: [anyCard.id], detail: { probe: USER } }).returning({ seq: deckDataChanges.seq });
    logged.push(prior.seq);
    execFileSync("pnpm", ["-s", "db:build:precon-overviews", "--stub", "--limit", "2"], {
      encoding: "utf8", env: { ...process.env, PRECON_OVERVIEW_DB_URL: process.env.PROBE_DB_URL, PRECON_OVERVIEW_TARGET_BRANCH: branch!.id!, PRECON_OVERVIEW_ROLE_BASIS: "classifier" },
    });
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
    // Ruling 1, on the computing path too (the fallback, and every Precons I own start): both rows carry the
    // date the precon's Overview was written.
    const [srcRow] = await db.select({ createdAt: preconSynopses.createdAt }).from(preconSynopses).where(and(mine, eq(preconSynopses.preconFile, files[0])));
    const [dated] = await db.select({ at: deckProfiles.computedAt }).from(deckProfiles).where(eq(deckProfiles.deckId, deckId));
    check("the computing carry-over dates the reading and the Overview when the precon's Overview was written", dated?.at.getTime() === srcRow.createdAt.getTime() && row.createdAt.getTime() === srcRow.createdAt.getTime(), `reading ${dated?.at.toISOString()}, overview ${row.createdAt.toISOString()}, precon ${srcRow.createdAt.toISOString()}`);

    const again = await carryOverPreconOverview(deckId, USER, ON);
    const [readingAgain] = await db.select().from(deckProfiles).where(eq(deckProfiles.deckId, deckId));
    check("a second carry-over attaches nothing and leaves the reading as it was", !again.attached && again.reason === "has_reading" && readingAgain?.computedAt.getTime() === reading?.computedAt.getTime(), `${JSON.stringify(again)}, computed ${reading?.computedAt.toISOString()} then ${readingAgain?.computedAt.toISOString()}`);
    await carryOnArrival(true, deckId, USER, ON);
    await carryOnArrival(true, deckId, USER, ON);
    const [readingArrived] = await db.select().from(deckProfiles).where(eq(deckProfiles.deckId, deckId));
    const synopses = await db.select({ id: deckSynopses.id }).from(deckSynopses).where(eq(deckSynopses.deckId, deckId));
    check("a double arrival is a no-op: one reading as stored, one Overview", synopses.length === 1 && synopses[0].id === row.id && readingArrived?.computedAt.getTime() === reading?.computedAt.getTime() && readingArrived?.dirty === false, `synopses ${synopses.length}, computed ${readingArrived?.computedAt.toISOString()}`);
    const stored = await readStoredReading(deckId, USER, requestProfileDeps(ON));
    check("the carried reading is v0's, and its date line says the precon list", stored?.versionNumber === 0 && analyzedLine(stored.analyzedAt, new Date(), stored.fresh, stored.versionNumber).startsWith("Analysis from the precon list · "), `version ${stored?.versionNumber}, fresh ${stored?.fresh}`);

    // THE STORED COPY: a fresh deck of the same precon, copied from the stored reading with no compute.
    const copied = await start(files[0]);
    const [src] = await db.select().from(preconSynopses).where(and(mine, eq(preconSynopses.preconFile, files[0])));
    const c1 = await carryStoredOnArrival(copied, USER, ON);
    const [cp] = await db.select().from(deckProfiles).where(eq(deckProfiles.deckId, copied));
    const [cs] = await db.select().from(deckSynopses).where(eq(deckSynopses.deckId, copied));
    check("the arrival copies the stored reading and Overview", c1.kind === "copied" && c1.overview && !!cp && !!cs && cs.preconFile === files[0] && cs.modelCallId === null, JSON.stringify(c1));
    check("the copy is the reading a compute gives this deck", !!cp && JSON.stringify(cp.permits) === JSON.stringify(reading?.permits) && cp.fingerprint === reading?.fingerprint && cp.profile.fingerprint === reading?.profile.fingerprint && cp.profile.deckId === copied && !cp.dirty, `permits ${JSON.stringify(cp?.permits)} vs ${JSON.stringify(reading?.permits)}`);
    const copiedStored = await readStoredReading(copied, USER, requestProfileDeps(ON));
    check("pinned to v0, fresh, and dated when the precon's Overview was written", copiedStored?.versionNumber === 0 && copiedStored.fresh && copiedStored.analyzedAt.getTime() === src.createdAt.getTime() && cs?.createdAt.getTime() === src.createdAt.getTime(), `version ${copiedStored?.versionNumber}, at ${copiedStored?.analyzedAt.toISOString()} vs ${src.createdAt.toISOString()}`);
    const c2 = await carryStoredOnArrival(copied, USER, ON);
    const synCount = (await db.select({ id: deckSynopses.id }).from(deckSynopses).where(eq(deckSynopses.deckId, copied))).length;
    check("a second arrival does nothing", c2.kind === "nothing" && synCount === 1, JSON.stringify(c2));
    await db.update(preconSynopses).set({ readingProfileVersion: 0 }).where(and(mine, eq(preconSynopses.preconFile, files[0])));
    const stale = await start(files[0]);
    const c3 = await carryStoredOnArrival(stale, USER, ON);
    const [staleRow] = await db.select().from(deckProfiles).where(eq(deckProfiles.deckId, stale));
    check("a stored reading that is not fresh copies nothing and falls back", c3.kind === "fallback" && c3.reason === "not_fresh" && !staleRow, JSON.stringify(c3));
    await db.update(preconSynopses).set({ readingProfileVersion: src.readingProfileVersion }).where(and(mine, eq(preconSynopses.preconFile, files[0])));

    // One edit: a card the deck does not hold, added as every list edit is, through `touchDeck`.
    const [extra] = await db.select({ id: cards.oracleId }).from(cards)
      .where(sql`${cards.oracleId} not in (select oracle_id from deck_cards where deck_id = ${deckId}::uuid)`).limit(1);
    await db.transaction(async (tx) => {
      await tx.insert(deckCards).values({ deckId, oracleId: extra.id, quantity: 1 });
      await touchDeck(tx, deckId);
    });
    const edited = await readSynopsisState(deckId, USER, undefined, new Date(), ON);
    check("after the first edit the same read calls it stale", edited?.stale === true, `stale ${edited?.stale}`);
    // A replayed start's carry-over after that edit: the edit's dirty reading is the owner's to recompute.
    await carryOverPreconOverview(deckId, USER, ON);
    const [replayed] = await db.select({ dirty: deckProfiles.dirty, list: deckProfiles.fingerprint, at: deckProfiles.computedAt }).from(deckProfiles).where(eq(deckProfiles.deckId, deckId));
    check("a replay after the edit leaves the reading as the start stored it, dirty", replayed?.dirty === true && replayed.list === reading?.fingerprint && replayed.at.getTime() === reading?.computedAt.getTime(), `dirty ${replayed?.dirty}, list ${replayed?.list === reading?.fingerprint ? "v0's" : "moved"}, computed ${replayed?.at.toISOString()}`);

    // A deck data change published AFTER the row's last check, on a card the deck holds, while the row
    // still says current: the carried Overview has not seen it, so the data-moved rule reports it.
    const moved = await start(files[0]);
    const [held] = await db.select({ id: deckCards.oracleId }).from(deckCards).where(eq(deckCards.deckId, moved)).limit(1);
    const [change] = await db.insert(deckDataChanges).values({ kind: "gameChanger", direction: "added", oracleIds: [held.id], detail: { probe: USER } }).returning({ seq: deckDataChanges.seq });
    logged.push(change.seq);
    const mv = await carryOverPreconOverview(moved, USER, ON);
    const [mvRow] = await db.select({ seenSeq: deckSynopses.seenSeq }).from(deckSynopses).where(eq(deckSynopses.deckId, moved));
    const movedFor = mvRow ? await overviewDataMovedFor(moved, USER, mvRow.seenSeq) : false;
    check("a change published after the row's check reaches the data-moved rule", mv.attached && !!mvRow && mvRow.seenSeq < change.seq && movedFor, `${JSON.stringify(mv)}, seen ${mvRow?.seenSeq}, change ${change.seq}, moved ${movedFor}`);
    check("and one published before the check counts as seen", !!mvRow && mvRow.seenSeq >= prior.seq, `seen ${mvRow?.seenSeq}, prior ${prior.seq}`);

    await db.update(preconSynopses).set({ current: false }).where(and(mine, eq(preconSynopses.preconFile, files[1])));
    const second = await start(files[1]);
    const nc = await carryOverPreconOverview(second, USER, ON);
    const [ncReading] = await db.select().from(deckProfiles).where(eq(deckProfiles.deckId, second));
    check("a precon whose row is not current: the reading, no Overview", !nc.attached && nc.reason === "not_current" && !!ncReading, `${JSON.stringify(nc)}, reading ${!!ncReading}`);
    const [ncSrc] = await db.select({ createdAt: preconSynopses.createdAt }).from(preconSynopses).where(and(mine, eq(preconSynopses.preconFile, files[1])));
    check("with no Overview attached the reading keeps its own date", !!ncReading && ncReading.computedAt.getTime() !== ncSrc.createdAt.getTime() && Date.now() - ncReading.computedAt.getTime() < 10 * 60_000, `reading ${ncReading?.computedAt.toISOString()}, precon ${ncSrc.createdAt.toISOString()}`);

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
    if (logged.length > 0) await db.delete(deckDataChanges).where(inArray(deckDataChanges.seq, logged));
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
