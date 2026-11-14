// Settings' Account section (account settings handoff R1, 2026-11-14, `account · copy strings.ts`), through /copy-review.
// The name field's strings are the shipped `socialCopy.page.nameField` (one name, two doors). The delete's strings join
// this module with the delete flow.

/** How the account signs in, in the order the line names them. */
export type SignInMethod = "google" | "password" | "code";

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
} as const;
