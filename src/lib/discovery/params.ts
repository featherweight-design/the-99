export function parseScope(v: unknown): "owned" | "play" {
  return v === "play" ? "play" : "owned";
}

/** Reads the requested sort and nothing more. Ruling 8's gate — novelty measures
    distance from what you have built, so with nothing built there is no distance
    and the sort falls back — is applied in `loadDiscovery`, which already knows
    whether any deck exists and can answer it without a second query. */
export function parseSort(v: unknown): "fit" | "new" {
  return v === "new" ? "new" : "fit";
}

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
