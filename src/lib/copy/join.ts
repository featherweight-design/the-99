// The newcomer's pages (invites R1, plan `2026-10-16-invites.md` PR 5): `/join/[token]` (boards N1 to N12) and the
// invite-only `/sign-up` (I1, I2). Transcribed from the handoff's copy strings; owed to /copy-review with PR 4's.
// `name` is the sender's display name. A line with an emphasized phrase is `Parts`: the copy owns every word, the page
// draws the `em` pieces in `--fg` at weight 500 (`Emphasis`).

export type Parts = ReadonlyArray<string | { em: string }>;

export const joinCopy = {
  brand: "The Ninety-Nine",
  cardType: "Invitation",
  cardRules: (name: string) => `Join The 99 as ${name}’s friend. Your decks and your collection stay yours.`,
  title: (name: string) => `${name} invited you to The 99`,
  body: "Type your own email. We’ll send it a code to check it’s yours, then you’ll make your account.",
  emailLabel: "Your email",
  emailPlaceholder: "name@example.com",
  sendCode: "Send code",
  sendingCode: "Sending code…",
  fine: (name: string) => `${name} won’t see your email. This invite works once, and only for the next 15 minutes.`,
  notAnEmail: "Enter an email address, like name@example.com.",
  codeTitle: "Check your email",
  codeBody: (email: string): Parts => ["We sent a 6-digit code to ", { em: email }, ". It works for 10 minutes."],
  codeAria: "6-digit code",
  confirm: "Confirm",
  confirming: "Confirming…",
  resend: "Send a new code",
  resendIn: (mmss: string) => `Send a new code in ${mmss}`,
  otherEmail: "Use a different email",
  codeWrong: "That code isn’t right. Check the email and try again.",
  codeExpired: "That code has expired. Send a new one.",
  okTitle: "That’s your email",
  okBody: (name: string) => `Now make your account. You’ll join as ${name}’s friend.`,
  toSignUp: "Continue to sign-up",
  continuing: "Continuing…",
  haveAccountTitle: "You already have an account",
  haveAccountBody: (email: string, name: string): Parts => [{ em: email }, ` is already on The 99. Sign in, then ask ${name} for a friend link.`],
  signIn: "Sign in",
  expiredTitle: "This invite QR has run out",
  expiredBody: "An invite QR lasts 15 minutes. Ask whoever showed it to make a new one.",
  endedTitle: "This invite QR no longer works",
  endedBody: "Each invite QR works once. Ask whoever showed it to make a new one.",
  haveOne: "Already on The 99?",
  /** R14: a transport failure on Send code, Confirm or Continue to sign-up. The field keeps its text. */
  failed: "We couldn’t do that. Try again.",
  retry: "Try again",
} as const;

export const inviteOnlyCopy = {
  kicker: "The Ninety-Nine",
  backWord: "BY INVITATION",
  title: "The 99 is invite-only",
  body: ["You join when someone already playing invites you. Ask a friend who plays: they’ll find ", { em: "Invite someone new" }, " under Add a friend."] as Parts,
  signIn: "Sign in",
  fine: "Have an invitation email? Open its link to make your account.",
} as const;
