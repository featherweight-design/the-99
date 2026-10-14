/**
 * "Start with this precon" (Hugh, 2026-10-14): the deck a precon starts is the box as printed, and a
 * finished deck. Its list is the edition's own rows, every card (commanders included) is pinned to the
 * edition's printing in `deck_printings`, and it is committed as v1 in the same transaction as the deck,
 * so there is no draft to commit and no moment the deck exists without its list or its printings.
 *
 * A pin names a printing; the reads honor it only while the player holds that printing
 * (`deck_printings`'s own rule), so a player who did not add the box sees their own copies until they
 * hold the box's. Its tokens are pinned the same way, to the box's token printings (`deck_token_printings`).
 * Not a "use server" module: it takes a user id.
 */
import { eq, inArray } from "drizzle-orm";
import { db } from "../../db";
import { cards, decks, preconCards, precons, preconTokens, printings, tokenPrintings } from "../../db/schema";
import { canPair, partnerAbility } from "../decks/partner";
import { commitVersion } from "../decks/versions";
import { writeImportedDeck } from "../decks/write-imported-deck";
import type { ImportPrintingPick } from "../decks/import-printings";
import { isCommanderCandidate } from "../recs/score";
import { deckMakesTokenIn, writeDeckTokenPrintingIn } from "../tokens/deck-printings";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type PreconLine = { oracleId: string; quantity: number; isCommander: boolean; setCode: string | null; collectorNumber: string | null };

/** One pin per card, at its first printing in the feed's order: the feed lists a basic once per art. */
export function preconPins(lines: readonly PreconLine[]): ImportPrintingPick[] {
  const pins = new Map<string, ImportPrintingPick>();
  for (const l of lines) {
    if (pins.has(l.oracleId) || !l.setCode || !l.collectorNumber) continue;
    pins.set(l.oracleId, { oracleId: l.oracleId, setCode: l.setCode.toLowerCase(), collectorNumber: l.collectorNumber });
  }
  return [...pins.values()];
}

/** A precon's deck, read and checked, ready to write: everything but the reader's name for it. */
export type PreparedPreconDeck = {
  commanderOracleId: string;
  partnerOracleId: string | null;
  /** The list, the commanders taken out, one row per card. */
  cards: { oracleId: string; quantity: number }[];
  printings: ImportPrintingPick[];
  /** The plain edition, which the deck records as the precon it was built from. */
  builtFromPrecon: string;
  /** One printing per token the box holds, at its first by id: the deck shows the box's own token. */
  tokens: { tokenOracleId: string; tokenPrintingId: string }[];
};

/** One printing per token, the first by id, so no answer depends on a read's row order. */
export function preconTokenPins(rows: readonly { tokenOracleId: string; tokenPrintingId: string }[]): PreparedPreconDeck["tokens"] {
  const pins = new Map<string, string>();
  for (const r of rows) {
    const had = pins.get(r.tokenOracleId);
    if (had === undefined || r.tokenPrintingId < had) pins.set(r.tokenOracleId, r.tokenPrintingId);
  }
  return [...pins].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([tokenOracleId, tokenPrintingId]) => ({ tokenOracleId, tokenPrintingId }));
}

/**
 * Reads and checks the deck `fileName` starts. `fileName` is the edition the reader chose: a Collector's
 * Edition twin starts its own printings, and the deck records the plain edition as the precon it was built
 * from (the two are one list, design call 4).
 */
export async function preparePreconDeck(fileName: string): Promise<PreparedPreconDeck> {
  // One snapshot: the ingest replaces precons, their cards and the catalog rows in one transaction, so
  // separate reads could pair a head from one generation with a list from the next.
  return db.transaction((tx) => preparePreconDeckIn(tx, fileName), { isolationLevel: "repeatable read" });
}

