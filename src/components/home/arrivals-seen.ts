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
 * The About keys a page visit in this document acknowledged (About visual PR 6b). The same problem as the arrivals':
 * the visit writes About's seen state and retires Home's cached payload on the server, but Back (or a client
 * navigation) to Home restores the payload the router holds, About's line included. `RecordPageVisit` calls
 * `acknowledgeAbout()` with the keys its visit wrote: the banner leaves out each launch whose key is among them, and a
 * first-run line when every id it stands for is. A new document starts clear.
 */
// Only ever added to: a visit acknowledges once its write has LANDED (or at once, for a reader whose visit writes
// nothing), so nothing is ever taken back and no late failure can race a later visit's acknowledgement.
const aboutAcked = new Set<string>();

/** A page visit in this document recorded these keys. */
export function acknowledgeAbout(ids: readonly string[]): void {
  for (const id of ids) aboutAcked.add(id);
}

/** Every one of `ids` was acknowledged by a page visit in this document. */
export function aboutAcknowledged(ids: readonly string[]): boolean {
  return ids.length > 0 && ids.every((id) => aboutAcked.has(id));
}

/**
 * A visit in this document took the reader past their first run without writing every key the first-run line stands
 * for: the Reference's (`?tab=reference`), which writes the floor and legacy ids. A fresh Home draws no first-run line
 * for them any more, so a restored one must not either. Only ever set.
 */
let aboutFirstRunEnded = false;

/** A visit in this document ended the reader's first run. */
export function endAboutFirstRun(): void {
  aboutFirstRunEnded = true;
}

/**
 * A write in this document CONFIRMED that the reader holds these About keys (a page visit's answer, the banner ✕'s):
 * they are acknowledged, and since holding any key at all means the reader is past their first run (`isFirstRun`), a
 * non-empty set ends it here too. So a first-run line restored by Back is not drawn even when its baseline was cut
 * (a unit switched off between Home's render and the visit leaves its key unwritten, and the line's ids unanswered).
 */
export function acknowledgeHeld(ids: readonly string[]): void {
  acknowledgeAbout(ids);
  if (ids.length > 0) endAboutFirstRun();
}

/** Whether a visit in this document ended the reader's first run. */
export function aboutFirstRunOver(): boolean {
  return aboutFirstRunEnded;
}

/** One launch's key was acknowledged by a page visit in this document. */
export function launchAcknowledged(key: string): boolean {
  return aboutAcked.has(key);
}

/** Tests only: a fresh document. */
export function resetArrivalsAcknowledged(): void {
  acknowledged.clear();
  aboutAcked.clear();
  aboutFirstRunEnded = false;
}
