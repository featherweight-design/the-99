// Proves the near-combos reads against a real database (plan 2026-10-22-near-combos-backend.md).
// Read A, `loadNearCombos`: for every deck of one account it prints how many combos the deck is one
// piece away from, where the top ones' missing pieces are, and checks the invariants: every listed
// combo misses exactly its named piece and holds the rest, the missing piece is inside the deck's
// identity, the list runs bucket by bucket (spare, elsewhere, priced buy, unpriced buy), the cap holds and `total`
// covers it, and the switch off reads nothing. Read B, `loadCardCombos`: the card in the most variants
// and the first deck's commander (that deck in scope), timed, checking the cap, that the card is never
// its own piece, that fewest unowned pieces rank first, and that a piece reads in-deck exactly when the deck in scope holds it.
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

  // Read B: a card's combos, on the card in the most variants (the shortlist's hard case), the
  // first deck's commander with that deck in scope, and a card the account owns.
  const { loadCardCombos, CARD_COMBOS_CAP } = await import("../src/lib/combos/near-combos");
  const busiest = (await db.execute<{ oracle_id: string; name: string }>(sql`
    select vc.oracle_id, c.name from spellbook_variant_cards vc join cards c using (oracle_id)
    group by vc.oracle_id, c.name order by count(*) desc limit 1`)).rows[0];
  const scoped = decks[0]
    ? (await db.execute<{ commander: string; partner: string | null; cards: string[] }>(sql`
        select d.commander_oracle_id as commander, d.partner_oracle_id as partner,
               array(select oracle_id from deck_cards where deck_id = d.id) as cards
        from decks d where d.id = ${decks[0].id}`)).rows[0]
    : null;
  const cases = [
    { label: busiest ? `${busiest.name} (most variants)` : "", oracleId: busiest?.oracle_id, deck: undefined },
    { label: `${decks[0]?.name}'s commander, deck in scope`, oracleId: scoped?.commander, deck: scoped ? { oracleIds: scoped.cards, commanderOracleIds: [scoped.commander, ...(scoped.partner ? [scoped.partner] : [])] } : undefined },
  ].filter((c): c is { label: string; oracleId: string; deck: { oracleIds: string[]; commanderOracleIds: string[] } | undefined } => !!c.oracleId);
  check("read B: switch off, empty", (await loadCardCombos({ userId, oracleId: cases[0].oracleId, env: OFF })).total === 0);
  for (const c of cases) {
    const started = Date.now();
    const out = await loadCardCombos({ userId, oracleId: c.oracleId, deck: c.deck, env: ON });
    const ms = Date.now() - started;
    console.log(`\n${c.label}: ${out.total} combos, top ${out.combos.length} in ${ms}ms`);
    for (const k of out.combos.slice(0, 3)) {
      console.log(`     with ${k.others.map((p) => `${p.name} [${p.state}]`).join(" + ")}: ${k.produces.slice(0, 2).join(", ")}`);
    }
    check(`${c.label}: cap ${CARD_COMBOS_CAP} holds and total covers it`, out.combos.length <= CARD_COMBOS_CAP && out.total >= out.combos.length);
    check(`${c.label}: the card is never one of its own pieces`, out.combos.every((k) => k.others.every((p) => p.oracleId !== c.oracleId)));
    const unowned = out.combos.map((k) => k.others.filter((p) => p.state === "notOwned").length);
    check(`${c.label}: fewest unowned pieces first`, unowned.every((n, i) => i === 0 || n >= unowned[i - 1]), unowned.join(","));
    if (c.deck) {
      const deck = c.deck;
      const inScope = (p: { oracleId: string; mustBeCommander: boolean }) =>
        p.mustBeCommander ? deck.commanderOracleIds.includes(p.oracleId) : deck.oracleIds.includes(p.oracleId) || deck.commanderOracleIds.includes(p.oracleId);
      const wrong = out.combos.flatMap((k) => k.others).filter((p) => (p.state === "inDeck") !== inScope(p));
      check(`${c.label}: a piece reads in the deck exactly when the deck in scope holds it`, wrong.length === 0, wrong.map((p) => p.name).join(", "));
    }
  }

  console.log(failed === 0 ? "\nall checks passed" : `\n${failed} check(s) failed`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
