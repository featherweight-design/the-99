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
 * | `-ves` | `-f`, `-fe` | `wolves`, `elves`, `dwarves`, `werewolves` |
 * | `-men` | `-man` | `cybermen` |
 * | `-i` | `-us` | `fungi`, `pegasi` |
 * | `-ice` | `-ouse` | `mice` |
 * | `-oes` | *(drop 2)* | `heroes` |
 * | `-ies` | `-y` | `allies` |
 * | `-(sh\|ch\|s\|x\|z)es` | *(drop 2)* | `foxes` |
 * | `-s` | *(drop 1)* | `frogs`, `faeries`, `horses`, `humans`, `zombies` |
 *
 * Over-reduction is safe and deliberate: a form that matches no creature type
 * costs nothing. What would NOT be safe is a rule pulling a real mechanic
 * across, and it is worth being exact about how much the negative cases prove,
 * because two earlier revisions of this comment overstated it.
 *
 * These five mechanic labels each FIRE the rule beside them, and are asserted in
 * both the generator and `gap-slot.test.ts`:
 *
 * | rule | mechanic label that fires it | reduces to |
 * |---|---|---|
 * | `-ves` | `Caves` | `caf`, `cafe`, `cave` |
 * | `-ice` | `Sacrifice` | `sacrifouse` |
 * | `-ies` | `Activated Abilities` | `activated ability` |
 * | `-(sh\|ch\|s\|x\|z)es` | `Curses` | `curs`, `curse` |
 * | `-s` | `Artifacts` | `artifact` |
 *
 * **They are regression guards on the classification, NOT proofs that a rule
 * cannot over-reach.** Over-reduction only misclassifies when the reduced form
 * happens to be a real creature type, and none of the forms in that third column
 * is one — so no tweak to those rules can pull these five across, and a mutation
 * run confirms the cases survive one. What they do catch is a label changing
 * bucket for any reason, which is the thing that would reach a reader.
 *
 * The real protection against over-reach is the PINNED COUNTS in
 * `gap-slot.test.ts`: any label moving between buckets changes 260/134/7 and
 * fails, whether or not anyone anticipated the label.
 *
 * `-men`, `-oes` and `-i` have no case at all, because no label in the mechanic
 * vocabulary ends that way — those three rules have nothing to pull across.
 *
 * An earlier revision claimed `Cycling`, `Surveil`, `Prison` and `Spellslinger`
 * as sentinels. They end in `g`, `l`, `n` and `r`, fire no rule, and proved
 * nothing; they came off a prefix-similarity sweep rather than off the rule
 * endings, and they are kept in the tests as what they actually are.
 *
 * `thieves` is deliberately absent from the table above even though `-ves`
 * would handle it: `Thief` is not a creature type in Scryfall's taxonomy and
 * `Thieves` is not in EDHREC's vocabulary, so listing it would imply a verified
 * invariant that does not exist.
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

/**
 * The creature subtypes a set of type lines carries, minus the ones Scryfall
 * files under another card type.
 *
 * Pure, and exported so the generator's parsing is unit-testable: the checked-in
 * artifact can be asserted all day without ever executing the code that
 * produced it, which would let a change here leave `pnpm test` green over a
 * stale or unreproducible artifact.
 */
export function creatureSubtypesFromTypeLines(
  typeLines: readonly (string | null)[],
  notCreature: ReadonlySet<string>,
): Set<string> {
  const derived = new Set<string>();
  for (const typeLine of typeLines) {
    if (!typeLine) continue;
    for (const face of typeLine.split("//")) {
      const [types, subs] = face.split("—");
      // `Kindred` (formerly `Tribal`) bears creature types without being a
      // creature: `Tribal Enchantment — Faerie Aura`.
      if (!subs || !/creature|kindred|tribal/i.test(types)) continue;
      for (const word of subs.trim().split(/\s+/)) {
        const w = word.toLowerCase();
        if (!notCreature.has(w)) derived.add(w);
      }
    }
  }
  return derived;
}

export type LabelKinds = {
  mechanic: string[];
  creature: string[];
  format: string[];
};

/**
 * The classification itself, pure and exported for the same reason as above.
 *
 * Order matters: a format label is a format even if some creature shares its
 * name, and the mechanic bucket is the FALLBACK.
 *
 * **THE FALLBACK IS THE DANGEROUS DIRECTION, not the safe one**, and an earlier
 * revision of this comment had it exactly backwards. Hidden-by-default protects
 * only labels absent from the generated set — a label this function SEES and
 * misclassifies is written into `MECHANIC_LABELS` and shown. That is precisely
 * how `Mice`, `Werewolves`, `Cybermen` and `Pegasi` reached the allowlist. The
 * safety here comes from the pinned counts and the per-rule invariants, never
 * from the direction of this branch.
 */
export function classifyLabels(
  labels: readonly string[],
  creatureTypes: Set<string>,
): LabelKinds {
  const kinds: LabelKinds = { mechanic: [], creature: [], format: [] };
  for (const label of labels) {
    if (FORMAT_LABELS.includes(label)) kinds.format.push(label);
    else if (isCreatureTypeLabel(label, creatureTypes)) kinds.creature.push(label);
    else kinds.mechanic.push(label);
  }
  return kinds;
}
