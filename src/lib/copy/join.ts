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
 * The printed flyer's words (flyer trial R1b, `Print.dc.html`; pitch, points and sub from `addendum-flyer-copy/`). Placeholder copy owed to /copy-review, except the Fan Content
 * passage the flyer carries, which is `fanContentNotice.passageOne` verbatim (locked) and is not repeated here.
 */
export const flyerCopy = {
  kicker: "Magic: The Gathering · Commander",
  pitch: "Search your library for a commander.",
  /** Three things The 99 does that a list app doesn't (flyer copy addendum, B3), drawn as a diamond list under the pitch. */
  points: [
    "Find the commanders hiding in your binder.",
    "Learn which combo is only one card away.",
    "Borrow a friend’s spare before you pay for one.",
  ],
  sub: "Try it before it launches. Scan, sign up, tell us what you think.",
  scan: "Scan to join",
  orType: "or type",
  /** The footer's three facts; `domain` is the host the QR and the typed address use (`siteOrigin()`), so they always agree. */
  facts: (domain: string) => ["Free to try", "3 invites for your pod", domain],
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

/**
 * The in-app sign-in, `/sign-in` (Small items 11, item 4: addenda A1 and A2, boards P1 to P8, K5, N1, N2 and G1). Passed
 * /copy-review (2026-11-11). Ruling 2 (Hugh, 2026-11-11): no line here says whether an email has an account, so every line that
 * follows an email reads the same either way. The email field, the code step's title, boxes, Confirm and resend are
 * `joinCopy`'s.
 */
export const signInCopy = {
  cardWord: "Welcome back",
  title: "Sign in to The\u00A099",
  body: "Use Google, or type your email.",
  google: "Continue with Google",
  signingIn: "Signing in…",
  or: "or",
  continue: "Continue",
  newHere: "New to The 99? It’s invite-only for now.",
  howToJoin: "How to join",
  passwordTitle: "Enter your password",
  forEmail: (email: string): Parts => ["For ", { em: email }, "."],
  passwordLabel: "Password",
  signIn: "Sign in",
  forgot: "Forgot password?",
  codeInstead: "Email me a code instead",
  /**
   * P3: one line for a wrong password, an unknown email, a code-only account and a locked one. Cut to one line at every
   * width (Hugh, 2026-11-11): the code option is the press right under it, Email me a code instead.
   */
  wrong: "That email or password isn’t right.",
  codeBody: (email: string): Parts => ["If ", { em: email }, " has an account, we sent it a 6-digit code. It works for 10 minutes."],
  /** N2 back from Google when Clerk does not say which email the sign-in is for. */
  codeBodyNoEmail: "We sent a 6-digit code to your email. It works for 10 minutes.",
  resetTitle: "Reset your password",
  resetBody: (email: string): Parts => ["If ", { em: email }, " has an account, we sent it a 6-digit code. Enter it, then choose a new password."],
  backToSignIn: "Back to sign in",
  newPasswordTitle: "Choose a new password",
  newPasswordLabel: "New password",
  newPasswordHint: "At least 8 characters.",
  save: "Save and sign in",
  saving: "Saving…",
  tooShort: "Use at least 8 characters.",
  tooWeak: "That password is too easy to guess. Try a longer one, or a few words together.",
  breached: "That password has appeared in a data breach, so it can’t be used. Choose a different one.",
  /** N1: a password Clerk refuses at sign-in (breached, compromised, or one it asks to be replaced). */
  cantUse: "This password can’t be used. Reset it to sign in.",
  resetPassword: "Reset password",
  /** G1: back from Google with nothing to sign in to. */
  googleRefused: "That Google account can’t sign in here. Use your email, or open your invitation link if you’re new.",
} as const;

/**
 * The in-app sign-up by invitation, `/sign-up/new` (Small items 11, item 4: addendum A2 Ruling 1 and Ruling 3; boards
 * Q1 to Q8, R2, R3 and R5). Passed /copy-review (2026-11-11). The ticket proves the mailbox, so Q1 names the email; R3
 * is one page for a used, revoked, expired or unknown ticket and for an invited email that already has an account, so
 * it names nothing. The password lines (Q2 to Q4), the password hint and the "or" are `signInCopy`'s; the card's type
 * and Sign in are `joinCopy`'s.
 */
export const signUpCopy = {
  /** Q1's card is the 99's own face: a Clerk ticket says nothing of who sent it. */
  cardName: "The 99",
  cardRules: "Build Commander decks from the cards you already own.",
  cardCredit: "The 99",
  title: "Make your account",
  body: (email: string): Parts => [{ em: email }, " has an invitation, and its link proved the email is yours. Add your first name and a password."],
  /** Q6: back from Google with something still missing. */
  googleBody: (email: string): Parts => ["Google confirmed ", { em: email }, ". Add what Google didn’t send."],
  nameLabel: "Your first name",
  nameHint: "Friends see it on your signature card. Change it any time in Settings.",
  make: "Make my account",
  making: "Making your account…",
  /** R2, and the landing while the ticket is checked. */
  checking: "Checking your invitation…",
  googleHint: (email: string) => `Use the Google account for ${email}.`,
  refusedTitle: "This invitation link doesn’t work",
  refusedBody: "It may have been used already, or it may have run out. If you made your account with it, sign in. If not, ask the friend who invited you to send a new one.",
} as const;
