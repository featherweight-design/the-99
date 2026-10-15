/**
 * The seen keys a Precons visit in this document acknowledged (rule 6).
 *
 * The Precons page writes the seen keys in `after()` whenever its visit acknowledges arrivals, and the stamp that
 * write moves retires Home's cached payload on the SERVER. The browser's router still holds the Home payload it
 * drew, banner included, and restores it on Back or on a client navigation to Home. So the Precons view calls
 * `acknowledgeArrivals()` when, and only when, the page told it its visit writes keys (a list drawn, the switch on,
 * a non-empty key set), with the keys it writes, and `ArrivalsBanner` draws nothing when every key it would write
 * is among them. A banner holding a key no visit covered (an arrival that landed after it) still draws.
 * `PreconsDown` acknowledges nothing, so a visit that wrote nothing leaves the banner up and retryable. A new
 * document starts clear.
 */
const acknowledged = new Set<string>();

/** The Precons visit in this document wrote these seen keys. */
export function acknowledgeArrivals(keys: readonly string[]): void {
  for (const k of keys) acknowledged.add(k);
}

/** Every one of `keys` was acknowledged by a Precons visit in this document. */
export function arrivalsAcknowledged(keys: readonly string[]): boolean {
  return keys.length > 0 && keys.every((k) => acknowledged.has(k));
}

/**
 * The About entries a `/about` visit in this document acknowledged (About on the banner, PR A). The same problem
 * as the arrivals': the visit writes About's seen state and retires Home's cached payload on the server, but Back
 * (or a client navigation) to Home restores the payload the router holds, About's line included. `RecordVisit`
 * calls `acknowledgeAbout()` with the entries the page drew, and the banner leaves About's line out when every id
 * it claims is among them. A failed visit write takes them back out. A new document starts clear.
 */
// Held per ATTEMPT: each acknowledgement is a token, and an id stays acknowledged while any token holds it. A failed
// write takes back its own attempt's claim only, so an older visit failing late never erases a later visit's.
const aboutAcked = new Map<string, Set<symbol>>();

/** A `/about` visit in this document recorded these entries. Returns the attempt, for `unacknowledgeAbout`. */
export function acknowledgeAbout(ids: readonly string[]): symbol {
  const attempt = Symbol("about-visit");
  for (const id of ids) {
    const holders = aboutAcked.get(id) ?? new Set<symbol>();
    holders.add(attempt);
    aboutAcked.set(id, holders);
  }
  return attempt;
}

/** That attempt's write failed: its claim goes, and any other attempt's on the same entries stays. */
export function unacknowledgeAbout(attempt: symbol): void {
  for (const [id, holders] of aboutAcked) {
    holders.delete(attempt);
    if (holders.size === 0) aboutAcked.delete(id);
  }
}

/** Every one of `ids` was acknowledged by a `/about` visit in this document. */
export function aboutAcknowledged(ids: readonly string[]): boolean {
  return ids.length > 0 && ids.every((id) => aboutAcked.has(id));
}

/** Tests only: a fresh document. */
export function resetArrivalsAcknowledged(): void {
  acknowledged.clear();
  aboutAcked.clear();
}
