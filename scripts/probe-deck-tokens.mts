// Proves the deck-tokens READ and WRITE seams against a real database holding a published token catalog
// (plan `2026-10-11-tokens-for-my-deck.md`, PR 4a). The unit tests prove the rules on fixtures; this proves the
// queries, which is where this feature's defects have lived (a join that returns the wrong rows reads green in
// every mock).
//
// It WRITES (joins and hand marks), so it fails closed on its target: `PROBE_DB_BRANCH` must name the Neon
// branch `DATABASE_URL` reports, and it never runs on staging or production. Run it on a scratch branch of
// staging carrying a catalog from `pnpm db:seed:printings` and `pnpm db:seed:prices`, then delete the branch.
//
//   PROBE_DB_BRANCH=br-… PROBE_USER_ID=<clerk id owning the decks> pnpm probe:deck-tokens
//
// Uses Aang (the brief's fixture): four tokens, six makers, and the commander counts as a maker.
import "./lib/env.mjs";

const AANG = "0f585441-203e-475b-be7c-f11e67e20d79";
const AANG_TOKENS = ["Ally", "Food", "Monk", "Soldier"];
const PROTECTED = new Set(["br-polished-pond-a6e63y0b", "br-noisy-violet-a6vw4ess"]);

let failed = 0;
const check = (label: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${detail ? ` (${detail})` : ""}`);
  if (!ok) failed++;
};

async function main() {
  const named = process.env.PROBE_DB_BRANCH;
  const userId = process.env.PROBE_USER_ID;
  if (!named || !userId) throw new Error("probe:deck-tokens: set PROBE_DB_BRANCH and PROBE_USER_ID");
  if (PROTECTED.has(named)) throw new Error(`probe:deck-tokens: ${named} is staging or production; it writes`);
  const { db } = await import("../src/db");
  const { sql } = await import("drizzle-orm");
  const { rows } = await db.execute<{ b: string | null }>(sql`select current_setting('neon.branch_id', true) as b`);
  if (rows[0]?.b !== named) throw new Error(`probe:deck-tokens: database reports ${rows[0]?.b}, not ${named}`);

  const { loadDeckTokens } = await import("../src/lib/tokens/read");
  const { joinToken, leaveToken, markOwnedOnDeck, unmarkOwned } = await import("../src/lib/tokens/joins");
  const { writeUploadTokens } = await import("../src/lib/tokens/ownership");

  // The account's own rows are kept and PUT BACK, in a finally: the probe starts from nothing so the three states
  // are reachable, and must leave the account as it found it even when a check throws.
  const TABLES = ["deck_token_joins", "token_ownership", "token_reads"] as const;
  const saved = new Map<string, unknown>();
  for (const t of TABLES) {
    const { rows: r } = await db.execute<{ j: unknown }>(
      sql`select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) as j from ${sql.raw(t)} x where x.user_id = ${userId}`);
    saved.set(t, r[0].j);
  }
  const clear = async () => { for (const t of TABLES) await db.execute(sql`delete from ${sql.raw(t)} where user_id = ${userId}`); };
  try {
    await clear();

    const get = async () => {
      const r = await loadDeckTokens(AANG, userId);
      if (r.status !== "ok") throw new Error(`Aang read ${r.status}`);
      return r;
    };

    const first = await get();
    const names = first.tokens.map((t) => t.name).sort();
    check("Aang makes the brief's four tokens", JSON.stringify(names) === JSON.stringify(AANG_TOKENS), names.join(","));
    check("every token starts not known (no read yet)", first.tokens.every((t) => t.state === "unknown"));
    check("the deck's six makers are counted, the commander among them", first.makerCount === 6, `makerCount ${first.makerCount}`);
    check("every token has a picture and a printing count", first.tokens.every((t) => t.picture && t.picture.printings >= 1));
    check("priced tokens carry the printing they are sent as", first.tokens.some((t) => t.price?.printing.scryfallId === t.picture?.scryfallId));

    const omnath = await loadDeckTokens("dcf9a86d-f6ef-4c7c-a20c-a9807c7cdfbd", userId);
    check("Omnath makes the brief's 14 tokens, Copy among them", omnath.status === "ok" && omnath.tokens.length === 14 && omnath.tokens.some((t) => t.name === "Copy"),
      omnath.status === "ok" ? String(omnath.tokens.length) : omnath.status);

    const food = first.tokens.find((t) => t.name === "Food")!;
    check("a deck that is not the player's reads absent", (await loadDeckTokens(AANG, "user_not_the_owner")).status === "absent");

    check("a join lands", (await joinToken(userId, AANG, food.oracleId)) === "done");
    check("a token the deck does not make is refused", (await joinToken(userId, AANG, "00000000-0000-4000-8000-000000000000")) === "notThisDeck");
    check("Food reads joined", (await get()).tokens.find((t) => t.name === "Food")!.joined);

    check("I have one lands and takes the join off this deck", (await markOwnedOnDeck(userId, AANG, food.oracleId)) === "done");
    const held = (await get()).tokens.find((t) => t.name === "Food")!;
    check("Food reads owned by hand, not joined", held.state === "owned" && held.source === "manual" && !held.joined);
    const rest = (await get()).tokens.filter((t) => t.name !== "Food");
    check("a hand mark leaves the others not known (the marker is unwritten)", rest.every((t) => t.state === "unknown"));

    check("an unmark for a token the deck does not make is refused", (await unmarkOwned(userId, AANG, "00000000-0000-4000-8000-000000000000")) === "notThisDeck");
    await unmarkOwned(userId, AANG, food.oracleId);
    check("unmarking clears the hand mark", (await get()).tokens.find((t) => t.name === "Food")!.state === "unknown");

    await db.transaction(async (tx) => { await writeUploadTokens(tx, userId, "00000000-0000-4000-8000-0000000000aa", "replace", []); });
    check("a read upload that held none makes the rest not owned", (await get()).tokens.every((t) => t.state === "not"));

    await joinToken(userId, AANG, food.oracleId);
    check("a join survives the read", (await get()).tokens.find((t) => t.name === "Food")!.joined);
    await leaveToken(userId, AANG, food.oracleId);
    check("leaving takes it off", !(await get()).tokens.find((t) => t.name === "Food")!.joined);


  } finally {
    await clear();
    for (const t of TABLES) {
      await db.execute(sql`insert into ${sql.raw(t)} select * from jsonb_populate_recordset(null::${sql.raw(t)}, ${JSON.stringify(saved.get(t))}::jsonb)`);
    }
  }

  if (failed) { console.log(`\n${failed} check(s) failed`); process.exit(1); }
  console.log("\nall checks passed");
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
