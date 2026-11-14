// Account in Settings (account settings handoff R1, 2026-11-14). DRAFT: every string passes /copy-review before build.
// The name field's strings are the shipped `socialCopy.page.nameField` (one name, two doors); the paid-credits split and
// its refund line are the shipped `creditsPageCopy.del` (the split's labels, `says`, `refundBefore`/`refundAfter`); the
// password and code lines are the shipped `signInCopy` and `joinCopy` ones. Only what is new is here.

type Parts = (string | { em: string })[];

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
    /** `wren@example.com · Google`, `· password`, `· email code`; joined with " and " when there are two. */
    google: "Google",
    password: "password",
    code: "email code",
    /** The quiet link to Clerk's hosted page (product call: email, password and Google stay there). */
    more: "More account options",
    moreLine: "Change your email or password, or connect Google.",
  },

  devices: {
    head: (n: number) => `Signed in on · ${n}`,
    explain: "Sign out of a device you don’t use or don’t recognize.",
    /** `Chrome on Mac`, `Safari on iPhone`, `The 99 app on iPhone` (an installed app is still its browser). */
    name: (browser: string, device: string) => `${browser} on ${device}`,
    thisDevice: "This device",
    activeNow: "Active now",
    lastActive: (ago: string) => `Last active ${ago}`,
    signOut: "Sign out",
    signOutAria: (name: string) => `Sign out of ${name}`,
    signingOut: "Signing out…",
    loading: "Finding your devices…",
    readFailed: "We couldn’t load your devices.",
    retry: "Try again",
    failed: "We couldn’t sign out that device. Try again.", // toast, role alert
    signedOut: (name: string) => `Signed out of ${name}.`, // toast, role status
  },

  del: {
    label: "Delete account",
    line: "Erases your Collection, decks and everything else, at once. It can’t be undone.",
    open: "Delete account…",

    /** D1, the modal's first screen. */
    title: "Delete your account?",
    intro: "This erases everything The 99 keeps for you, right away:",
    erased: [
      "your Collection and wishlist",
      "every deck, with its versions, games and notes",
      "your friends, pods and friend links",
      "tool results, credits and settings",
    ],
    pods: "A pod you own passes to its longest-standing member. Friends aren’t told; you leave their lists.",
    final: "It can’t be undone.",
    /** Under the shipped split: the shipped `del.title` and `del.says`, without "Nothing else in Manage account touches them". */
    heldSays: (plan: number, pack: number) => {
      const total = plan + pack;
      const n = (k: number, w: string) => `${k} ${w} ${k === 1 ? "credit" : "credits"}`;
      return `You have ${total} paid ${total === 1 ? "credit" : "credits"}. Deleting your account forfeits them${plan > 0 && pack > 0 ? `: ${n(plan, "plan")} and ${n(pack, "pack")}.` : "."}`;
    },
    /** The plan subscriber's line (the Stripe customer's delete cancels the plan at once). */
    plan: "Your plan ends now and won’t renew.",
    /** The shipped refund line, widened to the plan's first month (creditsPageCopy.refunds: first month refunded in 14 days). */
    refundBefore: "Bought a pack or started your plan in the last 14 days? Email ",
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
    /** Our rate limit (`src/lib/rate/rules.ts`) or Clerk's 429, on either screen. */
    tooMany: "Too many tries. Wait a few minutes, then try again.",
    back: "Back",
    close: "Close",
  },

  /** The landing, signed out, after a delete. Toast, role status. */
  deleted: "Your account is deleted.",
} as const;
