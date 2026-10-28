import { describe, expect, it, vi } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }));

import { shellUserId } from "./shell-session";

type Read = Parameters<typeof shellUserId>[0];
const reading = (impl: () => Promise<unknown>) => impl as unknown as Read;

describe("shellUserId", () => {
  it("reads the session the proxy saw", async () => {
    expect(await shellUserId(reading(async () => ({ userId: "user_1" })))).toBe("user_1");
    expect(await shellUserId(reading(async () => ({ userId: null })))).toBeNull();
  });

  it("draws signed out on a path the proxy skipped (a dotted 404), rather than throwing", async () => {
    const skipped = reading(async () => {
      // Clerk's own wording (`@clerk/nextjs` server/errors.js).
      throw new Error("Clerk: auth() was called but Clerk can't detect usage of clerkMiddleware(). Please ensure the following:");
    });
    expect(await shellUserId(skipped)).toBeNull();
  });

  it("throws every other error", async () => {
    await expect(shellUserId(reading(async () => { throw new Error("network down"); }))).rejects.toThrow("network down");
  });
});
