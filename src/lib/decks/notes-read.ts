/**
 * The deck page's read of a deck's notes. NOT cached: it runs in the page's own loader, outside the two
 * `cacheForUser` reads (`loadDeckSuggestions`, `readSynergyCards`), so a notes write has nothing cached
 * to retire beyond the route `deckSurfaces` already revalidates.
 *
 * A tag draws the card's CURRENT catalog name and falls back to the name stored with it when the card can
 * no longer be found (`resolved: false`, drawn as plain text). `held` is whether the deck holds the card
 * now, as a card or as a commander; "not held" covers both never held and since removed, which draw the
 * same (READINESS G2: nothing records history per tag).
 */
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "../../db";
import { cards, deckCards, deckNotes } from "../../db/schema";
import { parseBody, tagIds } from "./notes-body";

export type NoteDrawn =
  | { kind: "text"; text: string }
  | { kind: "tag"; oracleId: string; name: string; held: boolean; resolved: boolean };

export type NoteView = {
  id: string;
  /** The stored body, for the edit field. */
  body: string;
  drawn: NoteDrawn[];
  createdAt: string;
  doneAt: string | null;
};

export type DeckNotesView = { open: NoteView[]; done: NoteView[] };

export const EMPTY_NOTES: DeckNotesView = { open: [], done: [] };

/** The notes query, as a builder, so a test can read the SQL it emits: owner and deck both in the where. */
export function notesQuery(deckId: string, userId: string) {
  return db
    .select()
    .from(deckNotes)
    .where(and(eq(deckNotes.deckId, deckId), eq(deckNotes.userId, userId)))
    .orderBy(desc(deckNotes.createdAt), asc(deckNotes.id));
}

export async function readDeckNotes(
  deckId: string,
  userId: string,
  deck: { commanderOracleId: string; partnerOracleId: string | null },
): Promise<DeckNotesView> {
  const rows = await notesQuery(deckId, userId);
  if (rows.length === 0) return EMPTY_NOTES;
  const ids = [...new Set(rows.flatMap((r) => tagIds(r.body)))];
  const [names, inDeck] = ids.length === 0
    ? [[], []]
    : await Promise.all([
        db.select({ id: cards.oracleId, name: cards.name }).from(cards).where(inArray(cards.oracleId, ids)),
        db.select({ id: deckCards.oracleId }).from(deckCards).where(and(eq(deckCards.deckId, deckId), inArray(deckCards.oracleId, ids))),
      ]);
  const nameOf = new Map(names.map((n) => [n.id, n.name]));
  const held = new Set([...inDeck.map((d) => d.id), deck.commanderOracleId, ...(deck.partnerOracleId ? [deck.partnerOracleId] : [])]);

  const view = (r: (typeof rows)[number]): NoteView => ({
    id: r.id,
    body: r.body,
    drawn: parseBody(r.body).map((s): NoteDrawn =>
      s.kind === "text"
        ? s
        : { kind: "tag", oracleId: s.oracleId, name: nameOf.get(s.oracleId) ?? s.name, held: held.has(s.oracleId), resolved: nameOf.has(s.oracleId) }),
    createdAt: r.createdAt.toISOString(),
    doneAt: r.doneAt?.toISOString() ?? null,
  });
  return {
    // Open: newest first. Done: the one done most recently first.
    open: rows.filter((r) => r.doneAt === null).map(view),
    done: rows.filter((r) => r.doneAt !== null).sort((a, b) => b.doneAt!.getTime() - a.doneAt!.getTime()).map(view),
  };
}
