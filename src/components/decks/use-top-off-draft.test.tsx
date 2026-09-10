import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { topOffDraftKey } from "../../lib/decks/top-off-draft";
import { useTopOffDraft } from "./use-top-off-draft";

const DECK = "a0000000-0000-4000-8000-000000000001";
const KEY = topOffDraftKey(DECK);

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("useTopOffDraft", () => {
  it("starts empty when the deck has no stored selection", () => {
    const { result } = renderHook(() => useTopOffDraft(DECK));
    expect(result.current.ticked).toEqual(new Set());
    expect(result.current.declined).toEqual(new Set());
    expect(result.current.restored).toBe(false);
  });

  it("restores a selection stored under this deck", () => {
    localStorage.setItem(KEY, '{"t":["sol-ring"],"d":["chrome-mox"]}');
    const { result } = renderHook(() => useTopOffDraft(DECK));
    expect(result.current.ticked).toEqual(new Set(["sol-ring"]));
    expect(result.current.declined).toEqual(new Set(["chrome-mox"]));
    expect(result.current.restored).toBe(true);
  });

  // The strip seeds its ticks on the first open and the door promises what
  // will arrive ticked. Both questions are "has this player already chosen?",
  // so an empty selection the player themselves cleared has to read as
  // restored — otherwise reopening after clearing every tick would seed the
  // owned cards straight back in.
  it("reads an emptied selection as restored, not as absent", () => {
    localStorage.setItem(KEY, '{"t":[],"d":[]}');
    const { result } = renderHook(() => useTopOffDraft(DECK));
    expect(result.current.restored).toBe(true);
  });

  it("ignores a stored value this app did not write", () => {
    localStorage.setItem(KEY, "not json");
    const { result } = renderHook(() => useTopOffDraft(DECK));
    expect(result.current.ticked).toEqual(new Set());
    expect(result.current.restored).toBe(false);
  });

  it("does not read another deck's selection", () => {
    localStorage.setItem(topOffDraftKey("some-other-deck"), '{"t":["sol-ring"],"d":[]}');
    const { result } = renderHook(() => useTopOffDraft(DECK));
    expect(result.current.ticked).toEqual(new Set());
  });

  it("persists a tick so a remount restores it", () => {
    const first = renderHook(() => useTopOffDraft(DECK));
    act(() => first.result.current.setTicked(new Set(["sol-ring"])));
    first.unmount();

    const second = renderHook(() => useTopOffDraft(DECK));
    expect(second.result.current.ticked).toEqual(new Set(["sol-ring"]));
  });

  it("persists a decline alongside the ticks rather than replacing them", () => {
    const { result } = renderHook(() => useTopOffDraft(DECK));
    act(() => result.current.setTicked(new Set(["sol-ring"])));
    act(() => result.current.setDeclined(new Set(["chrome-mox"])));
    expect(result.current.ticked).toEqual(new Set(["sol-ring"]));
    expect(result.current.declined).toEqual(new Set(["chrome-mox"]));
  });

  // Declining a ticked candidate calls both setters back to back, inside one
  // handler and therefore before either re-render. A setter reading its
  // counterpart off the last render would write a snapshot taken before the
  // call beside it, and the first of the two writes would be lost.
  it("keeps both halves when the two setters are called in one handler", () => {
    const { result } = renderHook(() => useTopOffDraft(DECK));
    act(() => {
      result.current.setDeclined(new Set(["sol-ring"]));
      result.current.setTicked(new Set(["mana-crypt"]));
    });
    expect(result.current.declined).toEqual(new Set(["sol-ring"]));
    expect(result.current.ticked).toEqual(new Set(["mana-crypt"]));
  });

  // A landed pass is the one event that leaves nothing to hold, and the next
  // open has to read as a first visit — otherwise it seeds nothing and offers
  // an empty list to a player who still has slots to fill.
  it("forgets the selection outright when it is discarded", () => {
    localStorage.setItem(KEY, '{"t":["sol-ring"],"d":["chrome-mox"]}');
    const { result, unmount } = renderHook(() => useTopOffDraft(DECK));
    act(() => result.current.discard());
    expect(result.current.ticked).toEqual(new Set());
    expect(result.current.declined).toEqual(new Set());
    expect(result.current.restored).toBe(false);
    unmount();

    const second = renderHook(() => useTopOffDraft(DECK));
    expect(second.result.current.restored).toBe(false);
  });

  // The session map is where a value storage refused is held, and it is not
  // reachable through localStorage — a discard that cleared only the store
  // would leave the selection readable through the half it missed.
  it("forgets a selection storage refused to take", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    const { result } = renderHook(() => useTopOffDraft("deck-whose-writes-throw-then-discard"));
    act(() => result.current.setTicked(new Set(["sol-ring"])));
    act(() => result.current.discard());
    expect(result.current.ticked).toEqual(new Set());
    expect(result.current.restored).toBe(false);
  });

  // Acting in one tab should settle the other: the same deck open twice is the
  // second half of the loss this hook exists to close.
  it("settles when another tab writes this deck's selection", () => {
    const { result } = renderHook(() => useTopOffDraft(DECK));
    act(() => {
      localStorage.setItem(KEY, '{"t":["sol-ring"],"d":[]}');
      window.dispatchEvent(new StorageEvent("storage", { key: KEY }));
    });
    expect(result.current.ticked).toEqual(new Set(["sol-ring"]));
  });

  it("ignores another deck's cross-tab write", () => {
    const other = topOffDraftKey("some-other-deck");
    const { result } = renderHook(() => useTopOffDraft(DECK));
    act(() => {
      localStorage.setItem(other, '{"t":["sol-ring"],"d":[]}');
      window.dispatchEvent(new StorageEvent("storage", { key: other }));
    });
    expect(result.current.ticked).toEqual(new Set());
  });

  // Safari private mode and a full quota both throw outright. Persistence is
  // best-effort, but the tick itself is not: a throw must not leave the player
  // clicking a checkbox that never ticks.
  // Each of the two throwing cases takes its own deck. A value storage refused
  // is held for the session in module state that `localStorage.clear()` cannot
  // reach, so sharing a key would let the first of them satisfy the second.
  it("still holds the selection when storage refuses the write", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    const { result } = renderHook(() => useTopOffDraft("deck-whose-writes-throw"));
    act(() => result.current.setTicked(new Set(["sol-ring"])));
    expect(result.current.ticked).toEqual(new Set(["sol-ring"]));
  });

  it("still holds the selection when storage refuses to be read", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    const { result } = renderHook(() => useTopOffDraft("deck-whose-reads-throw"));
    act(() => result.current.setTicked(new Set(["sol-ring"])));
    expect(result.current.ticked).toEqual(new Set(["sol-ring"]));
  });
});
