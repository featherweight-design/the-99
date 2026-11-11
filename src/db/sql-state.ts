/** The SQLSTATE a database error carries, on the error or its `cause` (Drizzle wraps the driver's), or null. */
export function sqlState(error: unknown): string | null {
  const e = error as { cause?: { code?: unknown }; code?: unknown } | null;
  const code = e?.cause?.code ?? e?.code;
  return typeof code === "string" && /^[0-9A-Z]{5}$/.test(code) ? code : null;
}
