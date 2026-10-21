// Buying credits R1 · copy strings
//
// PLACEHOLDERS, owed to /copy-review (never to Hugh). US English, no em dashes.
// Fixture values (counts, dates, times) are the boards' fixtures: engineering formats them from the server's read,
// with clockTime for times, as creditsCopy does today. Reused shipped strings are not repeated here.

export const buyingCreditsCopy = {
  // The credit line (creditsCopy additions). Every surface draws these through CreditsText.
  line: {
    standing: "4 of 5 left · reset at 2:01 AM",
    withPaid: "4 of 5 free · reset at 2:01 AM · 114 paid",
    paidNext: "0 of 5 free · reset at 2:01 AM · this run uses 1 of 114 paid",
    spent: "0 of 5 left · reset at 2:01 AM · What uses credits?",
    getMore: "Get more credits",
    limit: "Today’s 20 paid credits are used. 94 more are banked · back at 2:01 AM",
    limitFree: "1 of 5 free · reset at 6:40 AM · paid back at 2:01 AM (daily limit)",
    expiring: "74 plan credits expire Nov 16",
    firstPaid: "Uses a paid credit. 0 of 5 free · reset at 2:01 AM · 114 paid.",
    againPaid: "Replaces these suggestions and uses a paid credit. 0 of 5 free · reset at 2:01 AM · 114 paid.",
  },
  // The /credits page head.
  page: {
    title: "Credits",
    sub: "1 credit is 1 run of any tool · What uses credits?",
    // R4 addendum (C1): the head's third line. FINAL, Hugh with the copywriter, 2026-10-21; not a placeholder.
    viewsFree: "Browsing is always free. Anything we write just for you uses a credit.",
    refunds: "Refunds: email support@the-99.dev within 14 days. Unused packs and a plan’s first month come back in full; used credits don’t. A run that fails refunds itself.",
    blocked: "Buying is paused on this account. Email support@the-99.dev and we’ll sort it out. Your free credits and everything else work as usual.",
  },
  // The balance: total, cells in spend order, the daily paid line.
  bal: {
    total: "credits to spend",
    order: "Spent in this order",
    free: "Free",
    plan: "Plan",
    packs: "Packs",
    freeSub: "reset at 2:01 AM",
    freeFull: "all 5 ready",
    planSub: "roll over",
    planEnds: "expire Nov 16",
    packsSub: "never expire",
    near: "17 of 20 paid credits used today · the limit resets at 2:01 AM. Free credits still run.",
    atLimit: "20 of 20 paid credits used today. Back at 2:01 AM. Free credits still run, and nothing banked is lost.",
  },
  // The plan card, every state.
  plan: {
    k: "Monthly plan",
    title: "60 credits a month",
    price: "$5 a month",
    fine: ["Unused plan credits roll over, with no cap, while you stay subscribed.", "Renews every month until you cancel. Cancel any time, in one tap, here.", "If you cancel, plan credits last until the end of the month you paid for, then expire.", "Paid credits are forfeited if you delete your account."],
    // R4 addendum item 4: the price and interval on the press, as the boards and STATES K1 drew it.
    subscribe: "Subscribe · $5 a month",
    via: "Checkout on Stripe · US cards",
    active: "Renews November 16 · $5",
    activeLeft: "74 plan credits, rolling over",
    cancel: "Cancel plan",
    cancelSays: "Cancelling keeps your 74 plan credits until November 16, then they expire. Pack credits aren’t affected.",
    updateCard: "Update card",
    ended: "Ends November 16",
    endedSays: "Your 74 plan credits expire on November 16. You won’t be charged again.",
    soon: "Your 74 plan credits expire in 2 days, on November 16.",
    keep: "Keep my plan",
    keepSays: "Keeps your credits and renews on November 16, as before.",
    cancelledLive: "Plan cancelled. Your 74 plan credits last until November 16.",
    dueTitle: "Your November 16 payment didn’t go through",
    dueSays: "Stripe will try again over the next few days, and your 74 plan credits still work meanwhile. If every try fails, the plan ends and they expire.",
  },
  // The pack card.
  pack: {
    k: "Credit pack",
    title: "40 credits",
    price: "$5",
    fine: "Pack credits never expire. They’re forfeited if you delete your account.",
    buy: "Buy 40 credits",
  },
  // Purchase history.
  hist: {
    title: "Purchase history",
    receipt: "Receipt",
    empty: "Nothing bought yet. Receipts show here once you do.",
    planMonth: "Monthly plan",
    planFirst: "Monthly plan, first month",
    pack: "Credit pack",
  },
  // Loading and failure.
  read: {
    failed: "We couldn’t load your credits.",
    retry: "Try again",
  },
  // Back from Stripe Checkout.
  ret: {
    procTitle: "Adding your 40 credits",
    procSays: "Payment received. Credits usually land in a second or two.",
    addedPack: "40 pack credits added",
    addedPlan: "Plan started: 60 credits added",
    addedPlanSays: "Renews November 16. Cancel any time below.",
    slowTitle: "Still adding your credits",
    slowSays: "This can take a few minutes. You won’t be charged twice. If they haven’t landed in an hour, email support@the-99.dev.",
    cancelled: "Checkout closed. Nothing was charged.",
    toast: "Couldn’t check on your purchase.",
    toastDetail: "Trying again in a moment",
  },
  // The account menu's identity line.
  menu: {
    // M1b, the chip by state (R2b)
    entryOut: "Get more credits",
    entryExpiring: "74 plan credits expire Nov 16",
    entry: "117 credits",
    entryFree: "3 free credits",
  },
  // The Manage account interstitial (deletion warning).
  del: {
    title: "You have 114 paid credits",
    says: "Deleting your account forfeits them: 74 plan credits and 40 pack credits. Nothing else in Manage account touches them.",
    refund: "Bought a pack in the last 14 days and not used it? Email support@the-99.dev for a refund before you delete.",
    go: "Continue to Manage account",
  },
} as const;
