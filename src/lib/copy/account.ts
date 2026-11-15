// Settings' Account section (account settings handoff R1, 2026-11-14, `account · copy strings.ts`), through /copy-review.
// The name field's strings are the shipped `socialCopy.page.nameField` (one name, two doors). The delete reuses the
// shipped paid-credits split (`creditsPageCopy.del`: title, labels, refund line) and the shipped password and code lines
// (`signInCopy`, `joinCopy`); only what is new is here.

/** How the account signs in, in the order the line names them. */
export type SignInMethod = "google" | "password" | "code";

export type Parts = (string | { em: string })[];

const methodWord: Record<SignInMethod, string> = { google: "Google", password: "password", code: "email code" };

export const accountCopy = {
  /** The section head, drawn uppercase by CSS, last on Settings. */
  head: "Account",

  name: {
    label: "Your name",
    /** The row's line under the name. */
    line: "Friends see it with your signature card.",
    change: "Change",
  },

  signIn: {
    label: "Email and sign-in",
    /** "Signs in with Google and email code." The words join with commas and a final "and". */
    methods: (methods: readonly SignInMethod[]) => {
      const w = methods.map((m) => methodWord[m]);
      return `Signs in with ${w.length > 1 ? `${w.slice(0, -1).join(", ")} and ${w[w.length - 1]}` : w[0]}.`;
    },
    /** The quiet link to Clerk's hosted page (product call: email, password and Google stay there). */
    more: "More account options",
    /** At md only, after the link. */
    moreLine: "Change your email or password, or connect Google.",
  },

  devices: {
    /** The sub-head; while the list loads or fails, it is drawn without the count. */
    head: (n: number | null) => (n === null ? "Signed in on" : `Signed in on · ${n}`),
    explain: "Sign out of a device you don’t use or don’t recognize.",
    /** `Chrome on Mac`, `Safari on iPhone`. */
    name: (browser: string, device: string) => `${browser} on ${device}`,
    /** When Clerk names no browser or device: "Browser on a phone". */
    unknownBrowser: "Browser",
    unknownPhone: "a phone",
    unknownComputer: "a computer",
    thisDevice: "This device",
    activeNow: "Active now",
    lastActive: (ago: string) => `Last active ${ago}`,
    signOut: "Sign out",
    signOutAria: (name: string) => `Sign out of ${name}`,
    signingOut: "Signing out…",
    loading: "Finding your devices…",
    readFailed: "We couldn’t load your devices.",
    retry: "Try again",
    /** Toast, role alert: the row comes back. Also over the rate rule, as the name field's failed save is. */
    failed: "We couldn’t sign out that device. Try again.",
    /** Toast, role status, as the row leaves. */
    signedOut: (name: string) => `Signed out of ${name}.`,
  },

  del: {
    label: "Delete account",
    line: "Erases your Collection, decks and everything else, at once. It can’t be undone.",
    open: "Delete account…",

    /** D1, the modal's first screen. */
    title: "Delete your account?",
    intro: "This erases everything The 99 keeps for you, right away:",
    erased: [
      "Your Collection and wishlist",
      "Every deck, with its versions, games and notes",
      "Your friends, pods and friend links",
      "Tool results, credits and settings",
    ],
    pods: "A pod you own passes to its longest-standing member. Friends aren’t told; you leave their lists.",
    final: "It can’t be undone.",
    /** Under the shipped split (`creditsPageCopy.del.title`): what the delete does to the paid credits. */
    heldSays: (plan: number, pack: number) =>
      plan > 0 && pack > 0
        ? `Deleting your account forfeits them: ${plan} plan ${plan === 1 ? "credit" : "credits"} and ${pack} pack ${pack === 1 ? "credit" : "credits"}.`
        : "Deleting your account forfeits them.",
    /** A live plan, with or without held credits: deleting the Stripe customer cancels it at once. */
    plan: "Your plan ends now and won’t renew.",
    /** The shipped refund line, widened to a plan's first month, which is refunded within 14 days too. */
    refundBefore: "Bought a pack or started your plan in the last 14 days and not used it? Email ",
    refundAfter: " for a refund before you delete.",
    /** The confirm gesture: the word, typed. Case and spaces at either end don't matter. */
    typeLabel: "Type delete to confirm",
    word: "delete",
    keep: "Keep",
    go: "Delete account",
    deleting: "Deleting…",

    /** D2, re-verify (Clerk's reverification), a screen of the same modal with ‹. */
    verifyTitle: "Confirm it’s you",
    verifyPassword: (email: string): Parts => ["Enter the password for ", { em: email }, "."],
    verifyCode: (email: string): Parts => ["We sent a 6-digit code to ", { em: email }, ". It works for 10 minutes."],
    /** A Google account re-verifies by a code to its Google email (Clerk's reverification has no Google step). */
    verifyGoogle: (email: string): Parts => ["You sign in with Google, so we sent a 6-digit code to ", { em: email }, ". It works for 10 minutes."],
    confirm: "Confirm and delete",
    /** Back on D1 after ‹ on D2. */
    notDeleted: "Nothing was deleted.",
    wrongPassword: "That password isn’t right. Try again, or email yourself a code.",
    /** A delete that fails after the step-up: nothing was erased. */
    failed: "We couldn’t delete your account. Nothing was deleted. Try again.",
    /** Our rate limit or Clerk's 429, on either screen. */
    tooMany: "Too many tries. Wait a few minutes, then try again.",
    back: "Back",
    close: "Close",
  },

  /** The landing, signed out, after a delete. Toast, role status. */
  deleted: "Your account is deleted.",
} as const;
