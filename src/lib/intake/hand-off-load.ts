import { sql } from "drizzle-orm";
import { db } from "../../db";
import type { ChooseParams } from "./params";
import { backing, type Bracket } from "./rank";
import { loadCardChip, type CardChip } from "./rows";
import { loadIntakeThemes } from "./search";
import { tribesFor, type ThemeRow } from "./vocabulary";

/**
 * What the create page's *Built from your answers* block says (HANDOFF §6), for the commander the
 * player pressed. Each figure is the same one the results row printed beside that commander, read
 * the same way (`backing`, the card's inclusion), so the two screens never disagree about it.
 */
export type HandOffAnswers = {
  /** In the order asked. `pct` is null where the results would print no figure either. */
  themes: { slug: string; label: string; pct: number | null }[];
  /** Null when none was asked, or when it is not one the search would have applied. */
  card: (CardChip & { pct: number | null }) | null;
  /** The card's read FAILED, which says nothing about the card: the block draws no row it cannot
   *  name, and the create still carries the id, since `createDeck` validates it itself. */
  cardUnread: boolean;
  budgetDollars: number | null;
  bracket: Bracket | null;
};

/**
 * Every read here is a decoration of a page the player already chose to open, so each fails soft,
 * as the results page's do: a failed vocabulary labels themes by their slugs, a failed support read
 * prints no figures, and a failed card read draws no card row. None takes the create form down.
 */
export async function loadHandOffAnswers(userId: string, commanderId: string, p: ChooseParams): Promise<HandOffAnswers> {
  const [vocabulary, card, [row]] = await Promise.all([
    p.themes.length > 0 ? loadIntakeThemes().catch(() => []) : Promise.resolve([]),
    // `undefined` when the read failed; `null` when it says there is no such card.
    p.card ? loadCardChip(userId, p.card).catch(() => undefined) : Promise.resolve(null),
    db.execute(sql`
      select cs.deck_count, cs.tags, c.type_line,
        ${p.card ? sql`(select csc.inclusion from commander_support_cards csc
          where csc.commander_oracle_id = cs.commander_oracle_id and csc.oracle_id = ${p.card}::uuid)` : sql`null::real`} as card_inclusion
      from commander_support cs join cards c on c.oracle_id = cs.commander_oracle_id
      where cs.commander_oracle_id = ${commanderId}::uuid
    `).then((r) => r.rows as { deck_count: number | null; tags: ThemeRow["tags"]; type_line: string | null; card_inclusion: number | null }[]).catch(() => []),
  ]);
  const labels = new Map(vocabulary.map((t) => [t.slug, t.label]));
  const themeRow = row ? { deckCount: row.deck_count, tags: row.tags ?? [], typeLine: row.type_line } : null;
  // The results' own backing, a tribal theme's type line included, so a row admitted that way
  // shows the same figure here as it did there.
  const tribes = tribesFor(p.themes, vocabulary);
  const pct = (share: number | null) => (share === null ? null : Math.round(share * 100));
  return {
    // Every theme asked is a row. One the vocabulary no longer offers is labeled by its slug,
    // exactly as the results page labels it, so no answer is lost between the two screens.
    themes: p.themes.map((slug) => ({ slug, label: labels.get(slug) ?? slug, pct: pct(themeRow ? backing(themeRow, slug, tribes)?.share ?? null : null) })),
    // `inclusion` is stored as EDHREC publishes it, a percentage (`search.ts`).
    card: card ? { ...card, pct: row?.card_inclusion == null ? null : Math.round(row.card_inclusion) } : null,
    cardUnread: card === undefined,
    budgetDollars: p.budgetDollars,
    bracket: p.bracket,
  };
}

/** Whether the block has a row to draw: colors and the words are never rows. */
export function hasAnswerRows(a: HandOffAnswers): boolean {
  return a.themes.length > 0 || a.card !== null || a.budgetDollars !== null || a.bracket !== null;
}
