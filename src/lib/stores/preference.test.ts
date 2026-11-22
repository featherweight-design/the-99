import { describe, expect, it, vi } from "vitest";

import { db } from "../../db";
import { parseStore, preferredStoreUpsert, readerStore, storeOf, STORES } from "./preference";

const env = (e: Record<string, string> = {}): NodeJS.ProcessEnv => e as unknown as NodeJS.ProcessEnv;
const ON = env({ STORE_PREFERENCE_ENABLED: "true" });

/** A select chain that resolves to `rows`, counting the reads. */
function fakeSelect(rows: unknown[]) {
  const select = vi.fn(() => ({ from: () => ({ where: async () => rows }) }));
  return { q: { select, insert: vi.fn() } as unknown as Parameters<typeof readerStore>[2], select };
}

describe("parseStore", () => {
  it("accepts exactly the stores the preferred-store check holds", () => {
    expect(STORES).toEqual(["manapool", "tcgplayer", "cardkingdom"]);
    for (const s of STORES) expect(parseStore(s)).toBe(s);
    for (const v of ["", "Manapool", "ebay", null, undefined, 3, ["tcgplayer"]]) expect(parseStore(v)).toBeNull();
  });
});

describe("storeOf", () => {
  it("is Mana Pool while the switch is off, whatever was chosen", () => {
    expect(storeOf(env(), "tcgplayer")).toBe("manapool");
    expect(storeOf(env({ STORE_PREFERENCE_ENABLED: "1" }), "cardkingdom")).toBe("manapool");
  });

  it("is the chosen store while on, and Mana Pool for no choice or an unreadable one", () => {
    expect(storeOf(ON, "tcgplayer")).toBe("tcgplayer");
    expect(storeOf(ON, "cardkingdom")).toBe("cardkingdom");
    expect(storeOf(ON, null)).toBe("manapool");
    expect(storeOf(ON, "ebay")).toBe("manapool");
  });
});

describe("readerStore", () => {
  it("reads nothing while the switch is off", async () => {
    const { q, select } = fakeSelect([{ preferred: "tcgplayer" }]);
    expect(await readerStore("u1", env(), q)).toBe("manapool");
    expect(select).not.toHaveBeenCalled();
  });

  it("reads the reader's choice while on, and Mana Pool with no prefs row", async () => {
    expect(await readerStore("u1", ON, fakeSelect([{ preferred: "cardkingdom" }]).q)).toBe("cardkingdom");
    expect(await readerStore("u1", ON, fakeSelect([]).q)).toBe("manapool");
  });
});

describe("preferredStoreUpsert", () => {
  it("inserts the prefs row, or updates it only when the choice differs", () => {
    const { sql, params } = preferredStoreUpsert("u1", "tcgplayer", db).toSQL();
    expect(sql).toContain('insert into "user_prefs"');
    expect(sql).toContain('on conflict ("user_id") do update set "preferred_store" = $');
    expect(sql).toMatch(/where "user_prefs"\."preferred_store" is distinct from \$\d+ returning "user_id"$/);
    expect(params).toContain("u1");
    // The value inserted, the value set, and the value the update is guarded on.
    expect(params.filter((p) => p === "tcgplayer")).toHaveLength(3);
  });
});
