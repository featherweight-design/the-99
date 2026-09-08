/**
 * The colour match mode, from `?join=`.
 *
 * `contains` is both the default and what an absent, misspelled or hand-edited
 * param resolves to, matching `parseColors`: a URL that says something the list
 * does not understand narrows to something real rather than erroring.
 *
 * The param value is `exact` and the mode is `exactly`. The word in the URL is a
 * label the player may see and edit; the word in the code is the one the copy
 * uses. They are allowed to differ, and this is the one place the mapping lives.
 */
export function parseJoin(v: unknown): "contains" | "exactly" {
  return v === "exact" ? "exactly" : "contains";
}
