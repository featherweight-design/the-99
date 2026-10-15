/**
 * The game log's "anyone" seat searches the whole catalog for the commander an opponent played
 * (Social R3 plan, PR 1). It is the deck search's name match without the owned filter and without a
 * deck's color identity: an opponent's commander is anyone's, so the player's collection and the
 * deck being logged against decide nothing here. Catalog data only, so nothing in it is a reader's.
 *
 * What it offers is what `opponentCommandersValid` accepts when the game is saved: commander-legal and
 * `isCommanderCandidate`. The partner ability rides each hit so the client can offer only the pairs
 * `canPair` allows; the server re-checks the pair at save, and that check is the one that counts.
 */
import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "../../db";
import { cards } from "../../db/schema";
import { loadOpeningArt } from "../cards/opening-printing";
import { nameSearch } from "../cards/name-search";
import { isGameCardWhere } from "../cards/game-card-where";
import { isCommanderCandidate } from "../recs/score";
import { partnerAbility, type PartnerAbility } from "./partner";

export type OpponentCommanderHit = {
  oracleId: string;
  name: string;
  typeLine: string;
  manaCost: string | null;
  /** In WUBRG order. Empty for a colorless commander. */
  colorIdentity: string[];
  partner: PartnerAbility | null;
  /** The Secret Lair name this row was found by, when the query matched that rather than `name`. */
  flavorName: string | null;
  /** The printing card details opens on, or null when the catalog has no art for the card. */
  imageUri: string | null;
};

export const OPPONENT_COMMANDER_HITS = 8;

/**
 * Rows read before `isCommanderCandidate` has the last word. The SQL narrows to a SUPERSET of its rule (a
 * legendary front or back, or "can be your commander" text), so the window holds commanders and the few the
 * rule then refuses (a legendary land, a melded card), never the arbitrary name matches a broad query like
 * "the" would otherwise fill it with.
 */
const SCAN = 40;

const WUBRG = ["W", "U", "B", "R", "G"];

export async function searchOpponentCommanders(query: unknown): Promise<OpponentCommanderHit[]> {
  if (typeof query !== "string") return [];
  const match = nameSearch(query);
  if (!match) return [];
  const { flavorHits } = match;
  const rows = await db
    .select({
      oracleId: cards.oracleId,
      name: cards.name,
      typeLine: cards.typeLine,
      oracleText: cards.oracleText,
      manaCost: cards.manaCost,
      layout: cards.layout,
      colorIdentity: cards.colorIdentity,
      imageUri: cards.imageUri,
      flavorName: flavorHits.flavorName,
    })
    .from(cards)
    .leftJoin(flavorHits, eq(flavorHits.oracleId, cards.oracleId))
    .where(and(
      match.where,
      eq(cards.commanderLegal, true),
      isGameCardWhere(),
      or(ilike(cards.typeLine, "%legendary%"), ilike(cards.oracleText, "%can be your commander%")),
    ))
    // A name that starts with what was typed leads, then name: a window cut at SCAN is the same one every call.
    .orderBy(desc(sql`${cards.name} ilike ${`${query.trim().replace(/[\\%_]/g, (m) => `\\${m}`)}%`}`), asc(cards.name))
    .limit(SCAN);
  const leads = rows.filter(isCommanderCandidate).slice(0, OPPONENT_COMMANDER_HITS);
  if (leads.length === 0) return [];
  const art = await loadOpeningArt(leads.map((r) => r.oracleId)).catch(() => new Map<string, string>());
  return leads.map((r) => ({
    oracleId: r.oracleId,
    name: r.name,
    typeLine: r.typeLine,
    manaCost: r.manaCost,
    colorIdentity: WUBRG.filter((c) => r.colorIdentity.includes(c)),
    partner: partnerAbility(r.oracleText, r.typeLine),
    flavorName: match.shownFlavor(r.name, r.flavorName),
    imageUri: art.get(r.oracleId) ?? r.imageUri,
  }));
}
