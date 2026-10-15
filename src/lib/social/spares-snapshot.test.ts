// A spare row's friend (face and pods) is read in the SAME snapshot as that friend's claim model: the grant
// read outside it only names who to ask. Here the two reads disagree, as they would when a share to one pod
// ends between them, and the row must carry the snapshot's pods. Every env is built over an empty base.
import { describe, expect, it, vi } from "vitest";

vi.mock("../../db", () => {
  const rows = (v: unknown) => (): unknown => new Proxy(() => {}, {
    get: (_t, prop) => (prop === "then" ? (resolve: (x: unknown) => void) => resolve(v) : () => rows(v)()),
  });
  const detail = (pods: string[]) => [{
    userId: "user_friend", publicId: "pub_friend", displayName: "Fran",
    commanderOracleId: null, commanderName: null, commanderArt: null, pods,
  }];
  // Outside any snapshot: the stale answer, naming a pod the share has since left.
  const outside = { select: rows(detail(["Alpha club", "Game night"])), selectDistinct: rows(detail(["Alpha club", "Game night"])) };
  // Inside the friend's snapshot: the current answer.
  const inside = { select: rows(detail(["Game night"])), selectDistinct: rows(detail(["Game night"])) };
  return { db: { ...outside, transaction: async (fn: (tx: unknown) => unknown) => fn(inside) } };
});
vi.mock("../decks/availability-query", () => ({
  loadAvailability: async (_userId: string, opts?: { oracleIds?: string[] }) =>
    new Map((opts?.oracleIds ?? []).map((id) => [id, { owned: 2, hard: 0, soft: 0 }])),
}));
vi.mock("../switches/snapshot", () => ({ resolveSwitchEnv: async () => ({}) }));

const { loadFriendSpares } = await import("./spares");
const CARD = "11111111-1111-4111-8111-111111111111";

describe("loadFriendSpares", () => {
  it("names the pods the grant holds through in the friend's own snapshot", async () => {
    const [row] = await loadFriendSpares("user_viewer", [CARD]);
    expect(row?.friend.pods).toEqual(["Game night"]);
  });
});
