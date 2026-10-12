"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import { adminEvents, adminSettings } from "../../db/schema";
import { requireAdmin } from "../../lib/admin/access";
import { parseDollars, type SettingKey } from "../../lib/admin/costs-rule";

// The settings the Costs page writes (admin STATES C7, locked rule 11): the caps that live outside
// the code. Every export here calls `requireAdmin()` on its first line, so a stranger's press is
// the app's 404 (STATES D4); `actions.test.ts` reads this file and fails on an export that does
// not. Each write is ONE transaction: the setting, then its `setting_set` row in `admin_events`.

export type SettingResult = { ok: true } | { ok: false; error: "amount" | "date" | "month" | "note" | "failed" };

const NOTE_MAX = 500;

/** The trimmed note, null when empty, or `false` past the cap: refused, never cut short. */
function noteOf(value: unknown): string | null | false {
  const text = typeof value === "string" ? value.trim() : "";
  if (text.length > NOTE_MAX) return false;
  return text || null;
}

const todayUtc = (now: Date) => now.toISOString().slice(0, 10);

/** A real calendar day, written `YYYY-MM-DD`, no later than today (UTC). */
function dayOf(value: unknown, now: Date): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) return null;
  return value > todayUtc(now) ? null : value;
}

/**
 * A month written `YYYY-MM`, this UTC month or a later one, as the first day it applies from
 * (`YYYY-MM-01`): the day a setting that starts later is stored under.
 */
function startOf(value: unknown, now: Date): string | null {
  if (typeof value !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return null;
  return value < todayUtc(now).slice(0, 7) ? null : `${value}-01`;
}

const dollars = (micro: number) => (micro / 1_000_000).toFixed(2);

/**
 * Writes the setting for the month its `asOf` falls in, so a change never rewrites another month's
 * value (a cap holds from its month on; `settingsForMonth` reads it back).
 */
async function writeSetting(actorId: string, key: SettingKey, micro: number, asOf: string, note: string | null): Promise<SettingResult> {
  const month = asOf.slice(0, 7);
  try {
    await db.transaction(async (tx) => {
      const [before] = await tx
        .select()
        .from(adminSettings)
        .where(and(eq(adminSettings.key, key), eq(adminSettings.month, month)))
        .for("update");
      const row = { valueMicroUsd: micro, asOf, note, updatedBy: actorId, updatedAt: new Date() };
      await tx
        .insert(adminSettings)
        .values({ key, month, ...row })
        .onConflictDoUpdate({ target: [adminSettings.key, adminSettings.month], set: row });
      await tx.insert(adminEvents).values({
        actorId,
        kind: "setting_set",
        settingKey: key,
        settingMonth: month,
        oldValue: before ? dollars(before.valueMicroUsd) : null,
        newValue: dollars(micro),
        note,
      });
    });
  } catch (err) {
    console.error("admin setting write failed", key, err);
    return { ok: false, error: "failed" };
  }
  revalidatePath("/admin");
  return { ok: true };
}

/** What this ledger cannot see (the other environment, the other app), as read on `asOf`. */
export async function setElsewhere(input: { amount: unknown; asOf: unknown; note?: unknown }): Promise<SettingResult> {
  const { userId } = await requireAdmin();
  const now = new Date();
  const micro = typeof input?.amount === "string" ? parseDollars(input.amount) : null;
  if (micro === null) return { ok: false, error: "amount" };
  const asOf = dayOf(input.asOf, now);
  if (!asOf) return { ok: false, error: "date" };
  const note = noteOf(input.note);
  if (note === false) return { ok: false, error: "note" };
  return writeSetting(userId, "elsewhere_usd", micro, asOf, note);
}

/** The Anthropic account's monthly cap, as set in Anthropic's console. */
export async function setAccountCap(input: { amount: unknown; note?: unknown }): Promise<SettingResult> {
  const { userId } = await requireAdmin();
  const micro = typeof input?.amount === "string" ? parseDollars(input.amount) : null;
  if (micro === null) return { ok: false, error: "amount" };
  const note = noteOf(input.note);
  if (note === false) return { ok: false, error: "note" };
  return writeSetting(userId, "account_cap_usd", micro, todayUtc(new Date()), note);
}

/**
 * The monthly ceiling on system spend (evals, labels, prose, free rewrites), from the month it
 * starts: this UTC month or a later one, stored as that month's first day.
 */
export async function setSystemCeiling(input: { amount: unknown; start: unknown; note?: unknown }): Promise<SettingResult> {
  const { userId } = await requireAdmin();
  const micro = typeof input?.amount === "string" ? parseDollars(input.amount) : null;
  if (micro === null) return { ok: false, error: "amount" };
  const asOf = startOf(input.start, new Date());
  if (!asOf) return { ok: false, error: "month" };
  const note = noteOf(input.note);
  if (note === false) return { ok: false, error: "note" };
  return writeSetting(userId, "system_ceiling_usd", micro, asOf, note);
}
