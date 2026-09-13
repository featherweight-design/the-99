// Reading a Postgres SQLSTATE off an error, wherever the driver put it.
//
// THE CODE IS NOT ALWAYS ON THE ERROR YOU CATCH. Drizzle wraps a driver error,
// so `error.code` is often undefined while `error.cause.code` is the `23505` the
// caller needs — and a bare `error.code` check therefore reads every unique
// violation as an unexpected failure. The folders probe caught exactly that: a
// duplicate insert rethrew instead of being classified.
//
// The message is never matched. It is localised, and it changes between server
// versions; the SQLSTATE is the contract.

/** One error's own code, or the first code in its `cause` chain. */
export function sqlstate(error: unknown): string | null {
  let current: unknown = error;
  // Bounded rather than `while (current)`: a cause cycle would otherwise spin.
  for (let depth = 0; depth < 5 && typeof current === "object" && current !== null; depth += 1) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === "string") return code;
    current = (current as { cause?: unknown }).cause;
  }
  return null;
}

/** 23505 — a unique index refused the write. */
export const isUniqueViolation = (error: unknown) => sqlstate(error) === "23505";

/** 23503 — a foreign key refused it, which on a delete-then-write race means
 *  the referenced row is gone. */
export const isForeignKeyViolation = (error: unknown) => sqlstate(error) === "23503";
