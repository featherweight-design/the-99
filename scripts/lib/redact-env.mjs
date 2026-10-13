// Tests run with whatever environment the shell that started them carries, and a developer's
// shell carries live keys. Any assertion that compares an object built from `process.env` prints
// that whole object when it fails, so one red test can put every secret in a terminal, a CI log or
// a transcript. `vitest.setup.ts` runs this before any test file loads: a variable whose NAME says
// it holds a credential, or whose VALUE is a URL carrying a password, is replaced. Nothing a unit
// test does needs a real credential; a test that needs one of these names sets its own value.

export const REDACTED = "redacted-for-tests";

const SECRET_NAME = /SECRET|TOKEN|PASSWORD|PASSWD|PRIVATE|CREDENTIAL|API_KEY|_KEY(_|$)|AUTH|DATABASE_URL|_DIRECT(_|$)|DSN/i;
const CREDENTIAL_URL = /^[a-z][a-z0-9+.-]*:\/\/[^/\s:@]+:[^/\s@]+@/i;

/** Whether `name=value` may carry a credential. */
export function looksSecret(name, value) {
  return SECRET_NAME.test(name) || (typeof value === "string" && CREDENTIAL_URL.test(value));
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
  return names;
}
