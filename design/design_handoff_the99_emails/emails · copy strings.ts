// Branded emails R1 (account 2, 2026-11-14): every string the emails carry, for /copy-review.
// "(today)" marks a string `inviteMail` or the code mails already send; every other string is new.
// `name` is the sender's display name (HTML-escaped in html parts); with none, the invite uses `anon` strings.
// Plain text uses straight quotes; HTML uses curly ones.

export const emailShellCopy = {
  wordmark: "THE 99",
  /** The footer's second line, on every email (Hugh: no reply-to). */
  noReplies: "Replies to this address aren’t read.",
  /** The footer's third line: "The 99" links to the site. */
  site: "The 99 · the-99.dev",
  siteText: "The 99 · https://the-99.dev",
} as const;

export const inviteEmailCopy = {
  subject: (name: string) => `${name} invited you to The 99`, // (today)
  preheader: (name: string, days: number) => `Join as ${name}’s friend. The link works for ${days} days.`,
  cardAlt: (name: string, commander: string) => `${name}’s invitation card, with ${commander} art`,
  heading: (name: string) => `${name} invited you to The 99`, // (today, as the subject)
  lead: (name: string) =>
    `The 99 reads the cards you own and builds Commander decks from them. You’ll join as ${name}’s friend, and your decks and your collection stay yours.`, // first sentence (today)
  button: "Join The 99", // (today, as a text link)
  rawLinkLabel: "Or paste this link into your browser:",
  textLinkLabel: "Join The 99:",
  fine: (days: number, nameOrWho: string) => `The link works for ${days} days. If you don’t know ${nameOrWho}, ignore this email.`, // (today)
  reason: (name: string) => `You’re getting this because ${name} invited this address.`,
  anon: {
    name: "A friend", // (today)
    who: "who sent it", // (today)
    reason: "You’re getting this because someone on The 99 invited this address.",
  },
} as const;

/** The newcomer's code (QR) and the flyer's code: one template. */
export const codeEmailCopy = {
  subject: (code: string) => `Your code for The 99: ${code}`, // (today)
  preheader: "Type it on the page where you asked for it. It works for 10 minutes.",
  heading: "Your code for The 99",
  lead: "Type this code on the page where you asked for it.",
  textLead: "Type this code on the page where you asked for it:",
  codeLabel: "Your code",
  fine: "It works for 10 minutes. If you didn’t ask for it, ignore this email.", // (today, reworded)
  reason: "You’re getting this because someone asked for a code for this address on The 99.",
} as const;

/** Clerk's templates: set in Clerk's dashboard, not in code. `{{otp_code}}` is Clerk's variable (G3). */
export const clerkEmailCopy = {
  signIn: {
    subject: "Your sign-in code for The 99: {{otp_code}}",
    preheader: "Type it on the sign-in page. It works for 10 minutes.",
    heading: "Your sign-in code",
    lead: "Type this code on the sign-in page.",
    textLead: "Type this code on the sign-in page:",
    codeLabel: "Your code",
    fine: "It works for 10 minutes. If you didn’t try to sign in, ignore this email. Nobody can sign in without this code.",
    reason: "You’re getting this because someone tried to sign in to The 99 with this address.",
  },
  reset: {
    subject: "Your password reset code for The 99: {{otp_code}}",
    preheader: "Type it on the sign-in page. It works for 10 minutes.",
    heading: "Reset your password",
    lead: "Type this code on the sign-in page, then choose a new password.",
    textLead: "Type this code on the sign-in page, then choose a new password:",
    codeLabel: "Reset code",
    fine: "It works for 10 minutes. If you didn’t ask to reset your password, ignore this email. Your password stays as it is.",
    reason: "You’re getting this because someone asked to reset the password for this address on The 99.",
  },
  /** Display name and From local part (Q1). */
  fromName: "The 99",
  fromLocalPart: "codes",
} as const;
