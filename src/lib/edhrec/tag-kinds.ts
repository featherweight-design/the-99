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
 * Every singular a label could reduce to, as RULES rather than as a table of
 * known words.
 *
 * **A hand table was tried first and is gone, because it cannot generalise.**
 * It held five entries and was still missing four tribes — `Mice`,
 * `Werewolves`, `Cybermen` and `Pegasi` — two of which a review found and two
 * of which turned up only when the whole mechanic allowlist was swept against
 * Scryfall's creature types. Every one of those four is a regular instance of an
 * irregular English pattern, so the pattern is what belongs here: a table entry
 * fixes one word, a rule fixes the next set's tribe too.
 *
 * The patterns, each with the tribe that paid for it:
 *
 * | ending | becomes | case |
 * |---|---|---|
 * | `-ves` | `-f`, `-fe` | `wolves`, `elves`, `dwarves`, `werewolves`, `thieves` |
 * | `-men` | `-man` | `cybermen` |
 * | `-i` | `-us` | `fungi`, `pegasi` |
 * | `-ice` | `-ouse` | `mice` |
 * | `-oes` | *(drop 2)* | `heroes` |
 * | `-ies` | `-y` | `allies` |
 * | `-(sh\|ch\|s\|x\|z)es` | *(drop 2)* | `foxes` |
 * | `-s` | *(drop 1)* | `frogs`, `faeries`, `horses`, `humans`, `zombies` |
 *
 * Over-reduction is safe and deliberate: a form that matches no creature type
 * costs nothing, and the generator's own `MUST_BE_MECHANIC` assertions catch a
 * rule that pulls a real mechanic across.
 */
export function singularForms(label: string): string[] {
  const lower = label.toLowerCase();
  const forms = [lower];
  if (lower.endsWith("ves")) {
    forms.push(`${lower.slice(0, -3)}f`, `${lower.slice(0, -3)}fe`);
  }
  if (lower.endsWith("men")) forms.push(`${lower.slice(0, -3)}man`);
  if (lower.endsWith("ice")) forms.push(`${lower.slice(0, -3)}ouse`);
  if (lower.endsWith("oes")) forms.push(lower.slice(0, -2));
  if (lower.endsWith("ies")) forms.push(`${lower.slice(0, -3)}y`);
  if (/(sh|ch|s|x|z)es$/.test(lower)) forms.push(lower.slice(0, -2));
  if (lower.endsWith("i")) forms.push(`${lower.slice(0, -1)}us`);
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
