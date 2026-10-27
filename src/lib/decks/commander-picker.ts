/**
 * The face picker's two reads (Social R1 plan, PR A; audit E2, G13). Neither touches a social table: the
 * deck row reads the viewer's OWN decks, and the search reads the catalog, so both live here rather than in
 * `src/lib/social/` (E2). What a press then saves goes through `setCommander`, which re-checks the card.
 *
 * A tile is the face's own shape: the oracle id, the card's name and the catalog's art crop (G12), plus the
 * colour identity the search rows draw as pips (R2 F3).
 */
import { and, asc, desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../../db";
import { cards, decks } from "../../db/schema";
import { nameSearch } from "../cards/name-search";
import { isCommanderCandidate } from "../recs/score";
import { isGameCard } from "../cards/game-card";
import { commanderSearchOrder, commanderSupersetWhere } from "./opponent-commanders";

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
