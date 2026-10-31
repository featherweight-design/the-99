"use server";

// Rule 0's setup (plan `2026-10-16-rule-zero.md` §PR 5): the reads that open it and the two writes that end it.
// Every action takes the reader from the session and decides `SOCIAL_FRIENDS_ENABLED` for THAT reader; off, a read answers
// null and a write `off`. The library re-checks everything it is handed (`setTable`, `reseatTable`): a member, a deck
// and the table are ids the client sent, never trusted. Nothing here names a social table.

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requireUserId } from "../../../lib/auth";
import { setterZone } from "../../../lib/rule-zero/rules";
import { socialFriendsEnabled } from "../../../lib/social/flag";
import { podSetup, reseatTable, setTable, tableSetup, type PodSetup, type TableSetup } from "../../../lib/social/rule-zero";
import { requestSwitchEnv } from "../../../lib/switches/request";

async function reader(): Promise<string | null> {
  const userId = await requireUserId();
  return socialFriendsEnabled(await requestSwitchEnv(userId)) ? userId : null;
}

export type SetupOutcome = { ok: true; tableId: string } | { ok: false; reason: "off" | "occupied" | "refused" };

/** Setup for one of the reader's pods (`Rule 0 check`), and whether the invite row is drawn. */
export async function loadPodSetupAction(podId: unknown): Promise<{ setup: PodSetup; invites: boolean } | null> {
  const userId = await requireUserId();
  const env = await requestSwitchEnv(userId);
  if (!socialFriendsEnabled(env)) return null;
  const setup = await podSetup(userId, podId);
  return setup ? { setup, invites: socialFriendsEnabled(env) } : null;
}

/** The setter's `Seats`: setup for the table, the seats kept, and whether the invite row is drawn. */
export async function loadTableSetupAction(tableId: unknown): Promise<{ setup: TableSetup; invites: boolean } | null> {
  const userId = await requireUserId();
  const env = await requestSwitchEnv(userId);
  if (!socialFriendsEnabled(env)) return null;
  const setup = await tableSetup(userId, tableId);
  return setup ? { setup, invites: socialFriendsEnabled(env) } : null;
}

/**
 * Set the table. A pod whose table is already open, with the reader seated at it, answers that table. `timeZone` is the
 * setter's browser zone, which decides the morning it closes; a missing or unknown one falls to Vercel's IP zone, then UTC.
 */
export async function setTableAction(podId: unknown, seats: unknown, timeZone?: unknown): Promise<SetupOutcome> {
  const userId = await reader();
  if (userId === null) return { ok: false, reason: "off" };
  const result = await setTable(userId, podId, seats, setterZone(timeZone, (await headers()).get("x-vercel-ip-timezone")));
  if (result.kind === "set" || result.kind === "open") {
    revalidatePath("/friends");
    return { ok: true, tableId: result.tableId };
  }
  return { ok: false, reason: result.kind === "occupied" ? "occupied" : "refused" };
}

/** The setter's `Seats`, saved. */
export async function reseatTableAction(tableId: unknown, seats: unknown): Promise<SetupOutcome> {
  const userId = await reader();
  if (userId === null) return { ok: false, reason: "off" };
  const result = await reseatTable(userId, tableId, seats);
  if (result.kind !== "reseated" || typeof tableId !== "string") return { ok: false, reason: "refused" };
  revalidatePath("/friends/table/[id]", "page");
  return { ok: true, tableId };
}
