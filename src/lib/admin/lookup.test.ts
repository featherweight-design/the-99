// The exact-email lookup (Admin R3, D10 to D12): an account id or nothing, never a name or an email.
import { describe, expect, it, vi } from "vitest";
import type { IdentityDeps } from "./accounts";
import { lookUpAccountIn, normalizeEmail } from "./lookup";

const user = (id: string, ...emails: string[]) => ({ id, emailAddresses: emails.map((emailAddress) => ({ emailAddress })) });
const deps = (found: unknown[] | Error): IdentityDeps & { findByEmail: ReturnType<typeof vi.fn> } => ({
  getUser: vi.fn(),
  findByEmail: vi.fn(async () => {
    if (found instanceof Error) throw found;
    return found as never;
  }),
  deadlineMs: 1000,
});

describe("normalizeEmail", () => {
  it("trims and case-folds an address with one @ and text on both sides, and refuses anything else", () => {
    expect(normalizeEmail(" Colin@Gmail.com ")).toBe("colin@gmail.com");
    for (const bad of ["colin", "@gmail.com", "colin@", "a@b@c.com", "", "   "]) expect(normalizeEmail(bad)).toBeNull();
  });
});

describe("lookUpAccountIn", () => {
  it("answers the one account holding the address exactly, by id alone", async () => {
    const d = deps([user("user_colin", "colin@gmail.com")]);
    const r = await lookUpAccountIn(" Colin@Gmail.com ", d);
    expect(r).toEqual({ kind: "hit", id: "user_colin" });
    expect(d.findByEmail).toHaveBeenCalledWith("colin@gmail.com");
  });

  it("misses a near address Clerk returns, two holders, and nothing found", async () => {
    expect(await lookUpAccountIn("olin@gmail.com", deps([user("user_colin", "colin@gmail.com")]))).toEqual({ kind: "miss" });
    expect(await lookUpAccountIn("colin@gmail", deps([]))).toEqual({ kind: "miss" });
    expect(await lookUpAccountIn("c@x.com", deps([user("a", "c@x.com"), user("b", "c@x.com")]))).toEqual({ kind: "miss" });
  });

  it("misses a malformed input without asking Clerk", async () => {
    for (const bad of ["colin", "@gmail.com", 42, null]) {
      const d = deps([user("user_colin", "colin@gmail.com")]);
      expect(await lookUpAccountIn(bad, d)).toEqual({ kind: "miss" });
      expect(d.findByEmail).not.toHaveBeenCalled();
    }
  });

  it("answers failed when Clerk throws, carrying nothing", async () => {
    expect(await lookUpAccountIn("colin@gmail.com", deps(new Error("clerk down")))).toEqual({ kind: "failed" });
  });
});
