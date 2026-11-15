// The new-password rules Q1 (sign-up) and K5 (choose a new password) share, without the estimator (Small items 11, live
// password strength R1c). This module is cheap and imported statically; the estimator in `strength-estimator.ts` is the
// heavy one and is only ever reached through a dynamic `import()` (pinned by `strength-lazy.test.ts`).

/** Clerk's minimum length. The length guide's words and every length check read this one constant. */
export const MIN_PASSWORD = 8;

/** The meter's reading: `short` draws no word (under 8, or not scored yet); the rest draw Weak, Good or Strong. */
export type Strength = "short" | "weak" | "good" | "strong";

export type StrengthGuides = {
  /** 8 or more characters. */
  length: boolean;
  /** A number or symbol. A space is neither, so a passphrase of words leaves this open (drawn S frame). */
  numberOrSymbol: boolean;
  /** Not a common word, name or date. Only the estimator can tick it. */
  common: boolean;
};

export type StrengthReading = {
  strength: Strength;
  /** The estimator found no common word, name or date: the same as `guides.common`. */
  commonOk: boolean;
  guides: StrengthGuides;
};

/** Characters, not UTF-16 units, so an emoji counts once. */
export const passwordLength = (pw: string): number => [...pw].length;

export const hasNumberOrSymbol = (pw: string): boolean => /[^\p{L}\p{M}\s]/u.test(pw);

/**
 * The reading before the estimator has loaded, or when it failed (READINESS clarification 2): length and number-or-symbol
 * tick live, the meter shows no word, the third guide stays open. It errs weak; Clerk still judges on the press.
 */
export function unscored(pw: string): StrengthReading {
  return {
    strength: "short",
    commonOk: false,
    guides: { length: passwordLength(pw) >= MIN_PASSWORD, numberOrSymbol: hasNumberOrSymbol(pw), common: false },
  };
}
