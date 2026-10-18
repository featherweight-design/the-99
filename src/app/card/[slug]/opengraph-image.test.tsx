// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const read = vi.hoisted(() => vi.fn());
const env = vi.hoisted(() => ({ value: { PUBLIC_PAGES_ENABLED: "true" } as Record<string, string> }));
const keys = vi.hoisted(() => [] as string[][]);
const store = vi.hoisted(() => new Map<string, unknown>());

vi.mock("../../../lib/public/cached-card", async (orig) => ({ ...(await orig<typeof import("../../../lib/public/cached-card")>()), readPublicCard: read }));
vi.mock("../../../lib/switches/snapshot", () => ({ resolveSwitchEnv: vi.fn(async () => env.value as unknown as NodeJS.ProcessEnv) }));
vi.mock("../../../lib/cache/catalog-generation", () => ({ catalogGeneration: vi.fn(async () => "1000") }));
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
const sol = {
  name: "Sol Ring", faces: [{ name: "Sol Ring", typeLine: "Artifact" }], typeLine: "Artifact", manaCost: "{1}",
  colorIdentity: [], imageUri: null, artCropUri: null,
};

beforeEach(() => {
  read.mockReset();
  keys.length = 0;
  store.clear();
  env.value = { PUBLIC_PAGES_ENABLED: "true" };
});

describe("the card's link-preview image (C2)", () => {
  it("is a 1200x630 PNG", () => {
    expect(size).toEqual({ width: 1200, height: 630 });
    expect(contentType).toBe("image/png");
  });

  it("answers a bare 404 while the switch is off, and reads nothing", async () => {
    env.value = {};
    expect((await image("sol-ring-6ad8011d3471")).status).toBe(404);
    expect(read).not.toHaveBeenCalled();
  });

  it("answers a bare 404 for an address that does not resolve", async () => {
    for (const kind of ["not-found", "ambiguous"]) {
      read.mockResolvedValue({ kind });
      expect((await image("x-0b3f2c9e6a41")).status).toBe(404);
    }
    expect(keys).toEqual([]);
  });

  it("draws the card once per catalog generation, keyed on the card's id whatever the name part says", async () => {
    read.mockResolvedValue({ kind: "ok", card: sol, canonicalSlug: "sol-ring-6ad8011d3471" });
    const first = await image("sol-ring-6ad8011d3471");
    expect(first.status).toBe(200);
    expect(first.headers.get("content-type")).toBe("image/png");
    const bytes = new Uint8Array(await first.arrayBuffer());
    expect([...bytes.slice(0, 4)]).toEqual(PNG);
    await image("sol-rnig-6ad8011d3471");
    expect(keys.map((k) => k[0] + "|" + k[1] + "|" + k[3])).toEqual(["public-card-image|gen:1000|id:6ad8011d3471", "public-card-image|gen:1000|id:6ad8011d3471"]);
    expect(store.size).toBe(1);
  }, 30_000);

  it("draws the no-image form, and stores nothing, when the card's art cannot be fetched", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    read.mockResolvedValue({
      kind: "ok", canonicalSlug: "sol-ring-6ad8011d3471",
      card: { ...sol, imageUri: "http://127.0.0.1:9/sol.jpg", artCropUri: "http://127.0.0.1:9/sol-art.jpg" },
    });
    const res = await image("sol-ring-6ad8011d3471");
    expect(res.status).toBe(200);
    expect([...new Uint8Array(await res.arrayBuffer()).slice(0, 4)]).toEqual(PNG);
    expect(store.size).toBe(0);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  }, 30_000);
});
