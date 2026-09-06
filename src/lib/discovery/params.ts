export function parseScope(v: unknown): "owned" | "play" {
  return v === "play" ? "play" : "owned";
}

/** `hasDecks` is the gate ruling 8 states: novelty measures distance from what
    you have built, so with nothing built there is no distance and the URL falls
    back rather than rendering an empty list. */
export function parseSort(v: unknown, hasDecks: boolean): "fit" | "new" {
  return v === "new" && hasDecks ? "new" : "fit";
}
