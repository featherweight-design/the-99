// Welcome credits R2 · copy strings
//
// PLACEHOLDERS, owed to /copy-review. US English, no em dashes, never "unlock".
// Fixtures: 15 credits, expiring November 20 (dated in the reader's own day, after hydration).
// Reused shipped strings are named, not repeated: writtenForYouCopy.rows (the five rows, whole),
// showcaseCopy.needsADeck ("Needs a deck, and you have none yet."), and R4's
// creditsPageCopy line "Browsing is always free. Anything we write just for you uses a credit." (L6, identical).

export const welcomeCopy = {
  // The Home strip (R2).
  strip: {
    held: "15 welcome credits to try the tools, until Nov 20.",
    partly: "9 of your 15 welcome credits are left, until Nov 20.",
    expiring: "15 welcome credits expire in 3 days, on Nov 20.",
    usedUp: "You’ve used all 15 welcome credits.",
    where: "Where they work", // opens the sheet
    more: "See packs and the monthly plan", // used up, payments on, nothing bought
    freeBack: "Your free credit comes back each day.", // used up otherwise
  },
  // The sheet (R2): title, L6 line, grant line, rows (name, where, cost), teaser.
  locked: "Opens once your cards are in", // shipped lock line, reused
  title: "Where credits work",
  live: "You have 15 welcome credits until November 20. Your free credit each day is spent first.",
  partly: "9 of your 15 welcome credits are left, until November 20. Your free credit each day is spent first.",
  expiring: "9 welcome credits expire in 3 days, on November 20. Your free credit each day is spent first.",
  tryIt: "Try it",
  teaser: "See packs and the monthly plan",
  dismiss: "Close", // aria-label on the bare ✕
};

// The credit line (creditsCopy additions). Drawn through CreditsText.
export const creditsCopyWelcome = {
  withWelcome: "1 of 1 free · 15 welcome",
  welcomeNext: "0 of 1 free · reset at 2:01 AM · this run uses 1 of 15 welcome",
  welcomePaid: "0 of 1 free · reset at 2:01 AM · this run uses 1 of 9 welcome · 40 paid",
  welcomeExpiring: "9 welcome credits expire Nov 20",
  limit: "Today’s 20 credit runs are used. 9 welcome and 21 paid are banked · back at 2:01 AM",
  firstWelcome: "Uses a welcome credit.",
};

// /credits balance.
export const creditsPageCopyWelcome = {
  welcome: "Welcome",
  welcomeSub: "expire Nov 20",
  welcomeSoon: "expire in 3 days, Nov 20",
  where: "Where they work", // R2: beside the date, opens the sheet
};
