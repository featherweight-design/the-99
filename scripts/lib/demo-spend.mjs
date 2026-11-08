// The landing demo's spend gate and its output redaction, apart from the browser and the database so a unit test can
// drive them with fakes (`demo-spend.test.mts`). `scripts/demo-generate.mjs` presses every model tool through
// `gatedPress`, and prints nothing from a child or an error without `redact`.

/**
 * One press under a hard cap, in the ledger's own shape (pending written BEFORE the press, a settling entry after):
 *  1. refuse, writing nothing, when `spent + worstUsd` would cross `capUsd`;
 *  2. write the pending entry at the worst case;
 *  3. run `press`;
 *  4. settle, whether the press returned or threw, at `settledUsd(ok, result)` (every row the press made, at its
 *     recorded cost), and at the worst case when that is unreadable (it throws, or answers null or a non-number).
 * A thrown press is rethrown carrying `settledUsd`, so the caller can record what the failure cost.
 *
 * @param {{
 *   ledger: { spent: () => number, record: (entry: object) => void },
 *   capUsd: number, worstUsd: number, id: string, feature: string,
 *   press: () => Promise<any>,
 *   settledUsd: (ok: boolean, result: any) => Promise<number | null> | number | null,
 *   now?: () => Date,
 * }} gate
 * @returns {Promise<{ result: any, usd: number }>}
 */
export async function gatedPress({ ledger, capUsd, worstUsd, id, feature, press, settledUsd, now = () => new Date() }) {
  const before = ledger.spent();
  if (before + worstUsd > capUsd) {
    throw new Error(`STOP before ${id}: worst case $${worstUsd.toFixed(3)} would cross the $${capUsd} cap (spent $${before.toFixed(3)})`);
  }
  const pending = `${now().getTime()}-${id}`;
  ledger.record({ at: now().toISOString(), runId: pending, source: "pending", usd: worstUsd, requests: 1, pending, note: `${id} ${feature}` });
  let ok = false;
  let result;
  let failure = null;
  try {
    result = await press();
    ok = true;
  } catch (error) {
    failure = error ?? new Error("the press failed");
  }
  let usd = worstUsd;
  try {
    const read = await settledUsd(ok, result);
    if (typeof read === "number" && Number.isFinite(read) && read >= 0) usd = read;
  } catch {
    // Unreadable: the worst case stands, never nothing.
  }
  ledger.record({ at: now().toISOString(), runId: `landing-demo-${id}`, source: "realtime:1", usd, requests: 1, settles: pending, note: `${id} ${feature}${ok ? "" : " failed"}` });
  if (failure) {
    const error = failure instanceof Error ? failure : new Error(String(failure));
    error.settledUsd = usd;
    throw error;
  }
  return { result, usd };
}

/**
 * Text safe to print: each of `secrets` (the connection string, its password and host), any `postgres(ql)://...` URL
 * and any Neon host name are replaced. A child's stderr and a driver's error can both carry the connection string.
 *
 * @param {unknown} text
 * @param {readonly (string | undefined | null)[]} [secrets]
 */
export function redact(text, secrets = []) {
  let out = String(text);
  for (const s of secrets) if (s && s.length >= 4) out = out.split(s).join("[redacted]");
  return out
    .replace(/postgres(?:ql)?:\/\/[^\s'"`)]+/gi, "postgres://[redacted]")
    .replace(/\b[\w-]+(?:\.[\w-]+)*\.neon\.tech\b/gi, "[db host]");
}

/** The parts of a connection string worth redacting on their own: the string, its password, its host (pooled or not). */
export function secretsOf(url) {
  const out = [url];
  try {
    const u = new URL(url);
    out.push(decodeURIComponent(u.password), u.hostname, u.hostname.replace("-pooler", ""));
  } catch {
    // Not a URL: the string itself is all there is to redact.
  }
  return out.filter(Boolean);
}
