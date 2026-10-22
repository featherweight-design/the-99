// Proves the near-combos reads against a real database (plan 2026-10-22-near-combos-backend.md).
// Read A, `loadNearCombos`: for every deck of one account it prints how many combos the deck is one
// piece away from, where the top ones' missing pieces are, and checks the invariants: every listed
// combo misses exactly its named piece and holds the rest, the missing piece is inside the deck's
// identity, the list runs bucket by bucket (spare, elsewhere, priced buy, unpriced buy), the cap holds and `total`
// covers it, and the switch off reads nothing.
//
// READ-ONLY: it calls the loaders and nothing else. Production is refused by id, and
// `PROBE_DB_BRANCH` must name the branch `DATABASE_URL` reports.
//
//   PROBE_DB_BRANCH=br-… [PROBE_USER_ID=user_…] pnpm probe:near-combos
import "./lib/env.mjs";

const PRODUCTION = "br-noisy-violet-a6vw4ess";

let failed = 0;
const check = (label: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${detail ? ` (${detail})` : ""}`);
  if (!ok) failed++;
};

async function main() {
  const named = process.env.PROBE_DB_BRANCH;
  if (!named) throw new Error("probe:near-combos: set PROBE_DB_BRANCH");
  if (named === PRODUCTION) throw new Error("probe:near-combos: refusing production");
  const { db } = await import("../src/db");
  const { sql } = await import("drizzle-orm");
  const { rows } = await db.execute<{ b: string | null }>(sql`select current_setting('neon.branch_id', true) as b`);
  if (rows[0]?.b !== named) throw new Error(`probe:near-combos: database reports ${rows[0]?.b}, not ${named}`);

  const { loadNearCombos, NEAR_COMBOS_CAP } = await import("../src/lib/combos/near-combos");
  const ON = { ...process.env, NEAR_COMBOS_ENABLED: "true" };
  const OFF = { ...process.env, NEAR_COMBOS_ENABLED: "" };

  const userId =
    process.env.PROBE_USER_ID ??
    (await db.execute<{ user_id: string }>(sql`select user_id from decks group by user_id order by count(*) desc limit 1`)).rows[0]?.user_id;
  if (!userId) throw new Error("probe:near-combos: no account holds a deck");
  const decks = (
    await db.execute<{ id: string; name: string; identity: string[] }>(sql`
      select d.id, d.name,
             coalesce((select array_agg(distinct c) from cards k, unnest(k.color_identity) c
                       where k.oracle_id in (d.commander_oracle_id, d.partner_oracle_id)), '{}') as identity
      from decks d where d.user_id = ${userId} and d.commander_oracle_id is not null order by d.name`)
  ).rows;
  console.log(`account ${userId.slice(0, 12)}…, ${decks.length} decks with a commander\n`);

  const off = await loadNearCombos({ userId, deckId: decks[0]?.id ?? "", env: OFF });
  check("switch off: empty", off.total === 0 && off.combos.length === 0);

  const bucket = (w: { kind: string; cents?: number | null }) => (w.kind === "spare" ? 0 : w.kind === "elsewhere" ? 1 : w.cents == null ? 3 : 2);
  let withAny = 0;
  for (const deck of decks) {
    const out = await loadNearCombos({ userId, deckId: deck.id, env: ON });
    if (out.total > 0) withAny++;
    const tally = { spare: 0, elsewhere: 0, buy: 0 };
    for (const c of out.combos) tally[c.missing.where.kind]++;
    console.log(`${deck.name}: ${out.total} near, top ${out.combos.length} spare ${tally.spare} / elsewhere ${tally.elsewhere} / buy ${tally.buy}`);
    for (const c of out.combos.slice(0, 3)) {
      const w = c.missing.where;
      const at = w.kind === "buy" ? `buy ${w.cents == null ? "unpriced" : `$${(w.cents / 100).toFixed(2)}`}` : w.kind === "elsewhere" ? `in ${w.decks.map((d) => d.name).join(", ")}` : "spare";
      console.log(`     + ${c.missing.name} (${at}) with ${c.pieces.filter((p) => p.held).map((p) => p.name).join(" + ")}: ${c.produces.slice(0, 2).join(", ")}${c.steps ? `, ${c.steps.split("\n").length} steps` : ""}`);
    }

    const shapeOk = out.combos.every((c) => {
      const missing = c.pieces.filter((p) => !p.held);
      return missing.length === 1 && missing[0].oracleId === c.missing.oracleId;
    });
    check(`${deck.name}: each combo misses exactly its named piece`, shapeOk);
    check(`${deck.name}: cap ${NEAR_COMBOS_CAP} holds and total covers it`, out.combos.length <= NEAR_COMBOS_CAP && out.total >= out.combos.length);
    const keys = out.combos.map((c) => bucket(c.missing.where));
    check(`${deck.name}: ordered spare, elsewhere, priced buy, unpriced buy`, keys.every((k, i) => i === 0 || k >= keys[i - 1]));
    if (out.combos.length > 0) {
      const ids = out.combos.map((c) => c.missing.oracleId);
      const idents = (await db.execute<{ oracle_id: string; color_identity: string[] }>(sql`
        select oracle_id, color_identity from cards where oracle_id = any(${sql.param(ids)}::uuid[])`)).rows;
      const outside = idents.filter((r) => !r.color_identity.every((c) => deck.identity.includes(c)));
      check(`${deck.name}: every missing piece is inside ${deck.identity.join("") || "C"}`, outside.length === 0, outside.map((r) => r.oracle_id).join(", "));
    }
  }
  check("at least one deck is one piece from a combo", withAny > 0, `${withAny} of ${decks.length}`);

  console.log(failed === 0 ? "\nall checks passed" : `\n${failed} check(s) failed`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
