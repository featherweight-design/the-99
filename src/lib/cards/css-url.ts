// A `url(...)` for a CSS background, quoted and escaped. Here, not in `src/lib/collection/browse.ts` where it began, so a
// surface a signed-out visitor sees can draw art without reaching the collection reader (demo split 5a). `browse.ts`
// re-exports it, so no caller moves.
export function cssUrl(uri: string): string {
  return `url("${encodeURI(uri).replaceAll('"', "%22")}")`;
}
