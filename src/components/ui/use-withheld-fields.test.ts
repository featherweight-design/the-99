import { afterEach, describe, expect, it, vi } from "vitest";
import { createFieldsLoop, type FieldsSource } from "./use-withheld-fields";

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
});
