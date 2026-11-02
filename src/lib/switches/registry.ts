// Shim (flags rename, PR 5): the module moved to `src/lib/flags/registry.ts`. Callers move in PRs 6a-6g; the final rename PR deletes this file.
export * from "../flags/registry";
export { FLAGS as SWITCHES } from "../flags/registry";
