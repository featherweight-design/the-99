import { sql } from "drizzle-orm";
import { db } from "../../db";
import type { ChooseParams } from "./params";
import type { Bracket } from "./rank";
import { loadCardChip, type CardChip } from "./rows";
import { loadIntakeThemes } from "./search";
import { themeShare, type ThemeRow } from "./vocabulary";

/**
 * What the create page's *Built from your answers* block says (HANDOFF §6), for the commander the
 * player pressed. Each figure is the same one the results row printed beside that commander, read
 * the same way (`themeShare`, the card's inclusion), so the two screens never disagree about it.
 */
export type HandOffAnswers = {
  /** In the order asked. `pct` is null where the results would print no figure either. */
  themes: { slug: string; label: string; pct: number | null }[];
  /** Null when none was asked, or when it is not one the search would have applied. */
  card: (CardChip & { pct: number | null }) | null;
  budgetDollars: number | null;
  bracket: Bracket | null;
};

export async function loadHandOffAnswers(userId: string, commanderId: string, p: ChooseParams): Promise<HandOffAnswers> {
  const [vocabulary, card, [row]] = await Promise.all([
    p.themes.length > 0 ? loadIntakeThemes() : Promise.resolve([]),
    p.card ? loadCardChip(userId, p.card) : Promise.resolve(null),
    db.execute(sql`
      select cs.deck_count, cs.tags,
        ${p.card ? sql`(select csc.inclusion from commander_support_cards csc
          where csc.commander_oracle_id = cs.commander_oracle_id and csc.oracle_id = ${p.card}::uuid)` : sql`null::real`} as card_inclusion
      from commander_support cs where cs.commander_oracle_id = ${commanderId}::uuid
    `).then((r) => r.rows as { deck_count: number | null; tags: ThemeRow["tags"]; card_inclusion: number | null }[]),
  ]);
  const labels = new Map(vocabulary.map((t) => [t.slug, t.label]));
  const themeRow: ThemeRow | null = row ? { deckCount: row.deck_count, tags: row.tags ?? [] } : null;
  const pct = (share: number | null) => (share === null ? null : Math.round(share * 100));
  return {
    // A slug the vocabulary no longer offers is no answer, exactly as the results page drops it.
    themes: p.themes.flatMap((slug) => {
      const label = labels.get(slug);
      return label ? [{ slug, label, pct: pct(themeRow ? themeShare(themeRow, slug) : null) }] : [];
    }),
    // `inclusion` is stored as EDHREC publishes it, a percentage (`search.ts`).
    card: card ? { ...card, pct: row?.card_inclusion == null ? null : Math.round(row.card_inclusion) } : null,
    budgetDollars: p.budgetDollars,
    bracket: p.bracket,
  };
}

/** Whether the block has a row to draw: colors and the words are never rows. */
export function hasAnswerRows(a: HandOffAnswers): boolean {
  return a.themes.length > 0 || a.card !== null || a.budgetDollars !== null || a.bracket !== null;
}
