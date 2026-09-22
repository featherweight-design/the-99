import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const action = vi.hoisted(() => ({
  result: { ok: true, declared: 2 } as unknown,
  calls: [] as [string, number][],
}));

vi.mock("../../app/decks/declaration-actions", () => ({
  declareBracket: async (deckId: string, value: number) => {
    action.calls.push([deckId, value]);
    if (action.result instanceof Error) throw action.result;
    return action.result;
  },
}));

const { useDeclaration } = await import("./use-declaration");

beforeEach(() => {
  action.calls = [];
  action.result = { ok: true, declared: 2 };
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
});
