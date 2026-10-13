// (CI selection probe: a comment-only change, to be closed unmerged.)
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Whether a value is a string shaped like the uuids this schema keys on. Worth
    checking before a value from a request reaches a query: Postgres rejects a
    malformed uuid with an error of its own, which reaches the reader as a 500
    rather than as the refusal the action meant to give.

    `unknown` rather than `string`, and the `typeof` is the point: every caller is
    a Server Action argument, where the declared type is a compile-time claim and
    not a runtime one. `RegExp.test` coerces, so a posted `["<a real uuid>"]`
    passes a bare `test` and reaches the query as an array. */
export function isUuid(value: unknown): boolean {
  return typeof value === "string" && UUID_RE.test(value);
}
