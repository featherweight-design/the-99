import { beforeEach, describe, expect, it, vi } from "vitest";

const read = vi.hoisted(() => vi.fn());
const env = vi.hoisted(() => ({ value: { PUBLIC_PAGES_ENABLED: "true" } as Record<string, string> }));
const hit = vi.hoisted(() => vi.fn(async () => {}));

vi.mock("../../../lib/public/cached-card", () => ({ readPublicCard: read }));
vi.mock("../../../lib/switches/snapshot", () => ({ resolveSwitchEnv: vi.fn(async () => env.value as unknown as NodeJS.ProcessEnv) }));
vi.mock("../../../lib/rate/anon", () => ({ observeAnonymousHit: hit }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-real-ip": "203.0.113.9" }) }));
vi.mock("next/navigation", () => ({
  notFound: () => { throw new Error("NOT_FOUND"); },
  permanentRedirect: (to: string) => { throw new Error(`308 ${to}`); },
}));
vi.mock("../../../components/public/card-page", () => ({ PublicCardPage: () => null }));

import PublicCardRoute from "./page";

const route = (slug: string) => PublicCardRoute({ params: Promise.resolve({ slug }) });
const card = { name: "Sol Ring", printings: [] };

beforeEach(() => {
  read.mockReset();
  hit.mockClear();
  env.value = { PUBLIC_PAGES_ENABLED: "true" };
});

describe("the public card route", () => {
  it("answers 404, never a sign-in redirect, while the switch is off, and reads nothing", async () => {
    env.value = {};
    await expect(route("sol-ring-0b3f2c9e6a41")).rejects.toThrow("NOT_FOUND");
    expect(read).not.toHaveBeenCalled();
  });

  it("answers 404 for an unknown or ambiguous address", async () => {
    for (const kind of ["not-found", "ambiguous"]) {
      read.mockResolvedValue({ kind });
      await expect(route("x-0b3f2c9e6a41")).rejects.toThrow("NOT_FOUND");
    }
    expect(hit).not.toHaveBeenCalled();
  });

  it("308s a wrong name part to the canonical address", async () => {
    read.mockResolvedValue({ kind: "ok", card, canonicalSlug: "sol-ring-0b3f2c9e6a41" });
    await expect(route("sol-rnig-0b3f2c9e6a41")).rejects.toThrow("308 /card/sol-ring-0b3f2c9e6a41");
  });

  it("draws the canonical address and counts the anonymous read", async () => {
    read.mockResolvedValue({ kind: "ok", card, canonicalSlug: "sol-ring-0b3f2c9e6a41" });
    expect(await route("sol-ring-0b3f2c9e6a41")).toBeTruthy();
    expect(hit).toHaveBeenCalledTimes(1);
  });
});
