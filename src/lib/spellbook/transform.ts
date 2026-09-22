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
  /** The cost to EXECUTE, not to cast. Null where upstream sends nothing. */
  manaNeeded: string | null;
  /** The same cost as a number. A 0 is a real answer — the combo is free to go off. */
  manaValueNeeded: number | null;
  /** Ordered execution steps, newline-separated. */
  steps: string | null;
  /** What must already be true for the combo to work. */
  notablePrerequisites: string | null;
};

export type VariantCardRow = { oracleId: string; mustBeCommander: boolean };

export type DropReason =
  | "not-commander-legal"
  | "unresolvable-card"
  | "no-uses"
  | "unknown-bracket-tag"
  | "no-id"
  | "malformed-prerequisite";

export type TransformResult =
  | { kind: "row"; variant: VariantRow; cards: VariantCardRow[] }
  | { kind: "drop"; reason: DropReason };

type Uses = { card?: { oracleId?: unknown }; mustBeCommander?: unknown }[];
type Requires = { template?: { id?: unknown } }[];
type Produces = { feature?: { name?: unknown } }[];

/** Upstream sends `""` rather than omitting these, so the two states are folded into one. */
function nonEmpty(v: unknown): string | null {
  return typeof v === "string" && v.trim().length > 0 ? v : null;
}

export function toVariantRows(raw: Record<string, unknown>, known: Set<string>): TransformResult {
  // Commander legality is upstream's own boolean, and it is how this ingest stays scoped to
  // the format rather than storing every variant in Magic.
  if ((raw.legalities as Record<string, unknown> | undefined)?.commander !== true) {
    return { kind: "drop", reason: "not-commander-legal" };
  }

  // `String(raw.id)` on a missing id yields the literal "undefined", which is a bogus primary
  // key — and a SECOND malformed record collides with it and fails the whole insert batch.
  // The canary reads only the first record, so a malformed one later in the file reaches here
  // unannounced; counting it as a drop is what makes it visible.
  if (typeof raw.id !== "string" || raw.id.length === 0) return { kind: "drop", reason: "no-id" };

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

  // A MALFORMED PREREQUISITE MUST NOT LOOK LIKE NO PREREQUISITE.
  //
  // Filtering non-integer ids out silently erases the entry, so a three-piece variant whose
  // template id is missing or malformed is stored with an empty `requiresTemplateIds` — and
  // the two-card combo query then reads it as an assembleable two-card infinite and slots the
  // deck to Bracket 4 over a combo it cannot make. That is exactly the false positive §4.3b
  // rule 1 exists to prevent, arriving through a data-quality hole rather than a logic one.
  //
  // So the variant is DROPPED AND COUNTED instead. Erring toward dropping a real combo
  // (under-slotting) over inventing one (over-slotting) is the direction this whole surface
  // is built on: a wrong verdict costs someone a card they did not need to cut.
  const requires = Array.isArray(raw.requires) ? (raw.requires as Requires) : [];
  const requiresTemplateIds: number[] = [];
  for (const r of requires) {
    const id = r?.template?.id;
    if (!Number.isInteger(id)) return { kind: "drop", reason: "malformed-prerequisite" };
    requiresTemplateIds.push(id as number);
  }

  const produces = Array.isArray(raw.produces) ? (raw.produces as Produces) : [];

  return {
    kind: "row",
    variant: {
      variantId: raw.id,
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
      // EMPTY STRING IS UPSTREAM'S "NOTHING", and it is what these fields carry far more often
      // than a missing key — `notablePrerequisites` is `""` on a third of records. Folding it
      // to null here means a reader tests one thing rather than two, and a `""` can never be
      // drawn as a prerequisite nobody wrote.
      manaNeeded: nonEmpty(raw.manaNeeded),
      // NOT `nonEmpty`, and not `|| null`: 0 is the answer for 59% of variants — the combo
      // needs no mana — and coercing it to null would turn the most informative reading on
      // this record into "we do not know".
      manaValueNeeded: Number.isFinite(raw.manaValueNeeded)
        ? (raw.manaValueNeeded as number)
        : null,
      steps: nonEmpty(raw.description),
      notablePrerequisites: nonEmpty(raw.notablePrerequisites),
    },
    cards,
  };
}
