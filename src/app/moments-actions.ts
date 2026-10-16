"use server";

import { requireUserId } from "../lib/auth";
import { liveMoments } from "../lib/moments/live";
import { isMomentId } from "../lib/moments/registry";
import { spendMoment } from "../lib/moments/spent";
import { requestSwitchEnv } from "../lib/switches/request";

/**
 * Spends a moment once its bubble has been on screen for a second (plan `2026-10-16-moments.md`, G5). The id must be
 * one the registry names AND one live for this reader now (`MOMENTS_ENABLED` and its tool's switch), so a client can
 * spend only what it could have been shown. Revalidates nothing: no page figure moves, and the write's stamp move
 * already retires Home's and `/decks`' cached payloads.
 */
export async function spendMomentAction(id: unknown): Promise<void> {
  const userId = await requireUserId();
  if (!isMomentId(id)) return;
  const env = await requestSwitchEnv(userId);
  if (!liveMoments(env).includes(id)) return;
  await spendMoment(userId, id);
}
