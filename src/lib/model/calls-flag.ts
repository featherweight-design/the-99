/**
 * Whether model calls may start at all: the app-wide kill switch for every model call (player and
 * system origin alike). A `plumbing` switch, so only the app-wide override applies.
 *
 * ON BY DEFAULT, unlike every other switch: on while the variable is unset, off only for `false` (an
 * app-wide Off override resolves to it) or the kill value `off`. A deployment that never sets it keeps
 * serving model calls. The registry marks it `defaultOn`, so the proxy's switch bits read it the same way.
 *
 * Off, `reserveModelCall` refuses every new run as `paused` before it writes a row or charges a credit,
 * and `readAllowance` reports `paused` so a panel shows the stop before a press. A run already in
 * flight settles or refunds as it would have.
 */
export function modelCallsEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.MODEL_CALLS_ENABLED !== "false" && env.MODEL_CALLS_ENABLED !== "off";
}
