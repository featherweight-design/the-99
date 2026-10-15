// Social R1 (friends and pods): copy. Taken from the handoff's `social-r1 · copy strings.ts` (R2) for the
// keys the plumbing draws (plan `2026-10-15-social-r1.md`, PR B): the account menu row, the `/friends`
// title and the friend link's signed-out card. The rest of the handoff's strings arrive with the screens
// that draw them (PRs C, D and E), after /copy-review (C1 to C4, G10).

export const socialCopy = {
  // The account menu row (popover and sheet), second, under About. Absent with the switch off.
  menu: { friends: "Friends" },

  page: { title: "Friends" },

  landing: {
    kicker: "Friend request",
    signedOutTitle: "Someone sent you a friend request",
    signedOutBody: "Sign in to turn the card over and see who it’s from.",
    signIn: "Sign in",
  },
} as const;
