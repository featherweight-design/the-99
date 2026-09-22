import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const action = vi.hoisted(() => ({
  result: { ok: true, declared: 2 } as unknown,
  calls: [] as [string, number][],
  /** When set, each call waits on its own promise, resolved by the test in any order. */
  held: null as null | ((value: number) => Promise<unknown>),
}));

vi.mock("../../app/decks/declaration-actions", () => ({
  declareBracket: async (deckId: string, value: number) => {
    action.calls.push([deckId, value]);
    if (action.held) return action.held(value);
    if (action.result instanceof Error) throw action.result;
    return action.result;
  },
}));

const { useDeclaration } = await import("./use-declaration");

beforeEach(() => {
  action.calls = [];
  action.result = { ok: true, declared: 2 };
  action.held = null;
});

describe("useDeclaration", () => {
  it("draws the answer at once and writes it through the action", async () => {
    const { result } = renderHook(() => useDeclaration("deck-1", null));
    act(() => result.current.declare(2));
    expect(result.current.declared).toBe(2);
    await waitFor(() => expect(action.calls).toEqual([["deck-1", 2]]));
    expect(result.current.refused).toBe(false);
  });

  // A REFUSAL PUTS THE PREVIOUS ANSWER BACK, and says so. Leaving the optimistic one standing
  // would draw an answer the database never stored.
  it("puts the previous answer back when the write is refused", async () => {
    action.result = { ok: false, reason: "not-permitted" };
    const { result } = renderHook(() => useDeclaration("deck-1", 4));
    act(() => result.current.declare(5));
    await waitFor(() => expect(result.current.refused).toBe(true));
    expect(result.current.declared).toBe(4);
  });

  it("treats a failed request as a refusal", async () => {
    action.result = new Error("network");
    const { result } = renderHook(() => useDeclaration("deck-1", null));
    act(() => result.current.declare(1));
    await waitFor(() => expect(result.current.refused).toBe(true));
    expect(result.current.declared).toBeNull();
  });

  // A fresh server value wins over what the visit holds.
  it("takes a new stored value from the server", () => {
    const { result, rerender } = renderHook(({ stored }) => useDeclaration("deck-1", stored), {
      initialProps: { stored: null as 1 | 2 | null },
    });
    rerender({ stored: 2 });
    expect(result.current.declared).toBe(2);
  });

  // ONLY THE NEWEST PRESS SPEAKS. A slow refusal of an earlier press must not put the screen back
  // over a later one that succeeded — the database holds the later answer.
  it("ignores a late reply to a superseded press", async () => {
    const replies = new Map<number, (r: unknown) => void>();
    action.held = (value) => new Promise((resolve) => replies.set(value, resolve));
    const { result } = renderHook(() => useDeclaration("deck-1", null));
    act(() => result.current.declare(2));
    act(() => result.current.declare(1));
    await waitFor(() => expect(replies.size).toBe(2));
    await act(async () => replies.get(1)!({ ok: true, declared: 1 }));
    await act(async () => replies.get(2)!({ ok: false, reason: "not-permitted" }));
    expect(result.current.declared).toBe(1);
    expect(result.current.refused).toBe(false);
  });

  // A refusal restores what the SERVER last confirmed, not the unconfirmed answer that happened
  // to be on screen when the refused press was made.
  it("restores the last confirmed answer, not an unconfirmed one", async () => {
    const replies = new Map<number, (r: unknown) => void>();
    action.held = (value) => new Promise((resolve) => replies.set(value, resolve));
    const { result } = renderHook(() => useDeclaration("deck-1", 4));
    act(() => result.current.declare(5));
    await waitFor(() => expect(replies.size).toBe(1));
    act(() => result.current.declare(4));
    await waitFor(() => expect(replies.size).toBe(2));
    await act(async () => replies.get(4)!({ ok: false, reason: "not-permitted" }));
    expect(result.current.declared).toBe(4);
    expect(result.current.refused).toBe(true);
  });

  // A SUPERSEDED SUCCESS IS STILL A FACT ABOUT THE DATABASE. The first press lands after the
  // second was made, then the second is refused: the screen goes back to the first answer, which
  // the column holds, not to the value before either press.
  it("restores a superseded success when the newer press is refused", async () => {
    const replies = new Map<number, (r: unknown) => void>();
    action.held = (value) => new Promise((resolve) => replies.set(value, resolve));
    const { result } = renderHook(() => useDeclaration("deck-1", null));
    act(() => result.current.declare(2));
    act(() => result.current.declare(1));
    await waitFor(() => expect(replies.size).toBe(2));
    await act(async () => replies.get(2)!({ ok: true, declared: 2 }));
    await act(async () => replies.get(1)!({ ok: false, reason: "not-permitted" }));
    expect(result.current.declared).toBe(2);
    expect(result.current.refused).toBe(true);
  });

  // KEYED ON THE DECK. Two decks can hold the same stored answer, so a value comparison alone
  // would carry deck A's unconfirmed answer onto deck B — and a late reply for A must not land.
  it("starts a new deck from its own stored answer and drops the old deck's replies", async () => {
    const replies = new Map<number, (r: unknown) => void>();
    action.held = (value) => new Promise((resolve) => replies.set(value, resolve));
    const { result, rerender } = renderHook(({ id }) => useDeclaration(id, null), {
      initialProps: { id: "deck-a" },
    });
    act(() => result.current.declare(2));
    expect(result.current.declared).toBe(2);
    rerender({ id: "deck-b" });
    expect(result.current.declared).toBeNull();
    await waitFor(() => expect(replies.size).toBe(1));
    await act(async () => replies.get(2)!({ ok: false, reason: "not-permitted" }));
    expect(result.current.declared).toBeNull();
    expect(result.current.refused).toBe(false);
  });
});
