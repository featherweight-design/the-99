/**
 * A stand-in for a reader's resolved switches in a test that stubs `requestSwitchEnv` or
 * `resolveSwitchEnv`. Every read goes through to `process.env`, so `vi.stubEnv` still reaches it,
 * and it enumerates nothing, so a failing assertion's diff prints `{}` and never the environment
 * (which holds secrets). One object, so a test can still check that the env it stubbed is the one
 * handed on, by identity.
 *
 * A caller that SPREADS it (`{ ...env }`) gets `{}`; a test whose code under test spreads the env
 * must stub a small sentinel env instead.
 */
export const ENV_VIEW: NodeJS.ProcessEnv = envViewWith({});

/**
 * The same view with `over` laid on top: what `{ ...process.env, ...over }` reads, without copying the
 * environment into a value an assertion could print. A new object per call.
 */
export function envViewWith(over: Readonly<Record<string, string>>): NodeJS.ProcessEnv {
  const own = (key: string) => Object.prototype.hasOwnProperty.call(over, key);
  return new Proxy({} as NodeJS.ProcessEnv, {
    get: (_target, key) => (typeof key !== "string" ? undefined : own(key) ? over[key] : process.env[key]),
    has: (_target, key) => typeof key === "string" && (own(key) || key in process.env),
    ownKeys: () => [],
    getOwnPropertyDescriptor: () => undefined,
  });
}
