"use server";

import { requireUserId } from "../auth";
import { isUuid } from "../uuid";
import { findADeckReadEnabled } from "./flag";
import { pressFitsRead, readFitsRead, type FitsReadPanel, type FitsReadPress } from "./fits-read-run";

/**
 * Find a deck read's server actions. Each is a PUBLIC ENDPOINT, so every gate is re-applied here:
 * the switch (a deploy without `FIND_A_DECK_READ_ENABLED` answers nothing), the session, and the
 * shape of the card id. Nothing is revalidated: the read changes no page but the picker's own view,
 * which draws the panel these return.
 */

export async function readFitsReadAction(oracleId: string): Promise<FitsReadPanel | null> {
  if (!findADeckReadEnabled() || !isUuid(oracleId)) return null;
  const userId = await requireUserId();
  return readFitsRead(userId, oracleId);
}

export async function pressFitsReadAction(oracleId: string): Promise<FitsReadPress> {
  if (!findADeckReadEnabled() || !isUuid(oracleId)) return { ok: false, reason: "notFound" };
  const userId = await requireUserId();
  return pressFitsRead(userId, oracleId);
}
