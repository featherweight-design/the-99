/**
 * A player's face (Social R1, plan `2026-10-15-social-r1.md` PR A; audit E1, G11, G12; widened by Hugh's ruling of
 * 2026-10-27): ANY catalog card, in any of its printings. The art is the chosen printing's art crop, else the
 * card's own (`cards.art_crop_uri`, G12), else nothing (initials).
 *
 * Every read that draws a face joins `commanderCard` (an alias of `cards`) AND `facePrinting` (an alias of
 * `printings`, on `faceJoin`) to the profile it belongs to, in the read's own statement, so the grant that read
 * joins decides whose face it may show (D1, D2). `face-reads.test.ts` fails when a reader takes the columns
 * without the join.
 */
import { and, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../../db";
import { cards, printings, socialProfiles } from "../../db/schema";
import { isGameCard } from "../cards/game-card";
import { facePromptDoneWrite } from "./face-prompt";
import { isUuid } from "./rules";

export type ProfileCommander = { oracleId: string; name: string; artCropUri: string | null };

/** The card a face is drawn from. An alias, so a read that also joins `cards` cannot mix the two up. */
export const commanderCard = alias(cards, "commander_card");

/** The printing a player chose for their face. Left-joined on `faceJoin`; null when none was chosen. */
export const facePrinting = alias(printings, "face_printing");

/**
 * The join condition for `facePrinting`: the pick AND the card it must belong to. A pick that no longer matches the
 * profile's card (the card was changed, or cleared) joins nothing, so the art falls back to the card's own.
 */
export const faceJoin = and(
  eq(facePrinting.scryfallId, socialProfiles.commanderPrintingId),
  eq(facePrinting.oracleId, socialProfiles.commanderOracleId),
);

/** The three columns a face needs, for a read's projection. All null when the face is initials. */
export const commanderColumns = {
  commanderOracleId: commanderCard.oracleId,
  commanderName: commanderCard.name,
  // The chain: the chosen printing's crop, else the card's. A printing from before the crop column existed has none.
  commanderArt: sql<string | null>`coalesce(${facePrinting.artCropUri}, ${commanderCard.artCropUri})`,
};

export function toCommander(r: { commanderOracleId: string | null; commanderName: string | null; commanderArt: string | null }): ProfileCommander | null {
  if (r.commanderOracleId === null || r.commanderName === null) return null;
  return { oracleId: r.commanderOracleId, name: r.commanderName, artCropUri: r.commanderArt };
}

export type SetCommanderResult = { ok: true } | { ok: false; reason: "noCard" | "badPrinting" | "noProfile" };

/** Postgres's foreign_key_violation, on the error or the cause the driver wrapped it in. */
function isForeignKeyViolation(e: unknown): boolean {
  const x = e as { code?: unknown; cause?: { code?: unknown } } | null;
  return x?.code === "23503" || x?.cause?.code === "23503";
}

/**
 * Set the viewer's face, or clear it with a null card. Any GAME card the catalog lists is allowed (`isGameCard`: no
 * token, emblem or art card, G1). `printingId` is the
 * printing to draw it from, or null/undefined for the card's default art; a printing that is not OF that card is
 * refused, so a client cannot show another card's art by naming its printing. Every write sets both columns, so
 * changing the card without a printing drops the old pick. A card picked (not a clear) also stamps the reader done
 * being asked for one (`facePromptDoneWrite`, G4), in the same transaction, so Home's ask leaves with the pick.
 */
export async function setCommander(viewerId: string, oracleId: unknown, printingId: unknown = null): Promise<SetCommanderResult> {
  let card: string | null = null;
  let printing: string | null = null;
  if (printingId !== null && printingId !== undefined && !isUuid(printingId)) return { ok: false, reason: "badPrinting" };
  if (oracleId !== null) {
    if (!isUuid(oracleId)) return { ok: false, reason: "noCard" };
    const [found] = await db
      .select({ oracleId: cards.oracleId, layout: cards.layout, typeLine: cards.typeLine })
      .from(cards)
      .where(eq(cards.oracleId, oracleId));
    if (!found || !isGameCard(found)) return { ok: false, reason: "noCard" };
    card = found.oracleId;
    if (printingId !== null && printingId !== undefined) {
      const [p] = await db
        .select({ scryfallId: printings.scryfallId })
        .from(printings)
        .where(and(eq(printings.scryfallId, printingId as string), eq(printings.oracleId, card)));
      if (!p) return { ok: false, reason: "badPrinting" };
      printing = p.scryfallId;
    }
  } else if (printingId !== null && printingId !== undefined) {
    return { ok: false, reason: "badPrinting" };
  }
  try {
    return await db.transaction(async (tx) => {
      const written = await tx
        .update(socialProfiles)
        .set({ commanderOracleId: card, commanderPrintingId: printing })
        .where(eq(socialProfiles.userId, viewerId))
        .returning({ userId: socialProfiles.userId });
      if (written.length === 0) return { ok: false, reason: "noProfile" } as const;
      if (card !== null) await facePromptDoneWrite(viewerId, tx);
      return { ok: true } as const;
    });
  } catch (e) {
    // The card or the printing left the catalog between the check and the write.
    if (!isForeignKeyViolation(e)) throw e;
    return { ok: false, reason: printing === null ? "noCard" : "badPrinting" };
  }
}
