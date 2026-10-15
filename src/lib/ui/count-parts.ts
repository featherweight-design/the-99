/**
 * The words around a count, cut out of a copy string that already holds it (`312 of 1,284`, `24 cards`), so the
 * copy stays the copy module's and `CountUp` gets plain strings it can take from a server component. The number is
 * the first place `n` reads in the string, written the way the app writes a count (en-US separators).
 */
export function countParts(text: string, n: number): { before: string; after: string } {
  const figure = n.toLocaleString("en-US");
  const at = text.indexOf(figure);
  if (at < 0) return { before: "", after: "" };
  return { before: text.slice(0, at), after: text.slice(at + figure.length) };
}
