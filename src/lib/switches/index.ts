// Shim (flags rename, PR 5): `src/lib/switches/` moved to `src/lib/flags/`. Each old module path keeps a re-export file
// beside this one, under the old names, so callers keep compiling until PRs 6a-6g move them; the final rename PR deletes
// the directory.
export * from "./explain";
export * from "./flags";
export * from "./pending-drop";
export * from "./registry";
export * from "./request";
export * from "./resolve";
export * from "./seed";
export * from "./snapshot";
export * from "./write-lock";
