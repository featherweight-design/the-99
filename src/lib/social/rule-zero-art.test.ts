import { PgDialect } from "drizzle-orm/pg-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

const granted = vi.hoisted(() => ({ rows: [] as unknown[], fail: false }));
const resolve = vi.hoisted(() => vi.fn());

vi.mock("../../db", () => ({
  db: { execute: () => (granted.fail ? Promise.reject(new Error("down")) : Promise.resolve({ rows: granted.rows })) },
}));
vi.mock("../decks/printings", () => ({ resolveCommanderPrintingsByDeck: resolve }));
vi.mock("../cache/soft-failure", () => ({ recordSoftFailure: vi.fn() }));

import { grantedDecksQuery, ownedDeckArt } from "./rule-zero-art";

const VIEWER = "user_viewer";
const crop = (uri: string) => ({ artCropUri: uri });

beforeEach(() => {
  granted.rows = [];
  granted.fail = false;
  resolve.mockReset();
  resolve.mockImplementation(async (owner: string, asks: { deckId: string; commanderOracleId: string }[]) =>
    new Map(asks.map((a) => [a.deckId, crop(`${owner}/${a.commanderOracleId}`)])));
});

describe("grantedDecksQuery", () => {
  it("decides the grant on the viewer in one statement: own decks, a shared table's seats, or a pod friend's visible decks", () => {
    const { sql, params } = new PgDialect().sqlToQuery(grantedDecksQuery(VIEWER, ["d1", "d2"]));
    const flat = sql.replace(/\s+/g, " ");
    expect(flat).toContain('where d.id in ($1, $2)');
    expect(flat).toMatch(/d\.user_id = \$\d+/);
    // The table branch: the viewer seated at the same table, both players still in its pod.
    expect(flat).toMatch(/join "rule_zero_seats" vs on vs\.table_id = s\.table_id and vs\.user_id = \$\d+/);
    expect(flat).toMatch(/join "pod_members" vm on vm\.pod_id = t\.pod_id and vm\.user_id = \$\d+/);
    expect(flat).toContain("join \"pod_members\" sm on sm.pod_id = t.pod_id and sm.user_id = s.user_id");
    expect(flat).toContain("where s.deck_id = d.id and s.user_id = d.user_id and (t.closed_at is null and t.expires_at > now())");
    // The friend branch: a friend link FROM the viewer, a shared pod, and the owner's deck rules.
    expect(flat).toContain("not d.hidden_from_friends and coalesce(up.friends_see_decks, true)");
    expect(flat).toMatch(/where fl\.user_id = \$\d+ and fl\.friend_user_id = d\.user_id/);
    expect(params.filter((p) => p === VIEWER)).toHaveLength(5);
  });
});

describe("ownedDeckArt", () => {
  it("resolves each granted deck under its OWNER's id, commander and partner apart", async () => {
    granted.rows = [
      { deckId: "d1", ownerId: "host", commanderOracleId: "c1", partnerOracleId: null },
      { deckId: "d2", ownerId: "friend", commanderOracleId: "c2", partnerOracleId: "p2" },
    ];
    const art = await ownedDeckArt(VIEWER, ["d1", "d2"]);
    expect(art.get("d1")).toEqual({ commander: "host/c1", partner: null });
    expect(art.get("d2")).toEqual({ commander: "friend/c2", partner: "friend/p2" });
    // A deck with no partner asks no partner read.
    const partnerAsks = (resolve.mock.calls as [string, { commanderOracleId: string }[]][]).flatMap(([, asks]) => asks.map((x) => x.commanderOracleId));
    expect(partnerAsks.filter((o) => o.startsWith("p"))).toEqual(["p2"]);
    for (const [owner, asks] of resolve.mock.calls as [string, { deckId: string }[]][]) {
      for (const a of asks) expect(granted.rows.find((r) => (r as { deckId: string }).deckId === a.deckId)).toMatchObject({ ownerId: owner });
    }
  });

  it("gives no art to a deck outside the viewer's grant, and reads no collection for its owner", async () => {
    granted.rows = [{ deckId: "d1", ownerId: "host", commanderOracleId: "c1", partnerOracleId: null }];
    const art = await ownedDeckArt(VIEWER, ["d1", "stranger-deck"]);
    expect(art.has("stranger-deck")).toBe(false);
    expect(resolve.mock.calls.map(([owner]) => owner)).toEqual(["host", "host"]);
  });

  it("leaves a card its owner does not hold null, so the caller keeps the oracle art", async () => {
    granted.rows = [{ deckId: "d1", ownerId: "host", commanderOracleId: "c1", partnerOracleId: null }];
    resolve.mockResolvedValue(new Map());
    expect((await ownedDeckArt(VIEWER, ["d1"])).get("d1")).toEqual({ commander: null, partner: null });
  });

  it("reads nothing for no decks, and answers empty when the grant read fails", async () => {
    expect((await ownedDeckArt(VIEWER, [])).size).toBe(0);
    granted.fail = true;
    expect((await ownedDeckArt(VIEWER, ["d1"])).size).toBe(0);
    expect(resolve).not.toHaveBeenCalled();
  });
});
