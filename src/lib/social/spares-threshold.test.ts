// Settings' Spares (menu and Home PR 3, G3): `loadFriendSpares` is the ONE place a friend's card is decided offered,
// by that FRIEND's own threshold and keeps. Two friends hold the same cards here; each friend's settings are read for
// that friend alone (in that friend's snapshot), and must filter that friend's rows alone.
import { beforeEach, describe, expect, it, vi } from "vitest";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

const m = vi.hoisted(() => ({
  // Per friend: their spare count of each card, and their settings.
  models: new Map<string, Map<string, { owned: number; hard: number; soft: number }>>(),
  settings: new Map<string, { min: number; kept: Set<string> }>(),
  settingsAsked: [] as { userId: string; asked: readonly string[] }[],
}));

vi.mock("../../db", () => {
  const GRANTS = ["user_fran", "user_gus"].map((userId) => ({
    userId, publicId: `pub_${userId}`, displayName: userId === "user_fran" ? "Fran" : "Gus",
    commanderOracleId: null, commanderName: null, commanderArt: null, pods: ["Game night"],
  }));
  const chain = (): unknown => new Proxy(() => {}, {
    get: (_t, prop) => (prop === "then" ? (resolve: (v: unknown) => void) => resolve(GRANTS) : () => chain()),
  });
  const reader = { select: () => chain(), selectDistinct: () => chain() };
  return { db: { ...reader, transaction: async (fn: (tx: unknown) => unknown) => fn(reader) } };
});
vi.mock("../decks/availability-query", () => ({
  loadAvailability: async (userId: string, opts?: { oracleIds?: string[] }) => {
    const model = m.models.get(userId) ?? new Map();
    return new Map((opts?.oracleIds ?? []).filter((id) => model.has(id)).map((id) => [id, model.get(id)!]));
  },
}));
vi.mock("../switches/snapshot", () => ({ resolveSwitchEnv: async () => ({}) }));
vi.mock("./spare-settings", () => ({
  spareSettingsIn: async (_q: unknown, userId: string, asked: readonly string[]) => {
    m.settingsAsked.push({ userId, asked });
    return m.settings.get(userId) ?? { min: 1, kept: new Set() };
  },
}));

const { loadFriendSpares } = await import("./spares");

const spare = (n: number) => ({ owned: n, hard: 0, soft: 0 });
const rows = async () => (await loadFriendSpares("user_viewer", [A, B])).map((s) => `${s.friend.displayName}:${s.oracleId === A ? "A" : "B"}:${s.spare}`);

beforeEach(() => {
  m.models.clear();
  m.settings.clear();
  m.settingsAsked.length = 0;
  m.models.set("user_fran", new Map([[A, spare(2)], [B, spare(1)]]));
  m.models.set("user_gus", new Map([[A, spare(3)], [B, { owned: 2, hard: 1, soft: 1 }]]));
});

describe("loadFriendSpares under each friend's spare settings", () => {
  it("at the default threshold of 1 offers every spare, as before the setting", async () => {
    expect(await rows()).toEqual(["Fran:A:2", "Gus:A:3", "Fran:B:1"]);
  });

  it("a threshold of 3 hides a card with 2 spares, and keeps one with 3", async () => {
    m.settings.set("user_fran", { min: 3, kept: new Set() });
    m.settings.set("user_gus", { min: 3, kept: new Set() });
    expect(await rows()).toEqual(["Gus:A:3"]);
  });

  it("a card kept back is never offered, however many spares", async () => {
    m.settings.set("user_gus", { min: 1, kept: new Set([A]) });
    expect(await rows()).toEqual(["Fran:A:2", "Fran:B:1"]);
  });

  it("one friend's settings never filter another friend's rows", async () => {
    m.settings.set("user_fran", { min: 9, kept: new Set([A, B]) });
    expect(await rows()).toEqual(["Gus:A:3"]);
    m.settings.clear();
    m.settings.set("user_gus", { min: 9, kept: new Set([A]) });
    expect(await rows()).toEqual(["Fran:A:2", "Fran:B:1"]);
  });

  it("reads each friend's settings for that friend, over the asked cards", async () => {
    await rows();
    expect(m.settingsAsked).toEqual([
      { userId: "user_fran", asked: [A, B] },
      { userId: "user_gus", asked: [A, B] },
    ]);
  });
});
