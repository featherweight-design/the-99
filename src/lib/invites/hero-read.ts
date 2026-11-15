/**
 * What an invite email's hand image draws (branded emails R2, eng item 3). SERVER-ONLY. The address carries a sealed key
 * (`heroKey`), never the reservation id; this opens it, reads the one row it names, and answers either the sender's hand or the
 * PLAIN one. Everything that is not a live email invite is `plain`: a key this server did not make, a row that is gone, an
 * invite that was accepted, expired, revoked or given back. The route never answers 404 for a key (a mail client refetches its
 * images long after the invite ends, and an unknown key must reveal nothing), and what it draws for a live invite is only what
 * the email already shows: the sender's name and commander art, through `readInviteSender`, the read `/join` uses.
 */
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { inviteReservations } from "../../db/schema";
import { readInviteSender } from "../social/friends";
import type { ThirdPartyName } from "../person-name";
import { holdsInvite, type HoldingRow } from "./rules";
import { readHeroKey } from "./tokens";

export type HeroView =
  | { kind: "hand"; name: ThirdPartyName; commander: { name: string; artCropUri: string } }
  | { kind: "plain" };

const PLAIN: HeroView = { kind: "plain" };

export async function readHero(key: string, secret: string | null, now: Date = new Date()): Promise<HeroView> {
  if (!secret) return PLAIN;
  const id = readHeroKey(secret, key);
  if (id === null) return PLAIN;
  const [row] = await db.select().from(inviteReservations).where(eq(inviteReservations.id, id));
  // Only an email invite still holding its sender's invite: the 7 days of the mail.
  if (!row || row.kind !== "email" || !holdsInvite(row as HoldingRow, now)) return PLAIN;
  const sender = await readInviteSender(row.userId);
  const commander = sender?.commander;
  if (!sender || !commander?.artCropUri) return PLAIN;
  return { kind: "hand", name: sender.displayName, commander: { name: commander.name, artCropUri: commander.artCropUri } };
}
