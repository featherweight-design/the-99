/**
 * The deck page's read of a deck's notes. NOT cached: it runs in the page's own loader, outside the two
 * `cacheForUser` reads (`loadDeckSuggestions`, `readSynergyCards`), so a notes write has nothing cached
 * to retire beyond the route `deckSurfaces` already revalidates.
 *
 * A tag draws the card's CURRENT catalog name and falls back to the name stored with it when the card can
 * no longer be found (`resolved: false`, drawn as plain text). `held` is whether the deck holds the card
 * now, as a card or as a commander; `imageUri` is the art the hover preview draws, down the same chain card
 * details uses (`chainArt`: the deck's pick, else the owned printing, else the catalog's); "not held" covers both never held and since removed, which draw the
 * same (READINESS G2: nothing records history per tag).
 */
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "../../db";
import { cards, deckCards, deckNotes } from "../../db/schema";
import { chainArt } from "../cards/chain-art";
import { parseBody, tagIds } from "./notes-body";

export type { DeckNotesView, NoteDrawn, NoteView, NotesResult } from "./notes-types";
import type { DeckNotesView, NoteDrawn, NoteView } from "./notes-types";

/** Read and found none. `readAt` is when the read BEGAN: see `readDeckNotes`. */
export const emptyNotes = (readAt = Date.now()): DeckNotesView => ({ open: [], done: [], readAt });

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
  /** The reader's resolved switches (`requestSwitchEnv`), for the tag art's deck printing picks. */
  env: NodeJS.ProcessEnv,
): Promise<DeckNotesView> {
  // Stamped before the first query, not after the last: a read that began before a write and finished after
  // it holds the old rows, and must not outrank the read the write's own action makes afterwards.
  const readAt = Date.now();
  const rows = await notesQuery(deckId, userId);
  if (rows.length === 0) return emptyNotes(readAt);
  const ids = [...new Set(rows.flatMap((r) => tagIds(r.body)))];
  const [names, inDeck, art] = ids.length === 0
    ? [[], [], new Map<string, string>()]
    : await Promise.all([
        db.select({ id: cards.oracleId, name: cards.name, imageUri: cards.imageUri }).from(cards).where(inArray(cards.oracleId, ids)),
        db.select({ id: deckCards.oracleId }).from(deckCards).where(and(eq(deckCards.deckId, deckId), inArray(deckCards.oracleId, ids))),
        chainArt(userId, deckId, ids, env),
      ]);
  const nameOf = new Map(names.map((n) => [n.id, n.name]));
  const catalogArt = new Map(names.map((n) => [n.id, n.imageUri]));
  const held = new Set([...inDeck.map((d) => d.id), deck.commanderOracleId, ...(deck.partnerOracleId ? [deck.partnerOracleId] : [])]);

  const view = (r: (typeof rows)[number]): NoteView => ({
    id: r.id,
    body: r.body,
    drawn: parseBody(r.body).map((s): NoteDrawn =>
      s.kind === "text"
        ? s
        : {
            kind: "tag", oracleId: s.oracleId, name: nameOf.get(s.oracleId) ?? s.name, held: held.has(s.oracleId), resolved: nameOf.has(s.oracleId),
            imageUri: art.get(s.oracleId) ?? catalogArt.get(s.oracleId) ?? null,
          }),
    createdAt: r.createdAt.toISOString(),
    doneAt: r.doneAt?.toISOString() ?? null,
  });
  return {
    // Open: newest first. Done: the one done most recently first.
    readAt,
    open: rows.filter((r) => r.doneAt === null).map(view),
    done: rows.filter((r) => r.doneAt !== null).sort((a, b) => b.doneAt!.getTime() - a.doneAt!.getTime()).map(view),
  };
}
