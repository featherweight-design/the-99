// The draft's commander, proved against a real Postgres by calling the real readers and writers
// (change commander, plan decisions 1–5).
//
// The rule is a comparison: the deck's live commander columns against its newest version's. It is
// unit tested as a TypeScript function and rendered as SQL, and neither says the four places that
// decide "pending" actually agree about a real row. Only a database can: `loadDraftState`, the deck
// list's pending count, the claim read's `pending` flag, and the commit and discard that end the
// draft. Each is read twice, with CHANGE_COMMANDER_ENABLED on and off, because OFF must read
// exactly as the app did before a commander could move.
//
// WHAT IT CANNOT REACH. The pull action and `discardDeckDraft` call `requireUserId()`, so the pull
// guard is read from the code; the discard is exercised through `restoreDraftFromVersion`, the
// function the action calls.
//
// It writes a fixture under a per-run user_id and deletes it in a finally; versions and cards
// cascade. It refuses production, staging and any branch it cannot name.
//
// Run: `pnpm tsx scripts/probe-change-commander-draft.ts` (no package.json entry: that file is
// outside this lane's fence).
// First, and on its own line: src/db reads DATABASE_URL at module scope.
import { requireEnv } from "./lib/env.mjs";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { sql } from "drizzle-orm";
import ws from "ws";
import { loadAvailability } from "../src/lib/decks/availability-query";
import { changeCount, loadDraftState, releasedCopies } from "../src/lib/decks/draft-state";
import { listDecksWithStats } from "../src/lib/decks/read";
import { commitVersion, newestVersion, restoreDraftFromVersion } from "../src/lib/decks/versions";

neonConfig.webSocketConstructor = ws;

const PRODUCTION = "br-noisy-violet-a6vw4ess";
const STAGING = "br-polished-pond-a6e63y0b";

const { DATABASE_URL } = requireEnv(["DATABASE_URL"]);
const pool = new Pool({ connectionString: DATABASE_URL });
const fixture = drizzle(pool);
const USER = `probe-change-commander-${Date.now()}`;

