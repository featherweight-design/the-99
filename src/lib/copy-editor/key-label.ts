// How a row's key reads in the overlay's tag: the copy file's name, then the path inside it without the export's name.
// `src/lib/copy/about-pages.ts#ABOUT_PAGE_STRINGS.moreTools#t1` is `about-pages · moreTools#t1`.
export function keyLabel(key: string): { file: string; path: string } {
  const hash = key.indexOf("#");
  const file = (hash < 0 ? key : key.slice(0, hash)).split("/").pop()!.replace(/\.[mc]?tsx?$/, "");
  const rest = hash < 0 ? "" : key.slice(hash + 1);
  const dot = rest.indexOf(".");
  const hashAfter = rest.indexOf("#");
  // Only the export's own name is dropped: a branch suffix (`#t1`) belongs to the leaf.
  const path = dot >= 0 && (hashAfter < 0 || dot < hashAfter) ? rest.slice(dot + 1) : rest;
  return { file, path };
}
