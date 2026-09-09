import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renameCopy } from "../../lib/copy/decks-builder";
import { useDeckRename } from "./use-deck-rename";

const renameDeck = vi.hoisted(() => vi.fn());
vi.mock("../../app/decks/actions", () => ({ renameDeck }));

describe("useDeckRename", () => {
  // `mockClear` and an explicit implementation, never `mockReset`: a reset mock
  // whose next call rejects has its rejection reported by the runner as an
  // unhandled error, even though the hook catches it.
  beforeEach(() => {
    renameDeck.mockClear();
    renameDeck.mockImplementation(async () => {});
  });

  it("cannot save an unchanged or empty name", () => {
    const { result } = renderHook(() => useDeckRename("d1", "Atraxa", () => {}));
    expect(result.current.canSave).toBe(false);
    act(() => result.current.setValue("   "));
    expect(result.current.canSave).toBe(false);
    act(() => result.current.setValue("Atraxa Superfriends"));
    expect(result.current.canSave).toBe(true);
  });

  it("Enter on an unchanged name is inert and leaves the field open", () => {
    const onDone = vi.fn();
    const { result } = renderHook(() => useDeckRename("d1", "Atraxa", onDone));
    act(() =>
      result.current.onKeyDown({
        key: "Enter",
        preventDefault: () => {},
      } as React.KeyboardEvent<HTMLInputElement>),
    );
    expect(renameDeck).not.toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
    expect(result.current.error).toBeNull();
  });

  it("commits the trimmed name and calls onDone", async () => {
    const onDone = vi.fn();
    const { result } = renderHook(() => useDeckRename("d1", "Atraxa", onDone));
    act(() => result.current.setValue("  Superfriends  "));
    await act(async () => result.current.commit());
    expect(renameDeck).toHaveBeenCalledWith("d1", "Superfriends");
    await waitFor(() => expect(onDone).toHaveBeenCalled());
  });

  it("reverts on Escape without calling the action", () => {
    const onDone = vi.fn();
    const { result } = renderHook(() => useDeckRename("d1", "Atraxa", onDone));
    act(() => result.current.setValue("Nope"));
    act(() =>
      result.current.onKeyDown({
        key: "Escape",
        preventDefault: () => {},
      } as React.KeyboardEvent<HTMLInputElement>),
    );
    expect(renameDeck).not.toHaveBeenCalled();
    expect(onDone).toHaveBeenCalled();
  });

  it("surfaces an error and stays open when the action rejects", async () => {
    // `mockImplementation`, not `mockRejectedValue`: the latter builds its
    // rejected promise when the mock is configured rather than when it is
    // called, and the runner reports that one as unhandled before the hook's
    // own `catch` ever sees it.
    renameDeck.mockImplementation(async () => {
      throw new Error("nope");
    });
    const onDone = vi.fn();
    const { result } = renderHook(() => useDeckRename("d1", "Atraxa", onDone));
    act(() => result.current.setValue("Superfriends"));
    await act(async () => result.current.commit());
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(onDone).not.toHaveBeenCalled();
  });

  it("an over-length name takes the error row rather than an inert Save", async () => {
    const { result } = renderHook(() => useDeckRename("d1", "Atraxa", () => {}));
    act(() => result.current.setValue("x".repeat(121)));
    expect(result.current.canSave).toBe(true);
    await act(async () => result.current.commit());
    expect(renameDeck).not.toHaveBeenCalled();
    expect(result.current.error).toBe(renameCopy.errorLength);
  });

  it("a blur with no change closes without calling the action", async () => {
    const onDone = vi.fn();
    const { result } = renderHook(() => useDeckRename("d1", "Atraxa", onDone));
    await act(async () => result.current.onBlur());
    expect(renameDeck).not.toHaveBeenCalled();
    expect(onDone).toHaveBeenCalled();
  });
});
