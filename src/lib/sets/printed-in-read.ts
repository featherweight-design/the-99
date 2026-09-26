import { sql } from "drizzle-orm";

import { db } from "../../db";
import { catalogGeneration } from "../cache/catalog-generation";
import { isCommanderCandidate } from "../recs/score";
import { buildCommanderPrintings, type CommanderPrintings } from "./printed-in";

// The server half of `Printed in`. Kept apart from `printed-in.ts` because the lane params import
// that module on the client, and this one imports the database.

/**
 * Every commander candidate's sets. "Candidate" is the ranking's own rule, `isCommanderCandidate`,
 * applied to the rows a coarse SQL filter lets through: a legendary type line, or text saying the
 * card can be your commander. A type-line shortcut alone would leave out the planeswalkers and
 * backgrounds that say so, which both lanes list, and a Printed in selection would then hide them
 * whatever their printings. The rule, not a copy of it in SQL, because a second copy drifts.
 */
export async function readCommanderPrintings(): Promise<CommanderPrintings> {
  const cardsRead = (await db.execute(sql`
    select c.oracle_id, c.type_line, c.oracle_text, c.mana_cost, c.layout
    from cards c
    where c.type_line ilike '%legendary%' or c.oracle_text ilike '%can be your commander%'
  `)).rows as { oracle_id: string; type_line: string; oracle_text: string | null; mana_cost: string | null; layout: string }[];
  const ids = cardsRead
    .filter((c) =>
      isCommanderCandidate({ typeLine: c.type_line, oracleText: c.oracle_text, manaCost: c.mana_cost, layout: c.layout }),
    )
    .map((c) => c.oracle_id);
  if (ids.length === 0) return buildCommanderPrintings([]);
  // `released_at` is cast to text: a `date` comes back from the driver as a JS Date, and two Dates
  // for the same day are never `===`, which would leave the same-day tie-break to chance.
  const rows = (await db.execute(sql`
    select p.oracle_id, p.set_code, s.name, s.released_at::text as released_at
    from printings p
    left join sets s on s.code = p.set_code
    where p.oracle_id = any(${sql.param(ids)}::uuid[])
    group by p.oracle_id, p.set_code, s.name, s.released_at
  `)).rows as { oracle_id: string; set_code: string; name: string | null; released_at: string | null }[];
  return buildCommanderPrintings(rows);
}

// Memoised per catalog generation, the way `intake/search.ts` memoises its theme vocabulary: the
// index moves only when the catalog does, and every reader shares one copy.
const MEMO_MS = 10 * 60 * 1000;
let memo: { generation: string; at: number; ticket: number; value: Promise<CommanderPrintings> } | null = null;
// Taken BEFORE the generation read's await, so it orders calls by when they started. A timestamp
// cannot: two calls in one millisecond tie, and the earlier one could roll the memo back.
let tickets = 0;

export async function loadCommanderPrintings(now: number = Date.now()): Promise<CommanderPrintings> {
  const ticket = ++tickets;
  const generation = await catalogGeneration();
  if (memo && memo.generation === generation && now - memo.at < MEMO_MS) return memo.value;
  const entry = { generation, at: now, ticket, value: readCommanderPrintings() };
  // A read that started earlier never replaces one that started later: around a catalog refresh
  // an old-generation read can finish last, and must not roll the memo back to it.
  if (memo && memo.ticket > ticket) return entry.value;
  memo = entry;
  entry.value.catch(() => {
    if (memo === entry) memo = null;
  });
  return entry.value;
}
