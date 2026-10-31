// A friend's spares come from the FRIEND's claim model: the read is the friend's, never the viewer's.
import { describe, expect, it, vi } from "vitest";

const FRIEND = "user_friend";

const m = vi.hoisted(() => ({
  read: [] as string[],
}));

vi.mock("../../db", () => {
  const GRANTORS = [{
    userId: "user_friend", publicId: "pub_friend", displayName: "Fran",
    commanderOracleId: null, commanderName: null, commanderArt: null, pods: ["Game night"],
  }];
  const chain = (): unknown => new Proxy(() => {}, {
    get: (_t, prop) => (prop === "then" ? (resolve: (v: unknown) => void) => resolve(GRANTORS) : () => chain()),
  });
  const reader = { select: () => chain(), selectDistinct: () => chain() };
  return { db: { ...reader, transaction: async (fn: (tx: unknown) => unknown) => fn(reader) } };
});
vi.mock("../decks/availability-query", () => ({
  loadAvailability: async (userId: string, opts?: { oracleIds?: string[] }) => {
    m.read.push(userId);
    return new Map((opts?.oracleIds ?? []).map((id) => [id, { owned: 3, hard: 1, soft: 0 }]));
  },
}));

const { loadFriendSpares } = await import("./spares");
const CARD = "11111111-1111-4111-8111-111111111111";

describe("loadFriendSpares", () => {
  it("reads the friend's claim model, not the viewer's", async () => {
    const spares = await loadFriendSpares("user_viewer", [CARD]);
    expect(spares.map((s) => [s.oracleId, s.friend.publicId, s.spare])).toEqual([[CARD, "pub_friend", 2]]);
    expect(m.read).toEqual([FRIEND]);
  });
});
