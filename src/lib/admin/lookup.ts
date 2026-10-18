import { findAccountIdByEmail, type IdentityDeps } from "./accounts";

// The exact-email lookup (Admin R3, D10 to D12). It answers an account id or nothing: a hit reveals nothing beyond
// the address the admin typed, so it writes no `admin_events` row (D11). A near address, a malformed one, or two
// accounts holding one all answer a miss; only a Clerk failure answers `failed`.

export type LookUpResult = { kind: "hit"; id: string } | { kind: "miss" } | { kind: "failed" };

/** Trimmed and case-folded, with exactly one `@` and text on both sides; else null. */
export function normalizeEmail(raw: string): string | null {
  const email = raw.trim().toLocaleLowerCase("en-US");
  const at = email.indexOf("@");
  if (at <= 0 || at === email.length - 1 || email.indexOf("@", at + 1) !== -1) return null;
  return email;
}

export async function lookUpAccountIn(raw: unknown, deps?: IdentityDeps): Promise<LookUpResult> {
  const email = typeof raw === "string" ? normalizeEmail(raw) : null;
  if (!email) return { kind: "miss" };
  try {
    const id = await findAccountIdByEmail(email, deps);
    return id ? { kind: "hit", id } : { kind: "miss" };
  } catch (error) {
    console.error("admin: the email lookup could not reach Clerk", error);
    return { kind: "failed" };
  }
}
