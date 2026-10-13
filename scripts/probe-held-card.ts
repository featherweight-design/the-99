// Help me choose's build-around card: the chip and the fill's charge agree (Hugh, 2026-09-27).
//
// An owned card whose every copy is held by a committed deck is BOUGHT by the fill
// (`loadFillGate` charges it first), so the chip `loadCardChip` returns must read it as held,
// never as free, and `buysCard` must say it is bought. This calls the real `loadCardChip` and the
// real `loadFillGate` against a real Postgres, in both states: one copy free, then that copy
// sleeved into a committed deck. A unit test can only hand each side the answer.
//
// The charge is read through the gate's own behavior rather than a restatement of its rule: the
// budget is set to exactly the card's price, and a cheaper unowned candidate is offered. The gate
// admits that candidate only when the card cost nothing.
//
// It writes a fixture under a per-run user_id (a collection row, a deck, its version) and deletes
// it in a finally. Point it at `local-dev` or a scratch branch, NEVER production or staging: it
// refuses both by branch id.
//
// Run: `pnpm probe:held-card`
import { requireEnv } from "./lib/env.mjs";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { sql } from "drizzle-orm";
import ws from "ws";
import { loadCardChip } from "../src/lib/intake/rows";
import { buysCard } from "../src/lib/intake/buys-card";
import { loadFillGate } from "../src/lib/intake/fill-facts";
import { loadPrices } from "../src/lib/discovery/price";
import { commitVersion } from "../src/lib/decks/versions";
// No signed-in reader here: every switch read takes the environment itself (`process.env`).

neonConfig.webSocketConstructor = ws;

const { DATABASE_URL } = requireEnv(["DATABASE_URL"]);
const pool = new Pool({ connectionString: DATABASE_URL });
const fixture = drizzle(pool);
const USER = `probe-held-card-${Date.now()}`;
// production and staging, from the topology note.
const REFUSED_BRANCHES = ["br-noisy-violet-a6vw4ess", "br-polished-pond-a6e63y0b"];

let failures = 0;
const check = (label: string, actual: unknown, expected: unknown) => {
  const ok = actual === expected;
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}: got ${actual}, expected ${expected}`);
};

async function main() {
  const { rows: [b] } = await fixture.execute<{ id: string | null }>(sql`select current_setting('neon.branch_id', true) as id`);
  if (!b?.id || REFUSED_BRANCHES.includes(b.id) || process.env.VERCEL_ENV === "production") {
    throw new Error(`Refusing to write a fixture on branch ${b?.id ?? "(unknown)"}.`);
  }

  // A commander to lead the holding deck and one for the new deck's fill, and two priced
  // commander-legal non-basic cards: the build-around card and a cheaper candidate. Found by
  // query, ordered, so the fixture is the same on every run.
  const { rows: legends } = await fixture.execute<{ oracle_id: string }>(sql`
    select oracle_id from cards
    where commander_legal and type_line ~ 'Legendary Creature' and type_line !~ '\\mBasic\\M'
    order by oracle_id limit 2
  `);
  const { rows: pool200 } = await fixture.execute<{ oracle_id: string }>(sql`
    select oracle_id from cards
    where commander_legal and type_line !~ 'Legendary' and type_line !~ '\\mBasic\\M' and type_line !~ 'Land'
    order by oracle_id limit 400
  `);
  const prices = await loadPrices(pool200.map((r) => r.oracle_id));
  const priced = pool200
    .map((r) => ({ id: r.oracle_id, cents: prices.get(r.oracle_id)?.liveCents ?? null }))
    .filter((p): p is { id: string; cents: number } => p.cents !== null && p.cents > 0)
    .sort((x, y) => y.cents - x.cents);
  if (legends.length < 2 || priced.length < 2) throw new Error("catalog or prices are empty; seed them first");
  const card = priced[0];
  const cheaper = priced.find((p) => p.cents < card.cents);
  if (!cheaper) throw new Error("no cheaper priced candidate");
  const [holderCmd, newCmd] = legends.map((l) => l.oracle_id);
  console.log(`card ${card.id} at ${card.cents}c; candidate ${cheaper.id} at ${cheaper.cents}c`);

  // The fill's charge, read through the gate: budget = the card's price exactly.
  const fillCharges = async () => {
    const gate = await loadFillGate({
      userId: USER,
      commanderIds: [newCmd],
      answers: { budgetCents: card.cents, bracket: null, cardOracleId: card.id },
      candidates: [{ oracleId: cheaper.id, owned: false, typeLine: "Artifact" } as never],
      env: process.env,
    });
    if (!gate) throw new Error("no gate for a budget");
    return !gate.admits({ oracleId: cheaper.id, owned: false, typeLine: "Artifact" } as never);
  };

  try {
    await fixture.execute(sql`
      insert into collection_items (user_id, oracle_id, quantity, set_code)
      values (${USER}, ${card.id}, 1, 'probe')
    `);

    // 1 · One copy, nothing claims it: free on the chip, and the fill charges nothing.
    const free = await loadCardChip(USER, card.id, process.env);
    check("free: chip reads owned", free?.owned, true);
    check("free: chip reads not held", free?.held, null);
    check("free: buysCard", free ? buysCard(free) : null, false);
    check("free: the fill charges it", await fillCharges(), false);

    // 2 · That copy sleeved into a committed deck: held on the chip, and the fill buys it.
    const { rows: [deck] } = await fixture.execute<{ id: string }>(sql`
      insert into decks (user_id, name, commander_oracle_id)
      values (${USER}, 'Probe Holder', ${holderCmd}) returning id
    `);
    await fixture.execute(sql`insert into deck_cards (deck_id, oracle_id, quantity) values (${deck.id}, ${card.id}, 1)`);
    await commitVersion(deck.id, null, undefined, undefined, process.env);

    const held = await loadCardChip(USER, card.id, process.env);
    check("held: chip still reads owned", held?.owned, true);
    check("held: chip names the holding deck", held?.held?.deck, "Probe Holder");
    check("held: buysCard", held ? buysCard(held) : null, true);
    check("held: the fill charges it", await fillCharges(), true);
    check("held: chip and fill agree", held ? buysCard(held) === (await fillCharges()) : false, true);
  } finally {
    await fixture.execute(sql`delete from decks where user_id = ${USER}`);
    await fixture.execute(sql`delete from collection_items where user_id = ${USER}`);
    await pool.end();
  }
}

// Outside any finally: an exit in a finally swallows the throw it was meant to report.
main()
  .catch((err) => {
    console.error(err);
    failures += 1;
  })
  .then(() => {
    console.log(failures === 0 ? "All checks passed." : `${failures} check(s) failed.`);
    process.exit(failures === 0 ? 0 : 1);
  });
