// /friends' watch over the reader's own links: it polls only while a link is watched and the tab is visible,
// stops when nothing is watched, polls at once when the tab comes back, and reports an ended link once.
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useInviteWatch, WATCH_MS } from "./use-invite-watch";

const A = "AbCdEfGhIjKlMnOpQrStUv";
const B = "ZyXwVuTsRqPoNmLkJiHgFe";
const fetchMock = vi.fn();
let visibility: DocumentVisibilityState = "visible";

function answer(links: { token: string; open: boolean; friend: { publicId: string; displayName: string } | null }[]) {
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ links }) });
}
const setVisibility = (v: DocumentVisibilityState) => {
  visibility = v;
  document.dispatchEvent(new Event("visibilitychange"));
};
const flush = () => act(async () => {});
const tick = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

beforeEach(() => {
  vi.useFakeTimers();
  visibility = "visible";
  vi.spyOn(document, "visibilityState", "get").mockImplementation(() => visibility);
  fetchMock.mockReset();
  answer([{ token: A, open: true, friend: null }]);
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("useInviteWatch", () => {
  it("polls nothing while no link is watched", async () => {
    renderHook(() => useInviteWatch([], vi.fn()));
    await tick(WATCH_MS * 3);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("polls the watched links every few seconds, and stops when they are no longer watched", async () => {
    const { rerender } = renderHook(({ t }) => useInviteWatch(t, vi.fn()), { initialProps: { t: [A] } });
    await tick(WATCH_MS);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(`/api/friend-invites?t=${A}`);
    await tick(WATCH_MS);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    rerender({ t: [] });
    await tick(WATCH_MS * 3);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("polls nothing while the tab is hidden, and polls at once when it comes back", async () => {
    renderHook(() => useInviteWatch([A], vi.fn()));
    act(() => setVisibility("hidden"));
    await tick(WATCH_MS * 5);
    expect(fetchMock).not.toHaveBeenCalled();
    act(() => setVisibility("visible"));
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reports a redeemed link once, with its friend, and stops polling it", async () => {
    const onEnded = vi.fn();
    answer([{ token: A, open: false, friend: { publicId: "p-mo", displayName: "Mo" } }, { token: B, open: true, friend: null }]);
    renderHook(() => useInviteWatch([A, B], onEnded));
    await tick(WATCH_MS);
    expect(onEnded).toHaveBeenCalledTimes(1);
    expect(onEnded).toHaveBeenCalledWith([{ token: A, open: false, friend: { publicId: "p-mo", displayName: "Mo" } }]);
    await tick(WATCH_MS);
    expect(onEnded).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[1][0]).toBe(`/api/friend-invites?t=${B}`);
  });

  it("reads a link the answer leaves out as ended, and a failed poll as nothing", async () => {
    const onEnded = vi.fn();
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    renderHook(() => useInviteWatch([A], onEnded));
    await tick(WATCH_MS);
    expect(onEnded).not.toHaveBeenCalled();
    answer([]);
    await tick(WATCH_MS);
    expect(onEnded).toHaveBeenCalledWith([{ token: A, open: false, friend: null }]);
  });
  it("reports nothing from an answer that lands after the watch stopped", async () => {
    const onEnded = vi.fn();
    let land: (v: unknown) => void = () => {};
    fetchMock.mockReturnValue(new Promise((r) => { land = r; }));
    const { rerender } = renderHook(({ t }) => useInviteWatch(t, onEnded), { initialProps: { t: [A] } });
    await tick(WATCH_MS);
    rerender({ t: [] });
    await act(async () => land({ ok: true, json: async () => ({ links: [{ token: A, open: false, friend: null }] }) }));
    expect(onEnded).not.toHaveBeenCalled();
  });
  it("leaves a link for the next watch to report when an answer lands after the watched set changed", async () => {
    const onEnded = vi.fn();
    let land: (v: unknown) => void = () => {};
    fetchMock.mockReturnValueOnce(new Promise((r) => { land = r; }));
    const { rerender } = renderHook(({ t }) => useInviteWatch(t, onEnded), { initialProps: { t: [A] } });
    await tick(WATCH_MS);
    rerender({ t: [A, B] });
    await act(async () => land({ ok: true, json: async () => ({ links: [{ token: A, open: false, friend: null }] }) }));
    answer([{ token: A, open: false, friend: null }, { token: B, open: true, friend: null }]);
    await tick(WATCH_MS);
    expect(onEnded).toHaveBeenCalledTimes(1);
    expect(onEnded).toHaveBeenCalledWith([{ token: A, open: false, friend: null }]);
  });
});
