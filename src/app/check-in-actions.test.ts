// The check-in's actions (flyer trial PR 6): the switch is decided for the READER and a refusal writes nothing; a visit is
// counted once per UTC day inside the locked transaction; Send writes ONE `check_in` row and ends the check-in; Not now
// snoozes and then ends; none of them revalidates anything.
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CheckInState } from "../lib/feedback/check-in-rule";

type Row = CheckInState & { shownAt: Date | null };
const m = vi.hoisted(() => ({
  requireUserId: vi.fn(),
  requestSwitchEnv: vi.fn(),
  observeHit: vi.fn(),
  lockState: vi.fn(),
  saveState: vi.fn(),
  markShown: vi.fn(),
  values: vi.fn(),
  insert: vi.fn(),
  transaction: vi.fn(),
  revalidatePath: vi.fn(),
}));
vi.mock("../lib/auth", () => ({ requireUserId: m.requireUserId }));
vi.mock("../lib/switches/request", () => ({ requestSwitchEnv: m.requestSwitchEnv }));
vi.mock("../lib/rate/observe", () => ({ observeHit: m.observeHit }));
vi.mock("../lib/feedback/check-in-state", () => ({ lockState: m.lockState, saveState: m.saveState, markShown: m.markShown }));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidatePath }));
vi.mock("../db", () => ({ db: { transaction: m.transaction } }));

import { checkInDue, dismissCheckIn, sendCheckIn } from "./check-in-actions";

const NOW = new Date("2026-10-15T10:00:00Z");
const row = (over: Partial<Row> = {}): Row => ({
  firstSeenAt: new Date("2026-10-01T10:00:00Z"),
  visitDays: 4,
  lastVisitDay: "2026-10-14",
  snoozes: 0,
  snoozedUntil: null,
  endedAt: null,
  shownAt: null,
  ...over,
});
const answers = { rating: 4, uses: ["Decks"], pod: "Yes", note: "Nice" };

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  m.requireUserId.mockResolvedValue("user_a");
  m.requestSwitchEnv.mockResolvedValue({ FEEDBACK_ENABLED: "true" });
  m.transaction.mockImplementation(async (run: (tx: unknown) => unknown) => run({ insert: m.insert }));
  m.insert.mockReturnValue({ values: m.values });
  m.values.mockResolvedValue(undefined);
});

describe("checkInDue", () => {
  it("counts today's visit and says due once the day makes the fifth", async () => {
    m.lockState.mockResolvedValue(row());
    expect(await checkInDue()).toBe(true);
    expect(m.saveState).toHaveBeenCalledWith(expect.anything(), "user_a", expect.objectContaining({ visitDays: 5, lastVisitDay: "2026-10-15" }));
    expect(m.markShown).toHaveBeenCalledTimes(1);
  });

  it("writes nothing for a second load on the same UTC day, and marks the first showing once", async () => {
    m.lockState.mockResolvedValue(row({ visitDays: 5, lastVisitDay: "2026-10-15", shownAt: new Date("2026-10-15T09:00:00Z") }));
    expect(await checkInDue()).toBe(true);
    expect(m.saveState).not.toHaveBeenCalled();
    expect(m.markShown).not.toHaveBeenCalled();
  });

  it("is not due before 14 days or 5 days, while snoozed, or once ended", async () => {
    m.lockState.mockResolvedValue(row({ visitDays: 1 }));
    expect(await checkInDue()).toBe(false);
    m.lockState.mockResolvedValue(row({ firstSeenAt: new Date("2026-10-10T10:00:00Z") }));
    expect(await checkInDue()).toBe(false);
    m.lockState.mockResolvedValue(row({ visitDays: 9, snoozedUntil: new Date("2026-10-16T00:00:00Z") }));
    expect(await checkInDue()).toBe(false);
    m.lockState.mockResolvedValue(row({ visitDays: 9, endedAt: new Date("2026-10-02T00:00:00Z") }));
    expect(await checkInDue()).toBe(false);
    expect(m.markShown).not.toHaveBeenCalled();
  });

  it("is false and touches nothing while the switch is off for the reader", async () => {
    m.requestSwitchEnv.mockResolvedValue({ FEEDBACK_ENABLED: "false" });
    expect(await checkInDue()).toBe(false);
    expect(m.transaction).not.toHaveBeenCalled();
    expect(m.requestSwitchEnv).toHaveBeenCalledWith("user_a");
  });

  it("needs a signed-in reader and never revalidates", async () => {
    m.requireUserId.mockRejectedValue(new Error("unauthenticated"));
    await expect(checkInDue()).rejects.toThrow("unauthenticated");
    m.requireUserId.mockResolvedValue("user_a");
    m.lockState.mockResolvedValue(row());
    await checkInDue();
    expect(m.revalidatePath).not.toHaveBeenCalled();
  });
});

