// Branded emails R2 (account 2, 2026-11-14): every string the emails carry, for /copy-review.
// Includes Design's prose pass (R2). "(today)" marks a string the shipped mails already send.
// `name` is the sender's display name (HTML-escaped in html parts); with none, the invite uses `anon`.
// Plain text uses straight quotes; HTML uses curly ones.

export const emailShellCopy = {
  /** The tile's alt text, shown in its box when images are off. */
  markAlt: "The 99",
  /** The footer's flavor line, every email (the flyer's pitch). */
  flavor: "Search your library for a commander.",
  noReplies: "Replies to this email aren’t read.",
  site: "the-99.dev",
  siteText: "https://the-99.dev",
  /** Sender line, every email (Hugh, Q1). */
  from: "The 99 <invites@mail.the-99.dev>",
} as const;

export const inviteEmailCopy = {
  subject: (name: string) => `${name} invited you to The 99`, // (today)
  preheader: (name: string, days: number) => `Join as ${name}’s friend. Your invite works for ${days} days.`,
  heroAlt: (name: string, commander: string) => `${name}’s invitation card, with ${commander} art`,
  heroPlainAlt: "An invitation to The 99",
  kicker: "You’re invited",
  heading: (name: string) => `${name} saved you a seat at The 99`,
  lead: (name: string) =>
    `The 99 reads the cards you already own and builds Commander decks from them. Join as ${name}’s friend. Your decks and your collection stay yours.`,
  /** The flyer's three points (flyerCopy.points), shipped words. */
  points: [
    "Find the commanders hiding in your binder.",
    "Learn which combo is only one card away.",
    "Borrow a friend’s spare before you pay for one.",
  ],
  button: "Join The 99", // (today, as a text link)
  rawLinkLabel: "Button not working? Paste this link into your browser:",
  textLinkLabel: "Join The 99:",
  fine: (days: number, nameOrWho: string) => `This link works for ${days} days. Don’t know ${nameOrWho}? You can ignore this email.`,
  reason: (name: string) => `You’re getting this because ${name} invited this address to The 99.`,
  anon: {
    name: "A friend", // (today)
    who: "who sent it", // (today)
    reason: "You’re getting this because someone on The 99 invited this address.",
  },
} as const;

/** The newcomer's code (QR) and the flyer's code: one template. */
export const codeEmailCopy = {
  subject: (code: string) => `Your code for The 99: ${code}`, // (today)
  preheader: "Enter it on the page where you asked for it. It expires in 10 minutes.",
  kicker: "One-time code",
  heading: "Here’s your code",
  lead: "Enter it on the page where you asked for it.",
  textLead: "Here’s your code for The 99. Enter it on the page where you asked for it:",
  fine: "It expires in 10 minutes. Didn’t ask for a code? You can ignore this email.",
  reason: "You’re getting this because someone asked for a code for this address on The 99.",
} as const;

/** Clerk's templates: set in Clerk's dashboard, not in code. `{{otp_code}}` is Clerk's variable (G3). */
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
