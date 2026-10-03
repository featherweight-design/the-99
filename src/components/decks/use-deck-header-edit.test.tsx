import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { useDeckHeaderEdit } from "./use-deck-header-edit";

vi.mock("../../app/decks/tuning-actions", () => ({ saveDeckHeader: vi.fn(async () => ({ ok: true })) }));

import { saveDeckHeader } from "../../app/decks/tuning-actions";

describe("useDeckHeaderEdit (H35, STATES-deck-description.md §2)", () => {
  beforeEach(() => {
    vi.mocked(saveDeckHeader).mockClear();
  });

  it("commits both fields in one atomic write", async () => {
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
    expect(saveDeckHeader).toHaveBeenCalledOnce();
    expect(saveDeckHeader).toHaveBeenCalledWith("d1", { name: "New Name", description: "New desc" });
    expect(onDone).toHaveBeenCalledOnce();
  });

  // Round 5: `onDone` closes the editor on success, so the only thing that lets a screen-reader
  // user hear it happened is state that OUTLIVES that unmount — a caller renders this outside
  // the editor's own conditional.
  it("announces a successful description save", async () => {
    const { result } = renderHook(() => useDeckHeaderEdit("d1", "Old Name", "Old desc", () => {}));
    act(() => { result.current.setDescription("New desc"); });
    await act(async () => {
      result.current.commit();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(result.current.announced).toBe("Saved the description.");
  });

  it("announces nothing for a name-only save — the tagline did not change", async () => {
    const { result } = renderHook(() => useDeckHeaderEdit("d1", "Old Name", "Old desc", () => {}));
    act(() => { result.current.setName("New Name"); });
    await act(async () => {
      result.current.commit();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(result.current.announced).toBe("");
  });

  // Pre-open review round 2: a name-only save must not resend the untouched description, or a
  // concurrent save of that field elsewhere could be overwritten with this commit's stale copy.
  it("sends only the field that changed, on a name-only edit", async () => {
    const onDone = vi.fn();
    const { result } = renderHook(() => useDeckHeaderEdit("d1", "Old Name", "Old desc", onDone));
    act(() => { result.current.setName("New Name"); });
    await act(async () => {
      result.current.commit();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(saveDeckHeader).toHaveBeenCalledWith("d1", { name: "New Name" });
  });

  it("sends only the field that changed, on a description-only edit", async () => {
    const onDone = vi.fn();
    const { result } = renderHook(() => useDeckHeaderEdit("d1", "Old Name", "Old desc", onDone));
    act(() => { result.current.setDescription("New desc"); });
    await act(async () => {
      result.current.commit();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(saveDeckHeader).toHaveBeenCalledWith("d1", { description: "New desc" });
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
    expect(saveDeckHeader).not.toHaveBeenCalled();
    expect(onDone).toHaveBeenCalledOnce();
  });

  it("Enter in the name field moves focus to the description field, not a commit", () => {
    const onDone = vi.fn();
    const { result } = renderHook(() => useDeckHeaderEdit("d1", "Old Name", null, onDone));
    const descField = { focus: vi.fn() } as unknown as HTMLTextAreaElement;
    const event = { key: "Enter", preventDefault: vi.fn(), nativeEvent: { isComposing: false } } as unknown as React.KeyboardEvent<HTMLInputElement>;
    act(() => {
      result.current.onNameKeyDown(event, descField);
    });
    expect(descField.focus).toHaveBeenCalledOnce();
    expect(saveDeckHeader).not.toHaveBeenCalled();
  });

  // Pre-open review round 2: Enter confirms a composing IME character (Japanese/Chinese/Korean
  // input) and must not also move focus or save an unfinished line.
  it("ignores Enter and Escape while an IME composition is in progress", () => {
    const onDone = vi.fn();
    const { result } = renderHook(() => useDeckHeaderEdit("d1", "Old Name", "Old desc", onDone));
    act(() => { result.current.setDescription("日本"); });
    const preventDefault = vi.fn();
    const event = { key: "Enter", shiftKey: false, preventDefault, nativeEvent: { isComposing: true } } as unknown as React.KeyboardEvent<HTMLTextAreaElement>;
    act(() => {
      result.current.onDescriptionKeyDown(event);
    });
    expect(preventDefault).not.toHaveBeenCalled();
    expect(saveDeckHeader).not.toHaveBeenCalled();
    expect(result.current.description).toBe("日本");
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
    expect(saveDeckHeader).not.toHaveBeenCalled();
  });

  // Pre-open review: both widths mount this hook, so a save at one must reach the other's
  // still-closed editor, and a description saved from the empty-state field must reach the
  // pencil's own draft — both while an UNEDITED field, never clobbering one mid-edit.
  it("follows an unedited field to a new prop value", () => {
    const onDone = vi.fn();
    const { result, rerender } = renderHook(
      ({ name, description }) => useDeckHeaderEdit("d1", name, description, onDone),
      { initialProps: { name: "Old Name", description: "Old desc" } },
    );
    rerender({ name: "New Name", description: "New desc" });
    expect(result.current.name).toBe("New Name");
    expect(result.current.description).toBe("New desc");
  });

  it("does not clobber a field the reader is mid-edit on", () => {
    const onDone = vi.fn();
    const { result, rerender } = renderHook(
      ({ name, description }) => useDeckHeaderEdit("d1", name, description, onDone),
      { initialProps: { name: "Old Name", description: "Old desc" } },
    );
    act(() => { result.current.setName("Still typing…"); });
    rerender({ name: "Saved Elsewhere", description: "Old desc" });
    expect(result.current.name).toBe("Still typing…");
  });
});
