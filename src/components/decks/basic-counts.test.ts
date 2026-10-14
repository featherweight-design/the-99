import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createBasicCounts, SETTLE_MS } from "./basic-counts";

// The deck's basics save queue (round 2 of #1752): one per deck, so List ↔ Card cannot split a burst between
// two owners, and other writers can flush it before they race it.

function harness() {
  const saves: number[] = [];
  const answers: Array<(v: unknown) => void> = [];
  const counts = createBasicCounts({
    save: (_id, n) => {
      saves.push(n);
      return new Promise((r) => answers.push(r as (v: unknown) => void)) as never;
    },
    predict: () => {},
    transition: (fn) => void fn(),
    refresh: vi.fn(),
  });
  const answer = (n: number) => answers.shift()!({ ok: true, quantity: n, changed: true });
  return { counts, saves, answer };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("createBasicCounts", () => {
  // The view switch: a save out, a newer press, the view swapped, a newer press still. One owner holds the
  // target, so the next save carries the last figure and nothing older is sent after it.
  it("sends only the latest figure after a save that was already out", async () => {
    const { counts, saves, answer } = harness();
    counts.set("island", 7, 6);
    await vi.advanceTimersByTimeAsync(SETTLE_MS);
    expect(saves).toEqual([7]);
    counts.set("island", 8, 6);
    counts.set("island", 9, 6);
    answer(7);
    await vi.advanceTimersByTimeAsync(SETTLE_MS);
    expect(saves).toEqual([7, 9]);
    answer(9);
    await vi.advanceTimersByTimeAsync(0);
    expect(counts.base("island")).toBeNull();
  });

  // Clear auto and the Add panel flush before they write: the pending figure is saved NOW, and the flush
  // resolves only once that save has answered.
  it("flush sends a settling figure at once and waits for its answer", async () => {
    const { counts, saves, answer } = harness();
    counts.set("island", 7, 6);
    let flushed = false;
    const flush = counts.flush().then(() => (flushed = true));
    await vi.advanceTimersByTimeAsync(0);
    expect(saves).toEqual([7]);
    expect(flushed).toBe(false);
    answer(7);
    await flush;
    expect(flushed).toBe(true);
  });

  it("flush resolves at once with nothing open", async () => {
    const { counts, saves } = harness();
    await counts.flush();
    expect(saves).toEqual([]);
  });

  it("keeps the burst's base across its presses", () => {
    const { counts } = harness();
    counts.set("island", 7, 6);
    counts.set("island", 8, 7);
    expect(counts.base("island")).toBe(6);
  });

  it("tells every view of the card the outcome, whichever is mounted", async () => {
    const { counts, answer } = harness();
    const row = vi.fn();
    const unsubscribe = counts.subscribe("island", row);
    counts.set("island", 7, 6);
    unsubscribe();
    const tile = vi.fn();
    counts.subscribe("island", tile);
    await vi.advanceTimersByTimeAsync(SETTLE_MS);
    answer(7);
    await vi.advanceTimersByTimeAsync(0);
    expect(row).not.toHaveBeenCalled();
    expect(tile).toHaveBeenCalledWith({ kind: "ok", n: 7 });
  });
});
