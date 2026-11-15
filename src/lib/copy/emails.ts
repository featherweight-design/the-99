// Every string the emails carry (branded emails R2, 2026-11-14; words from the handoff's `emails · copy strings.ts`, through
// /copy-review). `name` is a sender's display name where a function takes one: it is escaped where it is drawn, never here.
// The html parts use curly quotes; `straight()` (src/lib/email/shell.ts) makes the plain-text twin's straight.

export const emailShellCopy = {
  /** The tile's alt text, shown in its box when images are off. */
  markAlt: "The 99",
  /** The footer's flavor line, every email (the flyer's pitch). */
  flavor: "Search your library for a commander.",
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
    lead: "The 99 reads the cards you already own and builds Commander decks from them. Join as the sender’s friend. Your decks and your collection stay yours.",
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
