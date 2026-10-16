// Proves card search's reads (plan 2026-10-16-card-search.md, PR A) against a real database: the ranked search puts a
// name starting with the query first, then a word starting with it, then any match; and the reader's signals come
// back right for every case a row draws (owned across printings, a deck holding the card as its commander, its
// partner or in its list, an unmet wish, a met wish dropped) while another account's rows never reach them (lock 8).
// It also times the ranked search for a 2-, 3- and 5-letter query.
//
// It WRITES, so it fails closed on its target: `PROBE_DB_BRANCH` must name the Neon branch `DATABASE_URL` reports,
// and never staging, production or local-dev. Its two accounts are made-up ids, and it removes every row it wrote,
// in a finally.
//
//   PROBE_DB_BRANCH=br-… pnpm probe:card-search
import "./lib/env.mjs";

const PROTECTED = new Set(["br-polished-pond-a6e63y0b", "br-noisy-violet-a6vw4ess", "br-patient-hall-a6nbonvo"]);
const run = Date.now().toString(36);
const R = `probe_search_r_${run}`; // the reader
const S = `probe_search_s_${run}`; // a stranger

let failed = 0;
const check = (label: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${detail ? ` (${detail})` : ""}`);
  if (!ok) failed++;
};

async function main() {
  const named = process.env.PROBE_DB_BRANCH;
  if (!named) throw new Error("probe:card-search: set PROBE_DB_BRANCH");
  if (PROTECTED.has(named)) throw new Error(`probe:card-search: ${named} is staging, production or local-dev; it writes`);
  const { db } = await import("../src/db");
  const { sql } = await import("drizzle-orm");
  const { rows } = await db.execute<{ b: string | null }>(sql`select current_setting('neon.branch_id', true) as b`);
  if (rows[0]?.b !== named) throw new Error(`probe:card-search: database reports ${rows[0]?.b}, not ${named}`);
  const { searchAllCards, loadCardSignals } = await import("../src/lib/card-search/search");

  try {
    // Ranking, on the real catalog.
    const sol = await searchAllCards("sol");
    const rank = (n: string) => (n.toLowerCase().startsWith("sol") ? 0 : /[ \-/]sol/i.test(n) ? 1 : 2);
    const ranks = sol.map((h) => rank(h.name));
    check("a query returns at most 20 cards", sol.length > 0 && sol.length <= 20, String(sol.length));
    check("prefix matches come first, then word starts, then any", ranks.every((r, i) => i === 0 || r >= ranks[i - 1]!), ranks.join(""));
    const tier0 = sol.filter((h) => rank(h.name) === 0).map((h) => h.name);
    check("ties fall back to the name", tier0.join("|") === [...tier0].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)).join("|"), tier0.slice(0, 4).join(", "));
    check("a one-letter query runs nothing", (await searchAllCards("s")).length === 0);

    // Server time for the ranked search, as the database runs it: the round trip above is mostly network.
    const { nameSearch } = await import("../src/lib/cards/name-search");
    const { searchAllCardsQuery } = await import("../src/lib/card-search/search");
    const { PgDialect } = await import("drizzle-orm/pg-core");
    for (const q of ["so", "sol", "drago"]) {
      const { sql: text, params } = new PgDialect().sqlToQuery(searchAllCardsQuery(nameSearch(q)!).getSQL());
      const t = performance.now();
      await searchAllCards(q);
      const roundTrip = performance.now() - t;
      const { rows: plan } = await db.execute(sql.raw(`explain (analyze, format text) ${text.replace(/\$(\d+)/g, (_, i) => `'${String(params[Number(i) - 1]).replace(/'/g, "''")}'`)}`));
      const exec = (plan as { "QUERY PLAN": string }[]).map((r) => r["QUERY PLAN"]).find((l) => l.startsWith("Execution Time"));
      console.log(`time "${q}": round trip ${roundTrip.toFixed(0)}ms, ${exec}`);
    }

    // Signals, on fixture rows.
    const { rows: picks } = await db.execute<{ oracle_id: string }>(sql`
      select oracle_id from cards where type_line like '%Legendary Creature%' order by oracle_id limit 5`);
    const [CMD, PARTNER, BODY, WISHED, MET] = picks.map((r) => r.oracle_id) as [string, string, string, string, string];
    await db.execute(sql`insert into collection_items (user_id, oracle_id, quantity, set_code) values
      (${R}, ${BODY}, 2, 'prb'), (${R}, ${BODY}, 1, 'prc'), (${R}, ${MET}, 1, 'prb'),
      (${S}, ${CMD}, 4, 'prb'), (${S}, ${WISHED}, 9, 'prb')`);
    const { rows: deckRows } = await db.execute<{ id: string }>(sql`insert into decks (user_id, name, commander_oracle_id, partner_oracle_id) values
      (${R}, 'Zed deck', ${CMD}, ${PARTNER}), (${R}, 'Alpha deck', ${PARTNER}, null),
      (${S}, 'Stranger deck', ${BODY}, null) returning id`);
    await db.execute(sql`insert into deck_cards (deck_id, oracle_id) values (${deckRows[1]!.id}, ${BODY}), (${deckRows[2]!.id}, ${WISHED})`);
    await db.execute(sql`insert into wishlist_items (user_id, oracle_id, quantity) values
      (${R}, ${WISHED}, 1), (${R}, ${MET}, 1), (${S}, ${CMD}, 2)`);

    const sig = await loadCardSignals(R, [CMD, PARTNER, BODY, WISHED, MET], { wishlist: true });
    check("the commander's deck holds it, and only the reader's", JSON.stringify(sig.get(CMD)?.decks) === '["Zed deck"]', JSON.stringify(sig.get(CMD)));
    check("a partner counts, and decks read by name", JSON.stringify(sig.get(PARTNER)?.decks) === '["Alpha deck","Zed deck"]', JSON.stringify(sig.get(PARTNER)));
    check("owned sums every printing; a list card's deck counts", sig.get(BODY)?.owned === 3 && JSON.stringify(sig.get(BODY)?.decks) === '["Alpha deck"]', JSON.stringify(sig.get(BODY)));
    check("another account's copies and wishes never count", sig.get(CMD)?.owned === 0 && sig.get(CMD)?.wishlist === false);
    check("an unmet wish is marked", sig.get(WISHED)?.wishlist === true && sig.get(WISHED)?.owned === 0, JSON.stringify(sig.get(WISHED)));
    check("a met wish is collected, not marked", sig.get(MET)?.wishlist === false && sig.get(MET)?.owned === 1, JSON.stringify(sig.get(MET)));
    check("with the wishlist off nothing is marked", (await loadCardSignals(R, [WISHED], { wishlist: false })).get(WISHED)?.wishlist === false);
    check("the stranger reads their own and nothing of the reader's",
      JSON.stringify((await loadCardSignals(S, [BODY], { wishlist: true })).get(BODY)) === '{"owned":0,"decks":["Stranger deck"],"wishlist":false}');
  } finally {
    for (const u of [R, S]) {
      await db.execute(sql`delete from wishlist_items where user_id = ${u}`);
      await db.execute(sql`delete from decks where user_id = ${u}`);
      await db.execute(sql`delete from collection_items where user_id = ${u}`);
      await db.execute(sql`delete from user_data_stamps where user_id = ${u}`);
    }
  }
  console.log(failed === 0 ? "\nprobe:card-search passed" : `\nprobe:card-search: ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
