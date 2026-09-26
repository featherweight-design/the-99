/**
 * Reconciling what a model RETURNED against what a batch ASKED for.
 *
 * Two facts make this more than a lookup, and both were measured in the sample rather
 * than anticipated.
 *
 * **A two-faced card's name comes back split.** The catalog name is
 * `Soulcipher Board // Cipherbound Spirit`; Sonnet returned `Soulcipher Board` and
 * `Cipherbound Spirit` as separate entries while Haiku kept it joined. Left alone that
 * loses the card from the score entirely — it reads as "not returned" while the model
 * answered it. Reconciled by FACE, never by fuzzy match: a face is an exact segment of a
 * name this batch asked for, so nothing is guessed.
 *
 * **A name that is neither asked for nor a face of one is REFUSED.** An invented name
 * accepted here enters the label set, and `label-cards-agree` iterates one model's keys —
 * so a hallucination returned by both models would count as an agreeing card and move the
 * agreement denominator. Refusing keeps the denominator honest.
 */

/**
 * Resolves returned names to the catalog names a batch asked for.
 *
 * Returns `null` for a name the batch does not cover, which the caller records as
 * unexpected rather than inserting.
 */
export function faceResolver(asked: readonly string[]): (returned: string) => string | null {
  const exact = new Set(asked);
  // Each FACE of a two-faced name maps back to the joined name. Built once per batch
  // rather than per returned card: the batch is 12 cards and the model may return more.
  const faceOf = new Map<string, string>();
  for (const name of asked) {
    if (!name.includes(" // ")) continue;
    for (const face of name.split(" // ")) {
      // A face that is ALSO a whole asked-for name stays itself. Two cards in one batch
      // where one's name is the other's face is not a shape the catalog produces today,
      // and resolving such a face to the joined name would silently move a label from
      // one card to another — so the exact match wins.
      if (exact.has(face)) continue;
      faceOf.set(face, name);
    }
  }
  return (returned: string) => (exact.has(returned) ? returned : faceOf.get(returned) ?? null);
}

/** What `reconcile` did with one batch's reply, for the caller to record. */
export type Reconciled<T> = {
  /** Catalog name to the entries the model returned for it, faces merged. */
  byName: Map<string, T[]>;
  /** Names returned that this batch never asked about, in the order seen. */
  unexpected: string[];
  /** Names asked for and not returned — a MISS, recorded rather than silently absent. */
  missing: string[];
};

/**
 * Groups a reply's entries under the catalog names a batch asked for.
 *
 * Two faces of one card MERGE into one entry list, which is what the schema labels — the
 * card, not the face. A card asked for and not returned lands in `missing`, never in
 * `byName` with an empty list: an empty label and an absent one mean different things to
 * every reader downstream.
 */
export function reconcile<T>(
  asked: readonly string[],
  returned: readonly { name: string; value: T }[],
): Reconciled<T> {
  const resolve = faceResolver(asked);
  const byName = new Map<string, T[]>();
  const unexpected: string[] = [];
  for (const { name, value } of returned) {
    const to = resolve(name);
    if (to === null) { unexpected.push(name); continue; }
    byName.set(to, [...(byName.get(to) ?? []), value]);
  }
  return { byName, unexpected, missing: asked.filter((n) => !byName.has(n)) };
}
