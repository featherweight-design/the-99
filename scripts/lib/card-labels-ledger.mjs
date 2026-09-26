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

/**
 * A run is identified by a RUN ID chosen once, before anything is submitted.
 *
 * It used to be derived from the batch ids -- `Object.values(submitted).sort()` --
 * which changes as `submitted` grows. Reserving after each model therefore wrote one
 * entry under `H` and a second under `H+S`, so the first was orphaned under a key
 * nothing would ever reconcile: the total read $3.60 for a $2.70 run, and
 * `unreconciled` reported a phantom pending run FOREVER, which the runner's
 * refuse-if-pending guard would then use to block every future run. Measured before
 * fixing.
 */
export const runKey = (runId) => runId;

export function readLedger() {
  // ABSENCE is the only state that means "nothing spent". Every other unreadable
  // shape throws, because reading a damaged ledger as empty re-authorises the whole
  // cap -- and that is the single failure here with a real cost.
  //
  // The first version only caught a JSON parse error, so `{}` and `{"runs": []}`
  // both fell through its `d.runs ? d : { runs: {} }` to an empty ledger. An array
  // is the sharper case: it is truthy, so it passed, and string-keyed reservations
  // written onto it do not serialise as entries -- spend would vanish silently.
  if (!existsSync(PATH)) return { runs: {} };
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(PATH, "utf8"));
  } catch (e) {
    throw new Error(`${PATH} exists but is not valid JSON; refusing to treat it as zero spend: ${e.message}`);
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${PATH} is not an object; refusing to treat it as zero spend`);
  }
  const { runs } = parsed;
  if (runs === null || typeof runs !== "object" || Array.isArray(runs)) {
    throw new Error(`${PATH} has no plain \`runs\` object; refusing to treat it as zero spend`);
  }
  for (const [key, r] of Object.entries(runs)) {
    if (r === null || typeof r !== "object" || Array.isArray(r)) {
      throw new Error(`${PATH}: run "${key}" is not an object`);
    }
    for (const f of ["reservedUsd", "measuredUsd"]) {
      if (r[f] !== undefined && typeof r[f] !== "number") {
        throw new Error(`${PATH}: run "${key}" has a non-numeric ${f}`);
      }
    }
  }
  return parsed;
}

/** Measured where we have it, otherwise the reservation. */
export const ledgerTotal = (led) =>
  Object.values(led.runs).reduce((a, r) => a + (r.measuredUsd ?? r.reservedUsd ?? 0), 0);

/**
 * Any run that committed money and has never been reconciled -- including a bare
 * INTENT, which is the case that matters: an intent with no batch id means a
 * submission may exist that nothing can collect.
 */
export const unreconciled = (led) =>
  Object.entries(led.runs).filter(([, r]) => r.measuredUsd === undefined);

/**
 * Records that a submission is ABOUT TO BE MADE, before the API call.
 *
 * There is a window between `batches.create` returning and its id reaching disk: a
 * process exit in there loses the id while the provider may still bill and process
 * the batch. Nothing can make that window zero, so the intent is written FIRST and
 * the id is filled in after. A later run then finds an intent with no id and knows
 * to go looking -- `client.messages.batches.list()` will show it -- rather than
 * assuming nothing was submitted and paying for it twice.
 *
 * KNOWN GAP, declined on scope for this PR and carried into the full run's plan
 * (#1031, Task 2): an intent left behind by a crash between `create` and
 * `clearIntent` is never removed, because `writeMeasured` marks the RUN entry and
 * knows nothing about intents. `unreconciled()` therefore reports it for ever, and
 * the runner's refuse-while-pending guard would then block every later run. Harmless
 * for this sample -- the cap already refuses another run of it -- but the full-run
 * script must reconcile intents, not only reservations. An earlier version of this
 * comment claimed a later collection reconciles the submission; it does not.
 */
export function writeIntent(model, reservedUsd) {
  const led = readLedger();
  const key = `intent:${model}:${reservedUsd.toFixed(4)}`;
  led.runs[key] = { intent: true, model, reservedUsd: +reservedUsd.toFixed(4), at: new Date().toISOString() };
  writeFileSync(PATH, JSON.stringify(led, null, 1));
  return key;
}

/** Drops an intent once its real submission has been recorded. */
export function clearIntent(key) {
  const led = readLedger();
  delete led.runs[key];
  writeFileSync(PATH, JSON.stringify(led, null, 1));
}

/**
 * Reserves a run's WORST CASE under its run id, before any submission.
 *
 * Up front and once, rather than incrementally per model: over-reserving until
 * reconciliation is the fail-safe direction, and it removes the growing-key problem
 * entirely. `submitted` is then filled in as ids arrive, on the same entry.
 */
export function writeReservation(runId, reservedUsd, submitted = {}) {
  const led = readLedger();
  led.runs[runKey(runId)] = {
    ...led.runs[runKey(runId)],
    submitted, reservedUsd: +reservedUsd.toFixed(4), at: new Date().toISOString(),
  };
  writeFileSync(PATH, JSON.stringify(led, null, 1));
  return ledgerTotal(led);
}

export function writeMeasured(runId, measuredUsd) {
  const led = readLedger();
  const key = runKey(runId);
  led.runs[key] = { ...(led.runs[key] ?? {}), measuredUsd: +measuredUsd.toFixed(4) };
  writeFileSync(PATH, JSON.stringify(led, null, 1));
  return ledgerTotal(led);
}
