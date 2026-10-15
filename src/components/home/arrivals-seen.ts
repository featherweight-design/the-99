/**
 * Whether this document has acknowledged the upcoming-precons arrivals by a Precons visit (rule 6).
 *
 * The Precons page writes the seen keys in `after()` whenever its visit acknowledges arrivals, and the stamp that
 * write moves retires Home's cached payload on the SERVER. The browser's router still holds the Home payload it
 * drew, banner included, and restores it on Back or on a client navigation to Home. So the Precons view calls
 * `acknowledgeArrivals()` when, and only when, the page told it its visit writes keys (a list drawn, the switch on,
 * a non-empty key set), and `ArrivalsBanner` draws nothing while the flag is set. `PreconsDown` never sets it, so a
 * visit that wrote nothing leaves the banner up and the arrivals retryable. A new document starts clear.
 */
let acknowledged = false;

/** The Precons visit in this document wrote the seen keys. */
export function acknowledgeArrivals(): void {
  acknowledged = true;
}

export function arrivalsAcknowledged(): boolean {
  return acknowledged;
}

/** Tests only: a fresh document. */
export function resetArrivalsAcknowledged(): void {
  acknowledged = false;
}
