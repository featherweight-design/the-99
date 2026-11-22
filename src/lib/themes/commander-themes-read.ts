import { sql } from "drizzle-orm";

import { db } from "../../db";
import { catalogGeneration } from "../cache/catalog-generation";
import { buildCommanderThemes, THEME_FILTER_MIN_DECKS, type CommanderThemes, type ThemeTagRow } from "./commander-themes";

// The server half of `Themes`, apart from `commander-themes.ts` because client components import
// that module and this one imports the database.

/**
 * Every commander's theme tags at the filter floor, unnested in SQL so the 200-odd tags a commander
 * carries never cross the wire. The floor is applied again in `buildCommanderThemes`, which owns it.
 */
export async function readCommanderThemes(): Promise<CommanderThemes> {
  const rows = (await db.execute(sql`
    select cs.commander_oracle_id as oracle_id, t.tag->>'slug' as slug, t.tag->>'label' as label,
           (t.tag->>'count')::int as count
    from commander_support cs
    cross join lateral jsonb_array_elements(cs.tags) as t(tag)
    where cs.synergy_state = 'ok'
      and jsonb_typeof(t.tag->'count') = 'number'
      and (t.tag->>'count')::numeric >= ${THEME_FILTER_MIN_DECKS}
  `)).rows as ThemeTagRow[];
  return buildCommanderThemes(rows);
}

// Memoised per catalog generation and for ten minutes, as `loadCommanderPrintings` is. The EDHREC
// index moves on its own schedule, so the clock bounds how stale a reader can see it.
const MEMO_MS = 10 * 60 * 1000;
let memo: { generation: string; at: number; ticket: number; value: Promise<CommanderThemes> } | null = null;
let tickets = 0;

export async function loadCommanderThemes(now: number = Date.now()): Promise<CommanderThemes> {
  const ticket = ++tickets;
  const generation = await catalogGeneration();
  if (memo && memo.generation === generation && now - memo.at < MEMO_MS) return memo.value;
  const entry = { generation, at: now, ticket, value: readCommanderThemes() };
  if (memo && memo.ticket > ticket) return entry.value;
  memo = entry;
  entry.value.catch(() => {
    if (memo === entry) memo = null;
  });
  return entry.value;
}
