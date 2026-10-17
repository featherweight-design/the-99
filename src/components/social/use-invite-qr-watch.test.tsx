// The invite QR's watch (invites PR 4): it polls only while a live QR is shown and the tab is visible, and stops on
// the first end it reports, claimed or expired.
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useInviteQrWatch } from "./use-invite-qr-watch";
import { WATCH_MS } from "./use-invite-watch";

const T = "A".repeat(43);
const fetchMock = vi.fn();
let visibility: DocumentVisibilityState = "visible";
const answer = (body: unknown) => fetchMock.mockResolvedValue({ ok: true, json: async () => body });
const tick = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

beforeEach(() => {
  vi.useFakeTimers();
  visibility = "visible";
  vi.spyOn(document, "visibilityState", "get").mockImplementation(() => visibility);
  fetchMock.mockReset();
  answer({ state: "live", secondsLeft: 600 });
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("useInviteQrWatch", () => {
  it("polls nothing without a live QR", async () => {
    renderHook(() => useInviteQrWatch(null, vi.fn()));
    await tick(WATCH_MS * 3);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("polls the QR while it is live, and stops when it is no longer shown", async () => {
    const { rerender } = renderHook(({ t }) => useInviteQrWatch(t, vi.fn()), { initialProps: { t: T as string | null } });
    await tick(WATCH_MS);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(`/api/invite-qr?t=${T}`);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ cache: "no-store" });
    await tick(WATCH_MS);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    rerender({ t: null });
    await tick(WATCH_MS * 3);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each(["claimed", "expired"] as const)("reports %s once, and polls no more", async (state) => {
    const onEnded = vi.fn();
    renderHook(() => useInviteQrWatch(T, onEnded));
    await tick(WATCH_MS);
    answer({ state });
    await tick(WATCH_MS);
    expect(onEnded).toHaveBeenCalledTimes(1);
    expect(onEnded).toHaveBeenCalledWith(state);
    await tick(WATCH_MS * 3);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("hands each live answer's time left on, and keeps polling", async () => {
    const onEnded = vi.fn();
    const onLive = vi.fn();
    renderHook(() => useInviteQrWatch(T, onEnded, onLive));
    answer({ state: "live", secondsLeft: 120 });
    await tick(WATCH_MS);
    expect(onLive).toHaveBeenLastCalledWith(120);
    await tick(WATCH_MS);
    expect(onLive).toHaveBeenCalledTimes(2);
    expect(onEnded).not.toHaveBeenCalled();
  });

  it("polls nothing while the tab is hidden, and at once when it comes back", async () => {
    renderHook(() => useInviteQrWatch(T, vi.fn()));
    visibility = "hidden";
    document.dispatchEvent(new Event("visibilitychange"));
    await tick(WATCH_MS * 3);
    expect(fetchMock).not.toHaveBeenCalled();
    visibility = "visible";
    document.dispatchEvent(new Event("visibilitychange"));
    await tick(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
