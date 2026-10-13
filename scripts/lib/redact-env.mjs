// Tests run with whatever environment the shell that started them carries, and a developer's
// shell carries live keys. Any assertion that compares an object built from `process.env` prints
// that whole object when it fails, so one red test can put every secret in a terminal, a CI log or
// a transcript. `vitest.setup.ts` runs this before any test file loads: a variable whose NAME says
// it holds a credential, or whose VALUE is a URL carrying a password, is replaced. Nothing a unit
// test does needs a real credential; a test that needs one of these names sets its own value.
// `env.mjs` loads `.env` when a test file imports it, after the setup has run, so it calls this
// again under Vitest.

export const REDACTED = "redacted-for-tests";

// Whole `_`-separated words, never substrings: `LABEL_MAX_TOKENS` is a token COUNT, not a token.
const SECRET_WORD = /(^|_)(SECRET|TOKEN|PASSWORD|PASSWD|PRIVATE|CREDENTIALS?|KEY|AUTH|DIRECT|DSN)(_|$)/i;
const SECRET_NAMES = new Set(["DATABASE_URL"]);
// A password in a URL, with or without a username (`redis://:hunter2@host`).
const CREDENTIAL_URL = /^[a-z][a-z0-9+.-]*:\/\/[^/\s:@]*:[^/\s@]+@/i;

/** Whether `name=value` may carry a credential. */
export function looksSecret(name, value) {
  return SECRET_WORD.test(name) || SECRET_NAMES.has(name) || (typeof value === "string" && CREDENTIAL_URL.test(value));
}

/** Replaces every variable that may carry a credential, in place; returns the names replaced. */
export function redactSecrets(env) {
  const names = [];
  for (const [name, value] of Object.entries(env)) {
    if (value && value !== REDACTED && looksSecret(name, value)) {
      env[name] = REDACTED;
      names.push(name);
    }
  }
  globalThis.__envRedacted = true;
  return names;
}
