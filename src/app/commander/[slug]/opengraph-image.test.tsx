// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const read = vi.hoisted(() => vi.fn());
const env = vi.hoisted(() => ({ value: { PUBLIC_PAGES_ENABLED: "true" } as Record<string, string> }));
const keys = vi.hoisted(() => [] as string[][]);
const store = vi.hoisted(() => new Map<string, unknown>());
const gen = vi.hoisted(() => ({ value: "1000" }));

vi.mock("../../../lib/public/cached-commander", async (orig) => ({
  ...(await orig<typeof import("../../../lib/public/cached-commander")>()), readPublicCommander: read,
}));
vi.mock("../../../lib/switches/snapshot", () => ({ resolveSwitchEnv: vi.fn(async () => env.value as unknown as NodeJS.ProcessEnv) }));
vi.mock("../../../lib/cache/catalog-generation", () => ({ catalogGeneration: vi.fn(async () => gen.value) }));
// A stand-in for Next's data cache: stores what the function returns under its key, and nothing that throws.
vi.mock("next/cache", () => ({
  unstable_cache: (fn: () => Promise<unknown>, key: string[]) => async () => {
    keys.push(key);
    const k = key.join("|");
    if (store.has(k)) return store.get(k);
    const value = await fn();
    store.set(k, value);
    return value;
  },
}));

import Image, { contentType, size } from "./opengraph-image";

const PNG = [0x89, 0x50, 0x4e, 0x47];
const image = (slug: string) => Image({ params: Promise.resolve({ slug }) });
const zimone = {
  name: "Zimone, Infinite Analyst", typeLine: "Legendary Creature — Human Wizard", colorIdentity: ["G", "U"], artCropUri: null,
  state: "ok", prose: "Zimone turns each X spell into a cheaper next one.", rank: 203, deckCount: 11687,
};
const ok = (commander: object = zimone) => ({ kind: "ok", commander, canonicalSlug: "zimone-infinite-analyst-77a9e7cf76e9" });

beforeEach(() => {
  read.mockReset();
  keys.length = 0;
  store.clear();
  env.value = { PUBLIC_PAGES_ENABLED: "true" };
  gen.value = "1000";
});

describe("the commander's link-preview image (C2)", () => {
  it("is a 1200x630 PNG", () => {
    expect(size).toEqual({ width: 1200, height: 630 });
    expect(contentType).toBe("image/png");
  });

  it("answers a bare 404 while the switch is off, and reads nothing", async () => {
    env.value = {};
    expect((await image("zimone-infinite-analyst-77a9e7cf76e9")).status).toBe(404);
    expect(read).not.toHaveBeenCalled();
  });

  it("answers a bare 404 for an address that does not resolve", async () => {
    for (const kind of ["not-found", "ambiguous"]) {
      read.mockResolvedValue({ kind });
      expect((await image("x-0b3f2c9e6a41")).status).toBe(404);
    }
    expect(keys).toEqual([]);
  });

  it("draws the commander once per catalog generation, keyed on its id whatever the name part says", async () => {
    read.mockResolvedValue(ok());
    const first = await image("zimone-infinite-analyst-77a9e7cf76e9");
    expect(first.status).toBe(200);
    expect(first.headers.get("content-type")).toBe("image/png");
    expect(first.headers.get("cache-control")).toBe("public, max-age=3600");
    expect([...new Uint8Array(await first.arrayBuffer()).slice(0, 4)]).toEqual(PNG);
    await image("zimnoe-77a9e7cf76e9");
    expect(keys.map((k) => k[0] + "|" + k[1] + "|" + k[3])).toEqual([
      "public-commander-image|gen:1000|id:77a9e7cf76e9", "public-commander-image|gen:1000|id:77a9e7cf76e9",
    ]);
    expect(store.size).toBe(1);
  }, 30_000);

  it("draws the artless form, and stores nothing, when the art crop cannot be fetched", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    read.mockResolvedValue(ok({ ...zimone, artCropUri: "http://127.0.0.1:9/zimone-art.jpg" }));
    const res = await image("zimone-infinite-analyst-77a9e7cf76e9");
    expect(res.status).toBe(200);
    expect([...new Uint8Array(await res.arrayBuffer()).slice(0, 4)]).toEqual(PNG);
    expect(store.size).toBe(0);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("commander image 77a9e7cf76e9"), expect.anything());
    warn.mockRestore();
  }, 30_000);

  it("keys the image on the generation read BEFORE the commander", async () => {
    read.mockImplementation(async () => {
      gen.value = "2000";
      return ok();
    });
    await image("zimone-infinite-analyst-77a9e7cf76e9");
    expect(keys.at(-1)?.[1]).toBe("gen:1000");
  }, 30_000);
});
