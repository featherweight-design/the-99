/**
 * Whether model calls may start at all: the app-wide switch for every run the app reserves through
 * `reserveModelCall` (player runs and the Overview's system-origin rewrite). Background jobs (GitHub
 * workflows) read it from `/api/health` (`scripts/lib/model-calls-gate.mjs`). A `plumbing` switch, so only the
 * app-wide override applies.
 *
 * ON BY DEFAULT, unlike every other switch: on while the variable is unset, and this function reads
 * `false` and `off` as off. As for every switch, only the variable set to `off` is the hard stop no
 * override raises (the resolver's kill); `false` is a soft off an app-wide On row overrides, and an
 * app-wide Off row resolves to `false`. So: `off` for a hard stop, or the app-wide Off row without a
 * deploy. A deployment that never sets it keeps serving model calls. The registry marks it `defaultOn`,
 * so the proxy's switch bits read it the same way.
 *
 * Off, `reserveModelCall` refuses every new run as `paused` before it writes a row or charges a credit,
 * and it FAILS CLOSED: it reads the overrides fresh (`resolveSwitchEnvStrict`), and a read that fails
 * refuses as `paused` too, so a database failure never lets calls through under an app-wide Off row.
 * `readAllowance` reports `paused` so a panel shows the stop before a press; display only, it reads through
 * the 30-second memo and lets the environment decide when that read fails. A run already in
 * flight settles or refunds as it would have.
 */
export function modelCallsEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.MODEL_CALLS_ENABLED !== "false" && env.MODEL_CALLS_ENABLED !== "off";
}
