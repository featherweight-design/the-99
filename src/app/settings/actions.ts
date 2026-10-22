"use server";

// Settings' Spares writes (menu and Home plan PR 3, handoff G3). Every action takes the reader from the session,
// decides `SOCIAL_FRIENDS_ENABLED` for THAT reader (`requestSwitchEnv`) and refuses as `off` while it is off, as
// `/friends`' actions do. The writes live in `lib/social/spare-settings.ts`; nothing here names a table.
//
// Revalidation: `/settings` alone, inline, because the page redraws from the reply. A friend's spares are read per
// request (`GET /api/friend-spares`, uncached), and a cached page drawing them keys on `friendGeneration`, which the
// stamp trigger on `user_prefs` and `spare_keep` moves: nothing else needs telling.

import { revalidatePath } from "next/cache";
import { requireUserId } from "../../lib/auth";
import { socialFriendsEnabled } from "../../lib/social/flag";
import { requestSwitchEnv } from "../../lib/switches/request";
import {
  keepCardBack, releaseCard, searchSpareCards, setSpareMin, type SpareSearchHit,
} from "../../lib/social/spare-settings";

type Off = { ok: false; reason: "off" };
const OFF: Off = { ok: false, reason: "off" };

/** The signed-in reader and their switches, when Friends is on for them; null when it is off. */
async function spareReader(): Promise<{ userId: string; env: NodeJS.ProcessEnv } | null> {
  const userId = await requireUserId();
  const env = await requestSwitchEnv(userId);
  return socialFriendsEnabled(env) ? { userId, env } : null;
}

const refreshSettings = () => revalidatePath("/settings");

export type SpareWriteOutcome = { ok: true } | Off | { ok: false; reason: "invalid" };

/** The threshold stepper: an integer from 1 to 9 (`cleanSpareMin`), anything else `invalid`. */
export async function setSpareMinAction(value: unknown): Promise<SpareWriteOutcome> {
  const reader = await spareReader();
  if (!reader) return OFF;
  if (!(await setSpareMin(reader.userId, value))) return { ok: false, reason: "invalid" };
  refreshSettings();
  return { ok: true };
}

/** Keep a card back. `invalid`: not an oracle id, or not a card in the catalog. */
export async function keepCardAction(oracleId: unknown): Promise<SpareWriteOutcome> {
  const reader = await spareReader();
  if (!reader) return OFF;
  if (!(await keepCardBack(reader.userId, oracleId))) return { ok: false, reason: "invalid" };
  refreshSettings();
  return { ok: true };
}

/** A kept row's ✕: the card goes back to the spares. */
export async function releaseCardAction(oracleId: unknown): Promise<SpareWriteOutcome> {
  const reader = await spareReader();
  if (!reader) return OFF;
  if (!(await releaseCard(reader.userId, oracleId))) return { ok: false, reason: "invalid" };
  refreshSettings();
  return { ok: true };
}

export type SpareSearchOutcome = { ok: true; hits: SpareSearchHit[] } | Off;

/** Keep a card back's search over the reader's own spare cards. A read, so nothing revalidates. */
export async function searchSpareCardsAction(query: unknown): Promise<SpareSearchOutcome> {
  const reader = await spareReader();
  if (!reader) return OFF;
  return { ok: true, hits: await searchSpareCards(reader.userId, query, reader.env) };
}
