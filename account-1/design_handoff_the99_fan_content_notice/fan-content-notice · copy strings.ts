// Fan Content notice R1 · copy strings
//
// The notice's two passages are LOCKED (brief §Locked 1, Hugh's L4): reproduced here for reference only, never for
// /copy-review, and never reworded. Everything under `newStrings` is a PLACEHOLDER owed to /copy-review (never to Hugh).
// US English, no em dashes.

export const fanContentNotice = {
  // LOCKED. `policyLink` marks the only linked words, inside passage one.
  passageOne:
    "The 99 is unofficial Fan Content permitted under the Fan Content Policy. Not approved/endorsed by Wizards. Portions of the materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC.",
  passageTwo:
    "Card images and mana symbols are copyright Wizards of the Coast, LLC. Card data and images from Scryfall; prices from Mana Pool. Not affiliated with Wizards of the Coast, Scryfall or Mana Pool.",
  policyLink: "Fan Content Policy",
} as const;

export const newStrings = {
  // The link's accessible name, after the app's existing newTab pattern (mana-balance.ts). The visible words stay locked.
  policyLinkAria: "Fan Content Policy, opens in a new tab",
  legalPage: {
    privacyTitle: "Privacy",
    termsTitle: "Terms",
    lastUpdated: (date: string) => `Last updated ${date}`,
    onThisPage: "On this page",
    // Signed out only. Reuses the shipped label.
    signIn: "Sign in",
  },
} as const;
