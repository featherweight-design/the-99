import { beforeEach, describe, expect, it, vi } from "vitest";

const read = vi.hoisted(() => vi.fn());
const env = vi.hoisted(() => ({ value: { PUBLIC_PAGES_ENABLED: "true" } as Record<string, string> }));
const hit = vi.hoisted(() => vi.fn(async () => {}));

vi.mock("../../../lib/public/cached-commander", () => ({ readPublicCommander: read }));
vi.mock("../../../lib/switches/snapshot", () => ({ resolveSwitchEnv: vi.fn(async () => env.value as unknown as NodeJS.ProcessEnv) }));
vi.mock("../../../lib/rate/anon", () => ({ observeAnonymousHit: hit }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-real-ip": "203.0.113.9" }) }));
vi.mock("next/navigation", () => ({
  notFound: () => { throw new Error("NOT_FOUND"); },
  permanentRedirect: (to: string) => { throw new Error(`308 ${to}`); },
}));
vi.mock("../../../components/public/commander-page", () => ({ PublicCommanderPage: () => null }));

import PublicCommanderRoute, { generateMetadata } from "./page";

const route = (slug: string) => PublicCommanderRoute({ params: Promise.resolve({ slug }) });
const commander = { name: "Zimone, Infinite Analyst", state: "ok" };

beforeEach(() => {
  read.mockReset();
  hit.mockClear();
  env.value = { PUBLIC_PAGES_ENABLED: "true" };
});

describe("the public commander route", () => {
  it("answers 404, never a sign-in redirect, while the switch is off, and reads nothing", async () => {
    env.value = {};
    await expect(route("zimone-infinite-analyst-0b3f2c9e6a41")).rejects.toThrow("NOT_FOUND");
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
    read.mockResolvedValue({ kind: "ok", commander, canonicalSlug: "zimone-infinite-analyst-0b3f2c9e6a41" });
    await expect(route("zimone-0b3f2c9e6a41")).rejects.toThrow("308 /commander/zimone-infinite-analyst-0b3f2c9e6a41");
  });

  it("draws the canonical address and counts the anonymous read", async () => {
    read.mockResolvedValue({ kind: "ok", commander, canonicalSlug: "zimone-infinite-analyst-0b3f2c9e6a41" });
    expect(await route("zimone-infinite-analyst-0b3f2c9e6a41")).toBeTruthy();
    expect(hit).toHaveBeenCalledTimes(1);
  });

  describe("its metadata (C2)", () => {
    const meta = (slug: string) => generateMetadata({ params: Promise.resolve({ slug }) });
    const zimone = {
      name: "Zimone, Infinite Analyst", typeLine: "Legendary Creature — Human Wizard", state: "ok",
      prose: "Zimone turns each X spell into a cheaper next one.", rank: 203, deckCount: 11687, tags: [],
    };

    it("is the commander's title, its sentence, its canonical address and a large-image card, from the same read", async () => {
      read.mockResolvedValue({ kind: "ok", commander: zimone, canonicalSlug: "zimone-infinite-analyst-0b3f2c9e6a41" });
      const m = await meta("zimone-0b3f2c9e6a41");
      expect(m.title).toBe("Zimone, Infinite Analyst · Commander · The 99");
      expect(m.description).toBe("Zimone turns each X spell into a cheaper next one.");
      expect(m.alternates?.canonical).toBe("/commander/zimone-infinite-analyst-0b3f2c9e6a41");
      expect(m.openGraph).toMatchObject({
        title: "Zimone, Infinite Analyst · Commander · The 99", url: "/commander/zimone-infinite-analyst-0b3f2c9e6a41", type: "website", siteName: "The 99",
      });
      expect(m.twitter).toMatchObject({ card: "summary_large_image", title: "Zimone, Infinite Analyst · Commander · The 99" });
      expect(read).toHaveBeenCalledWith("zimone-0b3f2c9e6a41");
      expect(hit).not.toHaveBeenCalled();
    });

    it("says nothing about a commander while the switch is off, or for an address that does not resolve", async () => {
      env.value = {};
      expect(await meta("zimone-infinite-analyst-0b3f2c9e6a41")).toEqual({});
      expect(read).not.toHaveBeenCalled();
      env.value = { PUBLIC_PAGES_ENABLED: "true" };
      for (const kind of ["not-found", "ambiguous"]) {
        read.mockResolvedValue({ kind });
        expect(await meta("x-0b3f2c9e6a41")).toEqual({});
      }
    });
  });
});
