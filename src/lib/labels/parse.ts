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
    // An exact asked-for name always wins over being some other card's face — the
    // returned lambda checks `exact` before `faceOf`, so that precedence is in the lookup
    // rather than in this loop. A `continue` here for a face that is also a whole name
    // would be unreachable by effect, which is what an earlier version had.
    for (const face of name.split(" // ")) faceOf.set(face, name);
  }
  return (returned: string) => (exact.has(returned) ? returned : faceOf.get(returned) ?? null);
}
