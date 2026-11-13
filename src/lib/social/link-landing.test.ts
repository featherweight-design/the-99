import { beforeEach, describe, expect, it, vi } from "vitest";

/** `readLinkLanding` against scripted reads: the key-and-owner row, then the friendship rows and the reader's request. */
const h = vi.hoisted(() => ({ selects: [] as unknown[][], ownerOn: true, count: null as { out: boolean } | null | "throw" }));
vi.mock("../../db", () => {
  const chain = (): unknown => {
    const p: object = new Proxy(function () {}, {
      get(_t, key) {
        if (key === "then") return (ok: (v: unknown) => unknown, bad: (e: unknown) => unknown) => Promise.resolve(h.selects.shift() ?? []).then(ok, bad);
        return () => p;
      },
    });
    return p;
  };
  return { db: { select: () => chain() } };
});
vi.mock("../flags/snapshot", () => ({ resolveFlagsStrict: async () => (h.ownerOn ? { FRIEND_LINKS_ENABLED: "true" } : {}) }));
vi.mock("../invites/read", () => ({
  loadInviteCount: async () => { if (h.count === "throw") throw new Error("down"); return h.count; },
}));

import { readLinkLanding } from "./link-landing";

const TOKEN = "A".repeat(22);
const SECRET = "a".repeat(64);
const OWNER = { ownerId: "owner", publicId: "p-owner", displayName: "Wren", commanderOracleId: null, commanderName: null, commanderArt: null };

beforeEach(() => {
  h.selects = [];
  h.ownerOn = true;
  h.count = { out: false };
});

describe("readLinkLanding", () => {
  it("reads nothing for a token that is not a link, or without the key", async () => {
    expect(await readLinkLanding("me", "short", SECRET)).toBeNull();
    expect(await readLinkLanding("me", TOKEN, null)).toBeNull();
  });

  it("reads nothing for a reset or unknown link, or an owner with the switch off", async () => {
    h.selects = [[]];
    expect(await readLinkLanding("me", TOKEN, SECRET)).toBeNull();
    h.selects = [[OWNER]];
    h.ownerOn = false;
    expect(await readLinkLanding("me", TOKEN, SECRET)).toBeNull();
  });

  it("names the owner signed out, out of invites when the count cannot be read", async () => {
    h.selects = [[OWNER]];
    h.count = { out: false };
    expect(await readLinkLanding(null, TOKEN, SECRET)).toMatchObject({ owner: { publicId: "p-owner" }, outOfInvites: false });
    h.selects = [[OWNER]];
    h.count = "throw";
    expect(await readLinkLanding(null, TOKEN, SECRET)).toMatchObject({ outOfInvites: true });
  });

  it("reads the reader's own link as self", async () => {
    h.selects = [[OWNER]];
    expect(await readLinkLanding("owner", TOKEN, SECRET)).toMatchObject({ self: true });
  });

  it("counts friends only with both directed rows, and dates a request sent before", async () => {
    const sentAt = new Date("2026-11-10T12:00:00Z");
    h.selects = [[OWNER], [{ userId: "me" }], [{ sentAt }]];
    expect(await readLinkLanding("me", TOKEN, SECRET)).toMatchObject({ self: false, friends: false, sentAt });
    h.selects = [[OWNER], [{ userId: "me" }, { userId: "owner" }], []];
    expect(await readLinkLanding("me", TOKEN, SECRET)).toMatchObject({ friends: true, sentAt: null });
  });
});
