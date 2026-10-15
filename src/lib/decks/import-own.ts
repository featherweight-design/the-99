/**
 * The import's `I own these cards. Add them to my collection.` (no-collection entry plan, PR 1;
 * handoff R2, "Owning an imported deck's cards"): the list's cards go into the collection AND the
 * deck is made, in ONE transaction, in this order:
 *
 *   1. the add writes the copies (the ledger's own write, `applyCollectionChange`);
 *   2. inside it, the deck is written (`writeImportedDeck`), under an id minted before the write so
 *      the entry's source can name it: `deck:<deck id>`, which is how History titles the entry by the
 *      deck and how a retry finds the deck it made.
 *
 * A refusal or a failure anywhere rolls both back: the player has the deck and the copies, or neither.
 * Nothing is reserved (`card_assignments`): an import is not a precon start, and the claim model hands
 * the copies out by seniority like any other add. Revert takes the entry back like any add; the deck
 * stays, as a precon start's does.
 *
 * Not a "use server" module: it takes a user id.
 */
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import { collectionHistory, decks } from "../../db/schema";
import { printingRefKey, resolvePrintings, type PrintingRef } from "../collection/catalog-read";
import { deckOfSource, deckSource } from "../collection/deck-source";
import { isFinish, type Finish } from "../collection/key";
import type { PendingItem } from "../collection/pending";
import { applyCollectionChange, type ChangeOptions, type ChangeResult, type CollectionChange } from "../collection/write";
import { isUuid } from "../uuid";
import type { ImportPrintingCandidate, ImportPrintingPick } from "./import-printings";
import { writeImportedDeck, type ImportedDeck } from "./write-imported-deck";

/** What the add reads off the import: the deck's own lines, and the printings the list named. */
export type DeckOwnSource = {
  /** The body, the commanders already taken out (`deckCardValues`). An unresolved line is never one. */
  cards: readonly { oracleId: string; quantity: number }[];
  /** One copy each: the deck's lines leave them out, and the player owns them too. */
  commanderOracleIds: readonly string[];
  /** The printings the import kept as the deck's picks (`importPicks`). */
  picks: readonly ImportPrintingPick[];
  /** Every printing a line named, in any order (`DeckImport.printings`). */
  named: readonly ImportPrintingCandidate[];
};

export type CatalogPrinting = { scryfallId: string; finishes: string[] };

/** Every printing the add could take, for one `resolvePrintings` read. */
export function deckOwnRefs(src: DeckOwnSource): PrintingRef[] {
  const seen = new Map<string, PrintingRef>();
  for (const p of [...src.picks, ...src.named]) {
    const ref = { oracleId: p.oracleId, setCode: p.setCode.toLowerCase(), collectorNumber: p.collectorNumber };
    seen.set(printingRefKey(ref), ref);
  }
  return [...seen.values()];
}

const finishOf = (finishes: readonly string[]): Finish =>
  finishes.includes("nonfoil") ? "nonfoil" : ((finishes.find(isFinish) as Finish | undefined) ?? "nonfoil");

/**
 * The add's lines, one per card at the deck's count, plus one per commander. Each takes, in order:
 * the printing the import kept; failing that, the first printing the list itself named (in line
 * order); failing that, no printing (`setCode: ""`, as a precon card with no printing is added). A
 * named printing the catalog does not hold is passed over. Pure, so a test can start from a list.
 */
