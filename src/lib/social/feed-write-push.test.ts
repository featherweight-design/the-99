import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ enqueue: vi.fn() }));
vi.mock("../push/enqueue", () => ({ enqueuePush: m.enqueue }));

import { recordFeedItem } from "./feed-write";

const NOW = new Date("2026-10-22T12:00:00.000Z");
const input = { userId: "u1", kind: "price-drop" as const, dedupeKey: "k1", oracleId: "9a1412db-45ad-46ea-8f12-a85d203113d8", now: NOW };

beforeEach(() => vi.clearAllMocks());

describe("recordFeedItem queues a push", () => {
  it("through the same executor, only when it wrote a NEW item", async () => {
    const tx = { execute: vi.fn(async () => ({ rowCount: 1, rows: [{ id: "x" }] })) };
    expect(await recordFeedItem(tx as never, input)).toBe(true);
    expect(m.enqueue).toHaveBeenCalledWith(tx, { userId: "u1", kind: "price-drop", itemKey: "k1", batchKey: undefined, now: NOW });
  });

  it("passes the writer's own batch key on", async () => {
    const tx = { execute: vi.fn(async () => ({ rowCount: 1, rows: [{ id: "x" }] })) };
    await recordFeedItem(tx as never, { ...input, batchKey: "run-7" });
    expect(m.enqueue).toHaveBeenCalledWith(tx, expect.objectContaining({ batchKey: "run-7" }));
  });

  it("queues nothing for a repeat, an item the reader's kind is off for, or a malformed input", async () => {
    const none = { execute: vi.fn(async () => ({ rowCount: 0, rows: [] })) };
    expect(await recordFeedItem(none as never, input)).toBe(false);
    await expect(recordFeedItem(none as never, { ...input, oracleId: "nope" })).rejects.toThrow();
    expect(m.enqueue).not.toHaveBeenCalled();
  });
});
