// Admin R3 copy strings: masking personal data. PLACEHOLDER wording, owed to /copy-review.
// New or changed keys only; everything else is adminCopy as shipped (src/lib/copy/admin.ts).
// Times are UTC like every admin time. Names in these strings are always the masked name (D1).

export const adminMaskCopy = {
  /** D1: an account Clerk holds no name or username for. */
  noName: (idTail: string) => `Account ·${idTail}`,

  accounts: {
    /** Replaces accounts.sub. */
    sub: (n: number, env: string) => `${n} ${n === 1 ? "account" : "accounts"} on ${env}. Names and emails are masked; Show reveals one account and logs it.`,
    /** Replaces accounts.search. */
    search: "Name, or a whole email",
    /** D10: an `@` typed, not yet submitted. */
    enterToLookUp: "Press Enter to look up this exact email.",
    /** D11, D12. */
    hit: "One account holds this email.",
    miss: "No account holds this email.",
    /** D13, toast. */
    lookUpFailed: "Couldn’t look up that email.",
  },

  reveal: {
    show: "Show",
    hide: "Hide",
    /** D6: under a revealed account. */
    shown: (time: string) => `Shown and logged · hides at ${time} UTC`,
    /** D13, toast. */
    failed: (name: string) => `Couldn’t show ${name}. Nothing was shown.`,
    tryAgain: "Try again",
    /** D8: the account page's History line. */
    history: (who: string, name: string) => `${who} showed ${name}’s name and email`,
  },

  /** D14: replaces the member, override-picker and invite-tree search placeholders. */
  findByName: "Find an account by name",
} as const;
