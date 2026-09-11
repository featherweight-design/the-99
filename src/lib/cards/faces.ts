// What "two-faced" means, in one place (#363).
//
// The one thing every surface drawing the `//` mark has to agree on, and the
// reason the `cards.layout` column exists. A `//` in a name, a type line or the
// joined oracle text is not this question's answer: `Fire // Ice` and
// `Bonecrusher Giant // Stomp` carry the separator and are one piece of card
// stock each, so a heuristic-driven mark promises a flip the modal cannot
// deliver — and a control that is sometimes a lie is worse than one that is
// late. The layout word is Scryfall's own, and it answers exactly.

/**
 * The layouts that print two faces on two sides. `meld` is not one of them: a
 * meld back is a separate card with its own oracle id, and the pair is
 * assembled rather than turned over. Nor is `reversible_card`, which is
 * genuinely two-sided but carries no top-level `oracle_id` and so never
 * reaches the `cards` table at all — `toCardRow` drops it before this is asked.
 */
const TWO_FACED = new Set(["transform", "modal_dfc"]);

export function isTwoFaced(layout: string | null | undefined): boolean {
  return layout !== null && layout !== undefined && TWO_FACED.has(layout);
}

/**
 * The two halves of a two-faced card's name. Scryfall joins them with ` // `,
 * and the catalog stores that whole string — there is no per-face name column,
 * so this is where the back face's name comes from and the only thing the flip
 * control can call what it turns to.
 *
 * Only ever asked of a card `isTwoFaced` already answered for, but a name
 * without the separator still answers: both halves are the whole name, so the
 * control names the card rather than falling back to an empty string.
 */
export function faceNames(name: string): { front: string; back: string } {
  const [front, back] = name.split(" // ");
  return { front, back: back ?? front };
}

/**
 * The front face's half of a printed mana cost.
 *
 * Scryfall carries no top-level cost for the two-sided layouts, but it does for
 * every layout that prints two faces on ONE piece of card stock — `adventure`,
 * `split` and `prepare` — and there the string is both halves joined:
 * `Gollum, Silent Slinker // Meager Meal` is stored as `{3}{B} // {B}`. A pip
 * run has no way to say `//`, so drawing that string put the Adventure's pip in
 * the same run as the creature's and the row read as a four-pip card.
 *
 * The front half is simply the first run the pip treatment can represent: a run
 * of symbols has no way to say `//`, so one of the two halves is all it can
 * honestly draw, and the front is the one a reader casts from hand. It does NOT
 * follow the name beside it — `printedFaceName` splits only what `isTwoFaced`
 * recognises, which is `transform` and `modal_dfc`, so an `adventure` or `split`
 * row still prints both halves of its name next to one half of its cost.
 *
 * A split card's second cost is therefore drawn nowhere today — a real loss, and
 * the reason this lives in one function rather than inline in each pip renderer:
 * a treatment that wants both halves has one place to start from.
 *
 * A cost with no separator is returned whole, so this is safe on every card.
 */
export function frontFaceCost(cost: string): string {
  return cost.split(" // ")[0];
}
