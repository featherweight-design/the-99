import { beforeEach, describe, expect, it, vi } from "vitest";

// A stand-in for the launch list: one row per case-folded address, and an insert that does nothing on a conflict, as
// `onConflictDoNothing` does against the primary key.
const m = vi.hoisted(() => ({
  rows: new Map<string, { email: string; codeId: string | null }>(),
  find: vi.fn(),
  conflictIgnored: 0,
}));
vi.mock("../../db", () => ({
  db: {
    insert: () => ({
      values: (row: { email: string; codeId: string | null }) => ({
        onConflictDoNothing: async () => {
          if (m.rows.has(row.email)) m.conflictIgnored += 1;
          else m.rows.set(row.email, row);
        },
      }),
    }),
  },
}));
vi.mock("./claim", () => ({ findFlyerCode: m.find }));

import { saveLaunchEmail, saveLaunchEmailNoCode } from "./launch-list";

beforeEach(() => {
  m.rows.clear();
  m.find.mockReset();
  m.conflictIgnored = 0;
});

describe("saveLaunchEmailNoCode", () => {
  it("refuses a malformed address and writes nothing", async () => {
    expect(await saveLaunchEmailNoCode("not an address")).toEqual({ ok: false, reason: "invalid" });
    expect(m.rows.size).toBe(0);
  });

  it("stores the address case-folded against no code, and looks no code up", async () => {
    expect(await saveLaunchEmailNoCode("  A@X.dev ")).toEqual({ ok: true });
    expect(m.rows.get("a@x.dev")).toEqual({ email: "a@x.dev", codeId: null });
    expect(m.find).not.toHaveBeenCalled();
  });

  it("answers ok for an address already listed, so the answer never reveals it, and keeps the first row", async () => {
    m.find.mockResolvedValue({ id: "code-1" });
    await saveLaunchEmail("MAX4QK", "a@x.dev");
    expect(await saveLaunchEmailNoCode("A@x.dev")).toEqual({ ok: true });
    expect(m.conflictIgnored).toBe(1);
    expect(m.rows.get("a@x.dev")).toEqual({ email: "a@x.dev", codeId: "code-1" });
  });
});

describe("saveLaunchEmail", () => {
  it("still records the flyer code it came through, or none for a code nobody made", async () => {
    m.find.mockResolvedValueOnce({ id: "code-1" }).mockResolvedValueOnce(null);
    await saveLaunchEmail("MAX4QK", "a@x.dev");
    await saveLaunchEmail("NOSUCH", "b@x.dev");
    expect(m.rows.get("a@x.dev")?.codeId).toBe("code-1");
    expect(m.rows.get("b@x.dev")?.codeId).toBeNull();
  });
});
