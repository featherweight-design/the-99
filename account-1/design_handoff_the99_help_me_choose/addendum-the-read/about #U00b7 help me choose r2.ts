// About · Help me choose, revised for the read. Replaces the strings at src/lib/copy/about.ts:523–532 and the
// third credits bullet at :1168. Id, chapter, position and `since` are unchanged.
// Recommend ABOUT_VERSION 14 → 15 (a player can do something new); Hugh's call (AGENTS.md, About entries).
// Ships behind HELP_ME_CHOOSE_ENABLED with the build.

export const helpMeChooseEntryR2 = {
  id: "help-me-choose",
  title: "Help me choose a commander",
  caption:
    "Know the deck you want, but not who should lead it? Tell “Help me choose” what you’re after, and it finds commanders that fit, whether you own them or not.\n\n" +
    "Colors, themes, sets, a budget and a bracket narrow the list for free. Under “Anything else?” you can describe the deck in your own words: how it should feel, or how it should differ from decks you’ve built. That uses a credit, and the ten that fit best come first, each with a line on why.\n\n" +
    "Pick a commander and your answers carry over to a new deck, ready to fill from your Collection.",
  keys: [
    "What you write is read against every commander your answers allow. Your answers always hold, so it never shows a commander outside them.",
    "When you ask for something unlike your decks, it compares each commander with your decks’ commanders and themes. It never reads your notes or descriptions.",
    "If nothing fits, it says so and no credit is used. Stopping, or a read that doesn’t finish, also gives the credit back.",
    "The rest of your results follow the ten, in the usual order.",
  ],
} as const;

// Dropped from the old caption: "Name a card in your own words and it becomes the card to build around."
// The box no longer sets answers. If a card picker ships (Q1), a clause returns here.

export const creditsBulletR2 = "- Each “Help me choose” search where you fill in “Anything else?”";
