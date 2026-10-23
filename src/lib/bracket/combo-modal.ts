import type { ComboRef } from "../profile/types";

/**
 * What the reasoning modal draws for one combo.
 *
 * THE MANA IS A STATE, NEVER A FIGURE WITH A BLANK. Measured across 347 variants on 2026-09-21:
 * 41% need mana to execute and 59% need NONE — and `manaValueNeeded` is set on every record, so
 * a zero is an answer rather than an absence. Drawn as a blank, the more alarming of the two
 * readings is the one that disappears: a combo that costs nothing to go off is the dangerous
 * one. Null is genuinely unknown and is its own case.
 *
 * `notablePrerequisites` is drawn too, at 64% coverage, and Round 2 never asked for it because
 * nobody knew it was in the feed. It is the line that answers whether the combo works in THIS
 * deck. Ruled into the modal by Round 2's re-audit (#816), which Design may overrule.
 */
export type ComboModal = {
  variantId: string;
  cards: ComboRef["cards"];
  produces: string[];
  /** The execution cost, as one of three readings rather than a number with holes in it. */
  mana: { kind: "free" } | { kind: "costs"; pips: string | null; value: number } | { kind: "unknown" };
  /** Spellbook's ordered steps, split on its own newlines. Empty when it sent none. */
  steps: string[];
  /** What must already be true. Null when upstream sent nothing, which is 36% of the time. */
  prerequisites: string | null;
};

/** What `comboModal` reads off a combo: a `ComboRef`, or any record carrying the same stored fields. */
export type ComboModalInput = Pick<
  ComboRef,
  "variantId" | "cards" | "produces" | "manaValueNeeded" | "manaNeeded" | "steps" | "notablePrerequisites"
>;

export function comboModal(combo: ComboRef | ComboModalInput): ComboModal {
  return {
    variantId: combo.variantId,
    cards: combo.cards,
    produces: combo.produces,
    mana: readMana(combo),
    // SPLIT ON NEWLINES, because that is how upstream separates them and a modal drawing one
    // 395-character paragraph is not a list of steps. Blank lines dropped: a trailing newline
    // would otherwise draw an empty final step.
    steps: (combo.steps ?? "")
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s.length > 0),
    prerequisites: combo.notablePrerequisites,
  };
}

function readMana(combo: ComboModalInput): ComboModal["mana"] {
  const value = combo.manaValueNeeded;
  // `== null` and not `!value`: zero is the FREE reading, and a truthiness test would file the
  // 59% case under "unknown" — losing exactly the fact worth drawing.
  if (value == null) return { kind: "unknown" };
  if (value === 0) return { kind: "free" };
  return { kind: "costs", pips: combo.manaNeeded, value };
}

/**
 * A combo one piece away (`loadNearCombos`) as the combo body draws it (combos close UI-2): its
 * pieces, the missing one included, are the plates, and every other field is the same stored one a
 * `ComboRef` carries, read by `comboModal` itself so the steps split and the mana reads one way.
 */
export function nearComboModal(
  combo: Omit<ComboModalInput, "cards"> & { pieces: readonly { oracleId: string; name: string }[] },
): ComboModal {
  return comboModal({ ...combo, cards: combo.pieces.map(({ oracleId, name }) => ({ oracleId, name })) });
}
