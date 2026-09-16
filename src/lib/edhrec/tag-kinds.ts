// How an EDHREC theme label is classified, and the rules the classification
// rests on. The label SETS live in `tag-kinds.generated.ts`; the rules live here
// so the generator and the unit tests share one copy of them.

/**
 * Formats, variants and non-card contexts.
 *
 * Hand-maintained, unavoidably: no catalog separates a power level from a
 * mechanic, and a computed substitute does not exist — excluding labels by how
 * many commanders carry them cannot tell these apart from real themes, since
 * `cEDH` sits on 1,504 commanders and `Reanimator` on 1,519.
 *
 * `None of your decks play cEDH` is a category error rather than a false claim,
 * which is the whole reason for the list.
 *
 * IT WILL DRIFT as EDHREC's vocabulary grows, and nothing detects that — a new
 * format label is simply allowlisted as a mechanic at the next regeneration.
 * The cost is recorded in the spec
 * (`docs/superpowers/specs/2026-09-15-commander-row-play-style-design.md`) and
 * in `scripts/build-tag-kinds.mts`. There is no runbook; an earlier revision of
 * this comment cited one that does not exist.
 */
export const FORMAT_LABELS: readonly string[] = [
  "cEDH",
  "Custom Cards",
  "European Highlander",
  "Old School",
  "Planechase",
  "Premodern",
  "Value Vintage",
];

/**
 * Plurals the suffix rules below cannot reach.
 *
 * Five entries, and every one is load-bearing against Scryfall's own
 * creature-type catalog: no suffix rule produces `dwarf` from `dwarves`, `hero`
 * from `heroes`, or `fungus` from `fungi` at all. Entries that WERE here and are
 * gone, each because a suffix rule already yields the same answer and the table
 * row could never fire: `faeries`, `horses`, `humans`, `zombies` — and
 * `thieves`, which is moot twice over, since `Thief` is not a creature type in
 * Scryfall's taxonomy and `Thieves` is not in EDHREC's vocabulary.
 */
const IRREGULAR_PLURALS: Readonly<Record<string, string>> = {
  dwarves: "dwarf",
  elves: "elf",
  fungi: "fungus",
  heroes: "hero",
  wolves: "wolf",
};

/** Every singular a label could be, most specific first. */
export function singularForms(label: string): string[] {
  const lower = label.toLowerCase();
  const forms = [lower];
  const irregular = IRREGULAR_PLURALS[lower];
  if (irregular) forms.push(irregular);
  if (lower.endsWith("ies")) forms.push(`${lower.slice(0, -3)}y`);
  if (/(sh|ch|s|x|z)es$/.test(lower)) forms.push(lower.slice(0, -2));
  if (lower.endsWith("s")) forms.push(lower.slice(0, -1));
  return forms;
}

/**
 * Whether a label names a creature type, against Scryfall's creature-type
 * catalog (lower-cased).
 *
 * **Multi-word creature types work because the catalog carries the phrase.**
 * `Time Lord` is a real creature type, and `singularForms("Time Lords")` yields
 * `"time lord"`, which the catalog holds verbatim. An earlier version derived
 * the vocabulary from card type lines split on whitespace, which recorded
 * `time` and `lord` separately and so allowlisted `Time Lords` as a mechanic;
 * no guard on this function could have saved it, and the explicit
 * `if (/\s/.test(label)) return false` that once lived here would have produced
 * the same wrong answer by a different route.
 *
 * Multi-word MECHANIC labels — `Modified Creatures`, `Sea Creatures`,
 * `Commander Matters` — are absent from the catalog and fall out as mechanics
 * with no special handling.
 */
export function isCreatureTypeLabel(label: string, creatureTypes: Set<string>): boolean {
  return singularForms(label).some((form) => creatureTypes.has(form));
}
