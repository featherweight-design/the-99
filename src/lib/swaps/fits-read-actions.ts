"use server";

import { requireUserId } from "../auth";
import { requestSwitchEnv } from "../switches/request";
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
  const userId = await requireUserId();
  const env = await requestSwitchEnv(userId);
  if (!findADeckReadEnabled(env) || !isUuid(oracleId)) return null;
  return readFitsRead(userId, oracleId);
}

export async function pressFitsReadAction(oracleId: string): Promise<FitsReadPress> {
  const userId = await requireUserId();
  const env = await requestSwitchEnv(userId);
  if (!findADeckReadEnabled(env) || !isUuid(oracleId)) return { ok: false, reason: "notFound" };
  return pressFitsRead(userId, oracleId);
}
