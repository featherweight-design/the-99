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
 * Plurals a suffix rule gets wrong. Each one reached the mechanic side of a
 * first attempt at this, which is a tribe on screen — the defect the classifier
 * exists to prevent.
 */
const IRREGULAR_PLURALS: Readonly<Record<string, string>> = {
  dwarves: "dwarf",
  elves: "elf",
  faeries: "faerie",
  fungi: "fungus",
  heroes: "hero",
  horses: "horse",
  humans: "human",
  thieves: "thief",
  wolves: "wolf",
  zombies: "zombie",
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
 * Multi-word labels are never a bare subtype: `Modified Creatures`,
 * `Sea Creatures` and `Commander Matters` all contain a creature word and none
 * of them is a tribe.
 */
export function isCreatureTypeLabel(label: string, creatureOnlySubtypes: Set<string>): boolean {
  if (/\s/.test(label)) return false;
  return singularForms(label).some((form) => creatureOnlySubtypes.has(form));
}
