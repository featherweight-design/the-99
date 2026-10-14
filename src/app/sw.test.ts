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
    has: async (name: string) => stores.has(name),
    delete: async (name: string) => stores.delete(name),
  };
  const self = {
    location: new URL(ORIGIN),
    addEventListener: (type: string, fn: (e: unknown) => void) => (listeners[type] = fn),
    skipWaiting: () => {},
    clients: { claim: async () => {} },
  };
  start = () => runInNewContext(SOURCE, { self, caches, fetch: network, URL, Response, Request, Headers, Set, Math, Date });
  start();
});

/** Starts the worker script again over the same caches, as a browser does after stopping an idle worker. */
let start: () => void;

/** A response the way the network hands one back: with the URL it came from, and whether it redirected. */
function answered(body: string, url: string, init: ResponseInit & { redirected?: boolean } = {}): Response {
  const res = new Response(body, init);
  Object.defineProperty(res, "url", { value: new URL(url, ORIGIN).href });
  if (init.redirected) Object.defineProperty(res, "redirected", { value: true });
  return res;
}

/** The network as the worker sees it: `/offline` signed out, its two assets, and a page per path. */
function serve(page: (path: string) => Response | Promise<Response> = (path) => answered(`page ${path}`, path)) {
  network.mockImplementation(async (input: Request | string) => {
    const path = new URL(typeof input === "string" ? input : input.url, ORIGIN).pathname;
    if (path === "/offline") {
      return answered(
        '<link href="/_next/static/css/o.css"><script src="/_next/static/chunks/o.js"></script>' +
          '<script>self.__next_f.push([1,"[\\"/_next/static/chunks/f.js\\"]"])</script>',
        "/offline",
      );
    }
    if (path.startsWith("/_next/static/")) return answered(`asset ${path}`, path);
    return page(path);
  });
}

/** Dispatches a page load (`mode: "navigate"`, which a Request cannot be constructed with). */
async function load(url: string): Promise<Response | null> {
  let answer: Promise<Response> | null = null;
  const waits: Promise<unknown>[] = [];
  const request = new Request(new URL(url, ORIGIN));
  Object.defineProperty(request, "mode", { value: "navigate" });
  listeners.fetch({
    request,
    preloadResponse: Promise.resolve(undefined),
    respondWith: (p: Promise<Response>) => (answer = p),
    waitUntil: (p: Promise<unknown>) => waits.push(p),
  });
  const res = answer ? await answer : null;
  await Promise.all(waits);
  return res;
}

async function install(): Promise<void> {
  let done: Promise<unknown> = Promise.resolve();
  listeners.install({ waitUntil: (p: Promise<unknown>) => (done = p) });
  await done;
}

