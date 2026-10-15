/**
 * A player's face: the commander they chose to show (Social R1, plan `2026-10-15-social-r1.md` PR A; audit
 * E1, G11, G12). The face's art is the catalog's own art crop for that oracle id (`cards.art_crop_uri`, G12):
 * no printing choice this round.
 *
 * Every read that draws a face joins `commanderCard` (an alias of `cards`) to the profile it belongs to, in
 * the read's own statement, so the grant that read joins decides whose commander it may show (D1, D2).
 */
import { eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../../db";
import { cards, socialProfiles } from "../../db/schema";
import { isGameCard } from "../cards/game-card";
import { isCommanderCandidate } from "../recs/score";
import { isUuid } from "./rules";

export type ProfileCommander = { oracleId: string; name: string; artCropUri: string | null };

/** The card a face is drawn from. An alias, so a read that also joins `cards` cannot mix the two up. */
export const commanderCard = alias(cards, "commander_card");

/** The three columns a face needs, for a read's projection. All null when the face is initials. */
export const commanderColumns = {
  commanderOracleId: commanderCard.oracleId,
  commanderName: commanderCard.name,
  commanderArt: commanderCard.artCropUri,
};

export function toCommander(r: { commanderOracleId: string | null; commanderName: string | null; commanderArt: string | null }): ProfileCommander | null {
  if (r.commanderOracleId === null || r.commanderName === null) return null;
  return { oracleId: r.commanderOracleId, name: r.commanderName, artCropUri: r.commanderArt };
}

/** A card can be a face when it can lead a deck: the rule the commander search offers by (E2). */
export function canBeFace(card: {
  commanderLegal: boolean; typeLine: string; oracleText: string | null; manaCost: string | null; layout: string | null;
}): boolean {
  return card.commanderLegal && isGameCard(card) && isCommanderCandidate(card);
}

export type SetCommanderResult = { ok: true } | { ok: false; reason: "notCommander" | "noProfile" };

/**
 * Set the viewer's face, or clear it with null. Refuses an id that is not a commander the catalog lists,
 * so a client cannot make a face of a land or a token by naming its id (E1).
 */
export async function setCommander(viewerId: string, oracleId: unknown): Promise<SetCommanderResult> {
  if (oracleId !== null) {
    if (!isUuid(oracleId)) return { ok: false, reason: "notCommander" };
    const [card] = await db
      .select({
        commanderLegal: cards.commanderLegal, typeLine: cards.typeLine, oracleText: cards.oracleText,
        manaCost: cards.manaCost, layout: cards.layout,
      })
      .from(cards)
      .where(eq(cards.oracleId, oracleId));
    if (!card || !canBeFace(card)) return { ok: false, reason: "notCommander" };
  }
  const written = await db
    .update(socialProfiles)
    .set({ commanderOracleId: oracleId })
    .where(eq(socialProfiles.userId, viewerId))
    .returning({ userId: socialProfiles.userId });
  return written.length > 0 ? { ok: true } : { ok: false, reason: "noProfile" };
}
