// @vitest-environment node
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import { beforeEach, describe, expect, it, vi } from "vitest";

// `public/sw.js` run against a fake worker scope: which requests it answers, from where, and what it
// keeps. It is plain JavaScript served as-is, so it is loaded as text rather than imported.
const SOURCE = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../public/sw.js"), "utf8");
const ORIGIN = "https://staging.the-99.dev";

class FakeCache {
  entries = new Map<string, Response>();
  async match(req: Request) {
    return this.entries.get(req.url)?.clone();
  }
  async put(req: Request, res: Response) {
    this.entries.delete(req.url);
    this.entries.set(req.url, res);
  }
  async keys() {
    return [...this.entries.keys()].map((u) => new Request(u));
  }
  async delete(req: Request) {
    return this.entries.delete(req.url);
  }
}

let stores: Map<string, FakeCache>;
let listeners: Record<string, (e: unknown) => void>;
let network: ReturnType<typeof vi.fn>;

beforeEach(() => {
  stores = new Map();
  listeners = {};
  network = vi.fn(async (req: Request) => new Response(`body of ${new URL(req.url).pathname}`));
  const caches = {
    open: async (name: string) => stores.get(name) ?? (stores.set(name, new FakeCache()), stores.get(name)!),
    keys: async () => [...stores.keys()],
    delete: async (name: string) => stores.delete(name),
  };
  const self = {
    location: new URL(ORIGIN),
    addEventListener: (type: string, fn: (e: unknown) => void) => (listeners[type] = fn),
    skipWaiting: () => {},
    clients: { claim: async () => {} },
  };
  runInNewContext(SOURCE, { self, caches, fetch: network, URL, Response, Request, Set, Math });
});

/** Dispatches a fetch; resolves to the worker's response, or null when it lets the request through. */
async function fetchVia(url: string, init: RequestInit = {}): Promise<Response | null> {
  let answer: Promise<Response> | null = null;
  const waits: Promise<unknown>[] = [];
  listeners.fetch({
    request: new Request(new URL(url, ORIGIN), init),
    respondWith: (p: Promise<Response>) => (answer = p),
    waitUntil: (p: Promise<unknown>) => waits.push(p),
  });
  const res = answer ? await answer : null;
  await Promise.all(waits);
  return res;
}

describe("the service worker", () => {
  it("leaves documents, RSC payloads, api routes, actions and other origins to the network", async () => {
    for (const url of ["/", "/decks/abc", "/decks?_rsc=1x", "/api/health", "https://clerk.staging.the-99.dev/npm/x.js", "https://cards.scryfall.io/a.jpg", "https://other.example/_next/static/immutable/chunks/a.js"]) {
      expect(await fetchVia(url), url).toBeNull();
    }
    expect(await fetchVia("/_next/static/immutable/chunks/a.js", { method: "POST" })).toBeNull();
    expect(network).not.toHaveBeenCalled();
  });

  it("serves a hashed static file from the cache once it has fetched it", async () => {
    const first = await fetchVia("/_next/static/immutable/chunks/a.js");
    expect(await first!.text()).toBe("body of /_next/static/immutable/chunks/a.js");
    const second = await fetchVia("/_next/static/immutable/chunks/a.js");
    expect(await second!.text()).toBe("body of /_next/static/immutable/chunks/a.js");
    expect(network).toHaveBeenCalledTimes(1);
  });

  it("keeps no failed response", async () => {
    network.mockResolvedValueOnce(new Response("gone", { status: 404 }));
    await fetchVia("/_next/static/immutable/chunks/missing.js");
    await fetchVia("/_next/static/immutable/chunks/missing.js");
    expect(network).toHaveBeenCalledTimes(2);
  });

  it("serves the sprite from the cache at once and refreshes it behind", async () => {
    await fetchVia("/mana/sprite.svg");
    network.mockResolvedValueOnce(new Response("new sprite"));
    const served = await fetchVia("/mana/sprite.svg");
    expect(await served!.text()).toBe("body of /mana/sprite.svg");
    const next = await fetchVia("/mana/sprite.svg");
    expect(await next!.text()).toBe("new sprite");
  });

  it("trims the static cache to its newest 600 files", async () => {
    for (let i = 0; i < 605; i++) await fetchVia(`/_next/static/immutable/chunks/${i}.js`);
    const kept = [...stores.get("static-v1")!.entries.keys()];
    expect(kept).toHaveLength(600);
    expect(kept[0]).toBe(`${ORIGIN}/_next/static/immutable/chunks/5.js`);
  });

  it("drops the caches of an older version when it activates", async () => {
    stores.set("static-v0", new FakeCache());
    await fetchVia("/_next/static/immutable/chunks/a.js");
    let done: Promise<unknown> = Promise.resolve();
    listeners.activate({ waitUntil: (p: Promise<unknown>) => (done = p) });
    await done;
    expect([...stores.keys()]).toEqual(["static-v1"]);
  });
});