describe("sendCheckIn", () => {
  it("writes ONE check_in row with the answers and ends the check-in", async () => {
    m.lockState.mockResolvedValue(row({ visitDays: 6 }));
    expect(await sendCheckIn(answers)).toEqual({ ok: true });
    expect(m.values).toHaveBeenCalledTimes(1);
    expect(m.values).toHaveBeenCalledWith({
      userId: "user_a",
      kind: "check_in",
      answers: { rating: 4, uses: ["Decks"], pod: "Yes", note: "Nice" },
      source: "home",
    });
    expect(m.saveState).toHaveBeenCalledWith(expect.anything(), "user_a", expect.objectContaining({ endedAt: NOW }));
    expect(m.observeHit).toHaveBeenCalledWith("user_a", "feedback");
  });

  it("writes nothing a second time once the check-in has ended", async () => {
    m.lockState.mockResolvedValue(row({ endedAt: new Date("2026-10-15T09:00:00Z") }));
    expect(await sendCheckIn(answers)).toEqual({ ok: true });
    expect(m.values).not.toHaveBeenCalled();
    expect(m.saveState).not.toHaveBeenCalled();
  });

  it("refuses, writing nothing, while the switch is off for the reader", async () => {
    m.requestSwitchEnv.mockResolvedValue({ FEEDBACK_ENABLED: "false" });
    expect(await sendCheckIn(answers)).toEqual({ ok: false, reason: "off" });
    expect(m.transaction).not.toHaveBeenCalled();
  });

  it("refuses a bad rating, use, pod or note, writing nothing", async () => {
    for (const bad of [{ rating: null }, { rating: 6 }, { uses: ["Admin"] }, { pod: "No" }, { note: "x".repeat(1001) }]) {
      expect(await sendCheckIn({ ...answers, ...bad })).toEqual({ ok: false, reason: "invalid" });
    }
    expect(m.transaction).not.toHaveBeenCalled();
  });
});

describe("dismissCheckIn", () => {
  it("snoozes three days on Not now", async () => {
    m.lockState.mockResolvedValue(row());
    expect(await dismissCheckIn("snooze")).toEqual({ ok: true });
    expect(m.saveState).toHaveBeenCalledWith(
      expect.anything(),
      "user_a",
      expect.objectContaining({ snoozes: 1, snoozedUntil: new Date("2026-10-18T10:00:00Z"), endedAt: null }),
    );
  });

  it("ends the check-in on the Not now after the third snooze", async () => {
    m.lockState.mockResolvedValue(row({ snoozes: 3 }));
    await dismissCheckIn("snooze");
    expect(m.saveState).toHaveBeenCalledWith(expect.anything(), "user_a", expect.objectContaining({ endedAt: NOW }));
  });

  it("ends it on the ✕, and writes no feedback row", async () => {
    m.lockState.mockResolvedValue(row());
    await dismissCheckIn("end");
    expect(m.saveState).toHaveBeenCalledWith(expect.anything(), "user_a", expect.objectContaining({ endedAt: NOW }));
    expect(m.values).not.toHaveBeenCalled();
  });

  it("refuses while the switch is off, and an unknown way", async () => {
    m.requestSwitchEnv.mockResolvedValue({ FEEDBACK_ENABLED: "false" });
    expect(await dismissCheckIn("end")).toEqual({ ok: false, reason: "off" });
    m.requestSwitchEnv.mockResolvedValue({ FEEDBACK_ENABLED: "true" });
    expect(await dismissCheckIn("later" as never)).toEqual({ ok: false, reason: "invalid" });
    expect(m.saveState).not.toHaveBeenCalled();
  });
});
