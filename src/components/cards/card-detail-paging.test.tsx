import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { BrowseCard } from "../../lib/collection/browse";
import type { SiblingCard } from "./card-detail-context";
import {
  arrivalOf, focusableOpener, plateFor, useAnnouncer, usePagedReturnFocus, usePagingArrival, usePagingHandlers,
} from "./card-detail-paging";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

describe("arrivalOf", () => {
  it("keeps a page's swipe offset, progress and left face", () => {
    expect(arrivalOf("next", 40, 0.5, "back")).toEqual({ from: "next", offset: 40, progress: 0.5, leftFace: "back" });
  });

  it("fills a page's missing values with the resting ones", () => {
    expect(arrivalOf("prevPeek")).toEqual({ from: "prevPeek", offset: 0, progress: 0, leftFace: null });
  });

  it("arrives fresh for anything that is not a page, whatever it was handed", () => {
    expect(arrivalOf(undefined, 40, 0.5, "back")).toEqual({ from: null, offset: 0, progress: 0, leftFace: null });
  });
});

describe("usePagingArrival", () => {
  it("starts fresh and sets each value on its own", () => {
    const { result } = renderHook(() => usePagingArrival());
    expect(result.current).toMatchObject({ enterFrom: null, enterOffset: 0, enterProgress: 0, enterLeftFace: null });
    const setters = [result.current.setEnterFrom, result.current.setEnterOffset, result.current.setEnterProgress, result.current.setEnterLeftFace];
    act(() => {
      result.current.setEnterFrom("next");
      result.current.setEnterOffset(12);
    });
    expect(result.current).toMatchObject({ enterFrom: "next", enterOffset: 12, enterProgress: 0, enterLeftFace: null });
    act(() => {
      result.current.setEnterProgress(0.3);
      result.current.setEnterLeftFace("front");
    });
    expect(result.current).toMatchObject({ enterProgress: 0.3, enterLeftFace: "front" });
    // The setters keep one identity, so a callback that lists them never rebuilds.
    expect([result.current.setEnterFrom, result.current.setEnterOffset, result.current.setEnterProgress, result.current.setEnterLeftFace]).toEqual(setters);
  });
});

describe("useAnnouncer", () => {
  it("clears the text, then says it on the next frame, at one identity", () => {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => frames.push(cb));
    const { result } = renderHook(() => useAnnouncer());
    const announce = result.current.announce;
    act(() => announce("Second card"));
    expect(result.current.announcement).toBe("");
    act(() => frames.shift()!(0));
    expect(result.current.announcement).toBe("Second card");
    // The same text again is a real change twice over: cleared first, then said.
    act(() => result.current.announce("Second card"));
    expect(result.current.announcement).toBe("");
    act(() => frames.shift()!(0));
    expect(result.current.announcement).toBe("Second card");
    expect(result.current.announce).toBe(announce);
  });

  it("does not cancel a pending frame: an earlier text still lands after a later announce is queued (today's behavior)", () => {
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => frames.push(cb));
    const { result } = renderHook(() => useAnnouncer());
    act(() => {
      result.current.announce("First");
      result.current.announce("Second");
    });
    expect(frames).toHaveLength(2);
    act(() => frames.shift()!(0));
    expect(result.current.announcement).toBe("First");
    act(() => frames.shift()!(0));
    expect(result.current.announcement).toBe("Second");
  });
});

describe("focusableOpener", () => {
  it("is the opener itself when nothing collapsed hides it", () => {
    document.body.innerHTML = `<button id="opener">Open</button>`;
    const opener = document.getElementById("opener")!;
    expect(focusableOpener(opener)).toBe(opener);
  });

  it("walks out of a collapsed region to the disclosure that controls it, and out of the disclosure's own", () => {
    document.body.innerHTML = `
      <button id="group-head" aria-controls="group">Group</button>
      <div id="group" hidden>
        <button id="row-head" aria-controls="row">Row</button>
        <div id="row" inert><button id="opener">Open</button></div>
      </div>`;
    expect(focusableOpener(document.getElementById("opener")!)).toBe(document.getElementById("group-head"));
  });

  it("names a hidden item's container when the item carries no id", () => {
    document.body.innerHTML = `
      <button id="fold" aria-controls="tiles">More</button>
      <div id="tiles"><div hidden><button id="opener">Open</button></div></div>`;
    expect(focusableOpener(document.getElementById("opener")!)).toBe(document.getElementById("fold"));
  });

  it("is null when no disclosure names the region", () => {
    document.body.innerHTML = `<div id="lost" inert><button id="opener">Open</button></div>`;
    expect(focusableOpener(document.getElementById("opener")!)).toBeNull();
  });
});

