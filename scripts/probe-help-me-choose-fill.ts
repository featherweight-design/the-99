// Help me choose's fill constraints (PR 3), proved against a real Postgres by calling the real
// `buildFillPlan` with answers.
//
// WHAT ONLY A DATABASE CAN ANSWER HERE. The gates are pure and unit tested against hand-built
// facts. What is not is whether `loadFillGate` read the RIGHT facts for a real pool: prices at the
// newest `as_of`, claims, Game Changer and mass land denial flags, and Spellbook's two-card
// combos. So every check reads the plan back against facts this script gathers ITSELF, by a
// different query, rather than trusting the gate's own.
//
//   THE BUDGET: what the plan buys, priced at the cheapest printing stocked now, fits the cap, and
//   the same fill with no budget does not, or the check has measured nothing.
//   THE BRACKET at 2: no Game Changer, no mass land denial, and no two placed cards (commander
//   included) completing a counted two-card combo; and the unconstrained fill breaks at least one
//   of those, for the same reason.
//   THE BODY is still whole: basics finish it whatever the gates refuse.
//   NO ANSWERS, NO CHANGE: bracket 4 with no budget is no gate, and the plan equals the plain one.
//
// It makes NO WRITES. `PROBE_USER_ID` names the account and `PROBE_COMMANDER` the commander; the
// defaults are the local-dev fixture account and a commander whose plain fill buys Game Changers.
//
//   pnpm probe:help-me-choose-fill
import { requireEnv } from "./lib/env.mjs";
import { sql } from "drizzle-orm";

requireEnv(["DATABASE_URL"]);

const USER = process.env.PROBE_USER_ID ?? "user_3GjLj0ERZEQ7EeycFp57vRdQPub";
const COMMANDER = process.env.PROBE_COMMANDER ?? "Atraxa, Praetors' Voice";
const BUDGET_CENTS = 2_000;

