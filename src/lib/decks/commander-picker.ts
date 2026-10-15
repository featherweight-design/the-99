/**
 * The face picker's two reads (Social R1 plan, PR A; audit E2, G13). Neither touches a social table: the
 * deck row reads the viewer's OWN decks, and the search reads the catalog, so both live here rather than in
 * `src/lib/social/` (E2). What a press then saves goes through `setCommander`, which re-checks the card.
 *
 * A tile is the face's own shape: the oracle id, the card's name and the catalog's art crop (G12).
 */
import { and, asc, desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../../db";
import { cards, decks } from "../../db/schema";
import { nameSearch } from "../cards/name-search";
import { isCommanderCandidate } from "../recs/score";
import { commanderSearchOrder, commanderSupersetWhere } from "./opponent-commanders";

export type CommanderTile = { oracleId: string; name: string; artCropUri: string | null };

/** Tiles in the deck row (G13). */
export const DECK_COMMANDER_TILES = 8;
/** Hits the search offers. */
export const COMMANDER_SEARCH_HITS = 12;
/** Decks read for the row: enough that a run of decks sharing a commander still fills it. */
const DECKS_READ = 48;
/** Search rows read before `isCommanderCandidate` has the last word (`opponent-commanders.ts`' SCAN). */
const SEARCH_SCAN = 48;

const lead = alias(cards, "lead_card");
const partner = alias(cards, "partner_card");

/** The viewer's decks, newest first, each with its commander and partner. Apart so a test can render it. */
export function deckCommandersQuery(viewerId: string, q: Pick<typeof db, "select"> = db) {
  return q
    .select({
      leadId: lead.oracleId, leadName: lead.name, leadArt: lead.artCropUri,
      partnerId: partner.oracleId, partnerName: partner.name, partnerArt: partner.artCropUri,
    })
    .from(decks)
    .innerJoin(lead, eq(lead.oracleId, decks.commanderOracleId))
    .leftJoin(partner, eq(partner.oracleId, decks.partnerOracleId))
    .where(eq(decks.userId, viewerId))
    .orderBy(desc(decks.createdAt), asc(decks.id))
    .limit(DECKS_READ);
}

type DeckCommanderRow = Awaited<ReturnType<typeof deckCommandersQuery>>[number];

/** Newest deck first, a partner pair as two tiles (lead, then partner), each commander once, up to eight. */
export function deckTiles(rows: readonly DeckCommanderRow[]): CommanderTile[] {
  const out: CommanderTile[] = [];
  const seen = new Set<string>();
  const push = (oracleId: string | null, name: string | null, artCropUri: string | null) => {
    if (oracleId === null || name === null || seen.has(oracleId) || out.length >= DECK_COMMANDER_TILES) return;
    seen.add(oracleId);
    out.push({ oracleId, name, artCropUri });
  };
  for (const r of rows) {
    push(r.leadId, r.leadName, r.leadArt);
    push(r.partnerId, r.partnerName, r.partnerArt);
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
    .map((r) => ({ oracleId: r.oracleId, name: r.name, artCropUri: r.artCropUri }));
}
