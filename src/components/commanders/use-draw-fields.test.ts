import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useDrawFields } from "./use-draw-fields";
import type { DiscoveryRow, DrawFields } from "../../lib/discovery/encode";

const row = (slug: string): DiscoveryRow => ({ slug, name: slug, colorIdentity: [], releasedAt: null, deckCount: null });
const fieldsFor = (slug: string): DrawFields => ({
  artCropUri: null, rank: 1, price: { kind: "absent" }, prose: slug,
  gapSlot: { kind: "noMechanics" }, score: 1, measurableTotal: 1, fitPool: 0, fitRoles: 0, fitSynergy: 1,
});

/** A fetch the test answers by hand, so what is in flight at any moment is observable. */
function manualFetch() {
  const calls: { url: string; signal: AbortSignal; answer: () => void; fail: () => void; omit: (gone: string) => void }[] = [];
  const fn = vi.fn((url: string, init: RequestInit) =>
    new Promise<Response>((resolve, reject) => {
      const signal = init.signal as AbortSignal;
      signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      const slugs = new URL(url, "http://x").searchParams.get("s")!.split(",");
      calls.push({
        url,
        signal,
        answer: () => resolve(new Response(JSON.stringify({ fields: Object.fromEntries(slugs.map((s) => [s, fieldsFor(s)])) }))),
        fail: () => resolve(new Response("", { status: 500 })),
        omit: (gone: string) =>
          resolve(new Response(JSON.stringify({
            fields: Object.fromEntries(slugs.filter((s) => s !== gone).map((s) => [s, fieldsFor(s)])),
          }))),
      });
    }),
  );
  return { fn, calls };
}

let net: ReturnType<typeof manualFetch>;
beforeEach(() => {
  net = manualFetch();
  vi.stubGlobal("fetch", net.fn);
});
afterEach(() => vi.unstubAllGlobals());

const FIT = { sort: "fit", basis: "classifier" } as const;

