// Report a problem's action (flyer trial PR 5): the switch is decided for the READER, a bad report writes nothing, and a
// good one writes ONE `problem` row carrying a path-only page, a coarse device line and the error's ids.
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  currentUserId: vi.fn(),
  resolveSwitchEnv: vi.fn(),
  overAnonymousLimit: vi.fn(),
  requestSwitchEnv: vi.fn(),
  observeHit: vi.fn(),
  headers: vi.fn(),
  values: vi.fn(),
  insert: vi.fn(),
}));
vi.mock("../lib/auth", () => ({ currentUserId: m.currentUserId }));
vi.mock("../lib/switches/snapshot", () => ({ resolveSwitchEnv: m.resolveSwitchEnv }));
vi.mock("../lib/rate/anon", () => ({ overAnonymousLimit: m.overAnonymousLimit }));
vi.mock("../lib/switches/request", () => ({ requestSwitchEnv: m.requestSwitchEnv }));
vi.mock("../lib/rate/observe", () => ({ observeHit: m.observeHit }));
vi.mock("next/headers", () => ({ headers: m.headers }));
vi.mock("../db", () => ({ db: { insert: m.insert } }));

import { sendProblemReport } from "./feedback-actions";

const input = { what: "Blank page", doing: "Pressing Apply", page: "/decks/abc?x=1", source: "error", digest: "d1", sentryEventId: "e1" };

beforeEach(() => {
  vi.resetAllMocks();
  m.currentUserId.mockResolvedValue("user_a");
  m.resolveSwitchEnv.mockResolvedValue({ FEEDBACK_ENABLED: "true" });
  m.overAnonymousLimit.mockResolvedValue(false);
  m.requestSwitchEnv.mockResolvedValue({ FEEDBACK_ENABLED: "true" });
  m.headers.mockResolvedValue(new Headers({ "user-agent": "Mozilla/5.0 (Windows NT 10.0) Chrome/130.0 Safari/537.36" }));
  m.values.mockResolvedValue(undefined);
  m.insert.mockReturnValue({ values: m.values });
});

describe("sendProblemReport", () => {
  it("writes one problem row for the signed-in reader", async () => {
    expect(await sendProblemReport(input)).toEqual({ ok: true });
    expect(m.insert).toHaveBeenCalledTimes(1);
    expect(m.values).toHaveBeenCalledWith({
      userId: "user_a",
      kind: "problem",
      answers: { what: "Blank page", doing: "Pressing Apply" },
      page: "/decks/abc",
      device: "Chrome on Windows",
      digest: "d1",
      sentryEventId: "e1",
      source: "error",
    });
    expect(m.observeHit).toHaveBeenCalledWith("user_a", "feedback");
  });

  it("refuses, writing nothing, while the switch is off for the reader", async () => {
    m.requestSwitchEnv.mockResolvedValue({ FEEDBACK_ENABLED: "false" });
    expect(await sendProblemReport(input)).toEqual({ ok: false, reason: "off" });
    expect(m.insert).not.toHaveBeenCalled();
  });

  it("refuses an empty first box, an over-long one and a non-string, writing nothing", async () => {
    expect(await sendProblemReport({ ...input, what: "  " })).toEqual({ ok: false, reason: "invalid" });
    expect(await sendProblemReport({ ...input, what: "x".repeat(2001) })).toEqual({ ok: false, reason: "invalid" });
    expect(await sendProblemReport({ ...input, doing: 5 })).toEqual({ ok: false, reason: "invalid" });
    expect(m.insert).not.toHaveBeenCalled();
  });

  it("will not let a signed-in reader file under the signed-out source", async () => {
    expect(await sendProblemReport({ ...input, source: "report" })).toEqual({ ok: false, reason: "invalid" });
    expect(m.insert).not.toHaveBeenCalled();
  });

  it("never asks the anonymous limiter for a signed-in reader", async () => {
    await sendProblemReport(input);
    expect(m.overAnonymousLimit).not.toHaveBeenCalled();
    expect(m.resolveSwitchEnv).not.toHaveBeenCalled();
  });
});

describe("sendProblemReport signed out", () => {
  beforeEach(() => {
    m.currentUserId.mockResolvedValue(null);
  });

  it("writes one unowned row from the report door with a coarse device line and no address", async () => {
    m.headers.mockResolvedValue(
      new Headers({ "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Version/17.0 Safari/604.1", "x-real-ip": "203.0.113.9" }),
    );
    expect(await sendProblemReport({ ...input, source: "error" })).toEqual({ ok: true });
    expect(m.values).toHaveBeenCalledWith({
      userId: null,
      kind: "problem",
      answers: { what: "Blank page", doing: "Pressing Apply" },
      page: "/decks/abc",
      device: "Safari on iPhone",
      digest: "d1",
      sentryEventId: "e1",
      source: "report",
    });
    expect(JSON.stringify(m.values.mock.calls)).not.toContain("203.0.113.9");
    expect(m.requestSwitchEnv).not.toHaveBeenCalled();
    expect(m.observeHit).not.toHaveBeenCalled();
    expect(m.resolveSwitchEnv).toHaveBeenCalledWith(null);
  });

  it("refuses, writing nothing, while the switch is off", async () => {
    m.resolveSwitchEnv.mockResolvedValue({ FEEDBACK_ENABLED: "false" });
    expect(await sendProblemReport(input)).toEqual({ ok: false, reason: "off" });
    expect(m.insert).not.toHaveBeenCalled();
  });

  it("refuses over the hourly cap, writing nothing", async () => {
    m.overAnonymousLimit.mockImplementation(async (_h: unknown, bucket: string) => bucket === "report-anon");
    expect(await sendProblemReport(input)).toEqual({ ok: false, reason: "limited" });
    expect(m.insert).not.toHaveBeenCalled();
    // The day is not spent on a visit the hour refused.
    expect(m.overAnonymousLimit.mock.calls.map((c: unknown[]) => c[1])).toEqual(["report-anon"]);
  });

  it("refuses over the daily cap, writing nothing", async () => {
    m.overAnonymousLimit.mockImplementation(async (_h: unknown, bucket: string) => bucket === "report-anon-day");
    expect(await sendProblemReport(input)).toEqual({ ok: false, reason: "limited" });
    expect(m.insert).not.toHaveBeenCalled();
  });

  it("refuses bad input without counting a hit", async () => {
    expect(await sendProblemReport({ ...input, what: "  " })).toEqual({ ok: false, reason: "invalid" });
    expect(await sendProblemReport({ ...input, doing: 5 })).toEqual({ ok: false, reason: "invalid" });
    expect(m.overAnonymousLimit).not.toHaveBeenCalled();
    expect(m.insert).not.toHaveBeenCalled();
  });
});
