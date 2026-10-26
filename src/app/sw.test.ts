// @vitest-environment node
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

// `public/sw.js` run against a fake worker scope: which requests it answers, from where, and what it
// keeps. It is plain JavaScript served as-is, so it is loaded as text rather than imported.
const SOURCE = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../public/sw.js"), "utf8");
const ORIGIN = "https://staging.the-99.dev";
// `public/icons/icon-192.png` as the data URL the worker sends as a notification's icon.
const ICON_192 = `data:image/png;base64,${readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../public/icons/icon-192.png")).toString("base64")}`;

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
let showNotification: Mock<(...args: unknown[]) => Promise<void>>;
let windows: { url: string; focused: boolean; focus: ReturnType<typeof vi.fn>; navigate: ReturnType<typeof vi.fn>; postMessage: ReturnType<typeof vi.fn> }[];
let openWindow: Mock<(url: string) => Promise<null>>;
let userAgent: string;
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
  showNotification = vi.fn(async () => {});
  windows = [];
  openWindow = vi.fn(async () => null);
  userAgent = "Mozilla/5.0 (X11; Linux x86_64) Chrome/140";
  const self = {
    location: new URL(ORIGIN),
    addEventListener: (type: string, fn: (e: unknown) => void) => (listeners[type] = fn),
    skipWaiting: () => {},
    clients: { claim: async () => {}, matchAll: async () => windows, openWindow: (url: string) => openWindow(url) },
    registration: { showNotification: (...a: unknown[]) => showNotification(...a) },
    navigator: { get userAgent() { return userAgent; } }, // a WorkerNavigator: no maxTouchPoints
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
    const kept = [...stores.get("static-v2")!.entries.keys()];
    expect(kept).toHaveLength(600);
    expect(kept[0]).toBe(`${ORIGIN}/_next/static/immutable/chunks/5.js`);
  });

  it("keeps the signed-out /offline page at install, fetched with no credentials, and its assets", async () => {
    serve();
    await install();
    const offlineCall = network.mock.calls.find(([input]) => input === "/offline");
    expect(offlineCall?.[1]).toMatchObject({ credentials: "omit" });
    expect(await stores.get("offline-v2")!.entries.get(`${ORIGIN}/offline`)?.clone().text()).toContain("o.css");
    expect([...stores.get("offline-v2")!.entries.keys()].sort()).toEqual([
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
      const before = await stores.get("offline-v2")!.entries.get(`${ORIGIN}/offline`)!.clone().text();
      // An hour on, a deploy has moved the page to a new stylesheet that will not load.
      vi.setSystemTime(new Date("2026-10-14T13:30:00Z"));
      network.mockImplementation(async (input: Request | string) => {
        const path = new URL(typeof input === "string" ? input : input.url, ORIGIN).pathname;
        if (path === "/offline") return answered('<link href="/_next/static/css/new.css">', "/offline");
        if (path === "/_next/static/css/new.css") return answered("gone", path, { status: 500 });
        return answered(`page ${path}`, path);
      });
      await load("/decks");
      expect(await stores.get("offline-v2")!.entries.get(`${ORIGIN}/offline`)!.clone().text()).toBe(before);
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
      const kept = () => [...stores.get("offline-v2")!.entries.keys()].filter((u) => u.endsWith(".css")).sort();
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
      const offline = stores.get("offline-v2")!;
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

  it("asks for a page that keeps failing at most hourly too: the throttle counts attempts", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      vi.setSystemTime(new Date("2026-10-14T12:00:00Z"));
      start();
      serve();
      await install();
      network.mockImplementation(async (input: Request | string) => {
        const path = new URL(typeof input === "string" ? input : input.url, ORIGIN).pathname;
        if (path === "/offline") return answered("boom", "/offline", { status: 500 });
        return answered(`page ${path}`, path);
      });
      const offlineFetches = () => network.mock.calls.filter(([input]) => input === "/offline").length;
      vi.setSystemTime(new Date("2026-10-14T13:30:00Z"));
      await load("/decks");
      // Install's fetch, and this hour's failed one.
      expect(offlineFetches()).toBe(2);
      start();
      vi.setSystemTime(new Date("2026-10-14T14:00:00Z"));
      await load("/decks");
      await load("/collection");
      expect(offlineFetches()).toBe(2);
      vi.setSystemTime(new Date("2026-10-14T14:31:00Z"));
      await load("/decks");
      expect(offlineFetches()).toBe(3);
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
      // And the install fails, so the worker before it stays in charge.
      await expect(install()).rejects.toThrow("could not be kept");
      expect(stores.get("offline-v2")?.entries.size ?? 0).toBe(0);
    }
  });

  it("installs over a copy this version already kept, with no network", async () => {
    serve();
    await install();
    network.mockRejectedValue(new TypeError("offline"));
    start();
    await expect(install()).resolves.toBeUndefined();
  });

  it("answers a page load from the network, and keeps no document, whoever's it is", async () => {
    serve();
    const res = await load("/decks/abc");
    expect(await res!.text()).toBe("page /decks/abc");
    // The only page any cache holds is the signed-out /offline the worker fetched itself.
    // (Beside it, an empty marker of when it was last fetched, which is no one's page.)
    const pages = everythingKept().filter((u) => !u.includes("/_next/static/") && !u.endsWith("/offline?attempt"));
    expect(pages).toEqual([`${ORIGIN}/offline`]);
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
    expect([...stores.keys()].sort()).toEqual(["someone-else", "static-v2"]);
  });
});