let failures = 0;
/** Set once the branch guard has passed. The cleanup writes too, so it runs only after it. */
let verified = false;
const check = (label: string, actual: unknown, expected: unknown) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`);
};

const setFlag = (on: boolean) => {
  if (on) process.env.CHANGE_COMMANDER_ENABLED = "true";
  else delete process.env.CHANGE_COMMANDER_ENABLED;
};

/** Ordered legends and cards, so a failing run names the same fixture the next one will. */
const pick = async (where: string, n: number) => {
  const { rows } = await fixture.execute<{ oracle_id: string }>(sql`
    select oracle_id from cards where ${sql.raw(where)} order by oracle_id limit ${n}
  `);
  if (rows.length < n) throw new Error("catalog is too small, seed it first");
  return rows.map((r) => r.oracle_id);
};

const liveCommander = async (deckId: string) => {
  const { rows } = await fixture.execute<{ c: string; p: string | null }>(sql`
    select commander_oracle_id::text as c, partner_oracle_id::text as p from decks where id = ${deckId}::uuid
  `);
  return rows[0];
};

async function main() {
  const { rows: branch } = await fixture.execute<{ id: string | null }>(
    sql`select current_setting('neon.branch_id', true) as id`,
  );
  const branchId = branch[0]?.id ?? null;
  // Fail closed: an unknown branch (a primary, or a non-Neon database) is refused as well as the
  // two named ones, and so is any production deployment's environment.
  if (!branchId || branchId === PRODUCTION || branchId === STAGING || process.env.VERCEL_ENV === "production") {
    throw new Error(`refusing to write a fixture to ${branchId ?? "(unknown)"}: point DATABASE_URL at local-dev`);
  }
  verified = true;
  console.log(`branch ${branchId}`);

  const [a, b] = await pick("type_line ~ 'Legendary Creature'", 2);
  const [x] = await pick("type_line = 'Artifact'", 1);

  // A committed deck led by A, holding X.
  const { rows: made } = await fixture.execute<{ id: string }>(sql`
    insert into decks (user_id, name, commander_oracle_id)
    values (${USER}, ${`${USER} deck`}, ${a}::uuid) returning id
  `);
  const deckId = made[0].id;
  await fixture.execute(sql`
    insert into deck_cards (deck_id, oracle_id, quantity) values (${deckId}::uuid, ${x}::uuid, 1)
  `);
  // Owned, or the claim read returns no row for it at all.
  await fixture.execute(sql`
    insert into collection_items (user_id, oracle_id, quantity, set_code)
    values (${USER}, ${x}::uuid, 1, 'probe')
  `);
  const v1 = (await commitVersion(deckId, null)).version;

  const readAll = async () => {
    const state = await loadDraftState(deckId, USER);
    const list = await listDecksWithStats(USER, "name", { includeDeckState: true });
    const claims = await loadAvailability(USER, { oracleIds: [x] });
    const claim = claims.get(x)?.claims.find((c) => c.id === deckId);
    return {
      moved: state.commander ?? null,
      namesBoth: state.names.has(a) && state.names.has(b),
      changes: changeCount(state),
      released: releasedCopies(state),
      listed: list.find((d) => d.id === deckId)?.pendingChanges ?? null,
      claimPending: claim?.pending ?? null,
    };
  };

  // ── Clean: nothing moved, on or off ─────────────────────────────────────
  for (const on of [false, true]) {
    setFlag(on);
    const r = await readAll();
    const tag = on ? "on" : "off";
    check(`clean (${tag}): no commander move`, r.moved, null);
    check(`clean (${tag}): no change`, r.changes, 0);
    check(`clean (${tag}): the list reads 0`, r.listed, 0);
    check(`clean (${tag}): the claim is not pending`, r.claimPending, false);
  }

  // ── The swap: only the live column moves, exactly as the write will ───────
  await fixture.execute(sql`update decks set commander_oracle_id = ${b}::uuid where id = ${deckId}::uuid`);

  setFlag(true);
  const on = await readAll();
  check("swapped (on): the draft names the move", on.moved, {
    from: { commanderOracleId: a, partnerOracleId: null },
    to: { commanderOracleId: b, partnerOracleId: null },
  });
  check("swapped (on): one change", on.changes, 1);
  check("swapped (on): both commanders are named", on.namesBoth, true);
  check("swapped (on): the departing commander's copy is released", on.released, 1);
  check("swapped (on): the list's pending count agrees", on.listed, 1);
  check("swapped (on): the deck's claims read pending", on.claimPending, true);

  // OFF reads exactly as before commanders could move: nothing pending, anywhere.
  setFlag(false);
  const off = await readAll();
  check("swapped (off): no commander move", off.moved, null);
  check("swapped (off): no change", off.changes, 0);
  check("swapped (off): the list reads 0", off.listed, 0);
  check("swapped (off): the claim is not pending", off.claimPending, false);

  // ── Discard puts the version's commander back ─────────────────────────────
  setFlag(true);
  check("discard restores", await restoreDraftFromVersion(deckId, v1.id), "restored");
  check("discard: the live commander is the version's again", await liveCommander(deckId), { c: a, p: null });
  const discarded = await readAll();
  check("discard: nothing pending", discarded.changes, 0);
  check("discard: the list reads 0", discarded.listed, 0);

  // ── Commit freezes the move into the version, and resets its tenure ───────
  await fixture.execute(sql`update decks set commander_oracle_id = ${b}::uuid where id = ${deckId}::uuid`);
  const v2 = (await commitVersion(deckId, null)).version;
  check("commit: the version is led by the new commander", v2.commanderOracleId, b);
  check("commit: the new commander's tenure starts at the commit", v2.commanderSince > v1.commanderSince, true);
  const committed = await readAll();
  check("commit: nothing pending", committed.changes, 0);
  check("commit: the list reads 0", committed.listed, 0);
  check("commit: the claim is not pending", committed.claimPending, false);
  check("commit: newest version is v2", (await newestVersion(deckId))?.id, v2.id);
}

main()
  .catch((error) => {
    failures += 1;
    console.error(error);
  })
  .finally(async () => {
    try {
      if (verified) {
        await fixture.execute(sql`delete from decks where user_id = ${USER}`);
        await fixture.execute(sql`delete from collection_items where user_id = ${USER}`);
      }
    } catch (error) {
      failures += 1;
      console.error("cleanup failed", error);
    }
    await pool.end();
    console.log(failures === 0 ? "\nall checks passed" : `\n${failures} check(s) failed`);
    // exitCode, not process.exit: an exit here would swallow a throw from above.
    process.exitCode = failures === 0 ? 0 : 1;
  });
