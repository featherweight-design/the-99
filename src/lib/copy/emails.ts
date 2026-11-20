// Every string the emails carry (branded emails R2, 2026-11-14; words from the handoff's `emails · copy strings.ts`, through
// /copy-review). `name` is a sender's display name where a function takes one: it is escaped where it is drawn, never here.
// The html parts use curly quotes; `straight()` (src/lib/email/shell.ts) makes the plain-text twin's straight.

export const emailShellCopy = {
  /** The tile's alt text, shown in its box when images are off. */
  markAlt: "The 99",
  /** The footer's flavor line, every email: the tagline (Hugh, 2026-11-18, launch email R1). */
  flavor: "99 problems, but your commander ain’t one.",
  noReplies: "Replies to this email aren’t read.",
} as const;

/** The newcomer's code (QR) and the flyer's code: one template. */
export const codeEmailCopy = {
  subject: (code: string) => `Your code for The 99: ${code}`,
  preheader: (minutes: number) => `Enter it on the page where you asked for it. It expires in ${minutes} minutes.`,
  kicker: "One-time code",
  heading: "Here’s your code",
  lead: "Enter it on the page where you asked for it.",
  textLead: "Here’s your code for The 99. Enter it on the page where you asked for it:",
  fine: (minutes: number) => `It expires in ${minutes} minutes. Didn’t ask for a code? You can ignore this email.`,
  reason: "You’re getting this because someone asked for a code for this address on The 99.",
} as const;

export const inviteEmailCopy = {
  subject: (name: string) => `${name} invited you to The 99`,
  preheader: (name: string, days: number) => `Join as ${name}’s friend. Your invite works for ${days} days.`,
  heroAlt: (name: string, commander: string) => `${name}’s invitation card, with ${commander} art`,
  heroPlainAlt: "An invitation to The 99",
  kicker: "You’re invited",
  heading: (name: string) => `${name} saved you a seat at The 99`,
  lead: (name: string) =>
    `The 99 reads the cards you already own and builds Commander decks from them. Join as ${name}’s friend. Your decks and your collection stay yours.`,
  /** The flyer's three points (`joinCopy`'s), the shipped words. */
  points: [
    "Find the commanders hiding in your binder.",
    "Learn which combo is only one card away.",
    "Borrow a friend’s spare before you pay for one.",
  ],
  button: "Join The 99",
  rawLinkLabel: "Button not working? Paste this link into your browser:",
  textLinkLabel: "Join The 99:",
  fine: (days: number, nameOrWho: string) => `This link works for ${days} days. Don’t know ${nameOrWho}? You can ignore this email.`,
  reason: (name: string) => `You’re getting this because ${name} invited this address to The 99.`,
  /** No sender name (the sender has no profile name): the words that stand in for it. */
  anon: {
    name: "A friend",
    who: "who sent it",
    reason: "You’re getting this because someone on The 99 invited this address.",
    preheader: (days: number) => `A friend invited you. Your invite works for ${days} days.`,
    lead: "The 99 reads the cards you already own and builds Commander decks from them. Join as their friend. Your decks and your collection stay yours.",
  },
} as const;

/** What the hand image's top card says (`src/components/email/invite-hand-image.tsx`), the shipped compact card's words. */
export const inviteHandCopy = {
  backWord: "INVITATION",
  type: "Invitation",
  rules: (name: string) => `Join The 99 as ${name}’s friend. Your decks and your collection stay yours.`,
  credit: (commander: string) => `Art · ${commander}`,
  mark: "The 99",
} as const;

