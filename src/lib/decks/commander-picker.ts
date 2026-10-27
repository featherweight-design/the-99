/**
 * The face picker's two reads (Social R1 plan, PR A; audit E2, G13). Neither touches a social table: the
 * deck row reads the viewer's OWN decks, and the search reads the catalog, so both live here rather than in
 * `src/lib/social/` (E2). What a press then saves goes through `setCommander`, which re-checks the card.
 *
 * A tile is the face's own shape: the oracle id, the card's name and the catalog's art crop (G12), plus the
 * colour identity the search rows draw as pips (R2 F3).
 */
import { and, asc, desc, eq, isNotNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../../db";
import { cards, decks, printings, sets } from "../../db/schema";
import { nameSearch } from "../cards/name-search";
import { isCommanderCandidate } from "../recs/score";
import { isGameCard } from "../cards/game-card";
import { isGameCardWhere } from "../cards/game-card-where";
import { commanderSearchOrder, commanderSupersetWhere } from "./opponent-commanders";
import { resolveCommanderPrintingsByDeck } from "./printings";

/**
 * A card can lead a deck: the rule the commander search offers by (E2). The face itself is no longer held to it
 * (any card, 2026-10-27), so this stays the picker's own filter until the picker is redrawn.
 */
export function canLeadADeck(card: {
  commanderLegal: boolean; typeLine: string; oracleText: string | null; manaCost: string | null; layout: string | null;
}): boolean {
  return card.commanderLegal && isGameCard(card) && isCommanderCandidate(card);
}

export type CommanderTile = { oracleId: string; name: string; artCropUri: string | null; colorIdentity: string[] };

/** Tiles in the deck row (G13). */
export const DECK_COMMANDER_TILES = 8;
/** Hits the search offers. */
export const COMMANDER_SEARCH_HITS = 12;
/** Search rows read before `isCommanderCandidate` has the last word (`opponent-commanders.ts`' SCAN). */
const SEARCH_SCAN = 48;

const lead = alias(cards, "lead_card");
const partner = alias(cards, "partner_card");

/**
 * The viewer's decks, newest first, each with its commander and partner. Apart so a test can render it. Every
 * deck is read, never a window: a run of new decks sharing one commander must not hide an older one, and one
 * player's decks are few.
 */
export function deckCommandersQuery(viewerId: string, q: Pick<typeof db, "select"> = db) {
  return q
    .select({
      deckId: decks.id,
      leadId: lead.oracleId, leadName: lead.name, leadArt: lead.artCropUri, leadIdentity: lead.colorIdentity,
      leadLegal: lead.commanderLegal, leadType: lead.typeLine, leadText: lead.oracleText, leadCost: lead.manaCost, leadLayout: lead.layout,
      partnerId: partner.oracleId, partnerName: partner.name, partnerArt: partner.artCropUri, partnerIdentity: partner.colorIdentity,
      partnerLegal: partner.commanderLegal, partnerType: partner.typeLine, partnerText: partner.oracleText,
      partnerCost: partner.manaCost, partnerLayout: partner.layout,
    })
    .from(decks)
    .innerJoin(lead, eq(lead.oracleId, decks.commanderOracleId))
    .leftJoin(partner, eq(partner.oracleId, decks.partnerOracleId))
    .where(eq(decks.userId, viewerId))
    .orderBy(desc(decks.createdAt), asc(decks.id));
}

type DeckCommanderRow = Awaited<ReturnType<typeof deckCommandersQuery>>[number];

/**
 * Newest deck first, a partner pair as two tiles (lead, then partner), each commander once, up to eight. A
 * commander that can no longer be a face (banned since the deck was built) is left out before the count, so
 * the row never offers a tile `setCommander` would refuse.
 */
export function deckTiles(rows: readonly DeckCommanderRow[]): CommanderTile[] {
  const out: CommanderTile[] = [];
  const seen = new Set<string>();
  const push = (oracleId: string | null, name: string | null, artCropUri: string | null, colorIdentity: string[] | null, eligible: boolean) => {
    if (oracleId === null || name === null || !eligible || seen.has(oracleId) || out.length >= DECK_COMMANDER_TILES) return;
    seen.add(oracleId);
    out.push({ oracleId, name, artCropUri, colorIdentity: colorIdentity ?? [] });
  };
  for (const r of rows) {
    push(r.leadId, r.leadName, r.leadArt, r.leadIdentity,
      canLeadADeck({ commanderLegal: r.leadLegal, typeLine: r.leadType, oracleText: r.leadText, manaCost: r.leadCost, layout: r.leadLayout }));
    push(r.partnerId, r.partnerName, r.partnerArt, r.partnerIdentity, r.partnerType !== null && canLeadADeck({
      commanderLegal: r.partnerLegal ?? false, typeLine: r.partnerType, oracleText: r.partnerText,
      manaCost: r.partnerCost, layout: r.partnerLayout,
    }));
  }
  return out;
}

/** A deck row tile for the signature card picker: the deck's own printing of its commander, or null for the usual art. */
export type FaceTile = CommanderTile & { printingId: string | null };

/**
 * The signature card picker's deck row (call 2: "each deck's own printing"): the same tiles as `listOwnDeckCommanders`,
 * each lead drawn and saved in the printing its NEWEST deck shows (`resolveCommanderPrintingsByDeck`: the deck's pick
 * while held, else the Collection's). A partner, or a commander the player does not own, keeps the usual art.
 */
export async function listOwnDeckFaces(viewerId: string, env: NodeJS.ProcessEnv): Promise<FaceTile[]> {
  const rows = await deckCommandersQuery(viewerId);
  const tiles = deckTiles(rows);
  // The newest deck each lead heads: rows come newest first, so the first one seen.
  const deckOf = new Map<string, string>();
  for (const r of rows) if (r.leadId !== null && !deckOf.has(r.leadId)) deckOf.set(r.leadId, r.deckId);
  const leads = tiles.filter((t) => deckOf.has(t.oracleId));
  const shown = await resolveCommanderPrintingsByDeck(
    viewerId, leads.map((t) => ({ deckId: deckOf.get(t.oracleId)!, commanderOracleId: t.oracleId })), env,
  );
  const wanted = leads.flatMap((t) => {
    const p = shown.get(deckOf.get(t.oracleId)!);
    return p ? [{ oracleId: t.oracleId, setCode: p.setCode.toLowerCase(), collectorNumber: p.collectorNumber }] : [];
  });
  // The printing each lead saves, with ITS crop: what the face will draw. The deck's own art can be another printing's
  // (the resolver falls back to the set's representative when a printing has no image), so it is never the tile's.
  const picks = new Map<string, { scryfallId: string; artCropUri: string }>();
  if (wanted.length > 0) {
    const found = await db
      .select({ scryfallId: printings.scryfallId, oracleId: printings.oracleId, artCropUri: printings.artCropUri })
      .from(printings)
      .where(sql`(${printings.oracleId}, ${printings.setCode}, ${printings.collectorNumber}) in (${sql.join(
        wanted.map((w) => sql`(${w.oracleId}::uuid, ${w.setCode}, ${w.collectorNumber})`), sql`, `,
      )})`);
    // A set, code and number can name more than one printing (variants: `price-query.ts` handles the same case), and
    // the resolver hands back no printing id. Only a tuple that names exactly one printing is saved; any other lead keeps
    // the usual art rather than one variant picked at random. Only a printing with a crop can be a face's art.
    const named = new Map<string, number>();
    for (const r of found) named.set(r.oracleId, (named.get(r.oracleId) ?? 0) + 1);
    for (const r of found) {
      if (named.get(r.oracleId) === 1 && r.artCropUri !== null) picks.set(r.oracleId, { scryfallId: r.scryfallId, artCropUri: r.artCropUri });
    }
  }
  return tiles.map((t) => {
    const pick = picks.get(t.oracleId);
    return pick ? { ...t, printingId: pick.scryfallId, artCropUri: pick.artCropUri } : { ...t, printingId: null };
  });
}

/** The picker's deck row: the commanders of the viewer's own decks. */
export async function listOwnDeckCommanders(viewerId: string): Promise<CommanderTile[]> {
  return deckTiles(await deckCommandersQuery(viewerId));
}

/**
 * The picker's search: a commander by name, over the catalog's commanders (the rule `/commanders` ranks
 * by, `isCommanderCandidate`, over commander-legal game cards, and the rule `setCommander` saves by), with
 * the art crop. A name that starts with the query leads. Too short a query asks for nothing.
 */
export async function searchFaceCommanders(query: unknown): Promise<CommanderTile[]> {
  if (typeof query !== "string") return [];
  const match = nameSearch(query);
  if (!match) return [];
  const rows = await db
    .select({
      oracleId: cards.oracleId,
      name: cards.name,
      artCropUri: cards.artCropUri,
      colorIdentity: cards.colorIdentity,
      typeLine: cards.typeLine,
      oracleText: cards.oracleText,
      manaCost: cards.manaCost,
      layout: cards.layout,
    })
    .from(cards)
    .leftJoin(match.flavorHits, eq(match.flavorHits.oracleId, cards.oracleId))
    .where(and(match.where, commanderSupersetWhere()))
    .orderBy(...commanderSearchOrder(query))
    .limit(SEARCH_SCAN);
  return rows
    .filter(isCommanderCandidate)
    .slice(0, COMMANDER_SEARCH_HITS)
    .map((r) => ({ oracleId: r.oracleId, name: r.name, artCropUri: r.artCropUri, colorIdentity: r.colorIdentity }));
}

/**
 * A hit in the signature card search (avatar handoff call 2, G3): any game card, with its type line (drawn under the
 * name) and how many printings it has with art, so a card with more than one opens the printings screen.
 */
export type FaceCardHit = {
  oracleId: string;
  name: string;
  typeLine: string;
  artCropUri: string | null;
  colorIdentity: string[];
  printings: number;
};

/**
 * The signature card search, `SIGNATURE_CARD_ENABLED`'s picker: any GAME card by name (the rule `setCommander` saves
 * by, `isGameCardWhere`), best name match first, then by name. Too short a query asks for nothing.
 */
export async function searchFaceCards(query: unknown): Promise<FaceCardHit[]> {
  if (typeof query !== "string") return [];
  return (await faceCardsQuery(query)) ?? [];
}

/** `searchFaceCards`' statement, or null for a query too short or long to run. Apart so a test can render it. */
export function faceCardsQuery(query: string) {
  const match = nameSearch(query);
  if (!match) return null;
  return db
    .select({
      oracleId: cards.oracleId,
      name: cards.name,
      typeLine: cards.typeLine,
      artCropUri: cards.artCropUri,
      colorIdentity: cards.colorIdentity,
      // Aliased and qualified on both sides: a correlated subquery in a projection is emitted unqualified (AGENTS.md).
      printings: sql<number>`(
        select count(*) from ${printings} fp
        where fp.oracle_id = ${cards}.oracle_id and fp.art_crop_uri is not null
      )::int`,
    })
    .from(cards)
    .leftJoin(match.flavorHits, eq(match.flavorHits.oracleId, cards.oracleId))
    .where(and(match.where, isGameCardWhere()))
    .orderBy(match.rank, asc(cards.name))
    .limit(COMMANDER_SEARCH_HITS);
}

/** One printing on the printings screen: the whole card for its tile, the crop for the face preview. */
export type FacePrinting = {
  scryfallId: string;
  setCode: string;
  setName: string | null;
  collectorNumber: string;
  imageUri: string | null;
  artCropUri: string;
};

/** The printings screen (call 2, G3): the card's usual art (a null pick), then every printing with an art crop. */
export type FacePrintings = {
  oracleId: string;
  name: string;
  /** The card's own art; `setCode` is the printing that art comes from, when one matches (uppercased), else null. */
  usual: { imageUri: string | null; artCropUri: string | null; setCode: string | null };
  printings: FacePrinting[];
};

/**
 * A card's printings for the face: those with an art crop (a face is drawn from the crop), newest set first, then by
 * collector number. Null for a card that is not a game card or not in the catalog, so the screen offers nothing
 * `setCommander` would refuse.
 */
export async function listFacePrintings(oracleId: string): Promise<FacePrintings | null> {
  const [card] = await db
    .select({
      oracleId: cards.oracleId, name: cards.name, imageUri: cards.imageUri, artCropUri: cards.artCropUri,
      layout: cards.layout, typeLine: cards.typeLine,
    })
    .from(cards)
    .where(eq(cards.oracleId, oracleId));
  if (!card || !isGameCard(card)) return null;
  const rows = await db
    .select({
      scryfallId: printings.scryfallId,
      setCode: printings.setCode,
      setName: sets.name,
      collectorNumber: printings.collectorNumber,
      imageUri: printings.imageUri,
      artCropUri: printings.artCropUri,
    })
    .from(printings)
    .leftJoin(sets, eq(sets.code, printings.setCode))
    .where(and(eq(printings.oracleId, oracleId), isNotNull(printings.artCropUri)))
    .orderBy(sql`${sets.releasedAt} desc nulls last`, asc(printings.collectorNumber));
  return {
    oracleId: card.oracleId,
    name: card.name,
    usual: {
      imageUri: card.imageUri,
      artCropUri: card.artCropUri,
      setCode: rows.find((r) => r.imageUri !== null && r.imageUri === card.imageUri)?.setCode.toUpperCase() ?? null,
    },
    printings: rows.map((r) => ({ ...r, setCode: r.setCode.toUpperCase(), artCropUri: r.artCropUri as string })),
  };
}
