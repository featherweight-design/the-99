// Live password strength (Small items 11 addendum R1c): the panel under Q1's and K5's new password. Transcribed from the
// handoff's `password-strength · copy strings.ts`; the screen-reader strings are new here (READINESS clarification 5).

import { MIN_PASSWORD } from "../auth/password";

export const strengthCopy = {
  /** The three guides, shown from the empty field. Ticks are guidance only: the meter and Clerk still judge. */
  guides: {
    length: `${MIN_PASSWORD} or more characters`,
    mix: "A number or symbol",
    common: "Not a common word, name or date",
  },
  /** The meter's word, once there are 8 characters. */
  word: { weak: "Weak", good: "Good", strong: "Strong" },
  /** Under the guides only when all three are ticked and it is still weak. */
  stillWeak: "Still easy to guess. Try a longer one, or a few words together.",
  /** Screen readers: read after each guide, since the round mark is drawn and not read. */
  guideDone: ", done",
  guideNotYet: ", not yet",
  /** Screen readers: one polite line when the word or the count changes, once typing pauses. */
  announce: (word: string, met: number) => `${word}. ${met} of 3 done.`,
  /** The same line under 8 characters, where the meter has no word. */
  announceShort: (met: number) => `${met} of 3 done.`,
} as const;
