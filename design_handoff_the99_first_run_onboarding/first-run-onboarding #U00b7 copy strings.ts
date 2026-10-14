// first-run-onboarding · copy strings.ts. R1. PLACEHOLDERS: /copy-review sets the words.
// Target: src/lib/copy/refresh.ts (firstRun), src/lib/copy/collection.ts (replace), issue-inspector.ts.

export const firstRunOnboardingCopy = {
  firstRun: {
    // CHANGED: names both paths, locked and live (ruling 2).
    step2Title: 'Pick a commander or import a deck',
    step2Locked: 'Unlocks once a collection is read', // unchanged
    step2Body:
      'We rank the commanders your cards can already build. If you play a list from somewhere else, bring it in instead.',
    step2BodyShort: 'We rank the commanders your cards can already build. Or bring in a list you play.',
    step2Primary: 'Pick a commander', // → /commanders
    step2Secondary: 'Import a deck', // → /decks/import (reuses zero.importDeck)
    // Shown on step 3 while step 2 is live.
    step3LockedAfterRead: 'Unlocks with a commander. An imported deck arrives built.',
    step1Done: 'Collection read',
    step1DoneMeta: (cards: string, file: string) => `${cards} cards · ${file}`,
    step1Replace: 'Replace',
    step1Reviewing: (file: string, rows: string) => `Reviewing · ${file} · ${rows} rows`,
    // DELETED (ruling 1): importPrompt.
  },
  lock: {
    pageLine: 'Collection, Commanders, Discover and Decks open once your collection is read.',
    railLabel: 'Locked',
    tabBracket: 'Add a collection to unlock',
    // Note, for the rail and the tab bar. `others` is the other three locked labels, joined.
    note: (label: string, others: string) => `${label} opens once your collection is read. So do ${others}.`,
    goToStep1: 'Go to step 1',
  },
  review: {
    cancel: 'Cancel', // the phone exit (ruling 6); replaces the ‹ "Back to upload"
  },
  replaceConfirm: {
    title: 'Replace your collection?',
    now: 'Now',
    after: 'After',
    nowCaption: 'cards in your collection',
    afterCaption: (file: string) => `cards from ${file}`,
    body: 'Decks and commander recommendations rebuild from the new list. To go back, replace it again with your previous file.',
    bodyShort: 'Decks and recommendations rebuild from the new list. To go back, replace it again with your previous file.',
    keep: 'Keep current',
    confirm: (matched: string) => `Replace with ${matched} cards`,
    pending: 'Replacing…',
    // DELETED: the type-to-confirm label and token, and "This can't be undone."
  },
  replaceNote: (current: string) =>
    `A new file replaces your current ${current} cards; nothing is merged. You see every match before anything changes.`,
} as const;
