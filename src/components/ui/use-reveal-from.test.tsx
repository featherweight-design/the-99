// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { REVEAL_CAP, revealOf, useRevealFrom } from "./use-reveal-from";

afterEach(cleanup);
const ids = (n: number, start = 0) => Array.from({ length: n }, (_, i) => `c${start + i}`);

describe("useRevealFrom", () => {
  it("reveals nothing on the first draw", () => {
    const { result } = renderHook(({ list }) => useRevealFrom(list), { initialProps: { list: ids(200) } });
    expect(result.current).toBe(200);
  });

  it("starts the reveal where a Show more grew the list, and moves on when it grows again", () => {
    const { result, rerender } = renderHook(({ list }) => useRevealFrom(list), { initialProps: { list: ids(200) } });
    rerender({ list: ids(400) });
    expect(result.current).toBe(200);
    // A re-render with the same list keeps the same batch (the items already faded stay put, the new ones keep their class).
    rerender({ list: ids(400) });
    expect(result.current).toBe(200);
    rerender({ list: ids(600) });
    expect(result.current).toBe(400);
  });

  it("reveals nothing for a list that was not simply grown: a new head, a changed tail, a shrink", () => {
    const { result, rerender } = renderHook(({ list }) => useRevealFrom(list), { initialProps: { list: ids(200) } });
    rerender({ list: ids(400, 1) }); // a different sort or filter: another head
    expect(result.current).toBe(400);
    rerender({ list: [...ids(400, 1).slice(0, 399), "other", ...ids(100, 900)] }); // the old tail is not where it was
    expect(result.current).toBe(500);
    rerender({ list: ids(50) });
    expect(result.current).toBe(50);
  });

  it("follows a same-size, same-head replacement, so the next Show more on the new list still reveals", () => {
    const { result, rerender } = renderHook(({ list }) => useRevealFrom(list), { initialProps: { list: ids(200) } });
    const swapped = [...ids(199), "other-tail"];
    rerender({ list: swapped }); // another filter result: same size, same first card, a different tail
    expect(result.current).toBe(200);
    rerender({ list: [...swapped, ...ids(200, 500)] });
    expect(result.current).toBe(200);
  });

  it("copes with an empty list", () => {
    const { result, rerender } = renderHook(({ list }) => useRevealFrom(list), { initialProps: { list: [] as string[] } });
    expect(result.current).toBe(0);
    act(() => rerender({ list: ids(10) }));
    expect(result.current).toBe(10);
  });
});

describe("revealOf", () => {
  it("leaves the items already on screen alone", () => {
    expect(revealOf(0, 200)).toEqual({});
    expect(revealOf(199, 200)).toEqual({});
  });

  it("numbers the new batch from 0 and caps the number at 11, so everything past the 12th arrives with it", () => {
    expect(revealOf(200, 200).style).toEqual({ "--reveal-n": 0 });
    expect(revealOf(205, 200).style).toEqual({ "--reveal-n": 5 });
    expect(revealOf(211, 200).style).toEqual({ "--reveal-n": REVEAL_CAP });
    expect(revealOf(399, 200).style).toEqual({ "--reveal-n": REVEAL_CAP });
    expect(revealOf(200, 200).className).toBe("anim-reveal");
  });
});