/** Clerk's templates: set in Clerk's dashboard, not sent by our code. `{{otp_code}}` is Clerk's variable (confirm it with the editor's Variable insert). */
export const clerkEmailCopy = {
  signIn: {
    subject: "Your sign-in code for The 99: {{otp_code}}",
    preheader: "Enter it on the sign-in page. It expires in 10 minutes.",
    kicker: "Sign-in code",
    heading: "Welcome back",
    lead: "Enter this code on the sign-in page.",
    textLead: "Welcome back. Enter this code on the sign-in page:",
    fine: "It expires in 10 minutes. If you didn’t try to sign in, you can ignore this email. No one can get in without this code.",
    reason: "You’re getting this because someone tried to sign in to The 99 with this address.",
  },
  reset: {
    subject: "Your password reset code for The 99: {{otp_code}}",
    preheader: "Enter it on the sign-in page. It expires in 10 minutes.",
    kicker: "Password reset",
    heading: "Reset your password",
    lead: "Enter this code on the sign-in page, then choose a new password.",
    textLead: "Enter this code on the sign-in page, then choose a new password:",
    fine: "It expires in 10 minutes. If you didn’t ask to reset your password, you can ignore this email. Your password won’t change.",
    reason: "You’re getting this because someone asked to reset the password for this address on The 99.",
  },
} as const;

/**
 * The launch email (launch email R2c, 2026-11-18): one email to everyone on `launch_list`, sent once by
 * `sendLaunchBatch` (`src/lib/flyer/launch-send.ts`), pressed from /admin/invites. `subject` is Hugh's ruling of 2026-11-20 (Q1).
 */
export const launchEmailCopy = {
  subject: "The 99 is open",
  preheader: "Make a free account and see what your cards can build. You start with 15 credits.",
  fanAlt: "A fan of commander cards around The 99’s card back, which reads Now open",
  kicker: "Now open",
  /** The landing's hero title, shipped. */
  heading: "Your next commander is already in your binder",
  lead: "The 99 is open to everyone, starting today.",
  textLead: "Your next commander is already in your binder. The 99 is open to everyone today.",
  /** The landing's loop title, shipped. */
  section: "From your binder to a finished deck",
  features: [
    {
      image: "feature-commanders",
      title: "See what you can build",
      body: "Every commander you own, ranked by how much of its deck you already have.",
      alt: "Jace and Y’shtola, ranked with fit scores of 84 and 79 out of 100",
    },
    {
      image: "feature-tune",
      title: "Change a deck by describing it",
      body: "Say what you want from a deck, and it suggests cards to add and cut, yours first, with a reason for each.",
      alt: "For “More interaction”: add Chaos Warp and Abrade, cut Smokebraider",
    },
    {
      image: "feature-written",
      title: "Read why a commander works",
      body: "Every commander page explains how its deck plays, and every precon has an Overview. Both are free.",
      alt: "Tam, the Possibility, with why this commander is worth building",
    },
    {
      image: "feature-credits",
      title: "Try the writing tools free",
      body: "Your welcome credits cover every writing tool at least twice (Suggested changes, up to 10 changes) before you pay anything.",
      /** The text twin has no image, so it says what the picture shows. */
      textBody:
        "You start with 15 welcome credits, enough for every writing tool at least twice (Suggested changes, up to 10 changes) before you pay anything, and get 1 free credit every day.",
      alt: "15 welcome credits when you join, plus 1 free credit every day",
    },
  ],
  /** Drawn twice: under the lead, and after the features with `buttonFine`. One action, one word, one link. */
  button: "Sign up free",
  textLinkLabel: "Sign up free:",
  buttonFine: "No card details needed.",
  reason: {
    landing: "You’re getting this because this address was left on The 99’s launch list at the-99.dev.",
    flyer: "You’re getting this because this address was left on The 99’s launch list from a flyer.",
  },
  /** `link` is the word Unsubscribe, linked to the address's `/unsubscribe?t=` URL. */
  unsubscribe: { before: "This is the only email the launch list sends. ", link: "Unsubscribe", after: " and we’ll delete this address." },
  textUnsubscribe: "This is the only email the launch list sends. Unsubscribe and we’ll delete this address:",
} as const;

/** `/unsubscribe` (launch email R2c, board U1 and U2): the shipped offline page's body, signed out. */
export const unsubscribePageCopy = {
  eyebrow: "Launch list",
  done: {
    documentTitle: "Unsubscribed · The 99",
    title: "You’re off the list.",
    sub: "We’ve deleted this address from the launch list, so The 99 won’t email it again.",
  },
  broken: {
    documentTitle: "Link incomplete · The 99",
    title: "This link is incomplete.",
    sub: "Open it again from the email, or paste the whole link into your browser.",
  },
  button: "Visit The 99",
} as const;
