import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { useDeckHeaderEdit } from "./use-deck-header-edit";

vi.mock("../../app/decks/actions", () => ({ renameDeck: vi.fn(async () => undefined) }));
vi.mock("../../app/decks/tuning-actions", () => ({ saveDeckDescription: vi.fn(async () => ({ ok: true })) }));

import { renameDeck } from "../../app/decks/actions";
import { saveDeckDescription } from "../../app/decks/tuning-actions";

describe("useDeckHeaderEdit (H35, STATES-deck-description.md §2)", () => {
  beforeEach(() => {
    vi.mocked(renameDeck).mockClear();
    vi.mocked(saveDeckDescription).mockClear();
  });

  it("commits both fields through their own actions, once", async () => {
    const onDone = vi.fn();
    const { result } = renderHook(() => useDeckHeaderEdit("d1", "Old Name", "Old desc", onDone));
    act(() => {
      result.current.setName("New Name");
      result.current.setDescription("New desc");
    });
    await act(async () => {
      result.current.commit();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(renameDeck).toHaveBeenCalledWith("d1", "New Name");
    expect(saveDeckDescription).toHaveBeenCalledOnce();
    expect(onDone).toHaveBeenCalledOnce();
  });

  it("cancel reverts both fields and calls nothing", () => {
    const onDone = vi.fn();
    const { result } = renderHook(() => useDeckHeaderEdit("d1", "Old Name", "Old desc", onDone));
    act(() => {
      result.current.setName("New Name");
      result.current.setDescription("New desc");
      result.current.cancel();
    });
    expect(result.current.name).toBe("Old Name");
    expect(result.current.description).toBe("Old desc");
    expect(renameDeck).not.toHaveBeenCalled();
    expect(onDone).toHaveBeenCalledOnce();
  });

  it("Enter in the name field moves focus to the description field, not a commit", () => {
    const onDone = vi.fn();
    const { result } = renderHook(() => useDeckHeaderEdit("d1", "Old Name", null, onDone));
    const descField = { focus: vi.fn() } as unknown as HTMLTextAreaElement;
    const event = { key: "Enter", preventDefault: vi.fn() } as unknown as React.KeyboardEvent<HTMLInputElement>;
    act(() => {
      result.current.onNameKeyDown(event, descField);
    });
    expect(descField.focus).toHaveBeenCalledOnce();
    expect(renameDeck).not.toHaveBeenCalled();
  });

  it("blur on the wrapper commits only when focus leaves the pair", () => {
    const onDone = vi.fn();
    const { result } = renderHook(() => useDeckHeaderEdit("d1", "Old Name", "Old desc", onDone));
    act(() => {
      result.current.setName("New Name");
    });
    const insideChild = document.createElement("div");
    const wrapper = document.createElement("div");
    wrapper.appendChild(insideChild);
    const event = {
      currentTarget: wrapper,
      relatedTarget: insideChild,
    } as unknown as React.FocusEvent<HTMLElement>;
    act(() => {
      result.current.onPairBlur(event);
    });
    expect(renameDeck).not.toHaveBeenCalled();
  });
});
