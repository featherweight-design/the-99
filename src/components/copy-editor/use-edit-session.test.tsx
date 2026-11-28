// The lifted edit session: the door's count is the filtered stored edits and follows other tabs, and the status poll
// the submission hook runs from the provider starts only for a sent branch and stops at a terminal status.
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EDITS_STORAGE_KEY } from "../../lib/copy-editor/edits-store";
import { SENT_STORAGE_KEY } from "../../lib/copy-editor/submit";

const readStatus = vi.fn();
vi.mock("../../lib/copy-editor/submit", async (orig) => ({ ...(await orig<typeof import("../../lib/copy-editor/submit")>()), readStatus: (...a: unknown[]) => readStatus(...a) }));

import { useEditSession } from "./use-edit-session";

const edit = { key: "a.ts#x", from: "a", to: "b" };

beforeEach(() => {
  vi.useFakeTimers();
  window.localStorage.clear();
  readStatus.mockReset();
});
afterEach(() => vi.useRealTimers());

describe("edit count", () => {
  it("counts the stored edits and drops malformed ones", () => {
    window.localStorage.setItem(EDITS_STORAGE_KEY, JSON.stringify([edit, { key: 3 }, null]));
    const { result } = renderHook(() => useEditSession());
    expect(result.current.edits).toEqual([edit]);
  });
  it("follows another tab's change to the stored edits, and ignores other keys", () => {
    const { result } = renderHook(() => useEditSession());
    expect(result.current.edits).toEqual([]);
    window.localStorage.setItem(EDITS_STORAGE_KEY, JSON.stringify([edit]));
    act(() => window.dispatchEvent(new StorageEvent("storage", { key: EDITS_STORAGE_KEY })));
    expect(result.current.edits).toEqual([edit]);
    window.localStorage.setItem(EDITS_STORAGE_KEY, "[]");
    act(() => window.dispatchEvent(new StorageEvent("storage", { key: "other" })));
    expect(result.current.edits).toEqual([edit]);
  });
});

describe("status poll", () => {
  const sent = () => window.localStorage.setItem(SENT_STORAGE_KEY, JSON.stringify({ branch: "copy-edit/x", edits: [edit], at: Date.now() }));
  it("asks nothing when no sent branch is stored", async () => {
    renderHook(() => useEditSession());
    await act(() => vi.advanceTimersByTimeAsync(60_000));
    expect(readStatus).not.toHaveBeenCalled();
  });
  it("polls a sent branch until a terminal status, then stops", async () => {
    sent();
    readStatus.mockResolvedValue({ state: "pending" });
    renderHook(() => useEditSession());
    await act(() => vi.advanceTimersByTimeAsync(9_000));
    expect(readStatus).toHaveBeenCalledTimes(2);
    readStatus.mockResolvedValue({ state: "merged" });
    await act(() => vi.advanceTimersByTimeAsync(4_000));
    const calls = readStatus.mock.calls.length;
    await act(() => vi.advanceTimersByTimeAsync(120_000));
    expect(readStatus.mock.calls.length).toBe(calls);
    expect(window.localStorage.getItem(SENT_STORAGE_KEY)).toBeNull();
  });
});
