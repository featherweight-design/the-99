// `usePasswordStrength`: the estimator loads only on the field's first focus (and a failed chunk stays unscored), and the
// polite line speaks only when the word or the count changes, once typing pauses for 1s, never while a refusal's alert shows.
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = { loads: 0 };
/**
 * The estimator's chunk, registered per case with `vi.doMock` (a `vi.mock` factory's first result is cached past
 * `vi.resetModules`, so a count or a failure set by a later case would never be seen). After `vi.resetModules`, the hook's
 * next `import()` runs the factory registered last: each run is one load, and `fail` makes that load throw.
 */
function mockEstimator(fail: boolean) {
  vi.doMock("../../lib/auth/strength-estimator", () => {
    m.loads++;
    if (fail) throw new Error("chunk failed");
    return {
      estimate: (pw: string, inputs: readonly string[]) => ({
        strength: pw.length < 8 ? "short" : inputs.some((i) => pw.includes(i)) ? "weak" : "good",
        commonOk: pw.length >= 8,
        guides: { length: pw.length >= 8, numberOrSymbol: /\d/.test(pw), common: pw.length >= 8 },
      }),
    };
  });
}

import { ANNOUNCE_MS, RETRY_MS, usePasswordStrength } from "./use-password-strength";

beforeEach(() => {
  vi.useFakeTimers();
  vi.resetModules();
  m.loads = 0;
  mockEstimator(false);
});
afterEach(() => vi.useRealTimers());

type Props = { pw: string; quiet: boolean };
/** Renders of the hook's host: a write to the polite line is one. */
let renders = 0;
const hook = (pw = "", quiet = false) =>
  renderHook(({ pw, quiet }: Props) => {
    renders++;
    return usePasswordStrength(pw, ["colin"], quiet);
  }, { initialProps: { pw, quiet } });
const flush = () => act(() => vi.advanceTimersByTimeAsync(0));
const pause = (ms = ANNOUNCE_MS) => act(() => vi.advanceTimersByTimeAsync(ms));

describe("usePasswordStrength: the lazy estimator", () => {
  it("does not load the estimator until the field is focused, and reads unscored until then", async () => {
    const h = hook("");
    await flush();
    expect(m.loads).toBe(0);
    expect(h.result.current.reading.strength).toBe("short");
    expect(h.result.current.reading.guides.common).toBe(false);
    act(() => h.result.current.prime());
    await flush();
    h.rerender({ pw: "longenough", quiet: false });
    await flush();
    expect(m.loads).toBe(1);
    expect(h.result.current.reading.strength).toBe("good");
    // A second focus loads nothing more.
    act(() => h.result.current.prime());
    await flush();
    expect(m.loads).toBe(1);
  });

  it("loads on the first character too, for a field filled without a focus", async () => {
    const h = hook("");
    await flush();
    expect(m.loads).toBe(0);
    h.rerender({ pw: "longenough", quiet: false });
    await flush();
    expect(m.loads).toBe(1);
    expect(h.result.current.reading.strength).toBe("good");
  });

  it("a failed load is tried again on a later focus or keystroke, at most once per RETRY_MS", async () => {
    mockEstimator(true);
    const h = hook("");
    act(() => h.result.current.prime());
    await flush();
    expect(m.loads).toBe(1);
    expect(h.result.current.reading.strength).toBe("short");
    // Inside the backoff: neither a focus nor a keystroke tries again.
    vi.resetModules();
    mockEstimator(false);
    act(() => h.result.current.prime());
    h.rerender({ pw: "longenough", quiet: false });
    await flush();
    expect(m.loads).toBe(1);
    expect(h.result.current.reading.strength).toBe("short");
    // Past it, the next keystroke loads it.
    await act(() => vi.advanceTimersByTimeAsync(RETRY_MS));
    h.rerender({ pw: "longenough2", quiet: false });
    await flush();
    expect(m.loads).toBe(2);
    expect(h.result.current.reading.strength).toBe("good");
  });

  it("passes the player's inputs to the estimator", async () => {
    const h = hook("colin1994x");
    act(() => h.result.current.prime());
    await flush();
    expect(h.result.current.reading.strength).toBe("weak");
  });

  it("a chunk that fails stays on the under-8 frame: no word, third guide open, number ticking live", async () => {
    mockEstimator(true);
    const h = hook("longenough1");
    act(() => h.result.current.prime());
    await flush();
    expect(h.result.current.reading.strength).toBe("short");
    expect(h.result.current.reading.guides).toEqual({ length: true, numberOrSymbol: true, common: false });
  });
});

describe("usePasswordStrength: the polite line", () => {
  it("says nothing on the page's first reading", async () => {
    const h = hook();
    await pause();
    expect(h.result.current.live).toBe("");
  });

  it("speaks once typing pauses for 1s, and not before", async () => {
    const h = hook();
    h.rerender({ pw: "a1", quiet: false });
    await pause(ANNOUNCE_MS - 10);
    expect(h.result.current.live).toBe("");
    // Another keystroke restarts the pause.
    h.rerender({ pw: "a12", quiet: false });
    await pause(ANNOUNCE_MS - 10);
    expect(h.result.current.live).toBe("");
    await pause(10);
    expect(h.result.current.live).toBe("1 of 3 done.");
  });

  it("speaks only when the word or the count changes", async () => {
    const h = hook();
    act(() => h.result.current.prime());
    await flush();
    h.rerender({ pw: "abcdefgh", quiet: false });
    await pause();
    expect(h.result.current.live).toBe("Good. 2 of 3 done.");
    // Same word, same count: the line is not written again, so the pause renders nothing.
    h.rerender({ pw: "abcdefghi", quiet: false });
    const rendersBefore = renders;
    await pause();
    expect(renders).toBe(rendersBefore);
    expect(h.result.current.live).toBe("Good. 2 of 3 done.");
    h.rerender({ pw: "abcdefghi1", quiet: false });
    await pause();
    expect(h.result.current.live).toBe("Good. 3 of 3 done.");
  });

  it("an emptied field resets the line: K5, the email screen, then K5 again speaks as the first time", async () => {
    const h = hook();
    h.rerender({ pw: "a1", quiet: false });
    await pause();
    expect(h.result.current.live).toBe("1 of 3 done.");
    // The email screen: K5's field is gone, so the hook reads "". Nothing speaks and the line is cleared.
    h.rerender({ pw: "", quiet: false });
    await pause();
    expect(h.result.current.live).toBe("");
    // Back on K5, the same reading as before speaks again, since it is compared with the empty field.
    h.rerender({ pw: "b2", quiet: false });
    const before = renders;
    await pause();
    expect(renders).toBeGreaterThan(before);
    expect(h.result.current.live).toBe("1 of 3 done.");
  });

  it("stays quiet while a refusal's alert shows, and speaks again once it clears", async () => {
    const h = hook();
    h.rerender({ pw: "a1", quiet: true });
    await pause(ANNOUNCE_MS * 3);
    expect(h.result.current.live).toBe("");
    h.rerender({ pw: "a1b", quiet: false });
    await pause();
    expect(h.result.current.live).toBe("1 of 3 done.");
  });
});
