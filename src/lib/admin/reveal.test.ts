import { describe, expect, it, vi } from "vitest";
import { REVEAL_MS, revealAccountIn, type RevealDeps } from "./reveal";

const AT = new Date("2026-10-17T19:37:00Z");
const colin = { id: "user_colin", name: "Colin Reyes", email: "colin.reyes@gmail.com" };

function deps(over: Partial<RevealDeps> = {}) {
  const calls: string[] = [];
  const d: RevealDeps = {
    readIdentity: vi.fn(async (id: string) => {
      calls.push(`read:${id}`);
      return colin;
    }),
    logReveal: vi.fn(async (actor: string, account: string) => {
      calls.push(`log:${actor}:${account}`);
      return AT;
    }),
    ...over,
  };
  return { d, calls };
}

describe("revealAccountIn (Admin R3, D5 to D8)", () => {
  it("reads Clerk, logs the reveal, then answers the whole name and email with when it hides", async () => {
    const { d, calls } = deps();
    const out = await revealAccountIn("user_admin", "user_colin", d);
    expect(calls).toEqual(["read:user_colin", "log:user_admin:user_colin"]);
    expect(out).toEqual({ ok: true, id: "user_colin", name: "Colin Reyes", email: "colin.reyes@gmail.com", hidesAt: new Date(AT.getTime() + REVEAL_MS).toISOString() });
    expect(REVEAL_MS).toBe(5 * 60 * 1000);
  });

  it("refuses an empty or non-string id, asking Clerk nothing and logging nothing", async () => {
    for (const id of ["", "  ", 42, null, "x".repeat(201)]) {
      const { d, calls } = deps();
      expect(await revealAccountIn("user_admin", id, d)).toEqual({ ok: false, error: "invalid" });
      expect(calls).toEqual([]);
    }
  });

  it("shows and logs nothing when Clerk has no such account or fails", async () => {
    for (const readIdentity of [async () => null, async () => Promise.reject(new Error("clerk down"))]) {
      const { d, calls } = deps({ readIdentity });
      vi.spyOn(console, "error").mockImplementation(() => {});
      expect(await revealAccountIn("user_admin", "user_colin", d)).toEqual({ ok: false, error: "failed" });
      expect(calls.filter((c) => c.startsWith("log:"))).toEqual([]);
    }
  });

  it("answers failed with no raw value when the log cannot be written (A6, must-not)", async () => {
    const { d } = deps({ logReveal: async () => Promise.reject(new Error("db down")) });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const out = await revealAccountIn("user_admin", "user_colin", d);
    expect(out).toEqual({ ok: false, error: "failed" });
    expect(JSON.stringify(out)).not.toMatch(/Colin|colin\.reyes/);
  });
});
