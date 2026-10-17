import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { atFloor, SEND_FLOOR_MS } from "./floor";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

async function settleAt<T>(p: Promise<T>): Promise<number> {
  let doneAt = -1;
  const started = Date.now();
  p.then(() => { doneAt = Date.now() - started; }, () => { doneAt = Date.now() - started; });
  await vi.advanceTimersByTimeAsync(SEND_FLOOR_MS * 3);
  return doneAt;
}

describe("atFloor", () => {
  it("answers a fast success, a slow one and a throw at the same floor", async () => {
    expect(SEND_FLOOR_MS).toBe(1500);
    expect(await settleAt(atFloor(async () => "fast"))).toBe(SEND_FLOOR_MS);
    expect(await settleAt(atFloor(async () => { throw new Error("refused"); }))).toBe(SEND_FLOOR_MS);
    const slow = atFloor(() => new Promise((r) => setTimeout(() => r("slow"), 200)));
    expect(await settleAt(slow)).toBe(SEND_FLOOR_MS);
  });

  it("never adds to work that took longer than the floor", async () => {
    const long = atFloor(() => new Promise((r) => setTimeout(() => r("long"), SEND_FLOOR_MS + 400)));
    expect(await settleAt(long)).toBe(SEND_FLOOR_MS + 400);
  });

  it("returns what the work returned and rethrows what it threw", async () => {
    const ok = atFloor(async () => 7);
    await vi.advanceTimersByTimeAsync(SEND_FLOOR_MS);
    expect(await ok).toBe(7);
    const bad = atFloor(async () => { throw new Error("x"); });
    const caught = bad.catch((e: Error) => e.message);
    await vi.advanceTimersByTimeAsync(SEND_FLOOR_MS);
    expect(await caught).toBe("x");
  });
});
