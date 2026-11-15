// DRAFT for /copy-review (Live password strength R1, 2026-11-15).
export const strengthCopy = {
  /** Empty and under 8: the shipped hint, unchanged (`signInCopy.newPasswordHint`). */
  short: "At least 8 characters.",
  weak: "Weak. Try a longer one, or a few words together.",
  good: "Good. Longer is stronger.",
  strong: "Strong.",
} as const;
