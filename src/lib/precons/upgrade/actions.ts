"use server";

import { requireUserId } from "../../auth";
import { requestFlags } from "../../flags/request";
import { preconUpgradeEnabled } from "./flag";
import { LIVE_DEPS, pressUpgrade, readUpgrade, type UpgradePanel, type UpgradePress } from "./run";

/**
 * Upgrade this precon's server actions. Each is a PUBLIC ENDPOINT, so every gate is re-applied here: the session, the reader's
 * switch (`PRECON_UPGRADE_ENABLED`, off for players until launch) and the shape of what the client sent. The model-call kill
 * switch still stops the paid run (`reserveModelCall`). Nothing is revalidated: a run changes no page but its own panel.
 */

/** A catalog file name and a strategy key are only ever parameters of a lookup, so a bound on length is the whole shape check. */
const bounded = (v: unknown, max: number): v is string => typeof v === "string" && v.length > 0 && v.length <= max;

export async function readUpgradeAction(fileName: string): Promise<UpgradePanel | null> {
  const userId = await requireUserId();
  const env = await requestFlags(userId);
  if (!preconUpgradeEnabled(env) || !bounded(fileName, 200)) return null;
  return readUpgrade(userId, fileName, LIVE_DEPS, env);
}

export async function pressUpgradeAction(fileName: string, strategyKey: string): Promise<UpgradePress | { ok: false; reason: "off" }> {
  const userId = await requireUserId();
  const env = await requestFlags(userId);
  if (!preconUpgradeEnabled(env)) return { ok: false, reason: "off" };
  if (!bounded(fileName, 200)) return { ok: false, reason: "notFound" };
  if (!bounded(strategyKey, 80)) return { ok: false, reason: "notOffered" };
  return pressUpgrade(userId, fileName, strategyKey, LIVE_DEPS, env);
}
