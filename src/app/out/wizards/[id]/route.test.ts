import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const stub = vi.hoisted(() => ({
  userId: "user_1" as string | null,
  env: { ANNOUNCEMENTS_ENABLED: "true" } as Record<string, string>,
  rows: [] as { url: string }[],
  lookedUp: [] as unknown[],
}));
vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ userId: stub.userId }) }));
vi.mock("../../../../lib/switches/request", () => ({ requestSwitchEnv: async () => stub.env }));
vi.mock("../../../../lib/feed/home", async () => {
  // The host rule is the real one; the rest of Home's module (and the database it loads) stays out.
  const actual = await vi.importActual<typeof import("../../../../lib/feed/home")>("../../../../lib/feed/home");
  return { wizardsPostUrl: actual.wizardsPostUrl };
});
vi.mock("../../../../db", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: (w: unknown) => {
          stub.lookedUp.push(w);
          return { limit: async () => stub.rows };
        },
      }),
    }),
  },
}));

import { GET } from "./route";

const ORIGIN = "http://localhost";
const POST = "https://magic.wizards.com/en/news/announcements/secret-lair-x";
const get = (id: string) => GET(new NextRequest(`${ORIGIN}/out/wizards/${encodeURIComponent(id)}`), { params: Promise.resolve({ id }) });

beforeEach(() => {
  stub.userId = "user_1";
  stub.env = { ANNOUNCEMENTS_ENABLED: "true" };
  stub.rows = [{ url: POST }];
  stub.lookedUp = [];
});

describe("GET /out/wizards/[id]", () => {
  it("redirects a signed-in reader to the post on magic.wizards.com, temporarily and uncached", async () => {
    const res = await get("7aBcDe");
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(POST);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(stub.lookedUp).toHaveLength(1);
  });

  it("sends a request with no session to Home, before reading anything (defense in depth: the proxy signs them in first)", async () => {
    stub.userId = null;
    const res = await get("7aBcDe");
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(`${ORIGIN}/`);
    expect(stub.lookedUp).toHaveLength(0);
  });

  it("sends a reader with Announcements off to Home, before reading anything", async () => {
    stub.env = { ANNOUNCEMENTS_ENABLED: "false" };
    expect((await get("7aBcDe")).headers.get("location")).toBe(`${ORIGIN}/`);
    stub.env = {};
    expect((await get("7aBcDe")).headers.get("location")).toBe(`${ORIGIN}/`);
    expect(stub.lookedUp).toHaveLength(0);
  });

  it("sends an unknown id to Home", async () => {
    stub.rows = [];
    const res = await get("nope");
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(`${ORIGIN}/`);
  });

  it("never follows a stored address off magic.wizards.com, or not https", async () => {
    for (const url of ["https://evil.example/x", "http://magic.wizards.com/en/news/x", "https://magic.wizards.com.evil.com/x", "javascript:alert(1)", ""]) {
      stub.rows = [{ url }];
      expect((await get("7aBcDe")).headers.get("location"), url).toBe(`${ORIGIN}/`);
    }
  });

  it("looks up nothing for an id that is not a Contentful id's shape", async () => {
    for (const id of ["", "a/b", "a b", "x".repeat(65), "../x", "x.png"]) {
      expect((await get(id)).headers.get("location"), id).toBe(`${ORIGIN}/`);
    }
    expect(stub.lookedUp).toHaveLength(0);
  });
});
