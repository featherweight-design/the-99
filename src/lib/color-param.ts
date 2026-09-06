/**
 * The `?c=` colour filter, shared by the collection browser and both commander
 * lists. It lives above all three rather than inside one of them: a link is
 * carried between those surfaces, so a difference in which letters they accept
 * or how they normalise them would show up as a filter that changes meaning on
 * the way across.
 *
 * Unknown letters are dropped rather than rejected, and duplicates collapse, so
 * a hand-edited or truncated URL narrows to something real instead of erroring.
 */
export function parseColors(param: string | null): string[] {
  if (!param) return [];
  return [...new Set(param.toUpperCase().split("").filter((c) => "WUBRG".includes(c)))];
}
