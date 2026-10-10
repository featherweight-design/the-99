import { isLandFace } from "../cards/facet";

export type Role = "ramp" | "draw" | "removal" | "wipes" | "land";
export type RoleInput = { typeLine: string; oracleText: string | null; keywords: string[] };

export const ROLE_TARGETS: Record<Exclude<Role, "land">, number> = {
  ramp: 10, draw: 10, removal: 8, wipes: 3,
};

/**
 * The flat fallback for the LABELS basis: what a deck is graded against when no commander, pair or
 * bucket carries a `label_*` figure. Re-stated from the label means rather than borrowed from the
 * classifier's 10/10/8/3 (Hugh, 2026-10-09), because a deck counted by label measured against
 * a target the classifier set reads short or long on every role. These are the PLAN's expected
 * label means (about 11.6/8.4/6.2/1.5) rounded to whole cards, with wipes held at 1 as Hugh ruled
 * (a plain round would give 2). NOT yet computed from stored data: re-measure from staging's stored `label_*` once the
 * index build has written them (none were stored on 2026-10-10) and move these if they differ.
 */
export const LABEL_ROLE_TARGETS: Record<Exclude<Role, "land">, number> = {
  ramp: 12, draw: 8, removal: 6, wipes: 1,
};

const RAMP_PATTERNS = [
  /\{t\}: add /, /adds? (one|two|three|\{[wubrgc]\})/,
  /search your library for .{0,40}land .{0,60}onto the battlefield/,
];
const DRAW_PATTERNS = [/draw (a|one|two|three|four|x) cards?/];
// Mass removal is its own role (design baseline 3); these patterns move OUT of
// the removal set so a wrath doesn't inflate both chips.
const WIPE_PATTERNS = [/destroy all/, /exile all/, /all creatures get [-−]\d/];
// `counter target` stays in removal HERE, deliberately, while card labels separate a role
// `counterspell` from removal (the vocabulary plan's Task 3; mirrored at the labels' SYSTEM prompt).
// This classifier feeds ROLE_TARGETS, and removal's target of 8 was measured with counterspells
// counted: taking them out here would move every deck's removal count under a bar set with them in.
const REMOVAL_PATTERNS = [
  /destroy target/, /exile target/,
  /counter target/, /deals? \d+ damage to (any target|target creature)/,
  /target creature gets [-−]\d/,
];
const NOT_REMOVAL = /target .{0,30}you control/;

export function classifyRoles(card: RoleInput): Role[] {
  const roles: Role[] = [];
  const text = (card.oracleText ?? "").toLowerCase();

  // `isLandFace`, not a substring sweep of the lowercased type line. Two failures in one substring test, and both
  // are measurable: 82 of the 31,830 COMMANDER-LEGAL cards disagree between the two (83 across
  // all 35,572 catalog rows), every one an
  // MDFC whose BACK face is a land — `Fell the Profane // Fell Mire` is an Instant you cast
  // from hand — and without a word boundary `Lander Rizzi` is a land as well.
  //
  // It matters twice over. The land role itself was wrong, and the ramp test below is gated
  // on the SAME answer, so a land-backed ramp spell was excluded from ramp too.
  //
  // `facet.ts`'s own header says both land answers live there "so the two are visibly
  // different rather than accidentally divergent". This function predated that and never
  // adopted it, which is how `DeckProfile` ended up able to report `roles.counts.land` and
  // `counts.land` differently for the same deck.
  const isLand = isLandFace(card.typeLine);
  if (isLand) roles.push("land");
  if (!isLand && RAMP_PATTERNS.some((p) => p.test(text))) roles.push("ramp");
  if (DRAW_PATTERNS.some((p) => p.test(text))) roles.push("draw");
  if (WIPE_PATTERNS.some((p) => p.test(text))) roles.push("wipes");
  if (REMOVAL_PATTERNS.some((p) => p.test(text)) && !NOT_REMOVAL.test(text)) roles.push("removal");
  return roles;
}
