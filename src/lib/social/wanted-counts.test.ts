import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../db", () => ({ db: { execute: vi.fn() } }));
vi.mock("./spares", () => ({ loadFriendSpares: vi.fn(async () => []), loadOwnOffered: vi.fn(), loadOwnSpareSplit: vi.fn() }));
vi.mock("../decks/deck-need", () => ({ loadDeckNeed: vi.fn(async () => ({})) }));

import { db } from "../../db";
import { loadDeckNeed } from "../decks/deck-need";
import { loadFriendSpares } from "./spares";
import { loadWantedCounts } from "./spare-offers";
import { MAX_SPARES_BATCH } from "./client-rules";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";
const spare = (oracleId: string, publicId: string) => ({ oracleId, friend: { publicId } as never, spare: 1 });

beforeEach(() => {
  vi.mocked(db.execute).mockReset();
  vi.mocked(loadFriendSpares).mockReset();
  vi.mocked(loadDeckNeed).mockResolvedValue({});
});

describe("loadWantedCounts", () => {
  it("asks friends for the wishlist and deck-need cards once each, and counts cards per friend", async () => {
    vi.mocked(db.execute).mockResolvedValue({ rows: [{ oracle_id: A }, { oracle_id: B }] } as never);
    vi.mocked(loadDeckNeed).mockResolvedValue({ [B]: 2, [C]: 1 });
    vi.mocked(loadFriendSpares).mockResolvedValue([spare(A, "f1"), spare(B, "f1"), spare(C, "f2")]);
    const got = await loadWantedCounts("v");
    expect(vi.mocked(loadFriendSpares).mock.calls).toEqual([["v", [A, B, C]]]);
    expect([...got]).toEqual([["f1", 2], ["f2", 1]]);
  });

  it("splits a long want list into MAX_SPARES_BATCH reads, one finished before the next starts, and sums them", async () => {
    const ids = Array.from({ length: MAX_SPARES_BATCH + 1 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`);
    vi.mocked(db.execute).mockResolvedValue({ rows: ids.map((oracle_id) => ({ oracle_id })) } as never);
    let inFlight = 0;
    let most = 0;
    vi.mocked(loadFriendSpares).mockImplementation(async (_v, batch) => {
      most = Math.max(most, ++inFlight);
      await new Promise((r) => setTimeout(r, 0));
      inFlight--;
      return [spare(batch[0], "f1")];
    });
    const got = await loadWantedCounts("v");
    expect(vi.mocked(loadFriendSpares).mock.calls.map(([, b]) => b.length)).toEqual([MAX_SPARES_BATCH, 1]);
    expect(most).toBe(1);
    expect([...got]).toEqual([["f1", 2]]);
  });

  it("reads no friend when the viewer wants nothing", async () => {
    vi.mocked(db.execute).mockResolvedValue({ rows: [] } as never);
    expect((await loadWantedCounts("v")).size).toBe(0);
    expect(loadFriendSpares).not.toHaveBeenCalled();
  });
});