let failures = 0;
const check = (label: string, ok: boolean, detail: string) => {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} — ${detail}`);
};

async function main() {
  const { buildFillPlan } = await import("../src/lib/decks/fill-plan");
  const { db } = await import("../src/db");
  const { loadPrices } = await import("../src/lib/discovery/price");
  const { loadAvailability } = await import("../src/lib/decks/availability-query");
  const { isInfiniteOrGameEnding } = await import("../src/lib/spellbook/combo-features");
  const rows = async <T>(q: ReturnType<typeof sql>) => (await db.execute(q)).rows as T[];

  const [cmd] = await rows<{ oracle_id: string; name: string; color_identity: string[]; mana_cost: string | null }>(sql`
    select oracle_id, name, color_identity, mana_cost from cards where name = ${COMMANDER}`);
  if (!cmd) throw new Error(`no commander named ${COMMANDER}`);
  // `manaCost` feeds the basics pip census. It is a required field precisely so this probe cannot
  // pass a commander with no cost and quietly measure a deck whose colour signal is missing.
  const commanders = [{
    oracleId: cmd.oracle_id, name: cmd.name, colorIdentity: cmd.color_identity,
    manaCost: cmd.mana_cost ?? null,
  }];

  const plain = await buildFillPlan(USER, commanders, new Set(), { selected: [], env: process.env });
  const budgeted = await buildFillPlan(USER, commanders, new Set(), { selected: [], answers: { budgetCents: BUDGET_CENTS, bracket: null, cardOracleId: null }, env: process.env });
  const bracketed = await buildFillPlan(USER, commanders, new Set(), { selected: [], answers: { budgetCents: null, bracket: 2, cardOracleId: null }, env: process.env });
  const unasked = await buildFillPlan(USER, commanders, new Set(), { selected: [], answers: { budgetCents: null, bracket: 4, cardOracleId: null }, env: process.env });

  console.log("\n1. The budget, priced independently");
  const ids = (p: typeof plain) => p.rows.map((r) => r.oracleId);
  const all = [...new Set([...ids(plain), ...ids(budgeted)])];
  const [prices, availability] = await Promise.all([loadPrices(all), loadAvailability(USER, { oracleIds: all })]);
  const owned = new Set((await rows<{ oracle_id: string }>(sql`
    select distinct oracle_id from collection_items where user_id = ${USER}`)).map((r) => r.oracle_id));
  // The Shopping list's rule, read here rather than through the gate: a basic is never bought; a
  // buy is an unowned card, or an owned one whose copies are all claimed.
  const basics = new Set((await rows<{ oracle_id: string }>(sql`
    select oracle_id from cards where oracle_id = any(${sql.param(all)}::uuid[]) and type_line ~ '\mBasic\M'`)).map((r) => r.oracle_id));
  const spend = (p: typeof plain) => p.rows
    .filter((r) => !basics.has(r.oracleId)
      && (!owned.has(r.oracleId) || (availability.get(r.oracleId)?.free ?? 1) <= 0))
    .reduce((n, r) => n + (prices.get(r.oracleId)?.liveCents ?? 0) * r.quantity, 0);
  check("the unconstrained fill spends more than the budget, so the check can fail", spend(plain) > BUDGET_CENTS,
    `plain buys ${plain.bought} cards for $${(spend(plain) / 100).toFixed(2)}`);
  check("the budgeted fill's buys fit the cap", spend(budgeted) <= BUDGET_CENTS,
    `${budgeted.bought} cards for $${(spend(budgeted) / 100).toFixed(2)} against $${BUDGET_CENTS / 100}`);
  const neverStocked = budgeted.rows.filter((r) => !owned.has(r.oracleId) && prices.get(r.oracleId)?.liveCents == null);
  check("the budgeted fill buys nothing it cannot price", neverStocked.length === 0, `${neverStocked.length} unpriced buys`);
  // A selection the player carried across is placed before the fill, so the budget pays for it
  // first. The dearest unowned card under the cap is picked, so leaving it uncharged would show.
  const selection = plain.rows
    .filter((r) => !owned.has(r.oracleId) && (prices.get(r.oracleId)?.liveCents ?? 0) <= BUDGET_CENTS)
    .sort((a, b) => (prices.get(b.oracleId)?.liveCents ?? 0) - (prices.get(a.oracleId)?.liveCents ?? 0))[0];
  const selCents = prices.get(selection.oracleId)?.liveCents ?? 0;
  const { placedCardsOf } = await import("../src/lib/decks/costs-of");
  const withSelection = await buildFillPlan(USER, commanders, new Set([selection.oracleId]),
    { selected: await placedCardsOf([selection.oracleId]), answers: { budgetCents: BUDGET_CENTS, bracket: null, cardOracleId: null }, env: process.env });
  check("a placed selection is charged: it and the fill's buys fit the cap together", selCents + spend(withSelection) <= BUDGET_CENTS,
    `selection $${(selCents / 100).toFixed(2)} + fill $${(spend(withSelection) / 100).toFixed(2)} against $${BUDGET_CENTS / 100}`);

  console.log("\n2. The bracket at 2, read independently");
  const facts = async (p: typeof plain) => {
    const placed = [cmd.oracle_id, ...ids(p)];
    const flagged = await rows<{ name: string; gc: boolean; mld: boolean }>(sql`
      select c.name, c.game_changer as gc, coalesce(f.mass_land_denial, false) as mld
      from cards c left join card_bracket_flags f on f.oracle_id = c.oracle_id
      where c.oracle_id = any(${sql.param(placed)}::uuid[]) and (c.game_changer or coalesce(f.mass_land_denial, false))`);
    const pairs = await rows<{ produces: string[]; a: string; b: string }>(sql`
      select v.produces, min(ca.name) as a, max(ca.name) as b
      from spellbook_variants v
      join spellbook_variant_cards vc on vc.variant_id = v.variant_id
      join cards ca on ca.oracle_id = vc.oracle_id
      where v.card_count = 2 and cardinality(v.requires_template_ids) = 0
        and vc.oracle_id = any(${sql.param(placed)}::uuid[])
      group by v.variant_id, v.produces having count(*) = 2
        -- The profile's command-zone rule (src/lib/profile/load.ts): a must_be_commander piece
        -- assembles only from the command zone, so holding it in the 99 counts nothing.
        and bool_and(not vc.must_be_commander or vc.oracle_id = ${cmd.oracle_id}::uuid)`);
    return { flagged, combos: pairs.filter((x) => isInfiniteOrGameEnding(x.produces)) };
  };
  const [plainFacts, gatedFacts] = await Promise.all([facts(plain), facts(bracketed)]);
  check("the unconstrained fill breaks bracket 2, so the check can fail", plainFacts.flagged.length + plainFacts.combos.length > 0,
    `${plainFacts.flagged.length} flagged (${plainFacts.flagged.slice(0, 3).map((f) => f.name).join(", ")}), ${plainFacts.combos.length} combos`);
  check("the bracket-2 fill holds no Game Changer and no mass land denial", gatedFacts.flagged.length === 0,
    gatedFacts.flagged.map((f) => f.name).join(", ") || "none");
  check("no two cards in the bracket-2 deck complete a counted combo", gatedFacts.combos.length === 0,
    gatedFacts.combos.map((c) => `${c.a} + ${c.b}`).join("; ") || "none");

  console.log("\n3. The body, and no answers");
  check("every gated fill still fills the whole body", [budgeted, bracketed].every((p) => p.filled === plain.filled),
    `plain ${plain.filled}, budgeted ${budgeted.filled}, bracket 2 ${bracketed.filled}`);
  check("bracket 4 with no budget is no gate: the plan equals the plain one", JSON.stringify(unasked.rows) === JSON.stringify(plain.rows),
    `${unasked.rows.length} rows against ${plain.rows.length}`);

  console.log("\n4. A row's trial figures");
  const { trialFill } = await import("../src/lib/intake/trial");
  const trial = await trialFill(USER, commanders[0], { budgetCents: BUDGET_CENTS, bracket: null, cardOracleId: null });
  check("the trial fill fills the body, owns what it can and prices the rest within the budget",
    trial.body === budgeted.filled && trial.owned < trial.body && trial.buyCents <= BUDGET_CENTS && trial.unpricedCard === null,
    `own ${trial.owned} of ${trial.body}, about $${(trial.buyCents / 100).toFixed(2)} to buy`);
  check("its buy figure is the probe's own count of the same fill", trial.buyCents === spend(budgeted),
    `trial ${trial.buyCents}, independent ${spend(budgeted)}`);
  // The plan fills a whole body beside the build-around card, so without the cap its row makes 100.
  const around = plain.rows.find((r) => r.quantity === 1)!.oracleId;
  const withCard = await trialFill(USER, commanders[0], { budgetCents: null, bracket: null, cardOracleId: around });
  check("with a build-around card the trial body is still the whole body, never one over",
    withCard.body === plain.filled, `body ${withCard.body}, plain ${plain.filled}`);
}

main()
  .catch((e) => {
    console.error(e);
    failures += 1;
  })
  .finally(() => {
    console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
    process.exitCode = failures === 0 ? 0 : 1;
    setTimeout(() => process.exit(), 100).unref();
  });