/** The deck to write, read through `db`: a caller composing it with another read passes its own snapshot. */
export async function preparePreconDeckIn(db: Tx, fileName: string): Promise<PreparedPreconDeck> {
  const [head] = await db.select({ fileName: precons.fileName, twinOf: precons.twinOf }).from(precons).where(eq(precons.fileName, fileName));
  if (!head) throw new Error("precon not found");

  const lines: PreconLine[] = await db
    .select({
      oracleId: preconCards.oracleId,
      quantity: preconCards.quantity,
      isCommander: preconCards.isCommander,
      setCode: printings.setCode,
      collectorNumber: printings.collectorNumber,
    })
    .from(preconCards)
    .leftJoin(printings, eq(printings.scryfallId, preconCards.scryfallId))
    .where(eq(preconCards.fileName, head.fileName))
    // The feed's order, as the open precon reads it, so a pair's lead is the one its page names first.
    .orderBy(preconCards.position);
  const commanderIds = [...new Set(lines.filter((l) => l.isCommander).map((l) => l.oracleId))];
  if (commanderIds.length < 1 || commanderIds.length > 2) throw new Error("precon has no single commander or pair");

  // The same checks `createDeck` makes: the feed is trusted for its list, not for the app's rules.
  const leads = await db.select().from(cards).where(inArray(cards.oracleId, commanderIds));
  for (const id of commanderIds) {
    const c = leads.find((x) => x.oracleId === id);
    if (!c || !c.commanderLegal || !isCommanderCandidate(c)) throw new Error("card is not a legal commander");
  }
  const [a, b] = commanderIds.map((id) => leads.find((x) => x.oracleId === id)!);
  if (b && !canPair(
    { name: a.name, ability: partnerAbility(a.oracleText, a.typeLine) },
    { name: b.name, ability: partnerAbility(b.oracleText, b.typeLine) },
  )) {
    throw new Error("commanders cannot be paired");
  }

  // One row per card: the feed can list one card under two printings.
  const body = new Map<string, number>();
  for (const l of lines) {
    if (l.isCommander) continue;
    body.set(l.oracleId, (body.get(l.oracleId) ?? 0) + l.quantity);
  }
  const tokenRows = await db
    .select({ tokenOracleId: tokenPrintings.tokenOracleId, tokenPrintingId: preconTokens.tokenPrintingId })
    .from(preconTokens)
    .innerJoin(tokenPrintings, eq(tokenPrintings.scryfallId, preconTokens.tokenPrintingId))
    .where(eq(preconTokens.fileName, head.fileName));
  return {
    commanderOracleId: a.oracleId,
    partnerOracleId: b?.oracleId ?? null,
    cards: [...body].map(([oracleId, quantity]) => ({ oracleId, quantity })),
    printings: preconPins(lines),
    builtFromPrecon: head.twinOf ?? head.fileName,
    tokens: preconTokenPins(tokenRows),
  };
}

/**
 * Writes the prepared deck inside `tx` and commits it as v1 there: no snapshot (the deck has declared no
 * bracket to carry). `addEntryId` links the deck to the collection add a start with "I own this precon"
 * made in the same transaction (`startPreconOwned`). Returns the deck's id.
 */
export async function writePreconDeckIn(
  tx: Tx,
  userId: string,
  name: string,
  deck: PreparedPreconDeck,
  env: NodeJS.ProcessEnv,
  addEntryId?: string,
): Promise<string> {
  const deckId = await writeImportedDeck(tx, {
    userId,
    name,
    commanderOracleId: deck.commanderOracleId,
    partnerOracleId: deck.partnerOracleId,
    cards: deck.cards,
    printings: deck.printings,
    builtFromPrecon: deck.builtFromPrecon,
  });
  if (addEntryId) await tx.update(decks).set({ preconAddEntryId: addEntryId }).where(eq(decks.id, deckId));
  await commitVersion(deckId, null, tx, undefined, env);
  // Each token the deck makes shows the box's own printing, through the ONE writer, which takes it only
  // while the player holds that printing, from any source: a start with the box holds it (the add's
  // `syncPreconTokens` ran earlier in this transaction); a plain start holds it only from an earlier add or
  // an upload, and is otherwise refused and left to the deck's default, as a card's pin is honored only while
  // held.
  for (const t of deck.tokens) {
    if (!(await deckMakesTokenIn(tx, deckId, userId, t.tokenOracleId))) continue;
    await writeDeckTokenPrintingIn(tx, { deckId, userId, tokenOracleId: t.tokenOracleId, tokenPrintingId: t.tokenPrintingId });
  }
  return deckId;
}

/** Writes and commits the deck `fileName` starts, for `userId`, and returns its id. */
export async function startPreconDeck(userId: string, fileName: string, name: string, env: NodeJS.ProcessEnv): Promise<string> {
  const deck = await preparePreconDeck(fileName);
  return db.transaction((tx) => writePreconDeckIn(tx, userId, name, deck, env));
}
