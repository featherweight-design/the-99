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
