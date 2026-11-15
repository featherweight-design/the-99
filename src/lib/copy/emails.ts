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
