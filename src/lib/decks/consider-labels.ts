/**
 * The deck page's request-time read for the Consider filter (card labels item 7, item 1): the fresh
 * labels of the suggestions it renders, and the deck lens they are read through.
 *
 * Read AFTER the cached suggestions payload resolves and outside every `cacheForUser` entry: a label
 * publish moves neither the deployment nor the catalog generation that key carries, so a label read
 * inside the cache would serve the previous run's labels for up to its ceiling.
 *
 * Off (`LABEL_SURFACES_ENABLED` anything but `'true'`), nothing is read and the suggestions pass
 * through untouched.
 */
import { sql } from "drizzle-orm";
import { db } from "../../db";
import { creatureSubtypes } from "../recs/themes";
import { loadCreatureTypes, loadNoncreatureSubtypes } from "../swaps/gather";
import type { DeckLens } from "../swaps/honest";
import { filterConsider } from "../labels/consider";
import { deckLens } from "../labels/lens";
import { labelSurfacesEnabled, readLabels } from "../labels/read";
import type { Job } from "../labels/types";
import type { ReasonType } from "./suggest";

type LensRow = { oracleId: string; typeLine: string; oracleText: string | null; quantity: number };

export type ConsiderLabelDeps = {
  enabled: () => boolean;
  readLabels: (oracleIds: readonly string[]) => Promise<Map<string, Job[]>>;
  loadCreatureTypes: () => Promise<Set<string>>;
  loadNoncreatureSubtypes: () => Promise<Set<string>>;
  /** The deck's rows with type line, text and copies: `detail.cards` carries no oracle text. */
  readLensRows: (deckId: string) => Promise<LensRow[]>;
};

/** What `filterConsider` reads, or null when the switch is off. */
export type ConsiderLabels = {
  labels: Map<string, Job[]>;
  lens: DeckLens;
  commanderTypes: string[];
  isCreatureType: (w: string) => boolean;
};

/**
 * One query, scoped to the deck the page has already guarded (`getDeckDetail` is owner-scoped and the
 * page leaves through `notFound()` before this runs for a deck the reader does not own).
 */
async function readLensRows(deckId: string): Promise<LensRow[]> {
  const rows = await db.execute<{ oracle_id: string; type_line: string; oracle_text: string | null; quantity: number }>(sql`
    select dc.oracle_id, c.type_line, c.oracle_text, dc.quantity from deck_cards dc join cards c on c.oracle_id = dc.oracle_id
    where dc.deck_id = ${deckId}
  `);
  return rows.rows.map((r) => ({ oracleId: r.oracle_id, typeLine: r.type_line, oracleText: r.oracle_text, quantity: Number(r.quantity) }));
}

const DEFAULT_DEPS: ConsiderLabelDeps = {
  enabled: () => labelSurfacesEnabled(),
  readLabels, loadCreatureTypes, loadNoncreatureSubtypes, readLensRows,
};

export async function considerLabels(
  args: {
    deckId: string;
    /** The ids of the suggestions the page renders, and nothing else: never the catalog, never the deck. */
    suggestionIds: readonly string[];
    /** The deck's commanders: their types break a key-type tie, and what they hold counts as held. */
    commanders: readonly { oracleId: string; typeLine: string; oracleText: string | null }[];
  },
  deps: ConsiderLabelDeps = DEFAULT_DEPS,
): Promise<ConsiderLabels | null> {
  if (!deps.enabled()) return null;
  if (args.suggestionIds.length === 0) return null;
  const [labels, creatureTypes, noncreatureSubtypes, rows] = await Promise.all([
    deps.readLabels(args.suggestionIds),
    deps.loadCreatureTypes(),
    deps.loadNoncreatureSubtypes(),
    deps.readLensRows(args.deckId),
  ]);
  const isCreatureType = (w: string) => creatureTypes.has(w);
  const lens = deckLens({
    draft: rows,
    commanderTypeLines: args.commanders.map((c) => c.typeLine),
    // The commanders' text counts: a commander that makes Treasure holds Treasure. No card is leaving.
    holding: [...rows, ...args.commanders],
    leaving: null,
    noncreatureSubtypes,
  });
  const commanderTypes = [...new Set(args.commanders.flatMap((c) => creatureSubtypes(c.typeLine)))].filter(isCreatureType);
  return { labels, lens, commanderTypes, isCreatureType };
}

/** The suggestions the page renders: unchanged when the read is off or failed (null). */
export function applyConsiderLabels<T extends { oracleId: string; reasonType: ReasonType; typeLine: string }>(
  suggestions: T[],
  read: ConsiderLabels | null,
): T[] {
  if (read === null) return suggestions;
  return filterConsider(suggestions, read.labels, read.lens, read.commanderTypes, read.isCreatureType);
}
