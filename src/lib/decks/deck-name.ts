/**
 * Deck names feed export headers and download filenames, so a control character
 * in one can corrupt a file the player opens elsewhere.
 *
 * One definition, shared by createDeck and importDeck: an import that accepted a
 * name the manual path rejects would be a hole in the same guard.
 */
export function validateDeckName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0 || trimmed.length > 120 || /[\u0000-\u001F]/.test(trimmed)) {
    throw new Error("deck name must be 1–120 characters without control characters");
  }
  return trimmed;
}
