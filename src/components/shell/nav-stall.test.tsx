import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { newNavigation, watchFetches, watchStall } from "./nav-stall";
import { STALL_AFTER_MS } from "../../lib/nav-stall/report";

const config = { deployment: "dpl_abc" };
let beacon: ReturnType<typeof vi.fn>;


beforeEach(() => {
  vi.useFakeTimers();
  beacon = vi.fn(() => true);
  Object.defineProperty(navigator, "sendBeacon", { value: beacon, configurable: true });
  window.history.replaceState(null, "", "/decks/0b49cb44-8ae2-4c19-b558-633344a2f4ed/import");
  // Twice: the fake clock restarts at 0 for every test, and the module keeps the last test's marks.
  newNavigation();
  newNavigation();
});
afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
});

async function bodyOf(call: number): Promise<Record<string, unknown>> {
  return JSON.parse(await (beacon.mock.calls[call]![1] as Blob).text());
}

describe("watchStall", () => {
  it("sends one report when the wait outlasts STALL_AFTER_MS, as patterns, never raw paths", async () => {
    document.body.innerHTML = '<main><div data-loading-screen=""></div></main><div data-testid="pending-overlay"></div>';
    const stop = watchStall({ kind: "pending", from: location.pathname, to: "/decks", config });
    vi.advanceTimersByTime(STALL_AFTER_MS - 1);
    expect(beacon).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(beacon).toHaveBeenCalledTimes(1);
    expect(beacon.mock.calls[0]![0]).toBe("/api/nav-stall");
    const r = await bodyOf(0);
    expect(r).toMatchObject({
      kind: "pending", from: "/decks/[x]/import", to: "/decks", at: "/decks/[x]/import", moved: false,
      loader: "both", rsc: "none", deployment: "dpl_abc",
    });
    expect(JSON.stringify(r)).not.toContain("0b49cb44");
    stop();
  });
  it("sends nothing when the wait ends first", () => {
    const stop = watchStall({ kind: "pending", from: "/", to: "/decks", config });
    vi.advanceTimersByTime(STALL_AFTER_MS - 1);
    stop();
    vi.advanceTimersByTime(STALL_AFTER_MS * 2);
    expect(beacon).not.toHaveBeenCalled();
  });
  it("sends one report per navigation: a hang pending, then in its fallback, reports once", () => {
    watchStall({ kind: "pending", from: "/", to: "/decks", config });
    vi.advanceTimersByTime(STALL_AFTER_MS);
    window.history.replaceState(null, "", "/decks");
    watchStall({ kind: "fallback", from: "/decks", to: "/decks", config });
    vi.advanceTimersByTime(STALL_AFTER_MS);
    expect(beacon).toHaveBeenCalledTimes(1);
    // The next navigation may report again.
    newNavigation();
    watchStall({ kind: "fallback", from: "/decks", to: "/decks", config });
    vi.advanceTimersByTime(STALL_AFTER_MS);
    expect(beacon).toHaveBeenCalledTimes(2);
  });
  it("records that the page was hidden during the wait (a frozen background tab is not a hang)", async () => {
    watchStall({ kind: "pending", from: "/", to: "/decks", config });
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    vi.advanceTimersByTime(STALL_AFTER_MS);
    expect(await bodyOf(0)).toMatchObject({ wasHidden: true, visible: true });
  });
});

describe("the navigation's own RSC request", () => {
  // One stub for the whole file: the watch wraps whatever `fetch` was when it was installed.
  let answer: (r: Response) => void = () => {};
  const stub = vi.fn(() => new Promise<Response>((resolve) => { answer = resolve; }));
  window.fetch = stub as unknown as typeof fetch;
  watchFetches();

  const rscFetch = (path: string, extra: Record<string, string> = {}) =>
    void window.fetch(`${path}?_rsc=abc`, { headers: { rsc: "1", ...extra } });

  async function stage(): Promise<Record<string, unknown>> {
    vi.advanceTimersByTime(STALL_AFTER_MS);
    return bodyOf(beacon.mock.calls.length - 1);
  }

  it("says none before a request starts, and ignores a prefetch for the same path", async () => {
    rscFetch("/decks", { "next-router-prefetch": "1" });
    watchStall({ kind: "pending", from: "/", to: "/decks", config });
    expect(await stage()).toMatchObject({ rsc: "none", rscStatus: 0 });
  });
  it("says waiting while no response has begun, for a request that started just before the provider heard", async () => {
    // The real order: the router fetches on the press, and the provider marks the navigation after.
    rscFetch("/decks");
    vi.advanceTimersByTime(5);
    newNavigation();
    watchStall({ kind: "pending", from: "/", to: "/decks", config });
    expect(await stage()).toMatchObject({ rsc: "waiting", rscStatus: 0 });
  });
  it("says headers, with the status, once the response began but its body has not arrived", async () => {
    rscFetch("/decks");
    answer(new Response("", { status: 200 }));
    await Promise.resolve();
    await Promise.resolve();
    watchStall({ kind: "pending", from: "/", to: "/decks", config });
    expect(await stage()).toMatchObject({ rsc: "headers", rscStatus: 200 });
  });
  it("hands the caller the same response, untouched", async () => {
    const pending = window.fetch("/decks?_rsc=abc", { headers: { rsc: "1" } });
    const response = new Response("x", { status: 203 });
    answer(response);
    expect(await pending).toBe(response);
  });
});
