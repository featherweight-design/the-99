// DRAFT for /copy-review (Live password strength R1c, 2026-11-15).
export const strengthCopy = {
  /** The three guides, shown from the empty field. Ticks are guidance only: the meter and Clerk still judge. */
  guides: {
    length: "8 or more characters",
    mix: "A number or symbol",
    common: "Not a common word, name or date",
  },
  /** The meter's word, once there are 8 characters. */
  word: { weak: "Weak", good: "Good", strong: "Strong" },
  /** Under the guides only when all three are ticked and it is still weak. */
  stillWeak: "Still easy to guess. Try a longer one, or a few words together.",
  /** Screen readers: one polite line when the word or the count changes. */
  announce: (word: string, met: number) => `${word}. ${met} of 3 done.`,
} as const;
