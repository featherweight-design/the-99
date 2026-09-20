/**
 * One Commander Spellbook bulk record -> the rows `spellbook_variants` and
 * `spellbook_variant_cards` store.
 *
 * Pure: no database, no network. Every field projected here was verified against a REAL bulk
 * record on 2026-09-20 (see `__fixtures__/variants-head.json`, captured rather than written),
 * because the one shape the spec could not write down was `requires` — and §4.3b rule 1 is
 * load-bearing on reading it correctly.
 *
 * A dropped record returns a REASON rather than null. The ingest counts them by reason and
 * prints the tally, on the same principle as the EDHREC index's unresolvable-name count: a
 * record that vanishes silently shrinks a denominator nobody can audit.
 */

/** The seven tags the table's check constraint allows. */
const BRACKET_TAGS = new Set(["R", "S", "P", "O", "C", "E", "B"]);

export type VariantRow = {
  variantId: string;
  bracketTag: string;
  /** Length of `uses` ONLY — never `uses + requires`. §4.3b rule 1 depends on this. */
  cardCount: number;
  identity: string;
  popularity: number | null;
  produces: string[];
  requiresTemplateIds: number[];
};

export type VariantCardRow = { oracleId: string; mustBeCommander: boolean };

export type DropReason =
  | "not-commander-legal"
  | "unresolvable-card"
  | "no-uses"
  | "unknown-bracket-tag";

export type TransformResult =
  | { kind: "row"; variant: VariantRow; cards: VariantCardRow[] }
  | { kind: "drop"; reason: DropReason };

type Uses = { card?: { oracleId?: unknown }; mustBeCommander?: unknown }[];
type Requires = { template?: { id?: unknown } }[];
type Produces = { feature?: { name?: unknown } }[];

export function toVariantRows(raw: Record<string, unknown>, known: Set<string>): TransformResult {
  // Commander legality is upstream's own boolean, and it is how this ingest stays scoped to
  // the format rather than storing every variant in Magic.
  if ((raw.legalities as Record<string, unknown> | undefined)?.commander !== true) {
    return { kind: "drop", reason: "not-commander-legal" };
  }

  const bracketTag = typeof raw.bracketTag === "string" ? raw.bracketTag : "";
  if (!BRACKET_TAGS.has(bracketTag)) return { kind: "drop", reason: "unknown-bracket-tag" };

  const uses = Array.isArray(raw.uses) ? (raw.uses as Uses) : [];
  if (uses.length === 0) return { kind: "drop", reason: "no-uses" };

  // De-duplicated, because the composite primary key is (variant_id, oracle_id) and one
  // duplicate fails the whole insert batch — the same trap `toSupportRows` records.
  // `cardCount` keeps upstream's own `uses` length regardless, since that is what the
  // two-card test asks about.
  const cards: VariantCardRow[] = [];
  const emitted = new Set<string>();
  for (const u of uses) {
    const oracleId = u?.card?.oracleId;
    if (typeof oracleId !== "string" || !known.has(oracleId)) {
      return { kind: "drop", reason: "unresolvable-card" };
    }
    if (emitted.has(oracleId)) continue;
    emitted.add(oracleId);
    cards.push({ oracleId, mustBeCommander: u.mustBeCommander === true });
  }

  const requires = Array.isArray(raw.requires) ? (raw.requires as Requires) : [];
  const requiresTemplateIds = requires
    .map((r) => r?.template?.id)
    .filter((id): id is number => Number.isInteger(id));

  const produces = Array.isArray(raw.produces) ? (raw.produces as Produces) : [];

  return {
    kind: "row",
    variant: {
      variantId: String(raw.id),
      bracketTag,
      cardCount: uses.length,
      identity: typeof raw.identity === "string" ? raw.identity : "",
      // Null stays null: upstream leaves it unset on real records, and a 0 would read as
      // "nobody plays this" rather than "nobody counted".
      popularity: Number.isFinite(raw.popularity) ? (raw.popularity as number) : null,
      produces: produces
        .map((p) => p?.feature?.name)
        .filter((n): n is string => typeof n === "string" && n.length > 0),
      requiresTemplateIds,
    },
    cards,
  };
}
