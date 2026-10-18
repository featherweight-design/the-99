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

import PublicCardRoute, { generateMetadata } from "./page";

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

  describe("its metadata (C2)", () => {
    const meta = (slug: string) => generateMetadata({ params: Promise.resolve({ slug }) });
    const sol = {
      name: "Sol Ring", typeLine: "Artifact", faces: [{ name: "Sol Ring", typeLine: "Artifact" }], oracleText: "{T}: Add {C}{C}.", printings: [],
    };

    it("is the card's title, description, canonical address and large-image card, from the same read", async () => {
      read.mockResolvedValue({ kind: "ok", card: sol, canonicalSlug: "sol-ring-6ad8011d3471" });
      const m = await meta("sol-rnig-6ad8011d3471");
      expect(m.title).toBe("Sol Ring · The 99");
      expect(m.description).toBe("Artifact. {T}: Add {C}{C}.");
      expect(m.alternates?.canonical).toBe("/card/sol-ring-6ad8011d3471");
      expect(m.openGraph).toMatchObject({ title: "Sol Ring · The 99", url: "/card/sol-ring-6ad8011d3471", type: "website", siteName: "The 99" });
      expect(m.twitter).toMatchObject({ card: "summary_large_image", title: "Sol Ring · The 99" });
      expect(read).toHaveBeenCalledWith("sol-rnig-6ad8011d3471");
      // The metadata counts nothing: the page does, once.
      expect(hit).not.toHaveBeenCalled();
    });

    it("says nothing about a card while the switch is off, or for an address that does not resolve", async () => {
      env.value = {};
      expect(await meta("sol-ring-6ad8011d3471")).toEqual({});
      expect(read).not.toHaveBeenCalled();
      env.value = { PUBLIC_PAGES_ENABLED: "true" };
      for (const kind of ["not-found", "ambiguous"]) {
        read.mockResolvedValue({ kind });
        expect(await meta("x-0b3f2c9e6a41")).toEqual({});
      }
    });
  });
});
