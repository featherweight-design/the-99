// The two letters a face draws while its person has chosen no commander (Social R1, README decision 22). Here
// rather than in the component so the pure rows (`lib/decks/matchup-rows.ts`) draw the same initials a friend row does.

/** Two letters: the first of each of the first two words, or the first two of a one-word name. */
export function faceInitials(name: string): string {
  const words = name.trim().split(/\s+/u).filter(Boolean);
  const letters = (w: string) => [...w].filter((c) => /[\p{L}\p{N}]/u.test(c));
  const out = words.length > 1
    ? [letters(words[0])[0], letters(words[1])[0]]
    : letters(words[0] ?? "").slice(0, 2);
  return out.filter(Boolean).join("").toLocaleUpperCase("en-US");
}
