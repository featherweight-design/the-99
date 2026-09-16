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
 * which is the whole reason for the list. It will drift as EDHREC's vocabulary
 * grows; that is a known cost, noted in the commander-index runbook.
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
 * Six entries, not ten. `faeries`, `horses`, `humans` and `zombies` were here
 * and are gone: the trailing-`s` rule already yields `faerie`, `horse`, `human`
 * and `zombie`, so those entries could never change an answer — the same dead
 * -weight class as the format guard `gap-slot.ts` describes. What the six have
 * in common is that no suffix rule produces their singular: `dwarves` reduces
 * to `dwarve`, `heroes` to `heroe`, and `fungi` has no plural suffix at all.
 */
const IRREGULAR_PLURALS: Readonly<Record<string, string>> = {
  dwarves: "dwarf",
  elves: "elf",
  fungi: "fungus",
  heroes: "hero",
  thieves: "thief",
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
 * Whether a label names a creature type, against a vocabulary of subtypes that
 * ONLY ever name creatures.
 *
 * Multi-word labels — `Modified Creatures`, `Sea Creatures`, `Commander
 * Matters` — fall out as mechanics without a guard, and an explicit
 * `if (/\s/.test(label)) return false` was written here and removed: the
 * vocabulary is built by splitting type lines on whitespace, so every member is
 * one word, and `singularForms` only ever yields whole-label forms. A
 * space-bearing label therefore cannot match any entry, and a mutation run
 * confirmed the guard changed no answer in the 43-case suite.
 *
 * The behaviour is still asserted in the tests, because it is a property of
 * `singularForms` rather than of this function — a future `singularForms` that
 * split words would break it silently.
 */
export function isCreatureTypeLabel(label: string, creatureOnlySubtypes: Set<string>): boolean {
  return singularForms(label).some((form) => creatureOnlySubtypes.has(form));
}
