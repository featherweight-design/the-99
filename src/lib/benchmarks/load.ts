import { inArray } from "drizzle-orm";
import { db } from "../../db";
import { cards as cardsTable } from "../../db/schema";
import { comboModal } from "../bracket/combo-modal";
import { castFaceText } from "../cards/facet";
import { readLabels } from "../labels/read";
import type { Job } from "../labels/types";
import type { DeckProfile } from "../profile/types";
import { isInfiniteOrGameEnding } from "../spellbook/combo-features";
import { anySizeComboQuery, type ComboPieceRow } from "../synopsis/combo-facts";
import type { BenchmarkInput } from "./compute";
import { jobsFromText } from "./text-jobs";
import type { BenchCard, BenchLine } from "./types";

export type TextRow = { oracleId: string; oracleText: string | null; keywords: string[]; manaCost: string | null; colorIdentity: string[] };

/**
 * What the benchmarks read for one reading, from the list stored WITH it (`DeckProfile.cards`), so a
 * held or stale reading is graded on its own list (brief lock 2). Three reads, each on the list's ids:
 * the cards' text columns, their fresh labels, and the any-size combo rows. Null when a read fails:
 * the block then draws nothing, and the reading draws as it always has.
 */
export async function loadBenchmarkInput(profile: DeckProfile): Promise<BenchmarkInput | null> {
  const ids = [...new Set([...profile.cards.map((c) => c.oracleId), ...profile.commanderOracleIds])];
  if (ids.length === 0) return null;
  try {
    const [text, labels, combos] = await Promise.all([
      db.select({
        oracleId: cardsTable.oracleId, oracleText: cardsTable.oracleText, keywords: cardsTable.keywords,
        manaCost: cardsTable.manaCost, colorIdentity: cardsTable.colorIdentity,
      }).from(cardsTable).where(inArray(cardsTable.oracleId, ids)),
      readLabels(ids),
      db.execute(anySizeComboQuery(ids, profile.commanderOracleIds)),
    ]);
    return benchmarkInput(profile, text, labels, combos.rows as ComboPieceRow[]);
  } catch (error) {
    console.error("benchmark read failed", error);
    return null;
  }
}

/** The pure half of the load: the reading's list, joined to what was read for it. */
export function benchmarkInput(
  profile: Pick<DeckProfile, "cards" | "commanderOracleIds" | "roles">,
  text: readonly TextRow[],
  labels: ReadonlyMap<string, Job[]>,
  comboRows: readonly ComboPieceRow[],
): BenchmarkInput {
  const byId = new Map(text.map((t) => [t.oracleId, t]));
  const commanders = new Set(profile.commanderOracleIds);
  const cards: BenchCard[] = profile.cards.map((c) => {
    const t = byId.get(c.oracleId);
    const oracleText = castFaceText(t?.oracleText ?? null, c.layout);
    const keywords = t?.keywords ?? [];
    return {
      oracleId: c.oracleId, name: c.name, quantity: c.quantity, commander: commanders.has(c.oracleId),
      typeLine: c.typeLine, manaValue: c.cmc, manaCost: t?.manaCost ?? null, colorIdentity: t?.colorIdentity ?? [], oracleText, keywords,
      jobs: labels.get(c.oracleId) ?? jobsFromText({ typeLine: c.typeLine, oracleText, keywords }),
    };
  });
  return {
    cards,
    lines: assembledLines(comboRows, profile.commanderOracleIds),
    castRamp: profile.roles.excludingCommanders?.ramp ?? profile.roles.counts.ramp,
  };
}

/**
 * EVERY line the deck assembles: each variant whose every piece is held, grouped by variant and
 * never capped. `shapeComboFacts` caps the Overview's facts at six, which would cut Counter
 * Intelligence's seventeen lines and understate the odds, so it is not used here.
 */
export function assembledLines(rows: readonly ComboPieceRow[], commanderIds: readonly string[]): BenchLine[] {
  const byVariant = new Map<string, ComboPieceRow[]>();
  for (const r of rows) byVariant.set(r.variant_id, [...(byVariant.get(r.variant_id) ?? []), r]);
  const lines: BenchLine[] = [];
  for (const [variantId, pieces] of byVariant) {
    const first = pieces[0];
    if (pieces.length !== first.card_count || !isInfiniteOrGameEnding(first.produces) || pieces.some((p) => !p.held)) continue;
    const sorted = [...pieces].sort((a, b) => a.name.localeCompare(b.name));
    lines.push({
      ...comboModal({
        variantId,
        cards: sorted.map((p) => ({ oracleId: p.oracle_id, name: p.name })),
        produces: first.produces,
        bracketTag: "",
        usesCommander: sorted.some((p) => commanderIds.includes(p.oracle_id)),
        manaValueNeeded: first.mana_value_needed,
        manaNeeded: first.mana_needed ?? null,
        steps: first.steps ?? null,
        notablePrerequisites: first.notable_prerequisites ?? null,
      }),
      pieceIds: sorted.map((p) => p.oracle_id),
    });
  }
  return lines.sort((a, b) => a.variantId.localeCompare(b.variantId));
}
