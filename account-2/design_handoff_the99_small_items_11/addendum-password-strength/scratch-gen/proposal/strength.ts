// DRAFT for /copy-review (Live password strength R1b, 2026-11-15).
/** What the estimator found in a weak password, picked from its match patterns (zxcvbn: dictionary, date, sequence, repeat). */
export type WeakReason = "letters" | "common" | "date" | "run" | "other";
export const strengthCopy = {
  /** Empty and under 8: the shipped hint, unchanged (`signInCopy.newPasswordHint`). */
  short: "At least 8 characters.",
  /** Weak, by what is wrong with this password: the fix that actually raises its score. */
  weak: {
    letters: "Weak. Add a number or symbol, or another word.",
    common: "Weak. That one’s common. Try a few unrelated words together.",
    date: "Weak. Years and dates are easy to guess.",
    run: "Weak. Skip runs like 1234 or aaaa.",
    other: "Weak. Try a longer one, or a few words together.",
  } satisfies Record<WeakReason, string>,
  good: "Good. Longer is stronger.",
  strong: "Strong.",
  /** Q3 after the press: the shipped first sentence, then the same fix the live line gave. */
  tooWeak: (reason: WeakReason) => `That password is too easy to guess. ${strengthCopy.weak[reason].replace(/^Weak\. /, "")}`,
} as const;
