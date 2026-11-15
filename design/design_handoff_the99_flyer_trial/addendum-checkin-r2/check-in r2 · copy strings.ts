// Check-in R2 (flyer trial addendum, 2026-11-15): drafts for /copy-review. Replaces keys in `checkInCopy`
// (src/lib/copy/report.ts). Keys not listed here are kept as shipped: title, uses, pickAny, useOptions, pod, podOptions,
// more, notNow, send. Sending…, Close and Try again stay reportCopy's.

export const checkInCopyR2 = {
  intro: "You’ve been with The 99 for a couple of weeks. Three quick questions, and your answers steer what we improve next.",
  rating: "How’s it working for you?",
  // `ratingEnds` is removed: each card carries its word.
  ratingWords: ["Rough", "Meh", "Okay", "Good", "Love it"],
  ratingAria: (n: number, word: string) => `${n} of 5, ${word}`,
  morePlaceholder: "A wish, a gripe, a feature you love",
  hint: "Takes about a minute",
  // Rated 3 to 5.
  sentTitle: "Thank you, truly!",
  sentBody: "This genuinely helps us know what to improve. More to say later? About › Report a problem is always open.",
  // Rated 1 or 2.
  sentTitleLow: "Thanks for telling us straight",
  sentBodyLow:
    "Hearing what isn’t working is exactly how we know what to fix. If something broke, About › Report a problem is the quickest way to show us.",
  // The thank-you card (shipped compact FriendCard, crowned face). `name` is also the word on its back.
  card: {
    name: "Thank you",
    type: "Instant — Thanks",
    rules: "When this resolves, the people building The 99 read every word and choose what to make better next.",
    credit: "From the team",
    mark: "XCIX",
    aria: "Thank you, a card from The 99",
  },
  failed: "That didn’t go through. Your answers are still here.",
} as const;
