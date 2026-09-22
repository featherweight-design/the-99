import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// The default import is the server action; every case here injects its own read, so the
// module is stubbed only to keep a database client out of jsdom.
vi.mock("../../app/decks/[id]/combo-map-action", () => ({ loadDeckComboMap: vi.fn() }));
const { useDeckComboMap } = await import("./use-deck-combo-map");

const BLOOD = { "exquisite-blood": { oracleId: "sanguine-bond", name: "Sanguine Bond" } };

describe("useDeckComboMap", () => {
  it("reads nothing until asked — most deck visits never search", async () => {
    const load = vi.fn(async () => BLOOD);
    const { result } = renderHook(() => useDeckComboMap("deck-1", "a,b", load));
    await new Promise((r) => setTimeout(r, 20));
    expect(load).not.toHaveBeenCalled();
    expect(result.current.map).toBeNull();

    act(() => result.current.start());
    await waitFor(() => expect(result.current.map).toEqual(BLOOD));
    expect(load).toHaveBeenCalledTimes(1);
    expect(load).toHaveBeenCalledWith("deck-1");
  });

  it("asking twice reads once", async () => {
    const load = vi.fn(async () => BLOOD);
    const { result } = renderHook(() => useDeckComboMap("deck-1", "a", load));
    act(() => result.current.start());
    act(() => result.current.start());
    await waitFor(() => expect(result.current.map).toEqual(BLOOD));
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("re-reads when the deck's committed contents change, keeping the old map until then", async () => {
    let resolveSecond: (v: Record<string, { oracleId: string; name: string }>) => void = () => {};
    const load = vi
      .fn<(id: string) => Promise<Record<string, { oracleId: string; name: string }>>>()
      .mockResolvedValueOnce(BLOOD)
      .mockImplementationOnce(() => new Promise((r) => (resolveSecond = r)));
    const { result, rerender } = renderHook(({ key }) => useDeckComboMap("deck-1", key, load), {
      initialProps: { key: "a" },
    });
    act(() => result.current.start());
    await waitFor(() => expect(result.current.map).toEqual(BLOOD));

    rerender({ key: "a,exquisite-blood" });
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2));
    // Between the add and the re-read the previous map is still what is drawn.
    expect(result.current.map).toEqual(BLOOD);
    await act(async () => resolveSecond({}));
    expect(result.current.map).toEqual({});
  });

  it("never shows one deck's map on another deck", async () => {
    const load = vi.fn(async (id: string) => (id === "deck-1" ? BLOOD : new Promise<never>(() => {})));
    const { result, rerender } = renderHook(({ id }) => useDeckComboMap(id, "k", load), {
      initialProps: { id: "deck-1" },
    });
    act(() => result.current.start());
    await waitFor(() => expect(result.current.map).toEqual(BLOOD));
    rerender({ id: "deck-2" });
    expect(result.current.map).toBeNull();
  });

  it("a failed RE-read clears the map rather than leaving the old deck's up", async () => {
    let rejectSecond: (e: Error) => void = () => {};
    const load = vi
      .fn<(id: string) => Promise<Record<string, { oracleId: string; name: string }>>>()
      .mockResolvedValueOnce(BLOOD)
      .mockImplementationOnce(() => new Promise((_, reject) => (rejectSecond = reject)));
    const { result, rerender } = renderHook(({ key }) => useDeckComboMap("deck-1", key, load), {
      initialProps: { key: "a,sanguine-bond" },
    });
    act(() => result.current.start());
    await waitFor(() => expect(result.current.map).toEqual(BLOOD));
    // Sanguine Bond removed: the held map now names a card the deck no longer has.
    rerender({ key: "a" });
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2));
    await act(async () => rejectSecond(new Error("transient")));
    expect(result.current.map).toBeNull();
  });

  it("a failed read draws no partners and does not throw", async () => {
    const load = vi.fn(async () => {
      throw new Error("boom");
    });
    const { result } = renderHook(() => useDeckComboMap("deck-1", "k", load));
    act(() => result.current.start());
    await waitFor(() => expect(load).toHaveBeenCalled());
    expect(result.current.map).toBeNull();
  });
});
