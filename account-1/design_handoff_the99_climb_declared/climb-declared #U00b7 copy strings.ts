// The Climb under an answered range (addendum F, H34). Proposed strings for /copy-review.
// Placeholders: Design draws the role, and the words are settled in the build lane.
// Never quotes the player (declaration.ts:13): `declared` is the record word the head already ships.

export const climbDeclaredCopy = {
  /** NEW. The declared bracket's rung label, both widths (replaces roleHere / roleHereShort there). */
  roleDeclared: "declared",
  /** NEW. The other bracket in the answered range, both widths. The rung carries no body. */
  rolePermitted: "permitted",
} as const;

// REUSED, unchanged: climb.allowed, climb.noCap, climb.ruleNames, the drop sentences, upgradePathCopy.rungLabel.
// NOT DRAWN on an in-range rung once answered: climb.roleHere, climb.roleHereShort, climb.roleAbove,
// climb.aboveAllowed, climb.roleDeclare, climb.declare. All keep their unanswered uses.