describe("usePagedReturnFocus", () => {
  it("hands back one detached sink while paging, and the connected opener otherwise", () => {
    document.body.innerHTML = `<button id="opener">Open</button>`;
    const opener = document.getElementById("opener")!;
    const paging = { current: true };
    const openerRef = { current: opener as HTMLElement | null };
    const { result, rerender } = renderHook(() =>
      usePagedReturnFocus({ isPaging: () => paging.current, getOpener: () => openerRef.current }),
    );
    const ref = result.current;
    const sink = ref.current;
    expect(sink).not.toBe(opener);
    expect(sink?.isConnected).toBe(false);
    expect(ref.current).toBe(sink);
    paging.current = false;
    expect(ref.current).toBe(opener);
    opener.remove();
    expect(ref.current).toBeNull();
    openerRef.current = null;
    expect(ref.current).toBeNull();
    rerender();
    expect(result.current).toBe(ref);
  });

  it("resolves a connected opener through resolveTarget, and never hands it a detached one", () => {
    document.body.innerHTML = `<button id="opener">Open</button><button id="other">Other</button>`;
    const opener = document.getElementById("opener")!;
    const other = document.getElementById("other")!;
    const resolveTarget = vi.fn(() => other);
    const { result } = renderHook(() => usePagedReturnFocus({ isPaging: () => false, getOpener: () => opener, resolveTarget }));
    expect(result.current.current).toBe(other);
    expect(resolveTarget).toHaveBeenCalledWith(opener);
    opener.remove();
    resolveTarget.mockClear();
    expect(result.current.current).toBeNull();
    expect(resolveTarget).not.toHaveBeenCalled();
  });
});

describe("plateFor", () => {
  const sibling: SiblingCard = { oracleId: "o1", name: "Sol Ring", imageUri: "https://img/opener.jpg" };

  it("keeps the sibling, by identity, when nothing changes it", () => {
    expect(plateFor(sibling, {})).toBe(sibling);
  });

  it("draws a viewed printing's art in its finish", () => {
    const plate = plateFor(sibling, { viewed: { setCode: "c21", collectorNumber: "263", imageUri: "https://img/viewed.jpg", finish: "foil" } });
    expect(plate).toEqual({ ...sibling, imageUri: "https://img/viewed.jpg", foil: "foil" });
  });

  it("drops the film for a viewed nonfoil printing, and keeps the sibling when it already matches", () => {
    const same = { ...sibling, imageUri: "https://img/viewed.jpg" };
    expect(plateFor(same, { viewed: { setCode: "c21", collectorNumber: "263", imageUri: "https://img/viewed.jpg", finish: "nonfoil" } })).toBe(same);
  });

  it("draws an unread card in a viewed finish with no printing", () => {
    const plate = plateFor({ ...sibling, foil: "foil" }, { viewed: { finish: "etched" } });
    expect(plate.foil).toBe("etched");
    expect(plate.imageUri).toBe(sibling.imageUri);
  });

  it("draws a read card at the printing its own details resolve, with its printed name", () => {
    const read = {
      oracleId: "o1",
      name: "Sol Ring",
      printedName: "Sol Ring (Showcase)",
      printings: [{ setCode: "C21", collectorNumber: "263", imageUri: "https://img/own.jpg" }],
    } as unknown as BrowseCard;
    expect(plateFor(sibling, { read, pick: null })).toEqual({ ...sibling, imageUri: "https://img/own.jpg", name: "Sol Ring (Showcase)", foil: undefined });
  });

  it("draws no art for a read card with no printing, never the opener's", () => {
    const read = { oracleId: "o1", name: "Sol Ring", printedName: null, printings: [] } as unknown as BrowseCard;
    const plate = plateFor(sibling, { read, pick: null });
    expect(plate.imageUri).toBeNull();
    expect(plate.name).toBe("Sol Ring");
  });
});

describe("usePagingHandlers", () => {
  const ends = () => ({ atStart: vi.fn(), atEnd: vi.fn() });

  it("pages either way from the middle, carrying a swipe's values and a peek's left face", () => {
    const go = vi.fn();
    const { atStart, atEnd } = ends();
    const { result } = renderHook(() => usePagingHandlers({ index: 1, count: 3, go, atStart, atEnd }));
    result.current.onPrev!(30, 0.4, "back");
    expect(go).toHaveBeenLastCalledWith(0, "prev", 30, 0.4, "back");
    result.current.onNext!();
    expect(go).toHaveBeenLastCalledWith(2, "next", undefined, undefined, undefined);
    result.current.onPrevPeek!("front");
    expect(go).toHaveBeenLastCalledWith(0, "prevPeek", 0, 0, "front");
    result.current.onNextPeek!();
    expect(go).toHaveBeenLastCalledWith(2, "nextPeek", 0, 0, undefined);
    expect(result.current.onAtStart).toBe(atStart);
    expect(result.current.onAtEnd).toBe(atEnd);
  });

  it("has no page past either end, but still says the end", () => {
    const go = vi.fn();
    const { atStart, atEnd } = ends();
    const first = renderHook(() => usePagingHandlers({ index: 0, count: 2, go, atStart, atEnd })).result.current;
    expect(first.onPrev).toBeNull();
    expect(first.onPrevPeek).toBeNull();
    expect(first.onNext).not.toBeNull();
    expect(first.onAtStart).toBe(atStart);
    const last = renderHook(() => usePagingHandlers({ index: 1, count: 2, go, atStart, atEnd })).result.current;
    expect(last.onNext).toBeNull();
    expect(last.onNextPeek).toBeNull();
    expect(last.onPrev).not.toBeNull();
  });

  it("does not page a card in no list, or alone in one", () => {
    const go = vi.fn();
    const { atStart, atEnd } = ends();
    for (const [index, count] of [[-1, 3], [0, 1]] as const) {
      const h = renderHook(() => usePagingHandlers({ index, count, go, atStart, atEnd })).result.current;
      expect(h).toEqual({ onPrev: null, onNext: null, onPrevPeek: null, onNextPeek: null, onAtStart: undefined, onAtEnd: undefined });
    }
  });
});
