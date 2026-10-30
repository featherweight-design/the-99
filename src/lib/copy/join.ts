// The newcomer's pages (invites R1, plan `2026-10-16-invites.md` PR 5): `/join/[token]` (boards N1 to N12) and the
// invite-only `/sign-up` (I1, I2). Transcribed from the handoff's copy strings; owed to /copy-review with PR 4's.
// `name` is the sender's display name, a `ThirdPartyName` (lib/person-name): a line naming them is `PersonParts`, drawn
// marked. A line with an emphasized phrase is `Parts`: the copy owns every word, the page draws the `em` pieces in
// `--fg` at weight 500 (`Emphasis`).

import { personText, type ThirdPartyName } from "../person-name/brand";

export type Parts = ReadonlyArray<string | ThirdPartyName | { em: string }>;

export const joinCopy = {
  brand: "The Ninety-Nine",
  cardType: "Invitation",
  cardRules: (name: ThirdPartyName) => personText`Join The 99 as ${name}’s friend. Your decks and your collection stay yours.`,
  // "The" and "99" are held together by a no-break space, so the heading never breaks before the 99.
  title: (name: ThirdPartyName) => personText`${name} invited you to The\u00A099`,
  body: "Type your own email. We’ll send it a code to check it’s yours, then you’ll make your account.",
  emailLabel: "Your email",
  emailPlaceholder: "name@example.com",
  sendCode: "Send code",
  sendingCode: "Sending code…",
  fine: (name: ThirdPartyName) => personText`${name} won’t see your email. This invite works once, and only for the next 15 minutes.`,
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
  okBody: (name: ThirdPartyName) => personText`Now make your account. You’ll join as ${name}’s friend.`,
  toSignUp: "Continue to sign-up",
  continuing: "Continuing…",
  haveAccountTitle: "You already have an account",
  haveAccountBody: (email: string, name: ThirdPartyName): Parts => [{ em: email }, ...personText` is already on The 99. Sign in, then ask ${name} for a friend link.`],
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

/**
 * The flyer's `/join/<CODE>` (flyer trial R1b, boards `Join-Phone` V1 to E3; handoff `flyer-trial · copy strings.ts`).
 * Placeholder copy owed to /copy-review. The title is one the page balances; "The" and "99" stay on one line.
 * Everything else on the page (email field, Send code, the code step, Confirm) is `joinCopy`.
 */
export const flyerJoinCopy = {
  cardName: "The 99",
  cardType: "Invitation",
  cardRules: "Join before launch, with 3 invites of your own for your pod.",
  cardCredit: "From a flyer",
  /** The footer's right end, Roman for 99 (the board's `XCIX`); drawn uppercase by CSS. */
  cardMark: "XCIX",
  title: "Try The\u00A099 before it launches",
  fine: "You start with 15 welcome credits and 3 invites for your friends.",
  okBody: "Now make your account. You’ll start with 15 welcome credits and 3 invites.",
  fullTitle: "This flyer’s spots are all taken",
  revokedTitle: "This flyer has ended",
  listBody: "The 99 opens to everyone soon. Leave your email and we’ll tell you when it does.",
  listPress: "Tell me at launch",
  listedTitle: "You’re on the list",
  listedBody: (email: string): Parts => ["We’ll email ", { em: email }, " the day The 99 opens to everyone."],
  /** Not drawn on the boards: a hand-over to an address that already has an account. The invite's names its sender; a flyer has none. */
  haveAccountBody: (email: string): Parts => [{ em: email }, " is already on The 99. Sign in instead."],
  launchedTitle: "The 99 is open to everyone now",
  launchedBody: "Flyer codes have retired. Make your account the usual way.",
  launchedPress: "Make your account",
} as const;
