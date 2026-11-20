"use server";

import { requireUserId } from "../../auth";
import { requestFlags } from "../../flags/request";
import { preconUpgradeEnabled } from "./flag";
import { picksShape } from "./apply";
import { LIVE_DEPS, pressUpgrade, readSetBracket, readUpgrade, type UpgradePanel, type UpgradePress } from "./run";
import { markSeen, setPick, type SetPickResult } from "./store";

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

export async function pressUpgradeAction(fileName: string, commanderKey: string, bracket: number, strategyKey: string): Promise<UpgradePress | { ok: false; reason: "off" }> {
  const userId = await requireUserId();
  const env = await requestFlags(userId);
  if (!preconUpgradeEnabled(env)) return { ok: false, reason: "off" };
  if (!bounded(fileName, 200)) return { ok: false, reason: "notFound" };
  if (!bounded(commanderKey, 120) || !bounded(strategyKey, 80)) return { ok: false, reason: "notOffered" };
  return pressUpgrade(userId, fileName, commanderKey, bracket, strategyKey, LIVE_DEPS, env);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** A run id is a uuid; a line id is `a-` or `c-` and a card's oracle id (`store.ts`). Checked before any query, so a malformed id never reaches a uuid column. */
const isRunId = (v: unknown): v is string => typeof v === "string" && UUID.test(v);
const isLineId = (v: unknown): v is string => typeof v === "string" && /^[ac]-/.test(v) && UUID.test(v.slice(2));

/** Marks the reader's own finished run as shown, once: a run that landed while they were away opens fresh until then. */
export async function markUpgradeSeenAction(runId: string): Promise<{ ok: boolean }> {
  const userId = await requireUserId();
  const env = await requestFlags(userId);
  if (!preconUpgradeEnabled(env) || !isRunId(runId)) return { ok: false };
  return { ok: await markSeen(userId, runId) };
}

/** Picks or unpicks one card line of the reader's own done run; the stored picks are what the result draws next time. */
export async function pickUpgradeLineAction(runId: string, lineId: string, picked: boolean): Promise<SetPickResult | { ok: false; reason: "off" }> {
  const userId = await requireUserId();
  const env = await requestFlags(userId);
  if (!preconUpgradeEnabled(env)) return { ok: false, reason: "off" };
  if (!isRunId(runId)) return { ok: false, reason: "notFound" };
  if (!isLineId(lineId) || typeof picked !== "boolean") return { ok: false, reason: "unknownLine" };
  return setPick(userId, runId, lineId, picked);
}

/**
 * The brackets the reader's own done run permits with these of its adds and cuts picked, and the bracket that plays at (fresh start
 * R2): the Start dialog's bracket fact on the picked subset. Free: one profile build, no model call. The ids are oracle ids, held to
 * `picksShape` (arrays of uuids, none repeated, at most `MAX_SWAPS` a side) before anything is read; null on any refusal.
 */
export async function upgradeSetBracketAction(fileName: string, runId: string, addIds: unknown, cutIds: unknown): Promise<{ permits: number[]; bracket: number | null } | null> {
  const userId = await requireUserId();
  const env = await requestFlags(userId);
  if (!preconUpgradeEnabled(env) || !bounded(fileName, 200) || !isRunId(runId)) return null;
  const picks = picksShape({ adds: addIds, cuts: cutIds });
  if (!picks || picks.adds.length + picks.cuts.length === 0) return null;
  return readSetBracket(userId, fileName, runId, picks.adds, picks.cuts);
}
