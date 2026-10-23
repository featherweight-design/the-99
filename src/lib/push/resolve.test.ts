import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import { messagesFor } from "./message";
import { resolvePushItems } from "./resolve";

const dialect = new PgDialect();
const NOW = new Date("2026-10-22T16:00:00.000Z");
const card = { oracle_id: "00000000-0000-0000-0000-0000000000c1", name: "Card", identity: ["B"], image: "img", art: "art" };

/** Answers each read by what it reads: the catalog items, then the feed's catalog lookups. */
const fakeQ = (statements: string[]) => ({
  execute: async (s: Parameters<PgDialect["sqlToQuery"]>[0]) => {
    const { sql } = dialect.sqlToQuery(s);
    statements.push(sql);
    const base = { created_at: "2026-10-22T09:05:00Z", oracle_id: null, variant_id: null, friend_public_id: null, friend_name: null, data: {}, unseen: false };
    if (sql.includes("'set:' || s.code") || sql.includes("'precon:' || p.file_name")) {
      return { rows: [
        { ...base, kind: "new-set", key: "set:dsk", code: "dsk", name: "Duskmourn", file_name: null },
        { ...base, kind: "new-precon", key: "precon:A", code: "dsc", name: "Death Toll", file_name: "A" },
        { ...base, kind: "new-precon", key: "precon:B", code: "dsc", name: "Jump Scare", file_name: "B" },
      ] };
    }
    if (sql.includes("ss.card_count as size")) return { rows: [{ ...card, code: "dsk", size: 286 }] };
    if (sql.includes("pc.is_commander")) return { rows: [{ ...card, file_name: "A" }, { ...card, file_name: "B" }] };
    if (sql.includes("as owned")) return { rows: [{ file_name: "A", total: 100, owned: 37 }, { file_name: "B", total: 100, owned: 12 }] };
    throw new Error(`unexpected read: ${sql.slice(0, 80)}`);
  },
}) as never;

describe("resolving catalog rows (PR 3c)", () => {
  it("words each set and precon the feed's way, and drops a key the feed no longer lists", async () => {
    const statements: string[] = [];
    const refs = [
      { kind: "new-set" as const, key: "set:dsk", batch: "new-set:2026-10-22" },
      { kind: "new-precon" as const, key: "precon:A", batch: "new-precon:2026-10-22" },
      { kind: "new-precon" as const, key: "precon:B", batch: "new-precon:2026-10-22" },
      { kind: "new-precon" as const, key: "precon:gone", batch: "new-precon:2026-10-22" },
    ];
    const { items, dropped } = await resolvePushItems("u1", refs, {} as NodeJS.ProcessEnv, NOW, fakeQ(statements));
    expect(dropped.map((d) => d.key)).toEqual(["precon:gone"]);
    expect(items).toEqual([
      { kind: "new-set", key: "set:dsk", batch: "new-set:2026-10-22", name: "Duskmourn", cards: 286, href: "/collection/sets/dsk" },
      { kind: "new-precon", key: "precon:A", batch: "new-precon:2026-10-22", name: "Death Toll", owned: 37, of: 100, href: "/decks/precons/A" },
      { kind: "new-precon", key: "precon:B", batch: "new-precon:2026-10-22", name: "Jump Scare", owned: 12, of: 100, href: "/decks/precons/B" },
    ]);
    // No stored item was asked for, so the stored read never ran.
    expect(statements.some((s) => s.includes(`"feed_items"`))).toBe(false);

    // The handoff's words: one set is one push landing on its page; two precons of one day collapse to one.
    const [setMsg, preconMsg] = messagesFor(items, "live");
    expect(setMsg).toMatchObject({ title: "Duskmourn is out", body: "286 cards. See the set.", route: "/collection/sets/dsk", tag: "new-set" });
    expect(preconMsg).toMatchObject({ title: "2 new precons are out", route: "/decks/precons", tag: "new-precon", keys: ["precon:A", "precon:B"] });
    expect(messagesFor(items.slice(1, 2), "live")[0]).toMatchObject({ title: "Death Toll precon is out", body: "You own 37 of its 100 cards.", route: "/decks/precons/A" });
  });

  it("drops every ref whose key names nothing, reading nothing", async () => {
    const statements: string[] = [];
    const { items, dropped } = await resolvePushItems("u1", [{ kind: "new-set", key: "precon:x", batch: "b" }], {} as NodeJS.ProcessEnv, NOW, fakeQ(statements));
    expect(items).toEqual([]);
    expect(dropped).toHaveLength(1);
    expect(statements).toEqual([]);
  });
});
