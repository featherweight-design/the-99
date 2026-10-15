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
const aboutAcked = new Set<string>();

/** The `/about` visit in this document recorded these entries. */
export function acknowledgeAbout(ids: readonly string[]): void {
  for (const id of ids) aboutAcked.add(id);
}

/** A failed visit write: these entries are not acknowledged after all. */
export function unacknowledgeAbout(ids: readonly string[]): void {
  for (const id of ids) aboutAcked.delete(id);
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
