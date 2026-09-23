import { slotDeck } from "../bracket/slot";
import type { Bracket, CardRef, ComboRef, DeckProfile, FlaggedCardRef, FlagSource } from "../profile/types";

/**
 * The bracket flag on a suggestion (Hugh, 2026-09-23: a swap that moves the deck's bracket is
 * SHOWN, FLAGGED — never dropped, never silent). Pure.
 *
 * Computed with `slotDeck`, the verdict's own function, over the profile with the swap applied —
 * so the flag and the Analysis tab can never disagree about what a deck is. It compares two
 * verdicts' `permits` directly and never reads `bracketDelta`, whose `[3] → [4]` transition is
 * unreachable.
 *
 * Only the `brackets` group is rebuilt, because it is all the rules read: the add joins
 * `gameChangers` / `massLandDenial` / `extraTurns` per its facts, the cut leaves every list it is
 * on, and `twoCardCombos` is `combosAfter` — the assembled combos for the post-swap card set,
 * which the caller reads, since a combo completed by the add or broken by the cut is exactly what
 * a per-card flag cannot see. `comboReach` loses the cut's tutors and any reach into a combo that
 * no longer assembles. KNOWN GAP: an ADDED tutor is not classified here, so a swap whose only
 * effect is a new tutor reaching a combo can leave the 3/4 lean where the Analysis tab, after the
 * swap is applied, would move it. The flag errs silent there, never loud.
 */
export type AddFacts = {
  oracleId: string;
  name: string;
  gameChanger: boolean;
  massLandDenial: FlagSource[] | null;
  extraTurn: FlagSource[] | null;
};

export function bracketAfter(args: {
  profile: DeckProfile;
  declared: Bracket | null;
  add: AddFacts;
  cutOracleId: string;
  combosAfter: ComboRef[];
}): Bracket[] | null {
  const { profile, declared, add, cutOracleId, combosAfter } = args;
  const b = profile.brackets;
  const ref: CardRef = { oracleId: add.oracleId, name: add.name };
  const without = <T extends CardRef>(list: T[]) => list.filter((c) => c.oracleId !== cutOracleId);
  const flagged = (list: FlaggedCardRef[], sources: FlagSource[] | null) =>
    sources ? [...without(list), { ...ref, sources }] : without(list);

  const assembled = new Set(combosAfter.map((c) => c.variantId));
  const after: DeckProfile = {
    ...profile,
    brackets: {
      ...b,
      gameChangers: add.gameChanger ? [...without(b.gameChangers), ref] : without(b.gameChangers),
      massLandDenial: flagged(b.massLandDenial, add.massLandDenial),
      extraTurns: flagged(b.extraTurns, add.extraTurn),
      twoCardCombos: combosAfter,
      comboReach: {
        tutors: without(b.comboReach.tutors),
        reaches: b.comboReach.reaches.filter(
          (r) => r.tutor.oracleId !== cutOracleId && assembled.has(r.combo.variantId),
        ),
      },
    },
  };

  const before = slotDeck(profile, declared).permits;
  const moved = slotDeck(after, declared).permits;
  return sameBrackets(before, moved) ? null : moved;
}

function sameBrackets(a: readonly Bracket[], b: readonly Bracket[]): boolean {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}
