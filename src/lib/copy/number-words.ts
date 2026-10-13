/**
 * A count as the app's long-form copy writes it: a word from zero to ten, digits from 11 up.
 * Shared by About's captions and How it works, so the two never spell one number two ways.
 */
const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];

export function numberWord(n: number): string {
  return NUMBER_WORDS[n] ?? String(n);
}
