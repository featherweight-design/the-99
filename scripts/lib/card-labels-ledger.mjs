// The spend ledger: what has been COMMITTED against the sample's cap so far.
//
// Keyed PER RUN, by the set of batch ids that run submitted, because the two
// operations that touch it are not idempotent on their own:
//
//   - `run` reserves a run's WORST CASE at submission, so a process that dies
//     before collection is not credited with having spent nothing.
//   - `collect` replaces that reservation with the measured figure.
//
// A flat `totalUsd` cannot express that. The first version wrote
// `prior + grandTotal` on every collect, so re-running `collect` over the SAME
// batches charged the cap a second time -- measured: $1.7048 became $2.5637 with
// no money spent. Keying on the batch ids makes both operations idempotent: a
// repeat reserve or a repeat reconcile overwrites that run's entry rather than
// appending to a total.
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const PATH = "out/spend.json";

/** A run is identified by the batch ids it submitted, order-independent. */
export const runKey = (submitted) => Object.values(submitted).slice().sort().join("+");

export function readLedger() {
  if (!existsSync(PATH)) return { runs: {} };
  try {
    const d = JSON.parse(readFileSync(PATH, "utf8"));
    return d && typeof d === "object" && d.runs ? d : { runs: {} };
  } catch {
    // A corrupt ledger must not read as "nothing spent" -- that is the one failure
    // that silently re-authorises the whole cap.
    throw new Error(`${PATH} exists but is unreadable; refusing to treat it as zero spend`);
  }
}

/** Measured where we have it, otherwise the reservation. */
export const ledgerTotal = (led) =>
  Object.values(led.runs).reduce((a, r) => a + (r.measuredUsd ?? r.reservedUsd ?? 0), 0);

/** Any run that submitted batches and has never been reconciled. */
export const unreconciled = (led) =>
  Object.entries(led.runs).filter(([, r]) => r.measuredUsd === undefined);

export function writeReservation(submitted, reservedUsd) {
  const led = readLedger();
  led.runs[runKey(submitted)] = { submitted, reservedUsd: +reservedUsd.toFixed(4), at: new Date().toISOString() };
  writeFileSync(PATH, JSON.stringify(led, null, 1));
  return ledgerTotal(led);
}

export function writeMeasured(submitted, measuredUsd) {
  const led = readLedger();
  const key = runKey(submitted);
  const existing = led.runs[key] ?? { submitted };
  led.runs[key] = { ...existing, measuredUsd: +measuredUsd.toFixed(4) };
  writeFileSync(PATH, JSON.stringify(led, null, 1));
  return ledgerTotal(led);
}
