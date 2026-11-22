import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ stamp: 5 as number | null, enabled: true }));
vi.mock("../cache/user-data-stamp", () => ({ userDataStamp: async () => h.stamp }));
vi.mock("../cache/list-cache-flag", () => ({ listCacheEnabled: () => h.enabled }));
vi.mock("../cache/catalog-generation", () => ({ catalogGeneration: async () => "g1" }));
vi.mock("../flags/resolve", () => ({ switchBits: () => "101" }));

const { savedListToken, tokenFor } = await import("./saved-token");

const ENV = {} as NodeJS.ProcessEnv;
const base = { userId: "user_a", stamp: 5, generation: "g1", deployment: "d1", switches: "101" };

describe("tokenFor", () => {
  it("is the same for the same inputs, and moves with each one", () => {
    const t = tokenFor(base);
    expect(tokenFor({ ...base })).toBe(t);
    for (const change of [{ userId: "user_b" }, { stamp: 6 }, { generation: "g2" }, { deployment: "d2" }, { switches: "100" }]) {
      expect(tokenFor({ ...base, ...change })).not.toBe(t);
    }
  });

  it("carries neither the Clerk id nor the stamp", () => {
    const t = tokenFor(base);
    expect(t).not.toContain("user_a");
    expect(t).toMatch(/^[A-Za-z0-9_-]{32}$/);
  });
});

describe("savedListToken", () => {
  beforeEach(() => {
    h.stamp = 5;
    h.enabled = true;
  });

  it("is a token while the list cache is on and the stamp reads", async () => {
    expect(await savedListToken("user_a", ENV)).toMatch(/^[A-Za-z0-9_-]{32}$/);
  });

  it("moves when the reader's data stamp does (an import, a scan, an edit)", async () => {
    const before = await savedListToken("user_a", ENV);
    h.stamp = 6;
    expect(await savedListToken("user_a", ENV)).not.toBe(before);
  });

  it("is never the same for two readers", async () => {
    expect(await savedListToken("user_a", ENV)).not.toBe(await savedListToken("user_b", ENV));
  });

  it("is null with the list cache off, or when the stamp cannot be read: no copy is kept or used", async () => {
    h.enabled = false;
    expect(await savedListToken("user_a", ENV)).toBeNull();
    h.enabled = true;
    h.stamp = null;
    expect(await savedListToken("user_a", ENV)).toBeNull();
  });
});
