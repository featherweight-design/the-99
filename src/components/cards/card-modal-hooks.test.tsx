import { act, cleanup, renderHook } from "@testing-library/react";
import type React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SHEET } from "./card-sheet-gesture";
import { ZOOM_REGION } from "./card-modal-parts";
import { runEscapeLadder, useCardTurnHandlers, useFocusReturns, usePagedInitialFocus, usePagingKeys, useSheetSnap } from "./card-modal-hooks";

afterEach(() => {
  // Unmounted explicitly: a paging listener left from an earlier test would take the key first.
  cleanup();
  vi.unstubAllGlobals();
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
    const { result, rerender } = renderHook(
      ({ report }: { report: (minimized: boolean) => void }) =>
        useSheetSnap({ startMinimized: true, forceFull: true, onMinimizedChange: report, narrow: true, dialogRef: nullDialog }),
      { initialProps: { report: onMinimizedChange } },
    );
    expect(result.current.snap).toBe("full");
    expect(result.current.sheetFull).toBe(true);
    expect(result.current.sheetOpen).toBe(true);
    expect(onMinimizedChange).toHaveBeenCalledTimes(1);
    expect(onMinimizedChange).toHaveBeenCalledWith(false);
    // A new callback identity re-runs the effect: only the mount guard keeps it from reporting again.
    const later = vi.fn();
    rerender({ report: later });
    expect(onMinimizedChange).toHaveBeenCalledTimes(1);
    expect(later).not.toHaveBeenCalled();
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

  it("attaches nothing when disabled or for a list of one", () => {
    const disabled = mount({ enabled: false });
    press(document.body, "ArrowRight");
    expect(disabled.onNext).not.toHaveBeenCalled();
    document.body.innerHTML = "";
    const single = mount({ total: 1 });
    press(document.body, "ArrowRight");
    expect(single.onNext).not.toHaveBeenCalled();
  });

  it("stands down on the phone's full sheet, leaving the key unhandled", () => {
    const fullSheet = mount({ narrow: true, full: true });
    const e = press(document.body, "ArrowRight");
    expect(fullSheet.onNext).not.toHaveBeenCalled();
    expect(e.defaultPrevented).toBe(false);
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

describe("useFocusReturns", () => {
  const setup = () => {
    const dialog = document.createElement("div");
    const grip = document.createElement("button");
    const zoomClose = document.createElement("button");
    const hiddenTrigger = document.createElement("button");
    hiddenTrigger.getClientRects = () => ({ length: 0 }) as DOMRectList;
    const shownTrigger = document.createElement("button");
    shownTrigger.getClientRects = () => ({ length: 1 }) as DOMRectList;
    dialog.append(grip, zoomClose, hiddenTrigger, shownTrigger);
    document.body.appendChild(dialog);
    const refs = {
      dialogRef: { current: dialog },
      gripRef: { current: grip },
      zoomFlipRef: { current: null },
      zoomCloseRef: { current: zoomClose },
      zoomTriggerRefs: { current: [hiddenTrigger, shownTrigger] },
    };
    const view = renderHook(
      ({ sheetFull, zoomed }: { sheetFull: boolean; zoomed: boolean }) => useFocusReturns({ ...refs, sheetFull, zoomed }),
      { initialProps: { sheetFull: false, zoomed: false } },
    );
    return { ...view, grip, zoomClose, shownTrigger };
  };

  it("moves no focus on first mount", () => {
    setup();
    expect(document.activeElement).toBe(document.body);
  });

  it("returns focus to the grip when the sheet leaves full, and only on that change", () => {
    const { rerender, grip } = setup();
    rerender({ sheetFull: true, zoomed: false });
    // Nothing in the dialog held focus, so going full hands it to the grip as well.
    expect(document.activeElement).toBe(grip);
    (document.activeElement as HTMLElement).blur();
    rerender({ sheetFull: true, zoomed: false });
    expect(document.activeElement).toBe(document.body);
    rerender({ sheetFull: false, zoomed: false });
    expect(document.activeElement).toBe(grip);
  });

  it("leaves focus that a control inside the dialog still holds", () => {
    const { rerender, zoomClose } = setup();
    zoomClose.getClientRects = () => ({ length: 1 }) as DOMRectList;
    zoomClose.focus();
    rerender({ sheetFull: true, zoomed: false });
    expect(document.activeElement).toBe(zoomClose);
  });

  it("focuses the zoom's close on open, and on close the trigger on screen, past a hidden one", () => {
    const { rerender, zoomClose, shownTrigger } = setup();
    rerender({ sheetFull: false, zoomed: true });
    expect(document.activeElement).toBe(zoomClose);
    // The close unmounts with the layer, so focus falls to the body.
    zoomClose.remove();
    rerender({ sheetFull: false, zoomed: false });
    expect(document.activeElement).toBe(shownTrigger);
  });
});

describe("useCardTurnHandlers", () => {
  const reducedMotion = (reduce: boolean) =>
    vi.stubGlobal("matchMedia", (query: string) => ({ matches: reduce, media: query }) as MediaQueryList);
  const handlers = (over: Partial<Parameters<typeof useCardTurnHandlers>[0]> = {}) => {
    const args = {
      flipped: false,
      setFlipped: vi.fn(),
      zoomFlipped: false,
      setZoomFlipped: vi.fn(),
      turning: false,
      setTurning: vi.fn(),
      setZoomTurning: vi.fn(),
      setAnnouncement: vi.fn(),
      twoFaced: true,
      showingBack: true,
      shownLabel: (onBack: boolean) => (onBack ? "Showing back" : "Showing front"),
      zoomed: false,
      heldArtFace: { current: null as string | null },
      zoomPress: { current: null as { id: number; x: number; y: number; tilting: boolean } | null },
      zoomDragged: { current: false },
      desktopTiltRef: { current: null },
      phoneTiltRef: { current: null },
      zoomTiltRef: { current: null },
      ...over,
    };
    const { result } = renderHook(() => useCardTurnHandlers(args));
    return { args, h: result.current };
  };
  const settle = (el: HTMLElement) =>
    ({ target: el, currentTarget: el, propertyName: "transform" }) as unknown as React.TransitionEvent<HTMLDivElement>;
  const pointer = (el: HTMLElement, pointerId: number) =>
    ({ currentTarget: el, pointerId }) as unknown as React.PointerEvent<HTMLDivElement>;

  it("turns the art, and under reduced motion announces the face at once", () => {
    reducedMotion(true);
    const { args, h } = handlers();
    h.onFlip();
    expect(args.setFlipped).toHaveBeenCalledWith(true);
    expect(args.setAnnouncement).toHaveBeenCalledWith("Showing back");
    expect(args.setTurning).not.toHaveBeenCalled();
  });

  it("waits for the turn to land where it animates", () => {
    reducedMotion(false);
    const { args, h } = handlers({ flipped: true });
    h.onFlip();
    expect(args.setFlipped).toHaveBeenCalledWith(false);
    expect(args.setTurning).toHaveBeenCalledWith(true);
    expect(args.setAnnouncement).not.toHaveBeenCalled();
  });

  it("holds the art's landed face while the zoom covers it, rather than announcing it", () => {
    const { args, h } = handlers({ zoomed: true });
    const el = document.createElement("div");
    h.onArtTurnSettled(settle(el));
    expect(args.setTurning).toHaveBeenCalledWith(false);
    expect(args.heldArtFace.current).toBe("Showing back");
    expect(args.setAnnouncement).not.toHaveBeenCalled();
  });

  it("announces the art's landed face when the zoom is closed", () => {
    const { args, h } = handlers();
    h.onArtTurnSettled(settle(document.createElement("div")));
    expect(args.heldArtFace.current).toBeNull();
    expect(args.setAnnouncement).toHaveBeenCalledWith("Showing back");
  });

  it("ends a zoom press only for its own pointer, and marks a drag only after a tilt", () => {
    vi.useFakeTimers();
    try {
      const el = document.createElement("div");
      const press = { id: 7, x: 0, y: 0, tilting: false };
      const { args, h } = handlers({ zoomPress: { current: press } });
      h.endZoomPress(pointer(el, 8));
      expect(args.zoomPress.current).toBe(press);
      h.endZoomPress(pointer(el, 7));
      expect(args.zoomPress.current).toBeNull();
      expect(args.zoomDragged.current).toBe(false);

      args.zoomPress.current = { id: 7, x: 0, y: 0, tilting: true };
      h.endZoomPress(pointer(el, 7));
      expect(args.zoomDragged.current).toBe(true);
      vi.runAllTimers();
      expect(args.zoomDragged.current).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});
