import { sql } from "drizzle-orm";

import { db } from "../../db";
import { catalogGeneration } from "../cache/catalog-generation";
import { buildCommanderPrintings, type CommanderPrintings } from "./printed-in";

// The server half of `Printed in`. Kept apart from `printed-in.ts` because the lane params import
// that module on the client, and this one imports the database.

export async function readCommanderPrintings(): Promise<CommanderPrintings> {
  const rows = (await db.execute(sql`
    select p.oracle_id, p.set_code, s.name, s.released_at
    from printings p
    join cards c on c.oracle_id = p.oracle_id
    left join sets s on s.code = p.set_code
    where c.type_line ilike '%legendary%'
    group by p.oracle_id, p.set_code, s.name, s.released_at
  `)).rows as { oracle_id: string; set_code: string; name: string | null; released_at: string | null }[];
  return buildCommanderPrintings(rows);
}

// Memoised per catalog generation, the way `intake/search.ts` memoises its theme vocabulary: the
// index moves only when the catalog does, and every reader shares one copy.
const MEMO_MS = 10 * 60 * 1000;
let memo: { generation: string; at: number; value: Promise<CommanderPrintings> } | null = null;

export async function loadCommanderPrintings(now: number = Date.now()): Promise<CommanderPrintings> {
  const generation = await catalogGeneration();
  if (memo && memo.generation === generation && now - memo.at < MEMO_MS) return memo.value;
  const entry = { generation, at: now, value: readCommanderPrintings() };
  memo = entry;
  entry.value.catch(() => {
    if (memo === entry) memo = null;
  });
  return entry.value;
}

