import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createBasicCounts, SETTLE_MS } from "./basic-counts";

// The deck's basics save queue (round 2 of #1752): one per deck, so List ↔ Card cannot split a burst between
// two owners, and other writers can flush it before they race it.

function harness() {
  const saves: number[] = [];
  const expecteds: number[] = [];
  const refresh = vi.fn();
  const answers: Array<(v: unknown) => void> = [];
  const failures: Array<(e: unknown) => void> = [];
  const counts = createBasicCounts({
    save: (_id, n, expected) => {
      saves.push(n);
      expecteds.push(expected);
      return new Promise((r, j) => {
        answers.push(r as (v: unknown) => void);
        failures.push(j);
      }) as never;
    },
    predict: () => {},
    transition: (fn) => void fn(),
    refresh,
  });
  const answer = (n: number) => {
    failures.shift();
    answers.shift()!({ ok: true, quantity: n, changed: true });
  };
  const refuse = () => {
    failures.shift();
    answers.shift()!({ ok: false, reason: "out-of-range" });
  };
  const fail = () => {
    answers.shift();
    failures.shift()!(new Error("lost"));
  };
  return { counts, saves, expecteds, refresh, answer, refuse, fail };
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

describe("createBasicCounts, round 4", () => {
  // Removed at 1 while a save was out, then Undo, then a press on the restored row: the press opens a FRESH
  // burst, and the taken-over one's late answer neither swallows it nor deletes it from the queue.
  it("gives the card a fresh burst after a takeover, even with the old save still out", async () => {
    const { counts, saves, answer } = harness();
    counts.set("island", 2, 1);
    await vi.advanceTimersByTimeAsync(SETTLE_MS);
    expect(saves).toEqual([2]);
    const taken = counts.takeOver("island");
    expect(taken).not.toBeNull();
    counts.set("island", 3, 2);
    answer(2);
    await vi.advanceTimersByTimeAsync(SETTLE_MS);
    expect(saves).toEqual([2, 3]);
    expect(counts.base("island")).toBe(2);
    // The removal compares against the count the old save confirmed, once it answered.
    expect(await taken).toBe(2);
  });

  // Clear auto stops on an unconfirmed count rather than sweeping over it.
  it("flush says false when a save was refused or threw", async () => {
    const a = harness();
    a.counts.set("island", 7, 6);
    const refused = a.counts.flush();
    await vi.advanceTimersByTimeAsync(0);
    a.refuse();
    expect(await refused).toBe(false);

    const b = harness();
    b.counts.set("island", 7, 6);
    const thrown = b.counts.flush();
    await vi.advanceTimersByTimeAsync(0);
    b.fail();
    expect(await thrown).toBe(false);
  });

  it("flush says true when every save landed, and when nothing was open", async () => {
    const { counts, answer } = harness();
    expect(await counts.flush()).toBe(true);
    counts.set("island", 7, 6);
    const flushed = counts.flush();
    await vi.advanceTimersByTimeAsync(0);
    answer(7);
    expect(await flushed).toBe(true);
  });
});

describe("createBasicCounts, round 6: compare-and-set", () => {
  // Each save names the count it was computed from, and the next one names the figure the last confirmed.
  it("sends the last confirmed count with each save", async () => {
    const { counts, saves, expecteds, answer } = harness();
    counts.set("island", 7, 6);
    await vi.advanceTimersByTimeAsync(SETTLE_MS);
    counts.set("island", 8, 6);
    answer(7);
    await vi.advanceTimersByTimeAsync(SETTLE_MS);
    expect(saves).toEqual([7, 8]);
    expect(expecteds).toEqual([6, 7]);
  });

  // Another writer moved the row: the save is refused, and the burst stops there rather than sending a newer
  // figure from the same stale count. The page re-reads.
  it("stops on a refusal, even with a newer press waiting, and re-reads", async () => {
    const { counts, saves, refresh, refuse } = harness();
    const heard = vi.fn();
    counts.subscribe("island", heard);
    counts.set("island", 7, 6);
    await vi.advanceTimersByTimeAsync(SETTLE_MS);
    counts.set("island", 8, 6);
    refuse();
    await vi.advanceTimersByTimeAsync(SETTLE_MS);
    expect(saves).toEqual([7]);
    expect(heard).toHaveBeenCalledWith({ kind: "refused" });
    expect(refresh).toHaveBeenCalled();
  });
});

