import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }));
vi.mock("@sentry/nextjs", () => ({ logger: m }));

import { logEvent } from "./log-event";

beforeEach(() => vi.clearAllMocks());

describe("logEvent", () => {
  it("sends the event with its allowed attributes", () => {
    logEvent("card_scan.answered", { outcome: "sure", guesses: 3, ms: 41 });
    expect(m.info).toHaveBeenCalledWith("card_scan.answered", { outcome: "sure", guesses: 3, ms: 41 });
  });

  it("strips an email, a Clerk id, a disallowed key and an over-long string, and counts what it stripped", () => {
    logEvent("cron.run", {
      cron: "push-flush", result: "someone@example.com", owner: "user_2NNEqL2nrIRdJ194ndJqAHwEfxC", email: "x", mode: "a".repeat(65),
    }, "warn");
    expect(m.warn).toHaveBeenCalledWith("cron.run", { cron: "push-flush", stripped_attrs: 4 });
    expect(JSON.stringify(m.warn.mock.calls)).not.toMatch(/example|user_2N/);
  });

  it("never throws, even when the SDK does", () => {
    m.info.mockImplementationOnce(() => {
      throw new Error("boom");
    });
    expect(() => logEvent("deck.built", { cards: 1 })).not.toThrow();
  });
});
