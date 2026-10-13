import { sql } from "drizzle-orm";
import { db } from "../../db";
import type { ChooseParams } from "./params";
import { backing, bestFit, isAnyOf, type Bracket } from "./rank";
import { loadCardChip, type CardChip } from "./rows";
import { loadIntakeThemes } from "./search";
import { loadCommanderPrintings } from "../sets/printed-in-read";
import { tribesFor, type ThemeRow } from "./vocabulary";

/**
 * What the create page's *Built from your answers* block says (HANDOFF §6), for the commander the
 * player pressed. Each figure is the same one the results row printed beside that commander, read
 * the same way (`backing`, the card's inclusion), so the two screens never disagree about it.
 */
export type HandOffAnswers = {
  /**
   * In the order asked. `pct` is null where the results would print no figure either. `best`,
   * asked as any of, marks the theme the results row ranked by (`bestFit`, on the exact share).
   */
  themes: { slug: string; label: string; pct: number | null; best?: boolean }[];
  /** Any of: one row for the group, its line the best figure, as the results row ranked it. */
  themeJoin: "all" | "any";
  /** The sets asked, each with its name: one row, the codes as the chip draws them. */
  sets: { code: string; name: string }[];
  /** The 99 from the player's own cards (three answers §3). */
  pool: "any" | "own";
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
export async function loadHandOffAnswers(
  userId: string,
  commanderId: string,
  p: ChooseParams,
  /** The reader's resolved switches (`requestSwitchEnv`), for the card chip's claim read and art; the
   *  environment alone when omitted (admin PR 7 makes it required). */
  env: NodeJS.ProcessEnv = process.env,
): Promise<HandOffAnswers> {
  const [vocabulary, card, [row], printings] = await Promise.all([
    p.themes.length > 0 ? loadIntakeThemes().catch(() => []) : Promise.resolve([]),
    // `undefined` when the read failed; `null` when it says there is no such card.
    p.card ? loadCardChip(userId, p.card, env).catch(() => undefined) : Promise.resolve(null),
    db.execute(sql`
      select cs.deck_count, cs.tags, c.type_line,
        ${p.card ? sql`(select csc.inclusion from commander_support_cards csc
          where csc.commander_oracle_id = cs.commander_oracle_id and csc.oracle_id = ${p.card}::uuid)` : sql`null::real`} as card_inclusion
      from commander_support cs join cards c on c.oracle_id = cs.commander_oracle_id
      where cs.commander_oracle_id = ${commanderId}::uuid
    `).then((r) => r.rows as { deck_count: number | null; tags: ThemeRow["tags"]; type_line: string | null; card_inclusion: number | null }[]).catch(() => []),
    // The sets' names, a decoration: a failed read draws their codes.
    p.sets.length > 0 ? loadCommanderPrintings().catch(() => ({ sets: [], byOracle: {} })) : Promise.resolve({ sets: [], byOracle: {} }),
  ]);
  const labels = new Map(vocabulary.map((t) => [t.slug, t.label]));
  const setNames = new Map(printings.sets.map((s) => [s.code, s.name]));
  const themeRow = row ? { deckCount: row.deck_count, tags: row.tags ?? [], typeLine: row.type_line } : null;
  // The results' own backing, a tribal theme's type line included, so a row admitted that way
  // shows the same figure here as it did there.
  const tribes = tribesFor(p.themes, vocabulary);
  return {
    // Every theme asked is a row. One the vocabulary no longer offers is labeled by its slug,
    // exactly as the results page labels it, so no answer is lost between the two screens.
    themes: handOffThemes(p, themeRow ? (slug) => backing(themeRow, slug, tribes) : () => null, labels),
    // `inclusion` is stored as EDHREC publishes it, a percentage (`search.ts`).
    card: card ? { ...card, pct: row?.card_inclusion == null ? null : Math.round(row.card_inclusion) } : null,
    cardUnread: card === undefined,
    themeJoin: isAnyOf(p) ? "any" : "all",
    pool: p.pool,
    sets: p.sets.map((code) => ({ code, name: setNames.get(code) ?? code.toUpperCase() })),
    budgetDollars: p.budgetDollars,
    bracket: p.bracket,
  };
}

/** Each theme asked, its figure, and as any of the best-fitting one marked, as the row chose it. */
export function handOffThemes(
  p: Pick<ChooseParams, "themes" | "themeJoin">,
  backed: (slug: string) => { share: number; typeLine: boolean } | null,
  labels: ReadonlyMap<string, string>,
): HandOffAnswers["themes"] {
  const rows = p.themes.map((slug) => ({ slug, b: backed(slug) }));
  const best = isAnyOf(p) ? bestFit(rows.flatMap((r) => (r.b ? [{ slug: r.slug, ...r.b }] : []))) : null;
  return rows.map(({ slug, b }) => ({
    slug,
    label: labels.get(slug) ?? slug,
    pct: b === null ? null : Math.round(b.share * 100),
    ...(best?.slug === slug ? { best: true } : {}),
  }));
}

/** Whether the block has a row to draw: colors and the words are never rows. */
export function hasAnswerRows(a: HandOffAnswers): boolean {
  return a.themes.length > 0 || a.sets.length > 0 || a.pool === "own" || a.card !== null || a.budgetDollars !== null || a.bracket !== null;
}
