import { beforeEach, describe, expect, it, vi } from "vitest";

// The action module imports the db client, which throws at module init without a live URL.
const stub = vi.hoisted(() => {
  const owned: { one: number }[] = [];
  const calls = {
    owned,
    insertValues: null as Record<string, unknown> | null,
    conflict: null as Record<string, unknown> | null,
    deleted: false,
    revalidated: [] as string[],
    // `after` callbacks, when `hold` is set. The point of the pair is that the timing of the
    // revalidation is the fix, so one case has to be able to look between the two moments.
    deferred: [] as (() => void)[],
    hold: false,
  };
  const db = {
    select: () => ({
      from: () => ({ where: () => ({ limit: async () => calls.owned }) }),
    }),
    insert: () => ({
      values: (v: Record<string, unknown>) => {
        calls.insertValues = v;
        return {
          onConflictDoUpdate: async (c: Record<string, unknown>) => {
            calls.conflict = c;
          },
        };
      },
    }),
    delete: () => ({
      where: async () => {
        calls.deleted = true;
      },
    }),
  };
  return { db, calls };
});

vi.mock("../../db", () => ({ db: stub.db }));
vi.mock("../../lib/auth", () => ({ requireUserId: async () => "user_1" }));
vi.mock("next/cache", () => ({
  revalidatePath: (p: string) => {
    stub.calls.revalidated.push(p);
  },
  updateTag: () => {},
}));
vi.mock("next/server", () => ({
  after: (fn: () => void) => {
    if (stub.calls.hold) stub.calls.deferred.push(fn);
    else fn();
  },
}));

import { clearCardArtPreference, setCardArtPreference } from "./actions";

const ORACLE = "11111111-1111-1111-1111-111111111111";

beforeEach(() => {
  stub.calls.hold = false;
  stub.calls.deferred.length = 0;
  stub.calls.owned.length = 0;
  stub.calls.insertValues = null;
  stub.calls.conflict = null;
  stub.calls.deleted = false;
  stub.calls.revalidated.length = 0;
});

describe("setCardArtPreference", () => {
  it("writes nothing for a printing the user does not own", async () => {
    await setCardArtPreference(ORACLE, "LEA", "270");
    expect(stub.calls.insertValues).toBeNull();
    expect(stub.calls.revalidated).toHaveLength(0);
  });

  // The picker paints the pick before the answer arrives, and a refusal reads back exactly the
  // preference already on screen — so the answer is the only thing that can tell it apart.
  it("reports the refusal to the caller", async () => {
    expect(await setCardArtPreference(ORACLE, "LEA", "270")).toBe(false);
  });

  it("reports a write that landed", async () => {
    stub.calls.owned.push({ one: 1 });
    expect(await setCardArtPreference(ORACLE, "LEA", "270")).toBe(true);
  });

  it("lowercases the set code on write (§3.3)", async () => {
    stub.calls.owned.push({ one: 1 });
    await setCardArtPreference(ORACLE, "LEA", "270");
    expect(stub.calls.insertValues).toEqual({
      userId: "user_1",
      oracleId: ORACLE,
      setCode: "lea",
      collectorNumber: "270",
    });
  });

  it("upserts on (user, oracle) so repeat picks replace rather than duplicate", async () => {
    stub.calls.owned.push({ one: 1 });
    await setCardArtPreference(ORACLE, "ZNR", "12");
    expect(stub.calls.conflict).toMatchObject({ set: { setCode: "znr", collectorNumber: "12" } });
  });

  // REVALIDATES FROM INSIDE `after`, never during the run. A Server Action that revalidates
  // during its own run re-renders the route it was called from into its own response, and
  // this one is called from `/collection`: 1,665,949 bytes of reply inline, 122 deferred.
  //
  // The mock at the top runs `after` inline, so this asserts the paths; what pins the timing
  // is `deferred` below, which holds the callback instead of running it.
  it("drops the browse route and the set page", async () => {
    stub.calls.owned.push({ one: 1 });
    await setCardArtPreference(ORACLE, "ZNR", "12");
    expect(stub.calls.revalidated).toEqual(["/collection", "/collection/sets/[code]"]);
  });

  it("revalidates nothing until the response is out", async () => {
    stub.calls.owned.push({ one: 1 });
    stub.calls.deferred.length = 0;
    stub.calls.hold = true;
    try {
      await setCardArtPreference(ORACLE, "ZNR", "12");
      expect(stub.calls.revalidated).toEqual([]);
      expect(stub.calls.deferred).toHaveLength(1);
      stub.calls.deferred[0]();
      expect(stub.calls.revalidated).toEqual(["/collection", "/collection/sets/[code]"]);
    } finally {
      stub.calls.hold = false;
    }
  });

  it("accepts the empty collector number a bare Name,Qty import carries", async () => {
    stub.calls.owned.push({ one: 1 });
    await setCardArtPreference(ORACLE, "C21", "");
    expect(stub.calls.insertValues).toMatchObject({ collectorNumber: "" });
  });
});

describe("clearCardArtPreference", () => {
  it("deletes the row and drops the same caches, also after the response", async () => {
    stub.calls.deferred.length = 0;
    stub.calls.hold = true;
    try {
      await clearCardArtPreference(ORACLE);
      expect(stub.calls.deleted).toBe(true);
      expect(stub.calls.revalidated).toEqual([]);
      stub.calls.deferred[0]();
      // The set page too: clearing a pick moves the fill back between the same two cells.
      expect(stub.calls.revalidated).toEqual(["/collection", "/collection/sets/[code]"]);
    } finally {
      stub.calls.hold = false;
    }
  });
});
