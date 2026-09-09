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
vi.mock("next/server", () => ({ after: (fn: () => void) => fn() }));

import { clearCardArtPreference, setCardArtPreference } from "./actions";

const ORACLE = "11111111-1111-1111-1111-111111111111";

beforeEach(() => {
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
    expect(stub.calls.revalidated).toEqual(["/collection"]);
  });

  it("accepts the empty collector number a bare Name,Qty import carries", async () => {
    stub.calls.owned.push({ one: 1 });
    await setCardArtPreference(ORACLE, "C21", "");
    expect(stub.calls.insertValues).toMatchObject({ collectorNumber: "" });
  });
});

describe("clearCardArtPreference", () => {
  it("deletes the row and revalidates", async () => {
    await clearCardArtPreference(ORACLE);
    expect(stub.calls.deleted).toBe(true);
    expect(stub.calls.revalidated).toEqual(["/collection"]);
  });
});
