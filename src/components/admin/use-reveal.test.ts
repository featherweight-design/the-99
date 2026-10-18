// useReveal (Admin R3, D6, D7, D13): a Show reveals one account until the server's hidesAt, a Hide, or the view
// unmounting; an answer that arrives after a Hide or after the view is gone sets nothing; a failure names the account.
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RevealResult } from "../../lib/admin/reveal";

vi.mock("../../app/admin/accounts/actions", () => ({ revealAccount: vi.fn() }));
const { useReveal, utcHourMinute } = await import("./use-reveal");

const NOW = new Date("2026-10-17T19:37:00.000Z");
const ok = (id: string): RevealResult => ({ ok: true, id, name: "Colin Reyes", email: "colin@example.com", hidesAt: new Date(NOW.getTime() + 5 * 60_000).toISOString() });

function deferred() {
  let resolve!: (r: RevealResult) => void;
  const promise = new Promise<RevealResult>((r) => (resolve = r));
  return { promise, resolve };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});
afterEach(() => vi.useRealTimers());

describe("useReveal", () => {
  it("reveals on Show and re-masks quietly at hidesAt (D7)", async () => {
    const { result } = renderHook(() => useReveal(async (id) => ok(id)));
    await act(() => result.current.show("u1", "Colin R."));
    expect(result.current.revealed.get("u1")).toMatchObject({ name: "Colin Reyes", email: "colin@example.com", id: "u1" });
    act(() => vi.advanceTimersByTime(5 * 60_000 - 1));
    expect(result.current.revealed.has("u1")).toBe(true);
    act(() => vi.advanceTimersByTime(1));
    expect(result.current.revealed.has("u1")).toBe(false);
    expect(result.current.failure).toBeNull();
  });

  it("holds the account pending while the Show is in flight, and masks at once on Hide", async () => {
    const d = deferred();
    const { result } = renderHook(() => useReveal(() => d.promise));
    let shown!: Promise<void>;
    act(() => {
      shown = result.current.show("u1", "Colin R.");
    });
    expect(result.current.pending.has("u1")).toBe(true);
    expect(result.current.revealed.has("u1")).toBe(false);
    await act(async () => {
      d.resolve(ok("u1"));
      await shown;
    });
    expect(result.current.pending.has("u1")).toBe(false);
    act(() => result.current.hide("u1"));
    expect(result.current.revealed.has("u1")).toBe(false);
  });

  it("drops an answer that lands after a Hide", async () => {
    const d = deferred();
    const { result } = renderHook(() => useReveal(() => d.promise));
    let shown!: Promise<void>;
    act(() => {
      shown = result.current.show("u1", "Colin R.");
    });
    act(() => result.current.hide("u1"));
    await act(async () => {
      d.resolve(ok("u1"));
      await shown;
    });
    expect(result.current.revealed.has("u1")).toBe(false);
  });

  it("sets nothing when the answer lands after the view unmounted, and leaves no timer behind", async () => {
    const d = deferred();
    const { result, unmount } = renderHook(() => useReveal(() => d.promise));
    let shown!: Promise<void>;
    act(() => {
      shown = result.current.show("u1", "Colin R.");
    });
    unmount();
    await act(async () => {
      d.resolve(ok("u1"));
      await shown;
    });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("names a failed Show by the masked name, reveals nothing, and clears once a Show lands (D13)", async () => {
    const reveal = vi
      .fn<(id: string) => Promise<RevealResult>>()
      .mockResolvedValueOnce({ ok: false, error: "failed" })
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce(ok("u1"));
    const { result } = renderHook(() => useReveal(reveal));
    await act(() => result.current.show("u1", "Colin R."));
    expect(result.current.failure).toMatchObject({ id: "u1", masked: "Colin R." });
    expect(result.current.revealed.has("u1")).toBe(false);
    const first = result.current.failure!.n;
    // A thrown action is a failure too, never a reveal, and a new one (its toast gets a whole window).
    await act(() => result.current.show("u1", "Colin R."));
    expect(result.current.failure).toMatchObject({ id: "u1", masked: "Colin R." });
    expect(result.current.failure!.n).not.toBe(first);
    // The next Show that lands clears it.
    await act(() => result.current.show("u1", "Colin R."));
    expect(result.current.failure).toBeNull();
    expect(result.current.revealed.has("u1")).toBe(true);
  });

  it("re-masks when the page is left for the back/forward cache, and drops an answer still in flight (D7)", async () => {
    const d = deferred();
    const reveal = vi.fn<(id: string) => Promise<RevealResult>>().mockResolvedValueOnce(ok("u1")).mockImplementationOnce(() => d.promise);
    const { result } = renderHook(() => useReveal(reveal));
    await act(() => result.current.show("u1", "Colin R."));
    let shown!: Promise<void>;
    act(() => {
      shown = result.current.show("u2", "Max D.");
    });
    act(() => window.dispatchEvent(new Event("pagehide")));
    expect(result.current.revealed.size).toBe(0);
    expect(result.current.pending.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    await act(async () => {
      d.resolve(ok("u2"));
      await shown;
    });
    expect(result.current.revealed.size).toBe(0);
  });

  it("keeps a newer Show pending when a retired answer lands first", async () => {
    const old = deferred();
    const fresh = deferred();
    const reveal = vi.fn<(id: string) => Promise<RevealResult>>().mockImplementationOnce(() => old.promise).mockImplementationOnce(() => fresh.promise);
    const { result } = renderHook(() => useReveal(reveal));
    let first!: Promise<void>;
    let second!: Promise<void>;
    act(() => {
      first = result.current.show("u1", "Colin R.");
    });
    act(() => window.dispatchEvent(new Event("pagehide")));
    act(() => {
      second = result.current.show("u1", "Colin R.");
    });
    await act(async () => {
      old.resolve(ok("u1"));
      await first;
    });
    expect(result.current.pending.has("u1")).toBe(true);
    expect(result.current.revealed.has("u1")).toBe(false);
    await act(async () => {
      fresh.resolve(ok("u1"));
      await second;
    });
    expect(result.current.pending.has("u1")).toBe(false);
    expect(result.current.revealed.has("u1")).toBe(true);
  });

  it("clears pending at once on Hide", () => {
    const d = deferred();
    const { result } = renderHook(() => useReveal(() => d.promise));
    act(() => {
      void result.current.show("u1", "Colin R.");
    });
    act(() => result.current.hide("u1"));
    expect(result.current.pending.has("u1")).toBe(false);
  });

  it("shows nothing from an answer that lands past its hide time, and still reports the logged Show", async () => {
    const d = deferred();
    const onShown = vi.fn();
    const { result } = renderHook(() => useReveal(() => d.promise, onShown));
    let shown!: Promise<void>;
    act(() => {
      shown = result.current.show("u1", "Colin R.");
    });
    act(() => vi.advanceTimersByTime(5 * 60_000 + 1));
    await act(async () => {
      d.resolve(ok("u1"));
      await shown;
    });
    expect(result.current.revealed.has("u1")).toBe(false);
    expect(onShown).toHaveBeenCalledTimes(1);
  });

  it("reads the hide time on the UTC clock", () => {
    expect(utcHourMinute(new Date("2026-10-17T09:05:00.000Z"))).toBe("09:05");
  });
});
