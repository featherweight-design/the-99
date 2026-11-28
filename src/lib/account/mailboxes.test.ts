// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const { limit, captureServerError } = vi.hoisted(() => ({ limit: vi.fn(), captureServerError: vi.fn() }));
vi.mock("../../db", () => ({ db: { select: () => ({ from: () => ({ where: () => ({ limit }) }) }) } }));
vi.mock("../sentry/capture", () => ({ captureServerError }));

import { mailboxTaken } from "./mailboxes";

const keyed = { SENTRY_USER_HASH_KEY: "k".repeat(48) };
const noKey = { SENTRY_USER_HASH_KEY: "short" };

beforeEach(() => {
  limit.mockReset();
  captureServerError.mockReset();
});

describe("mailboxTaken", () => {
  it("is true when a row holds the address's mailbox, and reports nothing", async () => {
    limit.mockResolvedValue([{ userId: "u1" }]);
    expect(await mailboxTaken("a.b+x@gmail.com", keyed)).toBe(true);
    expect(captureServerError).not.toHaveBeenCalled();
  });
  it("is false when no row holds it", async () => {
    limit.mockResolvedValue([]);
    expect(await mailboxTaken("a@example.com", keyed)).toBe(false);
  });
  it("with no usable key skips the gate, reports it under a findable tag, and never reads the table", async () => {
    expect(await mailboxTaken("a@example.com", noKey)).toBe(false);
    expect(limit).not.toHaveBeenCalled();
    expect(captureServerError).toHaveBeenCalledTimes(1);
    const [tag, error] = captureServerError.mock.calls[0] as [string, Error];
    expect(tag).toBe("account-mailboxes:key");
    expect(error.message).not.toContain("a@example.com");
  });
  it("is false and silent for a string that is not an address, key or not", async () => {
    expect(await mailboxTaken("not an address", noKey)).toBe(false);
    expect(captureServerError).not.toHaveBeenCalled();
  });
});
