/**
 * `tsx scripts/eval/count-mechanism-seed.mts <moxfield.txt>` — writes the ORIGINAL Mutant Menace list into the count-mechanism
 * eval's scratch branch as its own deck (`ORIGINAL_DECK_ID`), beside the copies of Hugh's production decks already seeded
 * there. Writes ONLY to the branch `connectScratch` accepts, never production, staging or local-dev.
 *
 * The file is a Moxfield export: a `#` header line, then `N Name (SET) number [*F*]` per card, a blank line, `SIDEBOARD:` and
 * the cards Hugh did not play. The mainboard is read; the sideboard is not. The commander is the first card, as Moxfield
 * writes it, and the decks the app stores keep their commander out of `deck_cards`, so it is the deck's commander here too.
 * A two-faced card is matched by its front face (`Name // Back`). An unmatched name stops the seed: a deck quietly short of
 * a card would measure a different deck.
 */
import "../lib/env.mjs";

import { readFileSync } from "node:fs";

import { connectScratch } from "./lib/scratch.mjs";

export const EVAL_USER_ID = "user_eval_count_mechanism";
export const ORIGINAL_DECK_ID = "e0a10000-0000-4000-8000-000000000002";

export function parseMoxfield(text: string): { name: string; quantity: number }[] {
  const out: { name: string; quantity: number }[] = [];
  for (const line of text.split("\n")) {
    if (line.startsWith("#")) continue;
    if (line.trim() === "" || /^sideboard:/i.test(line.trim())) {
      if (out.length > 0) break;
      continue;
    }
    const m = /^(\d+)\s+(.+?)\s+\([A-Z0-9]+\)\s+\S+/.exec(line.trim());
    if (!m) throw new Error(`seed: cannot read the line "${line}"`);
    // Moxfield writes a two-faced card with one slash (`Find / Finality`); the catalog with two.
    out.push({ quantity: Number(m[1]), name: m[2].replace(/ \/ /g, " // ") });
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const file = process.argv[2];
  if (!file) throw new Error("seed: pass the Moxfield export's path");
  const [commander, ...rest] = parseMoxfield(readFileSync(file, "utf8"));
  const db = await connectScratch("count-mechanism-seed");
  const { sql } = await import("drizzle-orm");
  const names = [commander, ...rest].map((c) => c.name);
  const list = sql.join(names.map((n) => sql`${n}`), sql`, `);
  const rows = (await db.execute(sql`
    select distinct on (name) name, oracle_id from (
      select c.name, c.oracle_id from cards c where c.name in (${list})
      union all
      select split_part(c.name, ' // ', 1) as name, c.oracle_id from cards c where split_part(c.name, ' // ', 1) in (${list}) and c.name like '% // %'
    ) m order by name
  `)).rows as { name: string; oracle_id: string }[];
  const idOf = new Map(rows.map((r) => [r.name, r.oracle_id]));
  const missing = names.filter((n) => !idOf.has(n));
  if (missing.length > 0) throw new Error(`seed: no catalog card for ${missing.join(", ")}`);
  // The same oracle card twice (two printings on two lines) is one row with both counts.
  const quantities = new Map<string, number>();
  for (const c of rest) quantities.set(idOf.get(c.name)!, (quantities.get(idOf.get(c.name)!) ?? 0) + c.quantity);
  await db.transaction(async (tx) => {
    await tx.execute(sql`delete from decks where id = ${ORIGINAL_DECK_ID} and user_id = ${EVAL_USER_ID}`);
    await tx.execute(sql`insert into decks (id, user_id, name, commander_oracle_id, strategy_focus)
      values (${ORIGINAL_DECK_ID}, ${EVAL_USER_ID}, 'HD Tune - Mutant Menace (original)', ${idOf.get(commander.name)!}, 'mill')`);
    for (const [oracleId, quantity] of quantities) {
      await tx.execute(sql`insert into deck_cards (deck_id, oracle_id, quantity) values (${ORIGINAL_DECK_ID}, ${oracleId}, ${quantity})`);
    }
  });
  const total = [...quantities.values()].reduce((n, q) => n + q, 0);
  console.log(`seed: ${commander.name} and ${quantities.size} cards (${total} copies) written to ${ORIGINAL_DECK_ID}`);
  process.exit(0);
}
