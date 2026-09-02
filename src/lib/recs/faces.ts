/**
 * Scryfall joins the faces of a double-faced card into single fields, but it does
 * not use one separator for all of them: names and type lines join with " // ",
 * while transform.ts joins oracle text with "\n//\n". Two helpers, not one —
 * a single `frontFace` invites splitting oracle text on the type-line separator,
 * which silently returns the whole joined string and lets a back face's abilities
 * read as the front's. That is the bug class #79 was.
 */
const TYPE_LINE_SEPARATOR = " // ";
const ORACLE_SEPARATOR = "\n//\n";

export const frontFaceTypeLine = (s: string): string => s.split(TYPE_LINE_SEPARATOR)[0];
export const frontFaceName = (s: string): string => s.split(TYPE_LINE_SEPARATOR)[0];
export const frontFaceOracle = (s: string | null): string =>
  (s ?? "").split(ORACLE_SEPARATOR)[0];
