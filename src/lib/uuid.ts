const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Whether a string is shaped like the uuids this schema keys on. Worth checking
    before a value from a request reaches a query: Postgres rejects a malformed
    uuid with an error of its own, which reaches the reader as a 500 rather than
    as the refusal the action meant to give. */
export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}
