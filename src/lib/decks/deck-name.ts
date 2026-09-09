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

/** Exported so the rename field can say which rule a name broke before it is
    sent. A field carrying its own copy of either value drifts from this one and
    turns a nameable mistake into the generic failure message. */
export const DECK_NAME_MAX = 120;

export const hasControlChars = (name: string) => CONTROL_CHARS.test(name);

export function validateDeckName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0 || trimmed.length > DECK_NAME_MAX || hasControlChars(trimmed)) {
    throw new Error("deck name must be 1–120 characters without control characters");
  }
  return trimmed;
}
