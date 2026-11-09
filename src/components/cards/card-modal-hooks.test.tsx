import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SHEET } from "./card-sheet-gesture";
import { ZOOM_REGION } from "./card-modal-parts";
import { runEscapeLadder, usePagedInitialFocus, usePagingKeys, useSheetSnap } from "./card-modal-hooks";

afterEach(() => {
  // Unmounted explicitly: a paging listener left from an earlier test would take the key first.
  cleanup();
  document.body.innerHTML = "";
});

describe("useSheetSnap", () => {
  const nullDialog = { current: null };

  it("opens at the teaser, or at min when handed a minimized sheet", () => {
    const teaser = renderHook(() => useSheetSnap({ startMinimized: false, narrow: true, dialogRef: nullDialog }));
    expect(teaser.result.current.snap).toBe("teaser");
    const min = renderHook(() => useSheetSnap({ startMinimized: true, narrow: true, dialogRef: nullDialog }));
    expect(min.result.current.snap).toBe("min");
    expect(min.result.current.min).toBe(true);
  });

  it("opens full when forced, over a carried min, and reports the drawn snap once on mount", () => {
    const onMinimizedChange = vi.fn();
    const { result, rerender } = renderHook(() =>
      useSheetSnap({ startMinimized: true, forceFull: true, onMinimizedChange, narrow: true, dialogRef: nullDialog }),
    );
    expect(result.current.snap).toBe("full");
    expect(result.current.sheetFull).toBe(true);
    expect(result.current.sheetOpen).toBe(true);
    expect(onMinimizedChange).toHaveBeenCalledTimes(1);
    expect(onMinimizedChange).toHaveBeenCalledWith(false);
    rerender();
    expect(onMinimizedChange).toHaveBeenCalledTimes(1);
  });

  it("reports a carried min on mount when nothing forces the sheet full", () => {
    const onMinimizedChange = vi.fn();
    renderHook(() => useSheetSnap({ startMinimized: true, onMinimizedChange, narrow: true, dialogRef: nullDialog }));
    expect(onMinimizedChange).toHaveBeenCalledWith(true);
  });

  it("marks moves to and from min gentle and reports them, and teaser to full quick", () => {
    const onMinimizedChange = vi.fn();
    const { result } = renderHook(() => useSheetSnap({ startMinimized: false, onMinimizedChange, narrow: true, dialogRef: nullDialog }));
    onMinimizedChange.mockClear();
    act(() => result.current.setSnap("min"));
    expect(result.current.gentle).toBe(true);
    expect(onMinimizedChange).toHaveBeenLastCalledWith(true);
    act(() => result.current.setSnap("teaser"));
    expect(result.current.gentle).toBe(true);
    expect(onMinimizedChange).toHaveBeenLastCalledWith(false);
    onMinimizedChange.mockClear();
    act(() => result.current.setSnap("full"));
    expect(result.current.gentle).toBe(false);
    expect(onMinimizedChange).not.toHaveBeenCalled();
  });

  it("adds the door strip to the teaser, and reads no sheet at desktop widths", () => {
    const { result } = renderHook(() =>
      useSheetSnap({ startMinimized: true, forceFull: false, narrow: false, doorHeight: 40, dialogRef: nullDialog }),
    );
    expect(result.current.teaserHeight).toBe(SHEET.teaserHeight + 40);
    expect(result.current.min).toBe(false);
    act(() => result.current.setSnap("full"));
    expect(result.current.sheetFull).toBe(true);
    expect(result.current.sheetOpen).toBe(false);
  });
});

describe("runEscapeLadder", () => {
  it("asks the rungs in order and stops at the first that handles the key", () => {
    const asked: string[] = [];
    const rung = (name: string, handles: boolean) => () => {
      asked.push(name);
      return handles;
    };
    runEscapeLadder([rung("zoom", false), rung("view", false), rung("sheet", true), rung("close", true)]);
    expect(asked).toEqual(["zoom", "view", "sheet"]);
  });

  it("asks every rung when none handles it", () => {
    const last = vi.fn(() => false);
    runEscapeLadder([() => false, last]);
    expect(last).toHaveBeenCalledTimes(1);
  });
});

