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

describe("useDrawFields", () => {
  const all = Array.from({ length: 250 }, (_, i) => row(`c${i}`));

  it("asks for the rows the reader is waiting on first, one batch at a time", async () => {
    const wanted = [all[240], all[241]];
    renderHook(() => useDrawFields("fit", all, wanted));
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

  it("resolves a row once its fields have arrived", async () => {
    const wanted = [all[0]];
    const { result } = renderHook(() => useDrawFields("fit", all, wanted));
    expect(result.current.resolve(all[0])).toBeNull();
    await waitFor(() => expect(net.calls).toHaveLength(1));
    await act(async () => net.calls[0].answer());
    await waitFor(() => expect(result.current.resolve(all[0])?.prose).toBe("c0"));
  });

  it("aborts the batch in flight and starts no other when the page is left", async () => {
    renderHook(() => useDrawFields("fit", all, [all[0]]));
    await waitFor(() => expect(net.calls).toHaveLength(1));
    act(() => { window.dispatchEvent(new Event("pagehide")); });
    expect(net.calls[0].signal.aborted).toBe(true);
    await new Promise((r) => setTimeout(r, 400));
    expect(net.calls).toHaveLength(1);
  });

  it("aborts on a click to another route, and not on one to this route", async () => {
    renderHook(() => useDrawFields("fit", all, [all[0]]));
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
      return useDrawFields("fit", all, drawn);
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
    const { result } = renderHook(() => useDrawFields("fit", all, [all[0]]));
    await waitFor(() => expect(net.calls).toHaveLength(1));
    await act(async () => net.calls[0].fail());
    await waitFor(() => expect(net.calls).toHaveLength(2), { timeout: 2500 });
    expect(new URL(net.calls[1].url, "http://x").searchParams.get("s")!.split(",")[0]).toBe("c0");
    await act(async () => net.calls[1].answer());
    await waitFor(() => expect(result.current.resolve(all[0])?.prose).toBe("c0"));
  });

  it("never marks a window chosen after a batch was asked for as failed by that batch", async () => {
    const drawn = all.slice(0, 2).map((r) => ({ ...r, ...fieldsFor(r.slug) }));
    const { rerender } = renderHook(({ wanted }: { wanted: DiscoveryRow[] }) => useDrawFields("fit", all, wanted), {
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
    const { rerender } = renderHook(({ wanted }: { wanted: DiscoveryRow[] }) => useDrawFields("fit", all, wanted), {
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
    const first = renderHook(() => useDrawFields("fit", all, [all[0]], quiet));
    await waitFor(() => expect(net.calls).toHaveLength(1));
    await act(async () => net.calls[0].omit("c5"));
    expect(quiet).not.toHaveBeenCalled();
    first.unmount();

    const onStale = vi.fn();
    renderHook(() => useDrawFields("fit", all, [all[0]], onStale));
    await waitFor(() => expect(net.calls.at(-1)!.url).toContain("s=c0"));
    await act(async () => net.calls.at(-1)!.omit("c0"));
    await waitFor(() => expect(onStale).toHaveBeenCalledTimes(1));
  });

  // A page restored from the back/forward cache is not remounted: `pagehide` stopped the loop,
  // and `pageshow` has to start it again, asking once more for the batch the hide aborted.
  it("starts again when the page is restored from the back/forward cache", async () => {
    const { result } = renderHook(() => useDrawFields("fit", all, [all[0]]));
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

  it("asks for nothing when every row arrived drawn", async () => {
    const drawn = all.slice(0, 3).map((r) => ({ ...r, ...fieldsFor(r.slug) }));
    renderHook(() => useDrawFields("fit", drawn, drawn));
    await new Promise((r) => setTimeout(r, 400));
    expect(net.fn).not.toHaveBeenCalled();
  });
});
