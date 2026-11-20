import { beforeEach, describe, expect, it, vi } from "vitest";

// A stand-in launch list keyed by unsubscribe hash: the delete removes the row whose hash is named, and returns it.
const m = vi.hoisted(() => ({ rows: [] as { email: string; hash: string | null }[], asked: [] as string[] }));
vi.mock("drizzle-orm", async (orig) => ({ ...(await orig<typeof import("drizzle-orm")>()), eq: (_col: unknown, value: unknown) => value }));
vi.mock("../../db", () => ({
  db: {
    delete: () => ({
      where: (hash: string) => ({
        returning: async () => {
          m.asked.push(hash);
          const gone = m.rows.filter((r) => r.hash === hash);
          m.rows = m.rows.filter((r) => r.hash !== hash);
          return gone.map((r) => ({ email: r.email }));
        },
      }),
    }),
  },
}));

import { tokenShaped, unsubscribeByToken, unsubscribeHash, unsubscribeToken, unsubscribeUrl } from "./launch-unsubscribe";

const SECRET = "b".repeat(64);
const tokenOf = (email: string) => unsubscribeToken(SECRET, email);

beforeEach(() => {
  m.rows = [
    { email: "a@x.dev", hash: unsubscribeHash(tokenOf("a@x.dev")) },
    { email: "b@x.dev", hash: null },
  ];
  m.asked = [];
});

describe("unsubscribeToken", () => {
  it("is 43 base64url characters, the same for the same address however it is cased", () => {
    const t = tokenOf("A@X.dev");
    expect(tokenShaped(t)).toBe(true);
    expect(t).toBe(tokenOf("a@x.dev"));
    expect(t).not.toBe(tokenOf("b@x.dev"));
  });

  it("carries no address in the link, and the row stores only its hash", () => {
    const url = unsubscribeUrl("https://the-99.dev", SECRET, "a@x.dev");
    expect(url).toMatch(/^https:\/\/the-99\.dev\/unsubscribe\?t=[A-Za-z0-9_-]{43}$/);
    expect(url).not.toContain("a@");
    expect(unsubscribeHash(tokenOf("a@x.dev"))).not.toBe(tokenOf("a@x.dev"));
  });
});

describe("unsubscribeByToken", () => {
  it("deletes the address the token names", async () => {
    expect(await unsubscribeByToken(tokenOf("a@x.dev"))).toEqual({ outcome: "done", matched: true });
    expect(m.rows.map((r) => r.email)).toEqual(["b@x.dev"]);
  });

  it("answers done for a well-formed token that names no row, and deletes nothing", async () => {
    expect(await unsubscribeByToken(tokenOf("b@x.dev"))).toEqual({ outcome: "done", matched: false });
    expect(m.rows).toHaveLength(2);
  });

  it("is broken for a missing or malformed token, and asks nothing", async () => {
    expect(await unsubscribeByToken(undefined)).toEqual({ outcome: "broken", matched: false });
    expect(await unsubscribeByToken("short")).toEqual({ outcome: "broken", matched: false });
    expect(m.asked).toEqual([]);
  });
});
