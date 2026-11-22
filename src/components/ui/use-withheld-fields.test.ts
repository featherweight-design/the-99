import { afterEach, describe, expect, it, vi } from "vitest";
import { createFieldsLoop, type FieldsSource } from "./use-withheld-fields";

const disk = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn() }));
vi.mock("./saved-fields", () => ({ readSavedFields: disk.read, writeSavedFields: disk.write }));

type Row = { id: string };
const source: FieldsSource<Row> = {
  keyOf: (r) => r.id,
  isDrawn: () => false,
  url: (keys) => `/api/fields?ids=${keys.join(",")}`,
  maxBatch: 10,
};
const rows = [{ id: "a" }, { id: "b" }, { id: "c" }];

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("createFieldsLoop", () => {
  it("holds every batch, a new window's included, for a 429's Retry-After, then asks again", async () => {
    vi.useFakeTimers();
    const fetch = vi.fn(async (url: string) =>
      url.includes("ids=a")
        ? { ok: false, status: 429, headers: new Headers({ "retry-after": "20" }), json: async () => null }
        : { ok: true, status: 200, headers: new Headers(), json: async () => ({ fields: { b: {}, c: {} } }) },
    );
    vi.stubGlobal("fetch", fetch);
    const loop = createFieldsLoop<Row, object>(() => {});
    loop.start();
    loop.update({ source, all: rows, wanted: [rows[0]], wantedKey: "w1" });
    await vi.advanceTimersByTimeAsync(0);
    expect(fetch).toHaveBeenCalledTimes(1);
    // The reader moves to another window inside the refused one: nothing is sent, and the urgent retry waits too.
    loop.update({ source, all: rows, wanted: [rows[1]], wantedKey: "w2" });
    await vi.advanceTimersByTimeAsync(19_000);
    expect(fetch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1_500);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[1][0]).toContain("ids=b");
  });

  it("sends a batch as a POST carrying the body when the source gives one", async () => {
    vi.useFakeTimers();
    const fetch = vi.fn(async () => ({ ok: true, status: 200, headers: new Headers(), json: async () => ({ fields: { a: {}, b: {}, c: {} } }) }));
    vi.stubGlobal("fetch", fetch);
    const post: FieldsSource<Row> = { ...source, url: () => "/api/fields", body: (keys) => ({ ids: keys }) };
    const loop = createFieldsLoop<Row, object>(() => {});
    loop.start();
    loop.update({ source: post, all: rows, wanted: [rows[0]], wantedKey: "w1" });
    await vi.advanceTimersByTimeAsync(0);
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/fields");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({ ids: ["a", "b", "c"] });
  });

  it("tops an urgent batch up to 200 ids, not the full 500, so the visible rows are not held behind idle ones", async () => {
    vi.useFakeTimers();
    const fetch = vi.fn(async () => ({ ok: true, status: 200, headers: new Headers(), json: async () => ({ fields: {} }) }));
    vi.stubGlobal("fetch", fetch);
    const many = Array.from({ length: 600 }, (_, i) => ({ id: `r${i}` }));
    const big: FieldsSource<Row> = { ...source, maxBatch: 500, url: () => "/api/fields", body: (keys) => ({ ids: keys }) };
    const loop = createFieldsLoop<Row, object>(() => {});
    loop.start();
    loop.update({ source: big, all: many, wanted: [many[0]], wantedKey: "w1" });
    await vi.advanceTimersByTimeAsync(0);
    const [, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(String(init.body)).ids).toHaveLength(200);
  });

  describe("the saved copy", () => {
    const saved = { list: "collection", token: "tok-1" };
    const answer = () => vi.fn(async () => ({ ok: true, status: 200, headers: new Headers(), json: async () => ({ fields: { a: { n: 1 }, b: { n: 2 }, c: { n: 3 } } }) }));

    it("draws from a copy whose token is the page's, and asks the route for nothing", async () => {
      vi.useFakeTimers();
      disk.read.mockResolvedValue({ token: "tok-1", fields: { a: { n: 1 }, b: { n: 2 }, c: { n: 3 } } });
      const fetch = answer();
      vi.stubGlobal("fetch", fetch);
      const landed = vi.fn();
      const loop = createFieldsLoop<Row, object>(landed);
      loop.start();
      loop.update({ source, all: rows, wanted: [rows[0]], wantedKey: "w1", saved });
      await vi.advanceTimersByTimeAsync(1_000);
      expect(fetch).not.toHaveBeenCalled();
      expect(loop.get(rows, "c")).toEqual({ n: 3 });
      expect(landed).toHaveBeenCalled();
      expect(disk.write).not.toHaveBeenCalled();
    });

    it("ignores a copy filed under another token, fetches, and keeps what arrived once every card has its fields", async () => {
      vi.useFakeTimers();
      disk.write.mockClear();
      disk.read.mockResolvedValue({ token: "someone-elses", fields: { a: { n: 99 } } });
      const fetch = answer();
      vi.stubGlobal("fetch", fetch);
      const loop = createFieldsLoop<Row, object>(() => {});
      loop.start();
      loop.update({ source, all: rows, wanted: [rows[0]], wantedKey: "w1", saved });
      await vi.advanceTimersByTimeAsync(1_000);
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(loop.get(rows, "a")).toEqual({ n: 1 });
      expect(disk.write).toHaveBeenCalledWith("collection", { token: "tok-1", fields: { a: { n: 1 }, b: { n: 2 }, c: { n: 3 } } });
    });

    it("keeps nothing while a card is still missing its fields", async () => {
      vi.useFakeTimers();
      disk.write.mockClear();
      disk.read.mockResolvedValue(null);
      vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, status: 200, headers: new Headers(), json: async () => ({ fields: { a: {} } }) })));
      const loop = createFieldsLoop<Row, object>(() => {});
      loop.start();
      loop.update({ source, all: rows, wanted: [rows[0]], wantedKey: "w1", saved });
      await vi.advanceTimersByTimeAsync(1_000);
      expect(disk.write).not.toHaveBeenCalled();
    });

    it("reads and writes nothing when the page handed no token", async () => {
      vi.useFakeTimers();
      disk.read.mockClear();
      disk.write.mockClear();
      const fetch = answer();
      vi.stubGlobal("fetch", fetch);
      const loop = createFieldsLoop<Row, object>(() => {});
      loop.start();
      loop.update({ source, all: rows, wanted: [rows[0]], wantedKey: "w1", saved: null });
      await vi.advanceTimersByTimeAsync(1_000);
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(disk.read).not.toHaveBeenCalled();
      expect(disk.write).not.toHaveBeenCalled();
    });
  });
});