export function deckOwnLines(src: DeckOwnSource, catalog: ReadonlyMap<string, CatalogPrinting>): PendingItem[] {
  const picks = new Map(src.picks.map((p) => [p.oracleId, p]));
  const named = new Map<string, ImportPrintingCandidate[]>();
  for (const p of [...src.named].sort((a, b) => a.sourceLine - b.sourceLine)) {
    const list = named.get(p.oracleId);
    if (list) list.push(p);
    else named.set(p.oracleId, [p]);
  }
  const lines = [
    ...src.cards.map((c) => ({ oracleId: c.oracleId, quantity: c.quantity })),
    ...src.commanderOracleIds.map((oracleId) => ({ oracleId, quantity: 1 })),
  ];
  return lines.filter((l) => l.quantity > 0).map((l) => {
    const pick = picks.get(l.oracleId);
    for (const p of [...(pick ? [pick] : []), ...(named.get(l.oracleId) ?? [])]) {
      const ref = { oracleId: l.oracleId, setCode: p.setCode.toLowerCase(), collectorNumber: p.collectorNumber };
      const printing = catalog.get(printingRefKey(ref));
      if (!printing) continue;
      return { ...ref, scryfallId: printing.scryfallId, finish: finishOf(printing.finishes), condition: null, quantity: l.quantity };
    }
    return { oracleId: l.oracleId, setCode: "", scryfallId: null, finish: "nonfoil", condition: null, quantity: l.quantity };
  });
}

export type DeckOwnResult = { ok: true; deckId: string; entryId: string } | { ok: false };

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** The seams a test replaces; every one is the real write or read by default. */
export type DeckOwnDeps = {
  apply: (userId: string, change: CollectionChange, opts: ChangeOptions) => Promise<ChangeResult>;
  writeDeck: (tx: Tx, deck: ImportedDeck & { id: string }) => Promise<string>;
  madeBy: (userId: string, actionId: string) => Promise<string | "other" | null>;
  newId: () => string;
};

const defaultDeps: DeckOwnDeps = {
  apply: applyCollectionChange,
  writeDeck: writeImportedDeck,
  madeBy: importMadeBy,
  newId: randomUUID,
};

/**
 * Adds `items` to the collection and writes `deck` inside the same transaction. `actionId` is the
 * import's, minted once per press: a retry with it lands on the deck it made, never on a second one.
 */
export async function importDeckOwned(
  userId: string,
  deck: ImportedDeck,
  items: PendingItem[],
  actionId: string,
  env: NodeJS.ProcessEnv,
  deps: DeckOwnDeps = defaultDeps,
): Promise<DeckOwnResult> {
  const made = await deps.madeBy(userId, actionId);
  if (made === "other") return { ok: false };
  if (made) return { ok: true, deckId: made, entryId: actionId };

  const deckId = deps.newId();
  let wrote = false;
  const result = await deps.apply(userId, { kind: "add", items }, {
    id: actionId,
    env,
    source: deckSource(deckId),
    inside: async (tx) => {
      await deps.writeDeck(tx, { ...deck, id: deckId });
      wrote = true;
    },
  });
  if (result.status === "applied" && wrote) return { ok: true, deckId, entryId: actionId };
  // A twin request committed between the check above and this write: its deck, not this one's id.
  if (result.status === "alreadyApplied") {
    const raced = await deps.madeBy(userId, actionId);
    if (raced && raced !== "other") return { ok: true, deckId: raced, entryId: actionId };
  }
  return { ok: false };
}

/**
 * The deck this action already made, or "other" when the id belongs to some other write (an add with
 * no deck, a card's edit) or to a deck since deleted: a retry lands on its own deck, never on another.
 */
export async function importMadeBy(userId: string, actionId: string): Promise<string | "other" | null> {
  const [entry] = await db.select({ kind: collectionHistory.kind, source: collectionHistory.source })
    .from(collectionHistory)
    .where(and(eq(collectionHistory.id, actionId), eq(collectionHistory.userId, userId)));
  if (!entry) return null;
  const deckId = deckOfSource(entry.source);
  if (entry.kind !== "add" || !deckId || !isUuid(deckId)) return "other";
  const [deck] = await db.select({ id: decks.id }).from(decks).where(and(eq(decks.id, deckId), eq(decks.userId, userId)));
  return deck ? deck.id : "other";
}

/** The add's lines for an import, read against the catalog in one query. */
export async function readDeckOwnLines(src: DeckOwnSource): Promise<PendingItem[]> {
  return deckOwnLines(src, await resolvePrintings(deckOwnRefs(src)));
}