/** Every URL any cache holds, so a test can say what was never kept. */
function everythingKept(): string[] {
  return [...stores.values()].flatMap((c) => [...c.entries.keys()]);
}

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

  it("leaves the mana sprite to the network, since its URL carries no hash", async () => {
    expect(await fetchVia("/mana/sprite.svg")).toBeNull();
  });

  it("trims the static cache to its newest 600 files", async () => {
    for (let i = 0; i < 605; i++) await fetchVia(`/_next/static/immutable/chunks/${i}.js`);
    const kept = [...stores.get("static-v1")!.entries.keys()];
    expect(kept).toHaveLength(600);
    expect(kept[0]).toBe(`${ORIGIN}/_next/static/immutable/chunks/5.js`);
  });

  it("keeps the signed-out /offline page at install, fetched with no credentials, and its assets", async () => {
    serve();
    await install();
    const offlineCall = network.mock.calls.find(([input]) => input === "/offline");
    expect(offlineCall?.[1]).toMatchObject({ credentials: "omit" });
    expect(await stores.get("offline-v1")!.entries.get(`${ORIGIN}/offline`)?.clone().text()).toContain("o.css");
    expect([...stores.get("offline-v1")!.entries.keys()].sort()).toEqual([
      `${ORIGIN}/_next/static/chunks/f.js`,
      `${ORIGIN}/_next/static/chunks/o.js`,
      `${ORIGIN}/_next/static/css/o.css`,
      `${ORIGIN}/offline`,
    ]);
  });

  it("keeps the offline page's assets out of the static trim: they load offline after 600 newer files", async () => {
    serve();
    await install();
    for (let i = 0; i < 605; i++) await fetchVia(`/_next/static/immutable/chunks/${i}.js`);
    network.mockRejectedValue(new TypeError("offline"));
    for (const path of ["/_next/static/css/o.css", "/_next/static/chunks/o.js", "/_next/static/chunks/f.js"]) {
      const res = await fetchVia(path);
      expect(await res!.text(), path).toBe(`asset ${path}`);
    }
  });

  it("keeps the copy it has when a refresh cannot fetch one of the new page's assets", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      vi.setSystemTime(new Date("2026-10-14T12:00:00Z"));
      start();
      serve();
      await install();
      const before = await stores.get("offline-v1")!.entries.get(`${ORIGIN}/offline`)!.clone().text();
      // An hour on, a deploy has moved the page to a new stylesheet that will not load.
      vi.setSystemTime(new Date("2026-10-14T13:30:00Z"));
      network.mockImplementation(async (input: Request | string) => {
        const path = new URL(typeof input === "string" ? input : input.url, ORIGIN).pathname;
        if (path === "/offline") return answered('<link href="/_next/static/css/new.css">', "/offline");
        if (path === "/_next/static/css/new.css") return answered("gone", path, { status: 500 });
        return answered(`page ${path}`, path);
      });
      await load("/decks");
      expect(await stores.get("offline-v1")!.entries.get(`${ORIGIN}/offline`)!.clone().text()).toBe(before);
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps the previous page's assets one refresh longer, and drops those two refreshes old", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      vi.setSystemTime(new Date("2026-10-14T12:00:00Z"));
      start();
      const generation = (css: string) =>
        network.mockImplementation(async (input: Request | string) => {
          const path = new URL(typeof input === "string" ? input : input.url, ORIGIN).pathname;
          if (path === "/offline") return answered(`<link href="/_next/static/css/${css}.css">`, "/offline");
          if (path.startsWith("/_next/static/")) return answered(`asset ${path}`, path);
          return answered(`page ${path}`, path);
        });
      const kept = () => [...stores.get("offline-v1")!.entries.keys()].filter((u) => u.endsWith(".css")).sort();
      generation("a");
      await install();
      // A deploy later, a refresh: a document that drew the first copy may still ask for a.css.
      vi.setSystemTime(new Date("2026-10-14T13:30:00Z"));
      generation("b");
      await load("/decks");
      expect(kept()).toEqual([`${ORIGIN}/_next/static/css/a.css`, `${ORIGIN}/_next/static/css/b.css`]);
      vi.setSystemTime(new Date("2026-10-14T15:00:00Z"));
      generation("c");
      await load("/decks");
      expect(kept()).toEqual([`${ORIGIN}/_next/static/css/b.css`, `${ORIGIN}/_next/static/css/c.css`]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("never drops a file the page kept NOW names, when a second worker published after this one read", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      vi.setSystemTime(new Date("2026-10-14T12:00:00Z"));
      start();
      serve();
      await install();
      // A second worker publishes a page drawn with b.css while this one is mid-refresh with c.css:
      // simulated by writing B's page into the cache the moment this refresh's own write lands.
      vi.setSystemTime(new Date("2026-10-14T13:30:00Z"));
      const offline = stores.get("offline-v1")!;
      const put = offline.put.bind(offline);
      let raced = false;
      offline.put = async (req: Request, res: Response) => {
        await put(req, res);
        if (!raced && req.url === `${ORIGIN}/offline`) {
          raced = true;
          await put(new Request(`${ORIGIN}/_next/static/css/b.css`), new Response("asset b"));
          await put(
            new Request(`${ORIGIN}/offline`),
            new Response('<link href="/_next/static/css/b.css">', {
              headers: { "x-the99-kept-at": String(Date.now()), "x-the99-kept-assets": `${ORIGIN}/_next/static/css/b.css`, "x-the99-kept-previous": "" },
            }),
          );
        }
      };
      network.mockImplementation(async (input: Request | string) => {
        const path = new URL(typeof input === "string" ? input : input.url, ORIGIN).pathname;
        if (path === "/offline") return answered('<link href="/_next/static/css/c.css">', "/offline");
        if (path.startsWith("/_next/static/")) return answered(`asset ${path}`, path);
        return answered(`page ${path}`, path);
      });
      await load("/decks");
      const html = await offline.entries.get(`${ORIGIN}/offline`)!.clone().text();
      expect(html).toContain("b.css");
      expect(offline.entries.has(`${ORIGIN}/_next/static/css/b.css`)).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("reads a path in the page's inline RSC payload without the escape before its closing quote", async () => {
    serve();
    await install();
    const asked = network.mock.calls.map(([input]) => new URL(typeof input === "string" ? input : input.url, ORIGIN).pathname);
    expect(asked).toContain("/_next/static/chunks/f.js");
    expect(asked.filter((p) => p.endsWith("/"))).toEqual([]);
  });

  it("fetches /offline again after a page load at most hourly, across a stopped and restarted worker", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      vi.setSystemTime(new Date("2026-10-14T12:00:00Z"));
      start();
      serve();
      await install();
      const offlineFetches = () => network.mock.calls.filter(([input]) => input === "/offline").length;
      expect(offlineFetches()).toBe(1);
      await load("/decks");
      // The browser stops the idle worker; the next page load starts the script again.
      start();
      vi.setSystemTime(new Date("2026-10-14T12:59:00Z"));
      await load("/decks");
      expect(offlineFetches()).toBe(1);
      vi.setSystemTime(new Date("2026-10-14T13:01:00Z"));
      await load("/decks");
      expect(offlineFetches()).toBe(2);
      await load("/decks");
      expect(offlineFetches()).toBe(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps nothing for /offline when it is not that page: a redirect to sign-in, an error", async () => {
    for (const offline of [
      () => answered("sign in", "/sign-in", { redirected: true }),
      () => answered("boom", "/offline", { status: 500 }),
    ]) {
      stores.clear();
      network.mockImplementation(async (input: Request | string) => {
        const path = new URL(typeof input === "string" ? input : input.url, ORIGIN).pathname;
        return path === "/offline" ? offline() : answered(`page ${path}`, path);
      });
      await install();
      expect(stores.get("offline-v1")?.entries.size ?? 0).toBe(0);
    }
  });

  it("answers a page load from the network, and keeps no document, whoever's it is", async () => {
    serve();
    const res = await load("/decks/abc");
    expect(await res!.text()).toBe("page /decks/abc");
    // The only page any cache holds is the signed-out /offline the worker fetched itself.
    expect(everythingKept().filter((u) => !u.includes("/_next/static/"))).toEqual([`${ORIGIN}/offline`]);
  });

  it("passes a server's own error through: only an unreachable network gets the fallback", async () => {
    serve((path) => answered("broken", path, { status: 500 }));
    await install();
    const res = await load("/decks");
    expect(res!.status).toBe(500);
    expect(await res!.text()).toBe("broken");
  });

  it("shows the kept /offline when the network cannot be reached, at the address asked for", async () => {
    serve((path) => Promise.reject(new TypeError(`no network for ${path}`)));
    await install();
    const res = await load("/decks/shopping");
    expect(await res!.text()).toContain("o.css");
    expect(everythingKept()).not.toContain(`${ORIGIN}/decks/shopping`);
  });

  it("answers an unreachable page load with a network error when no /offline was ever kept", async () => {
    network.mockRejectedValue(new TypeError("offline"));
    const res = await load("/decks");
    expect(res!.type).toBe("error");
  });

  it("drops its own older versions when it activates, and no other cache", async () => {
    stores.set("offline-v0", new FakeCache());
    stores.set("static-v0", new FakeCache());
    stores.set("someone-else", new FakeCache());
    await fetchVia("/_next/static/immutable/chunks/a.js");
    let done: Promise<unknown> = Promise.resolve();
    listeners.activate({ waitUntil: (p: Promise<unknown>) => (done = p) });
    await done;
    expect([...stores.keys()].sort()).toEqual(["someone-else", "static-v1"]);
  });
});
