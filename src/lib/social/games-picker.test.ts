// The game log's picker reads a friend's decks by the friend's OWN rules (friend decks PR 5, Hugh's ruling
// 2026-10-22). The SQL itself is `games.test.ts`; here, which owner's rules reach the statement and what the picker
// is told.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { named } from "../person-name/mint";

const m = vi.hoisted(() => ({
  resolveFriend: vi.fn(),
  listFriends: vi.fn(),
  rows: vi.fn(),
  wheres: [] as SQL[],
}));
vi.mock("./access", () => ({ resolveFriend: m.resolveFriend, listFriends: m.listFriends, listPods: vi.fn() }));
vi.mock("../../db", () => {
  // Every builder step returns the chain; awaiting it answers the mocked rows. `where` is kept to render.
  const chain: Record<string, unknown> = {};
  for (const k of ["from", "innerJoin", "leftJoin", "orderBy", "groupBy"]) chain[k] = () => chain;
  chain.where = (w: SQL) => { m.wheres.push(w); return chain; };
  chain.then = (ok: (v: unknown) => unknown, bad: (e: unknown) => unknown) => Promise.resolve(m.rows()).then(ok, bad);
  return { db: { select: () => chain } };
});

import { listFriendDecks, listPickerFriends } from "./games";

const VIEWER = "user_viewer";
const FRIEND = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
const render = (w: SQL) => new PgDialect().sqlToQuery(w);

beforeEach(() => {
  m.wheres.length = 0;
  m.resolveFriend.mockReset().mockResolvedValue("user_friend");
  m.rows.mockReset().mockResolvedValue([]);
  m.listFriends.mockReset();
});

describe("listFriendDecks", () => {
  it("applies the OWNER's rules", async () => {
    await listFriendDecks(VIEWER, FRIEND);
    const where = render(m.wheres[0]);
    expect(where.sql).toContain("hidden_from_friends");
    expect(where.params).toContain("user_friend");
  });

  it("reads no deck for a public id that is not the viewer's friend", async () => {
    m.resolveFriend.mockResolvedValue(null);
    await expect(listFriendDecks(VIEWER, FRIEND)).resolves.toEqual([]);
    expect(m.rows).not.toHaveBeenCalled();
  });
});

describe("listPickerFriends", () => {
  const friend = (publicId: string, displayName: string) => ({ publicId, displayName: named(displayName), since: new Date(), commander: null });

  it("tells the picker each friend's visible count, with their rules applied", async () => {
    m.listFriends.mockResolvedValue([friend("p-a", "Dave"), friend("p-b", "Jo"), friend("p-none", "Lee")]);
    m.rows.mockResolvedValue([
      { publicId: "p-a", ownerId: "u-a", count: 4, visible: 2 },
      { publicId: "p-b", ownerId: "u-b", count: 3, visible: 0 },
    ]);
    const out = await listPickerFriends(VIEWER);
    expect(out).toEqual([
      { publicId: "p-a", displayName: named("Dave"), commanderArt: null, deckCount: 2, withheld: true },
      { publicId: "p-b", displayName: named("Jo"), commanderArt: null, deckCount: 0, withheld: true },
      { publicId: "p-none", displayName: named("Lee"), commanderArt: null, deckCount: 0, withheld: false },
    ]);
    // The owner's account id never reaches the client.
    expect(JSON.stringify(out)).not.toMatch(/u-a|u-b/);
  });
});
