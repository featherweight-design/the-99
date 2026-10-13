// The one way scripts under `scripts/` reach the repository's `.env`.
//
// Importing this module loads the file; the side effect is the point, because
// `src/db/index.ts` reads `DATABASE_URL` at module scope and an ES import is
// evaluated before any function this module could export gets called. Scripts
// that only need the values loaded can therefore `import "./lib/env.mjs";` on
// its own line, above the imports that depend on it.
//
// Two things this replaces, and why neither worked:
//
//   `node --env-file=.env script.mjs` — Node gives an already-set variable
//   precedence over the file. That is not hypothetical here: a shell profile on
//   the machine this was written on exported another project's
//   `E2E_AUDIT_USER_EMAIL`, so every probe signed in as the wrong account and
//   failed inside Clerk with "Couldn't find your account" — which reads as a
//   Clerk problem rather than as the wrong identity.
//
//   `import "dotenv/config"` — same precedence, and it reads `${cwd}/.env`. All
//   work here happens in worktrees, so any invocation from outside the worktree
//   root loads nothing at all and every variable reads as unconfigured.
//
// Hence `override`: the file is the answer, and an inherited value is not. The
// cost is that a variable `.env` sets cannot be overridden on the command line.
// The ones that are overridden that way in practice — PROBE_BASE, PROBE_DECK,
// PROBE_USER_EMAIL, AVAIL_FORCE, RESUME_SINCE — are absent from `.env` and so
// keep working.
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { redactSecrets } from "./redact-env.mjs";

/** The repository `.env`, resolved from this module rather than the cwd. */
export const ENV_PATH = new URL("../../.env", import.meta.url);

const loaded = config({ path: ENV_PATH, override: true, quiet: true });
// Under Vitest the file above just put `.env`'s secrets back after the setup took them out.
if (process.env.VITEST) redactSecrets(process.env);

/**
 * Assert the named variables are set, and return them.
 *
 * @param {readonly string[]} names
 * @returns {Record<string, string>}
 */
export function requireEnv(names) {
  const missing = names.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    // Every missing name at once. One at a time costs a browser launch per
    // variable to discover what the next one is.
    // A missing file and an unreadable one call for different responses, and
    // reporting both as "no .env" sends the reader off to copy a file that is
    // already there. `fileURLToPath` rather than `pathname`, which is
    // percent-encoded and, on Windows, not a native path.
    const path = fileURLToPath(ENV_PATH);
    let cause;
    if (loaded.error?.code === "ENOENT") {
      cause = `no .env at ${path} — copy it from the repository root into this worktree`;
    } else if (loaded.error) {
      cause = `.env at ${path} could not be read: ${loaded.error.message}`;
    } else {
      cause = `.env is present but does not set ${missing.length === 1 ? "it" : "them"}`;
    }
    throw new Error(`Missing ${missing.join(", ")}: ${cause}.`);
  }
  return Object.fromEntries(names.map((name) => [name, process.env[name]]));
}
