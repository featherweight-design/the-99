// Welcome credits R1 · copy strings
//
// PLACEHOLDERS, owed to /copy-review. US English, no em dashes, never "unlock".
// Fixtures: 15 credits, expiring November 20 (dated in the reader's own day, after hydration).
// Reused shipped strings are named, not repeated: writtenForYouCopy.rows (the five rows, whole),
// showcaseCopy.needsADeck ("Needs a deck, and you have none yet."), and R4's
// creditsPageCopy line "Browsing is always free. Anything we write just for you uses a credit." (L6, identical).

export const welcomeCopy = {
  // The Home section.
  title: "Where credits work",
  live: "You have 15 welcome credits to try these, until November 20.",
  partly: "9 of your 15 welcome credits are left, until November 20.",
  expiring: "9 welcome credits expire in 3 days, on November 20.",
  usedUp: "You’ve used all 15 welcome credits. Your free credit still comes back every day.",
  intro: "Your free credit each day is spent first, so welcome credits pay for the runs after it.",
  tryIt: "Try it",
  teaser: "Credit packs and the monthly plan are on Credits",
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
};
