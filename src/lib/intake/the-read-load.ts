import { sql } from "drizzle-orm";

import { db } from "../../db";
import type { EdhrecTag } from "../edhrec/parse";
import { matchWords, type PhraseIndex } from "./match";
import { leadingThemes, type PoolList } from "./pool-list";
import type { ReadCard, ReadDeck } from "./the-read";

/**
 * The read's per-player inputs (rework plan PR 1). SERVER-ONLY. Each is exactly what the read is
 * shown, so each is also what its fingerprint covers.
 */

/** Themes a deck brings to the read: its commander's leading index themes (lock 6). */
const DECK_THEMES = 3;
/** Cards from the words the read takes as build-around asks (F1), as the retired read did. */
const READ_CARDS_MAX = 3;
/** Commanders named per card: the ones whose decks run it most, inside the player's pool. */
const RUN_BY_MAX = 30;

/**
 * The player's decks as the read sees them (lock 6): each deck's commander, its partner, and its
 * commander's leading themes from the index. No names the player typed, no notes, no games. Ordered
 * by commander name, so the same decks always number the same way.
 */
export async function loadReadDecks(userId: string): Promise<ReadDeck[]> {
  const rows = (await db.execute(sql`
    select d.commander_oracle_id as id, c.name, p.name as partner, cs.tags
    from decks d
    join cards c on c.oracle_id = d.commander_oracle_id
    left join cards p on p.oracle_id = d.partner_oracle_id
    left join commander_support cs on cs.commander_oracle_id = d.commander_oracle_id
    where d.user_id = ${userId}
  `)).rows as { id: string; name: string; partner: string | null; tags: EdhrecTag[] | null }[];
  const seen = new Set<string>();
  return rows
    .sort((a, b) => a.name.localeCompare(b.name, "en") || (a.partner ?? "").localeCompare(b.partner ?? "", "en"))
    // Two decks led by one commander read as one to the model: the same commander, the same themes.
    .filter((r) => { const k = `${r.id}:${r.partner ?? ""}`; if (seen.has(k)) return false; seen.add(k); return true; })
    .map((r) => ({ commanderOracleId: r.id, commander: r.name, partner: r.partner, themes: leadingThemes(r.tags ?? [], DECK_THEMES) }));
}

/** A digest of the cards the player owns: any card coming or going is a new ask (lock 7). */
export async function collectionDigest(userId: string): Promise<string> {
  const [row] = (await db.execute(sql`
    select coalesce(md5(string_agg(oracle_id::text, ',' order by oracle_id)), '') as digest
    from (select distinct oracle_id from collection_items where user_id = ${userId}) owned
  `)).rows as { digest: string }[];
  return row?.digest ?? "";
}

/**
 * The cards the player's words name, as the free match resolves them (F1: no picker, a card named
 * in the box steers the read), each with its rules text and the pool commanders whose decks run it
 * most. The words are never turned into chips: this only tells the read what was named.
 */
export async function loadReadCards(words: string, index: PhraseIndex, list: PoolList, pool: ReadonlySet<number>): Promise<ReadCard[]> {
  const named = matchWords(words, index).chips.flatMap((c) => (c.kind === "card" ? [c] : [])).slice(0, READ_CARDS_MAX);
  if (named.length === 0) return [];
  const ids = named.map((c) => c.oracleId);
  const [texts, runs] = await Promise.all([
    db.execute(sql`select oracle_id as id, coalesce(oracle_text, '') as text from cards where oracle_id = any(${sql.param(ids)}::uuid[])`)
      .then((r) => new Map((r.rows as { id: string; text: string }[]).map((x) => [x.id, x.text]))),
    db.execute(sql`
      select oracle_id as card, commander_oracle_id as commander from commander_support_cards
      where oracle_id = any(${sql.param(ids)}::uuid[]) order by inclusion desc nulls last
    `).then((r) => r.rows as { card: string; commander: string }[]),
  ]);
  return named.map((c) => ({
    name: c.name,
    oracleText: texts.get(c.oracleId) ?? "",
    runBy: runs.filter((r) => r.card === c.oracleId)
      .flatMap((r) => { const k = list.keyOf.get(r.commander); return k !== undefined && pool.has(k) ? [k] : []; })
      .slice(0, RUN_BY_MAX),
  }));
}
