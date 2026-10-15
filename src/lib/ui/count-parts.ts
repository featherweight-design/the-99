/**
 * The words around a count, cut out of a copy string that already holds it (`312 of 1,284`, `24 cards`), so the
 * copy stays the copy module's and `CountUp` gets plain strings it can take from a server component. The number is
 * its first reading in the string, grouped (`1,284`, en-US) or plain (`1284`) as the copy wrote it, whichever comes
 * first, so a money figure later in the string (`$1,000.00`) is never taken for it. `grouped` says which form the
 * copy used, and `CountUp` draws the moving number the same way.
 */
export function countParts(text: string, n: number): { before: string; after: string; grouped: boolean } {
  const grouped = n.toLocaleString("en-US");
  const plain = String(n);
  const at = [text.indexOf(grouped), text.indexOf(plain)];
  const useGrouped = at[0] >= 0 && (at[1] < 0 || at[0] <= at[1]);
  const index = useGrouped ? at[0] : at[1];
  if (index < 0) return { before: "", after: "", grouped: true };
  const figure = useGrouped ? grouped : plain;
  return { before: text.slice(0, index), after: text.slice(index + figure.length), grouped: useGrouped };
}
