// Shim (flags rename, PR 5): the module moved to `src/lib/flags/snapshot.ts`. Callers move in PRs 6a-6g; the final rename PR deletes this file.
export * from "../flags/snapshot";
export { resolveFlags as resolveSwitchEnv, resolveFlagsStrict as resolveSwitchEnvStrict } from "../flags/snapshot";
