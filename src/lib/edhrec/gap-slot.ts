// The commander row's gap line: which mechanics the reader has never built.
//
// Everything the line needs is decided HERE, on the server, and shipped as one
// tagged union. The row draws what it is given and holds no rule — which is
// what keeps the three states from being re-derived per surface, and what gives
// the "decide on the classifier's output, not on `tags.length`" ruling exactly
// one place to live.

import type { EdhrecTag } from "./parse";
import { MECHANIC_LABELS } from "./tag-kinds.generated";

const MECHANICS = new Set(MECHANIC_LABELS);

/** How many names the line prints. A fourth buys nothing, and 90.8% of
    commanders have four or more eligible tags, so this cap binds on almost
    every row rather than being a ceiling rarely reached. */
export const GAP_NAME_CAP = 3;

/**
 * A tag must account for at least this share of the commander's own tracked
 * decks to count as a theme.
 *
 * Measured rather than chosen. Without a floor the median commander has 33
 * eligible mechanic tags and most of them are accidents — 48% of Glarb's 172
 * tags sit at a count of 3 or fewer out of 24,054 decks — so a reader who plays
 * a commander's real themes falls straight into the tail, which is how
 * `Crocodiles` (2 decks) and `Bears` (1) reached a row.
 *
 * 2% is disqualified by a case rather than by an aggregate: Kenrith's largest
 * theme (`Group Hug`, 614) is under 2% of its 31,481 decks, so at that floor a
 * commander with 31,481 decks on file has no theme at all. 1% costs 115
 * commanders their three-name form. 0.5% takes the median to 9 — comfortably
 * clear of the three names the line needs — and leaves the zero-tag population
 * exactly where no floor at all leaves it, at 118. The floor deletes accidents,
 * not states.
 */
export const THEME_FLOOR_RATIO = 0.005;

/**
 * The minimum count a tag needs on this commander.
 *
 * A null `deck_count` yields 0: the floor is a proportion and there is nothing
 * to take a proportion of, so the classifier alone governs those rows.
 * Inventing an absolute minimum for them would be a second rule with no
 * evidence behind it.
 */
export function themeFloorFor(deckCount: number | null): number {
  return deckCount == null ? 0 : Math.ceil(deckCount * THEME_FLOOR_RATIO);
}

/**
 * Whether a label reaches the reader at all.
 *
 * One membership test and nothing else, because the allowlist has already had
 * creature types and formats removed — the generator builds it that way. A
 * second `!FORMATS.has(label)` guard here was tried and deleted: it could never
 * fire, since the generator imports the same `FORMAT_LABELS` it filters on, and
 * a mutation run proved the point by removing it without failing a single test.
 *
 * Unknown labels are absent from the allowlist and so are excluded, which is
 * the safe direction: a thinner sentence costs less than a tribe on screen.
 */
export function isMechanic(label: string): boolean {
  return MECHANICS.has(label);
}

/** The tags eligible to be named, unordered. */
export function eligibleMechanics(
  tags: readonly EdhrecTag[],
  deckCount: number | null,
): EdhrecTag[] {
  const floor = themeFloorFor(deckCount);
  return tags.filter((t) => isMechanic(t.label) && t.count >= floor);
}

/**
 * What the gap slot draws. Never empty — one of three occupants, always, which
 * is the ruling that keeps row height from changing between two sorts.
 *
 * `noMechanics` and `allPlayed` are separate members for the reason R1 found:
 * both leave the label list empty, and asserting *you already play every
 * mechanic this commander leans on* about a commander with no mechanics on file
 * is the defect this feature exists to prevent, one layer down.
 *
 * **`noMechanics` means "no mechanic theme worth naming", which is WIDER than
 * "the classifier found nothing".** It also covers a commander whose mechanic
 * tags all sit under the floor. That case is currently UNREACHABLE on real data
 * — the floor was chosen partly because it leaves the zero-eligible population
 * exactly where no floor leaves it, at 118 — but the code has to answer for it,
 * and both of the other answers would be false: the reader plays none of those
 * themes, so `allPlayed` is a lie, and they are not nameable themes, so the
 * label list cannot be filled. If it ever becomes reachable the COPY needs a
 * Design ruling, because `discoveryCopy.untagged` says EDHREC lists no
 * archetypes, which would then be false too. Recorded as a follow-up rather
 * than answered here: inventing a fourth string is a design decision.
 */
export type GapSlot =
  | { readonly kind: "unplayed"; readonly labels: string[] }
  | { readonly kind: "allPlayed" }
  | { readonly kind: "noMechanics" };

/**
 * `played` holds tag SLUGS, matching `DeckTagSet.slugs`. The comparator is
 * `unplayedTags`' own — deck count descending, slug as the tiebreak — so the
 * line and the list it came from cannot order the same tags differently.
 */
export function gapSlotFor(
  tags: readonly EdhrecTag[],
  deckCount: number | null,
  played: ReadonlySet<string>,
): GapSlot {
  // Both emptiness tests, in order, so the two causes are distinguishable here
  // even though they currently draw the same member. `hasAnyMechanic` is what a
  // future fourth state would branch on.
  const hasAnyMechanic = tags.some((t) => isMechanic(t.label));
  const eligible = eligibleMechanics(tags, deckCount);
  if (!hasAnyMechanic || eligible.length === 0) return { kind: "noMechanics" };

  const unplayed = eligible
    .filter((t) => !played.has(t.slug))
    .sort((a, b) => b.count - a.count || a.slug.localeCompare(b.slug));
  if (unplayed.length === 0) return { kind: "allPlayed" };

  return { kind: "unplayed", labels: unplayed.slice(0, GAP_NAME_CAP).map((t) => t.label) };
}
