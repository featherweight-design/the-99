// The live card count under a deck paste box ("113 cards"). Kept out of `import.ts`, which pulls the
// matcher and the commander rules into whatever imports it, because the two paste boxes that show
// this count are client components.

import { looksLikeCsv, parseCollectionCsv } from "../manabox/parse";
import { parsePasteList } from "../manabox/paste";
import { sectionHeaderOf, type SectionKind } from "../manabox/section-headers";

/**
 * The copies a pasted deck list holds, read the way `buildDeckImport` will read it: a section
 * header (`Commander`, `Deck`, `Creatures (30)`) is not a card, and nothing under a `Sideboard`
 * or `Maybeboard` header is imported, so none of it is counted. A CSV counts its rows' quantities,
 * and a CSV the import would refuse counts nothing.
 */
export function deckPasteCardCount(text: string): number {
  if (!text.trim()) return 0;
  if (looksLikeCsv(text)) {
    const { rows, errors } = parseCollectionCsv(text);
    return errors.length > 0 ? 0 : rows.reduce((n, r) => n + r.quantity, 0);
  }
  let excluded: SectionKind = null;
  const kept: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const header = sectionHeaderOf(line.trim());
    if (header) {
      excluded = header.section;
      continue;
    }
    if (!excluded) kept.push(line);
  }
  return parsePasteList(kept.join("\n")).rows.reduce((n, r) => n + r.quantity, 0);
}
