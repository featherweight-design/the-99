import { beforeEach, describe, expect, it, vi } from "vitest";

// The Feedback tab's actions, run: a non-admin reaches nothing (the gate rejects before any read or write), the switch
// is re-checked on every Load more, and the arguments are handed to the library untrusted.
const gate = vi.fn(async () => ({ userId: "user_admin", env: "staging" as const }));
const markFeedbackRead = vi.fn(async (_id: unknown): Promise<{ ok: true; changed: boolean } | { ok: false }> => ({ ok: true, changed: true }));
const readFeedback = vi.fn(async (_o: unknown) => ({ rows: [{ id: "r1" }], hasMore: true }));
const enabled = { on: true };
const requestFlags = vi.fn(async (_userId: string) => ({}) as NodeJS.ProcessEnv);

vi.mock("../../../lib/admin/access", () => ({ requireAdmin: () => gate() }));
vi.mock("../../../lib/admin/feedback", () => ({
  markFeedbackRead: (id: unknown) => markFeedbackRead(id),
  readFeedback: (o: unknown) => readFeedback(o),
}));
vi.mock("../../../lib/feedback/flag", () => ({ feedbackEnabled: () => enabled.on }));
vi.mock("../../../lib/flags/request", () => ({ requestFlags: (u: string) => requestFlags(u) }));

const { markRead, loadMore } = await import("./actions");

const notFound = () => new Error("NEXT_NOT_FOUND");

beforeEach(() => {
  vi.clearAllMocks();
  gate.mockImplementation(async () => ({ userId: "user_admin", env: "staging" as const }));
  markFeedbackRead.mockImplementation(async () => ({ ok: true, changed: true }));
  enabled.on = true;
});

describe("a non-admin reaches nothing", () => {
  it("markRead rejects and writes nothing", async () => {
    gate.mockImplementation(async () => {
      throw notFound();
    });
    await expect(markRead("11111111-1111-4111-8111-111111111111")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(requestFlags).not.toHaveBeenCalled();
    expect(markFeedbackRead).not.toHaveBeenCalled();
  });

  it("loadMore rejects and reads nothing, not even the switch", async () => {
    gate.mockImplementation(async () => {
      throw notFound();
    });
    await expect(loadMore("all", 50)).rejects.toThrow("NEXT_NOT_FOUND");
    expect(requestFlags).not.toHaveBeenCalled();
    expect(readFeedback).not.toHaveBeenCalled();
  });
});

describe("markRead", () => {
  it("hands the id to the library untouched and answers ok", async () => {
    expect(await markRead("abc")).toEqual({ ok: true });
    expect(markFeedbackRead).toHaveBeenCalledWith("abc");
  });

  it("writes nothing with the switch off", async () => {
    enabled.on = false;
    expect(await markRead("abc")).toEqual({ ok: false });
    expect(markFeedbackRead).not.toHaveBeenCalled();
  });

  it("answers not ok when the library refuses the id or throws", async () => {
    markFeedbackRead.mockImplementationOnce(async () => ({ ok: false }));
    expect(await markRead("x")).toEqual({ ok: false });
    markFeedbackRead.mockImplementationOnce(async () => {
      throw new Error("db down");
    });
    expect(await markRead("y")).toEqual({ ok: false });
  });
});

describe("loadMore", () => {
  it("reads nothing with the switch off", async () => {
    enabled.on = false;
    expect(await loadMore("all", 50)).toEqual({ ok: false });
    expect(readFeedback).not.toHaveBeenCalled();
  });

  it("hands the filter and a numeric offset on, and only the rows and hasMore back", async () => {
    const out = await loadMore("problem", 50);
    expect(readFeedback).toHaveBeenCalledWith({ filter: "problem", offset: 50 });
    expect(out).toEqual({ ok: true, rows: [{ id: "r1" }], hasMore: true });
  });

  it("treats a non-number offset as zero, and a failed read as not ok", async () => {
    await loadMore("all", "50; drop table feedback");
    expect(readFeedback).toHaveBeenCalledWith({ filter: "all", offset: 0 });
    readFeedback.mockImplementationOnce(async () => {
      throw new Error("db down");
    });
    expect(await loadMore("all", 0)).toEqual({ ok: false });
  });
});