// Push (plan 2026-10-22-push.md, PR 3d): what the worker shows, when it does not, and where a tap lands.
describe("push", () => {
  const payload = { title: "Jace is cheaper", body: "Was $8.40, now $5.10.", route: "/", tag: "price-drop", keys: ["item:1"], openCard: "o1", openCombo: false, image: "https://cards.scryfall.io/x.jpg" };
  const win = (url = `${ORIGIN}/decks`, focused = false) => ({ url, focused, focus: vi.fn(async () => {}), navigate: vi.fn(async (): Promise<unknown> => ({})), postMessage: vi.fn() });

  async function push(data: unknown, raw?: string) {
    const waits: Promise<unknown>[] = [];
    listeners.push({
      data: raw === undefined ? { json: () => data } : { json: () => JSON.parse(raw) },
      waitUntil: (p: Promise<unknown>) => waits.push(p),
    });
    await Promise.all(waits);
  }
  async function click(data: unknown) {
    const waits: Promise<unknown>[] = [];
    const close = vi.fn();
    listeners.notificationclick({ notification: { data, close }, waitUntil: (p: Promise<unknown>) => waits.push(p) });
    await Promise.all(waits);
    return close;
  }

  it("shows the payload as sent: the words, the tag, the icon, the card image, and what a tap needs", async () => {
    await push(payload);
    expect(showNotification).toHaveBeenCalledWith("Jace is cheaper", {
      body: "Was $8.40, now $5.10.", tag: "price-drop", icon: ICON_192, image: "https://cards.scryfall.io/x.jpg",
      data: { route: `${ORIGIN}/`, keys: ["item:1"], openCard: "o1", openCombo: false },
    });
  });

  it("carries the app icon's own bytes, so Chrome never has to fetch it and never draws its lettered stand-in", async () => {
    await push(payload);
    const { icon } = showNotification.mock.calls[0]![1] as { icon: string };
    expect(icon.startsWith("data:image/png;base64,")).toBe(true);
    expect(icon).toBe(ICON_192); // the same file the manifest names; replacing the icon means replacing this too
  });

  it("keeps nothing of it: no cache is touched", async () => {
    await push(payload);
    expect(everythingKept()).toEqual([]);
  });

  it("shows a generic notification for a payload it cannot read, never nothing (a silent push costs the subscription)", async () => {
    await push(null, "not json");
    expect(showNotification).toHaveBeenCalledWith("The 99", expect.objectContaining({ body: "", tag: "the-99" }));
    showNotification.mockClear();
    const waits: Promise<unknown>[] = [];
    listeners.push({ data: null, waitUntil: (p: Promise<unknown>) => waits.push(p) });
    await Promise.all(waits);
    expect(showNotification).toHaveBeenCalledOnce(); // a push with no data at all
  });

  it("takes no image that is not https, and a landing that leaves the app becomes Home", async () => {
    await push({ ...payload, image: "http://evil.example/x.jpg", route: "//evil.example/x" });
    const options = showNotification.mock.calls[0]![1] as { image?: string; data: { route: string } };
    expect(options.image).toBeUndefined();
    expect(options.data.route).toBe(`${ORIGIN}/`);
    for (const route of ["https://evil.example", "/\\evil", 7, null]) {
      showNotification.mockClear();
      await push({ ...payload, route });
      expect((showNotification.mock.calls[0]![1] as { data: { route: string } }).data.route, String(route)).toBe(`${ORIGIN}/`);
    }
    showNotification.mockClear();
    await push({ ...payload, route: "/friends/abc?x=1" });
    expect((showNotification.mock.calls[0]![1] as { data: { route: string } }).data.route).toBe(`${ORIGIN}/friends/abc?x=1`);
  });

  it("shows nothing while a window of the app has focus: its own surfaces say it", async () => {
    windows = [win(`${ORIGIN}/`, true)];
    await push(payload);
    expect(showNotification).not.toHaveBeenCalled();
    windows = [win(`${ORIGIN}/`, false)];
    await push(payload);
    expect(showNotification).toHaveBeenCalledOnce();
  });

  it("shows it in Safari's WebKit even with a window focused: WebKit revokes a push that stays silent", async () => {
    windows = [win(`${ORIGIN}/`, true)];
    const shows = {
      "an installed iPhone": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
      "an iPad asking for the desktop site, or Safari on a Mac": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
      "Chrome on an iPhone (WebKit)": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/124.0 Mobile/15E148 Safari/604.1",
    };
    for (const [who, ua] of Object.entries(shows)) {
      userAgent = ua;
      showNotification.mockClear();
      await push(payload);
      expect(showNotification, who).toHaveBeenCalledOnce();
    }
    const silent = {
      "Chrome on a Mac": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      "Chrome on Android": "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36",
      "Edge on Windows": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 Edg/124.0",
      "Firefox on a Mac": "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.4; rv:125.0) Gecko/20100101 Firefox/125.0",
    };
    for (const [who, ua] of Object.entries(silent)) {
      userAgent = ua;
      showNotification.mockClear();
      await push(payload);
      expect(showNotification, who).not.toHaveBeenCalled();
    }
  });

  it("a tap closes the notification and focuses an open window, taking it to the landing with what to open IN the address", async () => {
    const w = win();
    windows = [win("https://elsewhere.example/"), w];
    const close = await click({ route: "/friends/abc", keys: ["item:1"], openCard: "o1", openCombo: true });
    expect(close).toHaveBeenCalledOnce();
    expect(w.focus).toHaveBeenCalledOnce();
    expect(w.navigate).toHaveBeenCalledWith(`${ORIGIN}/friends/abc?push-card=o1&push-combo=1`);
    // Never a message: one sent at a navigation reaches the page being left.
    expect(w.postMessage).not.toHaveBeenCalled();
    expect(openWindow).not.toHaveBeenCalled();
  });

  it("a cold tap carries what to open too: a window opened from nothing has no listener for a message", async () => {
    windows = [];
    await click({ route: "/", openCard: "o 1/x", openCombo: false });
    expect(openWindow).toHaveBeenCalledWith(`${ORIGIN}/?push-card=o+1%2Fx`);
  });

  it("a tap with no window of the app open opens one at the landing", async () => {
    windows = [win("https://elsewhere.example/")];
    await click({ route: "/decks/precons" });
    expect(openWindow).toHaveBeenCalledWith(`${ORIGIN}/decks/precons`);
  });

  it("a tap whose payload is missing or hostile lands on Home", async () => {
    await click(undefined);
    expect(openWindow).toHaveBeenLastCalledWith(`${ORIGIN}/`);
    await click({ route: "https://evil.example/" });
    expect(openWindow).toHaveBeenLastCalledWith(`${ORIGIN}/`);
    // The URL parser drops tabs and line breaks, so a string check alone would let these leave the app.
    for (const route of ["/\t/evil.example/x", "/\n/evil.example/x", "/\r/evil.example/x", "//evil.example/", "/\\evil.example/"]) {
      await click({ route });
      expect(openWindow, JSON.stringify(route)).toHaveBeenLastCalledWith(`${ORIGIN}/`);
    }
    // Parsed twice (once at the push, once at the tap): a same-origin route whose PATH starts "//" must not turn into a host
    // the second time.
    const host = new URL(ORIGIN).host;
    await push({ ...payload, route: `/.//${host}//evil.example/x` });
    const stored = (showNotification.mock.calls.at(-1)![1] as { data: { route: string } }).data.route;
    expect(new URL(stored).origin).toBe(ORIGIN);
    await click({ route: stored });
    expect(new URL(openWindow.mock.calls.at(-1)![0] as string).origin).toBe(ORIGIN);
  });

  it("still lands when the window refuses to focus or navigate: it opens one instead", async () => {
    const w = win();
    w.focus.mockRejectedValue(new Error("no"));
    w.navigate.mockRejectedValue(new Error("no"));
    windows = [w];
    await click({ route: "/friends" });
    expect(openWindow).toHaveBeenCalledWith(`${ORIGIN}/friends`);
  });

  it("opens a window when navigation resolves to null: the window went away between the lookup and the tap", async () => {
    const w = win();
    w.navigate.mockResolvedValue(null);
    windows = [w];
    await click({ route: "/decks" });
    expect(openWindow).toHaveBeenCalledWith(`${ORIGIN}/decks`);
  });
});
