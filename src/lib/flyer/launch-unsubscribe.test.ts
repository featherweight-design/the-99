import { beforeEach, describe, expect, it, vi } from "vitest";

// A stand-in launch list: the select returns every address, the delete removes the one named.
const m = vi.hoisted(() => ({ rows: [] as { email: string }[], deleted: [] as string[] }));
vi.mock("drizzle-orm", async (orig) => ({ ...(await orig<typeof import("drizzle-orm")>()), eq: (_col: unknown, value: unknown) => value }));
vi.mock("../../db", () => ({
  db: {
    select: () => ({ from: async () => m.rows }),
    delete: () => ({
      where: async (value: string) => {
        m.deleted.push(value);
        m.rows = m.rows.filter((r) => r.email !== value);
      },
    }),
  },
}));

import { tokenShaped, unsubscribeByToken, unsubscribeToken, unsubscribeUrl } from "./launch-unsubscribe";

const SECRET = "b".repeat(64);
const ENV = { INVITE_CODE_SECRET: SECRET };

beforeEach(() => {
  m.rows = [{ email: "a@x.dev" }, { email: "b@x.dev" }];
  m.deleted = [];
});

describe("unsubscribeToken", () => {
  it("is 43 base64url characters, the same for the same address however it is cased", () => {
    const t = unsubscribeToken(SECRET, "A@X.dev");
    expect(tokenShaped(t)).toBe(true);
    expect(t).toBe(unsubscribeToken(SECRET, "a@x.dev"));
    expect(t).not.toBe(unsubscribeToken(SECRET, "b@x.dev"));
  });

  it("carries no address in the link", () => {
    const url = unsubscribeUrl("https://the-99.dev", SECRET, "a@x.dev");
    expect(url).toMatch(/^https:\/\/the-99\.dev\/unsubscribe\?t=[A-Za-z0-9_-]{43}$/);
    expect(url).not.toContain("x.dev/");
    expect(url).not.toContain("a@");
  });
});

describe("unsubscribeByToken", () => {
  it("deletes the address the token names", async () => {
    expect(await unsubscribeByToken(unsubscribeToken(SECRET, "a@x.dev"), ENV)).toBe("done");
    expect(m.deleted).toEqual(["a@x.dev"]);
    expect(m.rows).toEqual([{ email: "b@x.dev" }]);
  });

  it("answers done for a well-formed token that names no row, and deletes nothing", async () => {
    expect(await unsubscribeByToken(unsubscribeToken(SECRET, "gone@x.dev"), ENV)).toBe("done");
    expect(m.deleted).toEqual([]);
  });

  it("is broken for a missing or malformed token, or with no secret, and reads nothing", async () => {
    expect(await unsubscribeByToken(undefined, ENV)).toBe("broken");
    expect(await unsubscribeByToken("short", ENV)).toBe("broken");
    expect(await unsubscribeByToken(unsubscribeToken(SECRET, "a@x.dev"), {})).toBe("broken");
    expect(m.deleted).toEqual([]);
  });
});
