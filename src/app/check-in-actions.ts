"use server";

import { db } from "../db";
import { playerFeedback } from "../db/schema";
import { requireUserId } from "../lib/auth";
import { countVisit, end, isDue, parseCheckIn, snooze } from "../lib/feedback/check-in-rule";
import { lockState, markShown, saveState } from "../lib/feedback/check-in-state";
import { feedbackEnabled } from "../lib/feedback/flag";
import { observeHit } from "../lib/rate/observe";
import { requestSwitchEnv } from "../lib/switches/request";

// The check-in on Home (flyer trial PR 6; handoff `Survey-Phone`, `Survey-Desktop`). Home is cached whole, so the due
// test is NOT in its payload: a small client component asks `checkInDue` after the page settles, which counts today's
// visit once per UTC day and says whether the sheet should open. Every action decides FEEDBACK_ENABLED for the reader
// and writes nothing when it is off. None of them revalidates a path (Home's cache is not touched by this state). The
// answers reach admin by name only, never a model prompt, so none of this goes through `playerText`.

export type CheckInOutcome = { ok: true } | { ok: false; reason: "invalid" | "off" };

async function enabledFor(userId: string): Promise<boolean> {
  return feedbackEnabled(await requestSwitchEnv(userId));
}

/** Counts this Home load (once per UTC day) and says whether the check-in is due. False while the switch is off. */
export async function checkInDue(): Promise<boolean> {
  const userId = await requireUserId();
  if (!(await enabledFor(userId))) return false;
  const now = new Date();
  return db.transaction(async (tx) => {
    const before = await lockState(tx, userId, now);
    const state = countVisit(before, now);
    if (state !== before) await saveState(tx, userId, state);
    const due = isDue(state, now);
    if (due && !before.shownAt) await markShown(tx, userId, now);
    return due;
  });
}

/** Send: one `check_in` feedback row and the check-in ends, in one transaction. Answered twice, it writes once. */
export async function sendCheckIn(input: { rating: unknown; uses: unknown; pod: unknown; note: unknown }): Promise<CheckInOutcome> {
  const userId = await requireUserId();
  if (!(await enabledFor(userId))) return { ok: false, reason: "off" };
  const answers = input && typeof input === "object" ? parseCheckIn(input) : null;
  if (!answers) return { ok: false, reason: "invalid" };
  await observeHit(userId, "feedback");
  const now = new Date();
  await db.transaction(async (tx) => {
    const state = await lockState(tx, userId, now);
    if (state.endedAt) return;
    await saveState(tx, userId, end(state, now));
    await tx.insert(playerFeedback).values({
      userId,
      kind: "check_in",
      answers: { rating: answers.rating, uses: answers.uses, pod: answers.pod, note: answers.note },
      source: "home",
    });
  });
  return { ok: true };
}

/** Not now (`snooze`) or the ✕ (`end`). */
export async function dismissCheckIn(how: "snooze" | "end"): Promise<CheckInOutcome> {
  const userId = await requireUserId();
  if (!(await enabledFor(userId))) return { ok: false, reason: "off" };
  if (how !== "snooze" && how !== "end") return { ok: false, reason: "invalid" };
  const now = new Date();
  await db.transaction(async (tx) => {
    const state = await lockState(tx, userId, now);
    await saveState(tx, userId, how === "snooze" ? snooze(state, now) : end(state, now));
  });
  return { ok: true };
}
