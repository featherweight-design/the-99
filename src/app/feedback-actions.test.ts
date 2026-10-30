// Report a problem's action (flyer trial PR 5): the switch is decided for the READER, a bad report writes nothing, and a
// good one writes ONE `problem` row carrying a path-only page, a coarse device line and the error's ids.
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  requireUserId: vi.fn(),
  requestSwitchEnv: vi.fn(),
  observeHit: vi.fn(),
  headers: vi.fn(),
  values: vi.fn(),
  insert: vi.fn(),
}));
vi.mock("../lib/auth", () => ({ requireUserId: m.requireUserId }));
vi.mock("../lib/switches/request", () => ({ requestSwitchEnv: m.requestSwitchEnv }));
vi.mock("../lib/rate/observe", () => ({ observeHit: m.observeHit }));
vi.mock("next/headers", () => ({ headers: m.headers }));
vi.mock("../db", () => ({ db: { insert: m.insert } }));

import { sendProblemReport } from "./feedback-actions";

const input = { what: "Blank page", doing: "Pressing Apply", page: "/decks/abc?x=1", source: "error", digest: "d1", sentryEventId: "e1" };

beforeEach(() => {
  vi.resetAllMocks();
  m.requireUserId.mockResolvedValue("user_a");
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

  it("needs a signed-in reader", async () => {
    m.requireUserId.mockRejectedValue(new Error("unauthenticated"));
    await expect(sendProblemReport(input)).rejects.toThrow("unauthenticated");
    expect(m.insert).not.toHaveBeenCalled();
  });
});
