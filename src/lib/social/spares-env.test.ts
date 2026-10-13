// Admin PR 6f-1: a friend's spares come from the FRIEND's claim model, and that model decides
// NEVER_CUT_ENABLED's `locked` key and CHANGE_COMMANDER_ENABLED's pending clause from the env it is
// handed (the environment alone when none is). So it runs under the friend's resolved switches, never the
// viewer's: here the two hold opposite account overrides, and the env the friend's read is handed must be
// the one resolved for the friend, by identity. Every env is built over an empty base, never the process
// environment, and compared as a boolean, so a failure prints nothing real.
import { describe, expect, it, vi } from "vitest";
import type { SwitchSnapshot } from "../switches/resolve";

const VIEWER = "user_viewer";
const FRIEND = "user_friend";

const m = vi.hoisted(() => ({
  resolved: new Map<string | null, NodeJS.ProcessEnv>(),
  handed: [] as { userId: string; env: unknown }[],
}));

vi.mock("../../db", () => {
  const GRANTORS = [{ userId: "user_friend", publicId: "pub_friend", displayName: "Fran" }];
  const chain = (): unknown => new Proxy(() => {}, {
    get: (_t, prop) => (prop === "then" ? (resolve: (v: unknown) => void) => resolve(GRANTORS) : () => chain()),
  });
  const reader = { selectDistinct: () => chain() };
  return { db: { ...reader, transaction: async (fn: (tx: unknown) => unknown) => fn(reader) } };
});
vi.mock("../decks/availability-query", () => ({
  loadAvailability: async (userId: string, opts?: { oracleIds?: string[]; env?: unknown }) => {
    m.handed.push({ userId, env: opts?.env });
    return new Map((opts?.oracleIds ?? []).map((id) => [id, { owned: 3, hard: 1, soft: 0 }]));
  },
}));
vi.mock("../switches/snapshot", async () => {
  const { resolveEnv } = await vi.importActual<typeof import("../switches/resolve")>("../switches/resolve");
  const SNAP: SwitchSnapshot = {
    overrides: [
      { switchName: "NEVER_CUT_ENABLED", scope: "user", groupId: null, userId: "user_viewer", value: "off" },
      { switchName: "NEVER_CUT_ENABLED", scope: "user", groupId: null, userId: "user_friend", value: "on" },
      { switchName: "CHANGE_COMMANDER_ENABLED", scope: "user", groupId: null, userId: "user_viewer", value: "on" },
      { switchName: "CHANGE_COMMANDER_ENABLED", scope: "user", groupId: null, userId: "user_friend", value: "off" },
    ],
    groupOf: new Map(),
  };
  return {
    resolveSwitchEnv: async (userId: string | null) => {
      const env = resolveEnv({} as NodeJS.ProcessEnv, SNAP, userId);
      m.resolved.set(userId, env);
      return env;
    },
  };
});

const { loadFriendSpares } = await import("./spares");
const CARD = "11111111-1111-4111-8111-111111111111";

describe("loadFriendSpares", () => {
  it("runs the friend's claim model under the friend's resolved switches, not the viewer's", async () => {
    const spares = await loadFriendSpares(VIEWER, [CARD]);
    expect(spares.map((s) => [s.oracleId, s.friend.publicId, s.spare])).toEqual([[CARD, "pub_friend", 2]]);
    expect(m.handed.map((h) => h.userId)).toEqual([FRIEND]);
    const handed = m.handed[0].env as NodeJS.ProcessEnv | undefined;
    expect(handed !== undefined && handed === m.resolved.get(FRIEND)).toBe(true);
    // The friend's overrides, which are the opposite of the viewer's.
    expect(handed?.NEVER_CUT_ENABLED === "true" && handed?.CHANGE_COMMANDER_ENABLED === "false").toBe(true);
    expect(m.resolved.has(VIEWER)).toBe(false);
  });
});
