/**
 * The friend code's shape (friend links R1, G1): six characters from an alphabet with no lookalikes (no 0, O, 1, I
 * or L), read without case. Pure and client-safe: the code box and the server both read a typed code through
 * `normalizeFriendCode`, so what the box accepts and what the server looks up cannot disagree.
 */

/** 23 letters and 8 digits: 31 symbols, about 8.9 × 10⁸ codes of six. */
export const FRIEND_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const FRIEND_CODE_LENGTH = 6;

const SHAPE = new RegExp(`^[${FRIEND_CODE_ALPHABET}]{${FRIEND_CODE_LENGTH}}$`);

/**
 * A typed code in its one stored form (upper case, spaces and hyphens dropped), or null when it cannot be a code.
 * A lookalike is not mapped: no code holds 0, O, 1, I or L, so one typed is simply a code that names nobody.
 */
export function normalizeFriendCode(raw: unknown): string | null {
  if (typeof raw !== "string" || raw.length > 32) return null;
  const code = raw.replace(/[\s-]/g, "").toUpperCase();
  return SHAPE.test(code) ? code : null;
}