describe("usePagingKeys", () => {
  function mount(overrides: Partial<Parameters<typeof usePagingKeys>[0]> = {}) {
    const backdrop = document.createElement("div");
    document.body.appendChild(backdrop);
    const onPrev = vi.fn();
    const onNext = vi.fn();
    const onAtStart = vi.fn();
    const onAtEnd = vi.fn();
    const props = {
      backdropRef: { current: backdrop },
      total: 3,
      enabled: true,
      onPrev,
      onNext,
      onAtStart,
      onAtEnd,
      narrow: false,
      full: false,
      leftFaceRef: { current: "back.jpg" },
      ...overrides,
    };
    renderHook(() => usePagingKeys(props));
    return { backdrop, onPrev, onNext, onAtStart, onAtEnd };
  }
  const press = (target: EventTarget, key: string, init: KeyboardEventInit = {}) => {
    const e = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...init });
    target.dispatchEvent(e);
    return e;
  };

  it("pages on a plain arrow at the body or inside the backdrop, handing the face being left", () => {
    const { backdrop, onPrev, onNext } = mount();
    const e = press(document.body, "ArrowRight");
    expect(onNext).toHaveBeenCalledWith(undefined, undefined, "back.jpg");
    expect(e.defaultPrevented).toBe(true);
    const inside = document.createElement("button");
    backdrop.appendChild(inside);
    press(inside, "ArrowLeft");
    expect(onPrev).toHaveBeenCalledWith(undefined, undefined, "back.jpg");
  });

  it("calls the ends when a side is missing", () => {
    const { onAtStart, onAtEnd } = mount({ onPrev: null, onNext: null });
    press(document.body, "ArrowLeft");
    press(document.body, "ArrowRight");
    expect(onAtStart).toHaveBeenCalledTimes(1);
    expect(onAtEnd).toHaveBeenCalledTimes(1);
  });

  it("leaves modified arrows, other keys and handled keys alone", () => {
    const { onNext } = mount();
    for (const mod of ["altKey", "ctrlKey", "metaKey", "shiftKey"] as const) press(document.body, "ArrowRight", { [mod]: true });
    press(document.body, "Enter");
    const handled = new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true });
    handled.preventDefault();
    document.body.dispatchEvent(handled);
    expect(onNext).not.toHaveBeenCalled();
  });

  it("leaves a key aimed outside the backdrop alone", () => {
    const { onNext } = mount();
    const outside = document.createElement("button");
    document.body.appendChild(outside);
    press(outside, "ArrowRight");
    expect(onNext).not.toHaveBeenCalled();
  });

  it("stands down in a field, a radiogroup and the zoom", () => {
    const { backdrop, onNext } = mount();
    const input = document.createElement("input");
    backdrop.appendChild(input);
    input.focus();
    press(input, "ArrowRight");
    const group = document.createElement("div");
    group.setAttribute("role", "radiogroup");
    const radio = document.createElement("button");
    group.appendChild(radio);
    backdrop.appendChild(group);
    radio.focus();
    press(radio, "ArrowRight");
    const zoom = document.createElement("div");
    zoom.id = ZOOM_REGION;
    const close = document.createElement("button");
    zoom.appendChild(close);
    backdrop.appendChild(zoom);
    close.focus();
    press(close, "ArrowRight");
    expect(onNext).not.toHaveBeenCalled();
  });

  it("attaches nothing when disabled, for a list of one, or on the phone's full sheet", () => {
    const disabled = mount({ enabled: false });
    press(document.body, "ArrowRight");
    expect(disabled.onNext).not.toHaveBeenCalled();
    document.body.innerHTML = "";
    const single = mount({ total: 1 });
    press(document.body, "ArrowRight");
    expect(single.onNext).not.toHaveBeenCalled();
    document.body.innerHTML = "";
    const fullSheet = mount({ narrow: true, full: true });
    press(document.body, "ArrowRight");
    expect(fullSheet.onNext).not.toHaveBeenCalled();
  });
});

describe("usePagedInitialFocus", () => {
  const button = (rects: number) => {
    const el = document.createElement("button");
    el.getClientRects = () => ({ length: rects }) as DOMRectList;
    return el;
  };
  const refs = (closes: (HTMLButtonElement | null)[], over: Record<string, HTMLElement | null> = {}) => ({
    prevButtonRef: { current: over.prevButton ?? null },
    nextButtonRef: { current: over.nextButton ?? null },
    prevPeekRef: { current: over.prevPeek ?? null },
    prevPhonePeekRef: { current: over.prevPhonePeek ?? null },
    nextPeekRef: { current: over.nextPeek ?? null },
    nextPhonePeekRef: { current: over.nextPhonePeek ?? null },
    closeRefs: { current: closes },
  });

  it("focuses the ✕ with layout on a fresh open, else the first mounted one", () => {
    const hidden = button(0);
    const shown = button(1);
    const fresh = renderHook(() => usePagedInitialFocus({ enteredFrom: null, ...refs([null, hidden, shown]) }));
    expect(fresh.result.current.current).toBe(shown);
    const noLayout = renderHook(() => usePagedInitialFocus({ enteredFrom: null, ...refs([null, hidden]) }));
    expect(noLayout.result.current.current).toBe(hidden);
  });

  it("focuses the peek on screen that led here, and falls back to the ✕ when none has layout", () => {
    const close = button(1);
    const phonePeek = button(1);
    const paged = renderHook(() =>
      usePagedInitialFocus({ enteredFrom: "nextPeek", ...refs([close], { nextPeek: button(0), nextPhonePeek: phonePeek }) }),
    );
    expect(paged.result.current.current).toBe(phonePeek);
    const fallback = renderHook(() => usePagedInitialFocus({ enteredFrom: "prev", ...refs([close], { prevButton: button(0) }) }));
    expect(fallback.result.current.current).toBe(close);
  });
});
