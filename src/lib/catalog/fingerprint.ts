import { sql, type SQL } from "drizzle-orm";

/**
 * The catalog INPUT fingerprint: one md5 over every `cards` column a replicated builder reads,
 * for every card, in `oracle_id` order (plan `2026-09-28-card-data-replicate.md`, §3 item 3).
 *
 * Oracle ids alone are not enough. They survive a Scryfall text change, and the index's role pass
 * and the combo flags are both derived from the text, so two catalogs agreeing on ids can still
 * disagree about a card. A copy refuses unless this is equal on the source as built, the source
 * now, and the target, which is what makes facts derived on staging true of production's cards.
 *
 * `fingerprint.test.ts` pins the list against the builders' own reads, through Drizzle columns and
 * through raw SQL aliases: a builder that starts reading a column this omits fails that test rather
 * than silently copying facts derived from it. A read built dynamically, from a string the scan
 * cannot see, would pass it; none of the builders does that today.
 */
export const FINGERPRINT_COLUMNS = [
  "oracle_id", "name", "oracle_text", "type_line", "mana_cost", "cmc", "keywords", "layout",
  "color_identity", "commander_legal", "game_changer",
] as const;

// Unit and record separators, so no field's own text can forge a boundary.
export const catalogFingerprintSql: SQL = sql`
  select count(*)::int as cards,
         md5(coalesce(string_agg(concat_ws(chr(31),
           oracle_id::text, name, coalesce(oracle_text, ''), type_line, coalesce(mana_cost, ''),
           cmc::text, array_to_string(keywords, ','), coalesce(layout, ''),
           array_to_string(color_identity, ','), commander_legal::text, game_changer::text
         ), chr(30) order by oracle_id), '')) as md5
  from cards`;

export type CatalogFingerprint = { cards: number; md5: string };

/** Anything that can run a statement: a database, a transaction or a savepoint. */
export type Executor = { execute: (query: SQL) => Promise<{ rows: unknown[] }> };

export async function readCatalogFingerprint(executor: Executor): Promise<CatalogFingerprint> {
  const { rows } = await executor.execute(catalogFingerprintSql);
  const row = rows[0] as { cards: number; md5: string };
  return { cards: Number(row.cards), md5: row.md5 };
}

/** The one string stored and compared: the count travels with the hash so a log line reads it. */
export const fingerprintKey = (f: CatalogFingerprint): string => `${f.cards}:${f.md5}`;