describe("useDrawFields", () => {
  const all = Array.from({ length: 250 }, (_, i) => row(`c${i}`));

  // Admin PR 6d-2: the fields are the PAGE's ranking's, so the request names the basis the page's
  // payload was counted by, and the route loads that entry rather than resolving the switch again.
  it("names the ranking's sort and role basis in every request", async () => {
    renderHook(() => useDrawFields({ sort: "new", basis: "labels" }, all, [all[0]]));
    await waitFor(() => expect(net.calls).toHaveLength(1));
    const params = new URL(net.calls[0].url, "http://x").searchParams;
    expect(params.get("sort")).toBe("new");
    expect(params.get("b")).toBe("labels");
  });

  it("asks for the rows the reader is waiting on first, one batch at a time", async () => {
    const wanted = [all[240], all[241]];
    renderHook(() => useDrawFields(FIT, all, wanted));
    await waitFor(() => expect(net.calls).toHaveLength(1));
    const first = new URL(net.calls[0].url, "http://x").searchParams.get("s")!.split(",");
    expect(first.slice(0, 2)).toEqual(["c240", "c241"]);
    expect(first).toHaveLength(200);
    // Still one: the next batch waits for this one to land.
    await new Promise((r) => setTimeout(r, 300));
    expect(net.calls).toHaveLength(1);
    await act(async () => net.calls[0].answer());
    await waitFor(() => expect(net.calls).toHaveLength(2));
    expect(new URL(net.calls[1].url, "http://x").searchParams.get("s")!.split(",")).toHaveLength(50);
  });

  // The reader can wait on more rows than one batch holds (Show more pressed past the first
  // window, then a refresh that leaves only that window whole), and the route refuses a batch
  // over its limit, so the waiting rows are split across batches rather than asked for at once.
  it("never asks for more than one batch's limit, even for rows the reader is waiting on", async () => {
    const wanted = all.slice(0, 230);
    renderHook(() => useDrawFields(FIT, all, wanted));
    await waitFor(() => expect(net.calls).toHaveLength(1));
    const first = new URL(net.calls[0].url, "http://x").searchParams.get("s")!.split(",");
    expect(first).toHaveLength(200);
    expect(first).toEqual(wanted.slice(0, 200).map((r) => r.slug));
    await act(async () => net.calls[0].answer());
    await waitFor(() => expect(net.calls).toHaveLength(2));
    const second = new URL(net.calls[1].url, "http://x").searchParams.get("s")!.split(",");
    expect(second.slice(0, 30)).toEqual(wanted.slice(200).map((r) => r.slug));
  });

  it("resolves a row once its fields have arrived", async () => {
    const wanted = [all[0]];
    const { result } = renderHook(() => useDrawFields(FIT, all, wanted));
    expect(result.current.resolve(all[0])).toBeNull();
    await waitFor(() => expect(net.calls).toHaveLength(1));
    await act(async () => net.calls[0].answer());
    await waitFor(() => expect(result.current.resolve(all[0])?.prose).toBe("c0"));
  });

  it("aborts the batch in flight and starts no other when the page is left", async () => {
    renderHook(() => useDrawFields(FIT, all, [all[0]]));
    await waitFor(() => expect(net.calls).toHaveLength(1));
    act(() => { window.dispatchEvent(new Event("pagehide")); });
    expect(net.calls[0].signal.aborted).toBe(true);
    await new Promise((r) => setTimeout(r, 400));
    expect(net.calls).toHaveLength(1);
  });

  it("aborts on a click to another route, and not on one to this route", async () => {
    renderHook(() => useDrawFields(FIT, all, [all[0]]));
    await waitFor(() => expect(net.calls).toHaveLength(1));
    const same = document.createElement("a");
    same.href = `${location.pathname}?o=name`;
    document.body.append(same);
    act(() => { same.click(); });
    expect(net.calls[0].signal.aborted).toBe(false);
    const other = document.createElement("a");
    other.href = "/commanders";
    document.body.append(other);
    act(() => { other.click(); });
    expect(net.calls[0].signal.aborted).toBe(true);
    same.remove();
    other.remove();
  });

  // A background batch has nothing to draw, so it must not render the view.
  it("renders nothing when a batch lands only rows the reader is not looking at", async () => {
    const drawn = all.slice(0, 2).map((r) => ({ ...r, ...fieldsFor(r.slug) }));
    let renders = 0;
    renderHook(() => {
      renders++;
      return useDrawFields(FIT, all, drawn);
    });
    await waitFor(() => expect(net.calls).toHaveLength(1));
    const before = renders;
    await act(async () => net.calls[0].answer());
    await waitFor(() => expect(net.calls).toHaveLength(2));
    expect(renders).toBe(before);
  });

  // `Show more` ignores a press while its rows are awaited, so a failed batch for them must not
  // leave the list waiting for a change of window the reader has no reason to make.
  it("asks again on its own for rows the reader is waiting on after a batch fails", async () => {
    const { result } = renderHook(() => useDrawFields(FIT, all, [all[0]]));
    await waitFor(() => expect(net.calls).toHaveLength(1));
    await act(async () => net.calls[0].fail());
    await waitFor(() => expect(net.calls).toHaveLength(2), { timeout: 2500 });
    expect(new URL(net.calls[1].url, "http://x").searchParams.get("s")!.split(",")[0]).toBe("c0");
    await act(async () => net.calls[1].answer());
    await waitFor(() => expect(result.current.resolve(all[0])?.prose).toBe("c0"));
  });

  it("never marks a window chosen after a batch was asked for as failed by that batch", async () => {
    const drawn = all.slice(0, 2).map((r) => ({ ...r, ...fieldsFor(r.slug) }));
    const { rerender } = renderHook(({ wanted }: { wanted: DiscoveryRow[] }) => useDrawFields(FIT, all, wanted), {
      initialProps: { wanted: drawn as DiscoveryRow[] },
    });
    await waitFor(() => expect(net.calls).toHaveLength(1));
    rerender({ wanted: [all[240]] });
    await act(async () => net.calls[0].fail());
    await waitFor(() => expect(net.calls).toHaveLength(2));
    expect(new URL(net.calls[1].url, "http://x").searchParams.get("s")!.split(",")[0]).toBe("c240");
  });

  it("asks again for a window the reader returns to after it failed", async () => {
    const other = all.slice(0, 2).map((r) => ({ ...r, ...fieldsFor(r.slug) })) as DiscoveryRow[];
    const { rerender } = renderHook(({ wanted }: { wanted: DiscoveryRow[] }) => useDrawFields(FIT, all, wanted), {
      initialProps: { wanted: [all[240]] as DiscoveryRow[] },
    });
    await waitFor(() => expect(net.calls).toHaveLength(1));
    await act(async () => net.calls[0].fail());
    rerender({ wanted: other });
    await waitFor(() => expect(net.calls).toHaveLength(2));
    rerender({ wanted: [all[240]] });
    await act(async () => net.calls[1].fail());
    // Back on the failed window, well inside the first retry's 1s pause: asked for at once.
    await waitFor(() => expect(net.calls).toHaveLength(3), { timeout: 600 });
    expect(new URL(net.calls[2].url, "http://x").searchParams.get("s")!.split(",")[0]).toBe("c240");
  });

  // The route leaves out a slug the reader's list no longer holds, so a row the reader is waiting
  // on would never arrive: the page's list is stale and it is read again.
  it("reports a stale page when the route leaves out a row the reader is waiting on", async () => {
    // A row nobody is waiting on going missing is not a stale page.
    const quiet = vi.fn();
    const first = renderHook(() => useDrawFields(FIT, all, [all[0]], quiet));
    await waitFor(() => expect(net.calls).toHaveLength(1));
    await act(async () => net.calls[0].omit("c5"));
    expect(quiet).not.toHaveBeenCalled();
    first.unmount();

    const onStale = vi.fn();
    renderHook(() => useDrawFields(FIT, all, [all[0]], onStale));
    await waitFor(() => expect(net.calls.at(-1)!.url).toContain("s=c0"));
    await act(async () => net.calls.at(-1)!.omit("c0"));
    await waitFor(() => expect(onStale).toHaveBeenCalledTimes(1));
  });

  // A refresh hands the view a fresh payload of the same ranking: its withheld rows must be asked
  // for again, never resolved from the fields the previous payload fetched.
  it("keeps fields to the payload that fetched them", async () => {
    const { result, rerender } = renderHook(
      ({ list, wanted }: { list: DiscoveryRow[]; wanted: DiscoveryRow[] }) => useDrawFields(FIT, list, wanted),
      { initialProps: { list: all, wanted: [all[0]] } },
    );
    await waitFor(() => expect(net.calls).toHaveLength(1));
    await act(async () => net.calls[0].answer());
    await waitFor(() => expect(result.current.resolve(all[0])?.prose).toBe("c0"));

    const fresh = all.map((r) => ({ ...r }));
    rerender({ list: fresh, wanted: [fresh[0]] });
    expect(result.current.resolve(fresh[0])).toBeNull();
    await waitFor(() => expect(net.calls.at(-1)!.url).toContain("s=c0"));
  });

  it("reports a stale page when the reader later wants a row a background batch left out", async () => {
    const onStale = vi.fn();
    const drawn = all.slice(0, 2).map((r) => ({ ...r, ...fieldsFor(r.slug) })) as DiscoveryRow[];
    const { rerender } = renderHook(
      ({ wanted }: { wanted: DiscoveryRow[] }) => useDrawFields(FIT, all, wanted, onStale),
      { initialProps: { wanted: drawn } },
    );
    await waitFor(() => expect(net.calls).toHaveLength(1));
    await act(async () => net.calls[0].omit("c5"));
    expect(onStale).not.toHaveBeenCalled();
    rerender({ wanted: [all[5]] });
    await waitFor(() => expect(onStale).toHaveBeenCalledTimes(1));
  });

  // A page restored from the back/forward cache is not remounted: `pagehide` stopped the loop,
  // and `pageshow` has to start it again, asking once more for the batch the hide aborted.
  it("starts again when the page is restored from the back/forward cache", async () => {
    const { result } = renderHook(() => useDrawFields(FIT, all, [all[0]]));
    await waitFor(() => expect(net.calls).toHaveLength(1));
    act(() => { window.dispatchEvent(new Event("pagehide")); });
    expect(net.calls[0].signal.aborted).toBe(true);
    const shown = new Event("pageshow") as Event & { persisted: boolean };
    Object.defineProperty(shown, "persisted", { value: true });
    act(() => { window.dispatchEvent(shown); });
    await waitFor(() => expect(net.calls).toHaveLength(2));
    expect(new URL(net.calls[1].url, "http://x").searchParams.get("s")!.split(",")[0]).toBe("c0");
    await act(async () => net.calls[1].answer());
    await waitFor(() => expect(result.current.resolve(all[0])?.prose).toBe("c0"));
  });

  // A batch the reader waits on fails, and the reader leaves before its retry fires: `leave`
  // cancels the retry, so a failure kept across a back/forward return would hold the window busy
  // with nothing left to clear it.
  it("asks again for a failed window when the page comes back from the back/forward cache", async () => {
    renderHook(() => useDrawFields(FIT, all, [all[0]]));
    await waitFor(() => expect(net.calls).toHaveLength(1));
    await act(async () => net.calls[0].fail());
    act(() => { window.dispatchEvent(new Event("pagehide")); });
    const shown = new Event("pageshow") as Event & { persisted: boolean };
    Object.defineProperty(shown, "persisted", { value: true });
    act(() => { window.dispatchEvent(shown); });
    await waitFor(() => expect(net.calls).toHaveLength(2));
    expect(new URL(net.calls[1].url, "http://x").searchParams.get("s")!.split(",")[0]).toBe("c0");
  });

  // A list sent for a fresh read asks for nothing more: what it would fetch belongs to the payload
  // the page is replacing, and every batch would hold the one in-flight slot.
  it("asks for nothing more of a list once it has sent the page for a fresh read", async () => {
    const onStale = vi.fn();
    const { rerender } = renderHook(({ wanted }: { wanted: DiscoveryRow[] }) => useDrawFields(FIT, all, wanted, onStale), {
      initialProps: { wanted: [all[0]] },
    });
    await waitFor(() => expect(net.calls).toHaveLength(1));
    await act(async () => net.calls[0].omit("c0"));
    await waitFor(() => expect(onStale).toHaveBeenCalledTimes(1));
    // Show more on the list being replaced, before the fresh payload lands.
    rerender({ wanted: [all[0], all[240]] });
    await new Promise((r) => setTimeout(r, 300));
    expect(onStale).toHaveBeenCalledTimes(1);
    expect(net.calls).toHaveLength(1);
  });

  // A window that spent its retries, then a refresh that hands over a new payload with the same
  // window: the new payload's rows are asked for, or the list stays busy with nothing to clear it.
  it("asks afresh for a new payload's rows after the old one's window failed for good", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const { rerender } = renderHook(
        ({ list, wanted }: { list: DiscoveryRow[]; wanted: DiscoveryRow[] }) => useDrawFields(FIT, list, wanted),
        { initialProps: { list: all, wanted: [all[0]] } },
      );
      for (let i = 0; i < 4; i++) {
        await waitFor(() => expect(net.calls).toHaveLength(i + 1));
        await act(async () => net.calls[i].fail());
        await act(async () => { await vi.advanceTimersByTimeAsync(10_000); });
      }
      expect(net.calls).toHaveLength(4);
      const fresh = all.map((r) => ({ ...r }));
      rerender({ list: fresh, wanted: [fresh[0]] });
      await waitFor(() => expect(net.calls).toHaveLength(5));
      expect(new URL(net.calls[4].url, "http://x").searchParams.get("s")!.split(",")[0]).toBe("c0");
    } finally {
      vi.useRealTimers();
    }
  });

  // A refresh can hand over a new payload with the same window while a background batch for the
  // old one is still in flight. That batch gives way: it is aborted, so its failure cannot mark the
  // new payload's window failed, and the new payload's waiting rows are asked for at once.
  it("gives up an old payload's batch when a new payload arrives for the same window", async () => {
    const drawn = all.slice(0, 2).map((r) => ({ ...r, ...fieldsFor(r.slug) })) as DiscoveryRow[];
    const { rerender } = renderHook(
      ({ list, wanted }: { list: DiscoveryRow[]; wanted: DiscoveryRow[] }) => useDrawFields(FIT, list, wanted),
      { initialProps: { list: all, wanted: drawn } },
    );
    await waitFor(() => expect(net.calls).toHaveLength(1));
    const fresh = all.map((r) => ({ ...r }));
    rerender({ list: fresh, wanted: [fresh[0], fresh[1]] });
    expect(net.calls[0].signal.aborted).toBe(true);
    await waitFor(() => expect(net.calls).toHaveLength(2));
    expect(new URL(net.calls[1].url, "http://x").searchParams.get("s")!.split(",").slice(0, 2)).toEqual(["c0", "c1"]);
  });

  it("asks for nothing when every row arrived drawn", async () => {
    const drawn = all.slice(0, 3).map((r) => ({ ...r, ...fieldsFor(r.slug) }));
    renderHook(() => useDrawFields(FIT, drawn, drawn));
    await new Promise((r) => setTimeout(r, 400));
    expect(net.fn).not.toHaveBeenCalled();
  });
});
