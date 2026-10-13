/**
 * Which Stripe mode a key belongs to, and whether this deployment may use it (payments scope §5.2).
 * Pure. A LIVE key is allowed only where `ADMIN_ENV_LABEL` says `production`, and a TEST key only
 * where it does not, so staging, every Preview and a local server run in test mode and production
 * never does. `VERCEL_ENV` cannot tell the two Vercel projects apart (both read `production`), which is
 * why the label decides, as it does for the admin. Anything unrecognised is refused: fail closed.
 */
export type KeyMode = "live" | "test";

export function keyMode(key: string | undefined): KeyMode | null {
  const k = key?.trim() ?? "";
  if (/^(?:sk|rk)_live_\w+$/.test(k)) return "live";
  if (/^(?:sk|rk)_test_\w+$/.test(k)) return "test";
  return null;
}

/** Whether `key` may be used where the environment label is `label`. */
export function keyAllowed(key: string | undefined, label: string | undefined): boolean {
  const mode = keyMode(key);
  if (!mode) return false;
  return label?.trim() === "production" ? mode === "live" : mode === "test";
}
