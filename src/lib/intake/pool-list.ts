import { sql } from "drizzle-orm";

import { db } from "../../db";
import { readCatalogGeneration } from "../cache/catalog-generation";
import { readIndexGeneration } from "../cache/index-generation";
import type { EdhrecTag } from "../edhrec/parse";

/**
 * The read's commander list (brief lock 4, rework plan PR 1): every legal, indexed commander, one
 * line each, in the order the read shows them. SERVER-ONLY for the loader; `formatPoolList` is pure.
 *
 * ONE LIST FOR EVERY PLAYER. The list is the cached prefix of step 1's prompt, and a cache entry is
 * shared only by byte-identical prefixes, so nothing per player may enter it: not the commanders a
 * player has built, not the filters. Those go in the request after the prefix, and the validator
 * drops any pick outside the player's own filtered pool (lock 1), whatever the model chose.
 *
 * A KEY, NOT AN ID. Each line starts with a short number, its place in the list, and the model picks
 * by that number. An oracle id costs about 25 tokens a line; 3,400 of them would be most of the list.
 * The number maps back to the oracle id through this list alone, so a pick is a pool row or nothing.
 *
 * What a line carries (F6, F9a): name, color identity, creature types from the type line, and the
 * top themes by EDHREC deck count. Nothing else: no card labels, no prices, no ownership.
 */

/** Themes per line: enough to place a commander, few enough to keep the list compact. */
export const POOL_LIST_THEMES = 3;

export type PoolListRow = {
  oracleId: string;
  name: string;
  colorIdentity: readonly string[];
  typeLine: string | null;
  tags: readonly EdhrecTag[];
};

export type PoolList = {
  /** The prefix itself, one line per commander. */
  text: string;
  /** A line's key to its commander's oracle id. */
  idOf: ReadonlyMap<number, string>;
  /** An oracle id to its key, for the request half: the keys a step 2 shortlist or a card hint names. */
  keyOf: ReadonlyMap<string, number>;
  /** What the list was built from: the catalog and the index generations, joined. */
  generation: string;
};

const COLOR_ORDER = "WUBRG";

/** `WUB`, in the WUBRG order; `C` for a colorless identity. */
export function colorsKey(identity: readonly string[]): string {
  const known = [...COLOR_ORDER].filter((c) => identity.includes(c));
  return known.length > 0 ? known.join("") : "C";
}

/** The creature types on any face that can bear them, in printed order, each once. */
export function creatureTypes(typeLine: string | null): string[] {
  if (!typeLine) return [];
  const out: string[] = [];
  for (const face of typeLine.split("//")) {
    const [types, subs] = face.split("—");
    if (!subs || !/creature|kindred|tribal/i.test(types)) continue;
    for (const word of subs.trim().split(/\s+/)) if (word && !out.includes(word)) out.push(word);
  }
  return out;
}

/** The leading themes by deck count, labels only; ties keep EDHREC's order. */
export function leadingThemes(tags: readonly EdhrecTag[], n: number = POOL_LIST_THEMES): string[] {
  return tags
    .map((t, i) => ({ t, i }))
    .sort((a, b) => b.t.count - a.t.count || a.i - b.i)
    .slice(0, n)
    .map(({ t }) => t.label);
}

/**
 * The list, from rows the caller has read. Ordered by name, then oracle id, so the same index
 * always yields the same bytes and the same keys: a cache entry survives as long as the index does.
 */
export function formatPoolList(rows: readonly PoolListRow[], generation: string): PoolList {
  const sorted = [...rows].sort((a, b) => a.name.localeCompare(b.name, "en") || a.oracleId.localeCompare(b.oracleId));
  const idOf = new Map<number, string>();
  const keyOf = new Map<string, number>();
  const lines = sorted.map((r, i) => {
    const key = i + 1;
    idOf.set(key, r.oracleId);
    keyOf.set(r.oracleId, key);
    // `|` never appears in a card name or a theme label, so a line splits on it unambiguously.
    return [key, r.name, colorsKey(r.colorIdentity), creatureTypes(r.typeLine).join(" "), leadingThemes(r.tags).join(", ")].join("|");
  });
  return { text: lines.join("\n"), idOf, keyOf, generation };
}

/** Every commander the search could ever list, before any player's filters: `isCandidate` less the
 *  per-player clause. */
export async function loadPoolListRows(): Promise<PoolListRow[]> {
  const rows = (await db.execute(sql`
    select cs.commander_oracle_id as id, c.name, c.color_identity, c.type_line, cs.tags
    from commander_support cs
    join cards c on c.oracle_id = cs.commander_oracle_id
    where c.commander_legal and cs.synergy_state = 'ok'
  `)).rows as { id: string; name: string; color_identity: string[]; type_line: string | null; tags: EdhrecTag[] | null }[];
  return rows.map((r) => ({ oracleId: r.id, name: r.name, colorIdentity: r.color_identity, typeLine: r.type_line, tags: r.tags ?? [] }));
}

/**
 * Kept per server instance while both generations hold, for at most `POOL_LIST_MEMO_MS`, as the
 * search's own catalog memo is (`search.ts`): about 3,400 rows no press should pay to read again.
 */
const POOL_LIST_MEMO_MS = 10 * 60 * 1000;
let memo: { generation: string; at: number; list: Promise<PoolList> } | null = null;

export async function loadPoolList(now: number = Date.now()): Promise<PoolList> {
  const [catalog, index] = await Promise.all([readCatalogGeneration(), readIndexGeneration()]);
  const generation = `${catalog}:${index}`;
  if (memo && memo.generation === generation && now - memo.at < POOL_LIST_MEMO_MS) return memo.list;
  const entry = { generation, at: now, list: loadPoolListRows().then((rows) => formatPoolList(rows, generation)) };
  memo = entry;
  // A failed read is not kept: the next press tries again.
  entry.list.catch(() => { if (memo === entry) memo = null; });
  return entry.list;
}
