/**
 * Deck names feed export headers and download filenames, so a control character
 * in one can corrupt a file the player opens elsewhere.
 *
 * One definition, shared by createDeck and importDeck: an import that accepted a
 * name the manual path rejects would be a hole in the same guard.
 */
// C0, DEL, and the C1 range. DEL and C1 corrupt a filename or a header exactly
// as C0 does, so all three belong in one guard rather than only the first.
const CONTROL_CHARS = /[\u0000-\u001F\u007F-\u009F]/;

export function validateDeckName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0 || trimmed.length > 120 || CONTROL_CHARS.test(trimmed)) {
    throw new Error("deck name must be 1–120 characters without control characters");
  }
  return trimmed;
}
