// Your requests' read (spare requests PR 3d): `loadMyAsks` with the reader's buy list as `stillNeeded`, read only when an
// open ask could read `unneeded`; the diamond from the reader's Friends cursor; after a No, the other friends with a spare.
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ myAsks: vi.fn(), buyRows: vi.fn(), spares: vi.fn(), prefs: vi.fn() }));
vi.mock("../../db", () => ({ db: { select: () => ({ from: () => ({ where: m.prefs }) }) } }));
vi.mock("./spare-requests", () => ({ loadMyAsks: m.myAsks }));
vi.mock("../decks/availability-query", () => ({ loadDeckBuyRows: m.buyRows }));
vi.mock("./spares", () => ({ loadFriendSpares: m.spares }));

import { answerUnseen, loadYourRequests } from "./your-requests";
import type { MyAsk } from "./spare-requests";

const ON = { SOCIAL_FRIENDS_ENABLED: "true", SPARE_REQUESTS_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;
const NOW = new Date("2026-10-22T12:00:00Z");
const ask = (id: string, state: MyAsk["state"], o: Partial<MyAsk> = {}): MyAsk => ({
  id, oracleId: "jace", card: { name: "Jace", imageUri: null }, copies: 1, deckName: null, deckId: null,
  holder: { publicId: "pub-colin", displayName: "Colin", commander: null }, state, daysLeft: null,
  createdAt: new Date("2026-10-20T00:00:00Z"), answeredAt: null, ...o,
});
const friend = (name: string) => ({ publicId: `pub-${name.toLowerCase()}`, displayName: name, commander: null, pods: [] });

beforeEach(() => {
  m.myAsks.mockReset().mockResolvedValue([]);
  m.buyRows.mockReset().mockResolvedValue([]);
  m.spares.mockReset().mockResolvedValue([]);
  m.prefs.mockReset().mockResolvedValue([]);
});

describe("answerUnseen", () => {
  const at = new Date("2026-10-21T00:00:00Z");
  it("is an answer after the cursor, or any answer with no cursor yet; never an open or expired ask", () => {
    expect(answerUnseen({ state: "yes", answeredAt: at }, null)).toBe(true);
    expect(answerUnseen({ state: "no", answeredAt: at }, new Date("2026-10-20T00:00:00Z"))).toBe(true);
    expect(answerUnseen({ state: "yes", answeredAt: at }, new Date("2026-10-22T00:00:00Z"))).toBe(false);
    expect(answerUnseen({ state: "open", answeredAt: null }, null)).toBe(false);
    expect(answerUnseen({ state: "expired", answeredAt: null }, null)).toBe(false);
  });
});

describe("loadYourRequests", () => {
  it("reads nothing with spare requests off", async () => {
    expect(await loadYourRequests("u1", {} as NodeJS.ProcessEnv, NOW)).toEqual([]);
    expect(m.myAsks).not.toHaveBeenCalled();
  });

  it("reads no buy list when no ask is open", async () => {
    m.myAsks.mockResolvedValue([ask("a", "yes", { answeredAt: NOW })]);
    await loadYourRequests("u1", ON, NOW);
    expect(m.buyRows).not.toHaveBeenCalled();
    expect(m.myAsks).toHaveBeenCalledTimes(1);
  });

  it("with an open ask, reads again with the reader's buy list as stillNeeded", async () => {
    m.myAsks.mockResolvedValueOnce([ask("a", "open")]).mockResolvedValueOnce([ask("a", "unneeded")]);
    m.buyRows.mockResolvedValue([{ deckId: "d1", oracleId: "sol", quantity: 1 }, { deckId: "d2", oracleId: "sol", quantity: 1 }]);
    const rows = await loadYourRequests("u1", ON, NOW);
    expect(m.buyRows).toHaveBeenCalledWith("u1", undefined, undefined, ON);
    expect(m.myAsks).toHaveBeenLastCalledWith("u1", ON, NOW, { stillNeeded: new Set(["sol"]) });
    expect(rows.map((r) => r.state)).toEqual(["unneeded"]);
  });

  it("marks answers newer than the Friends cursor", async () => {
    m.prefs.mockResolvedValue([{ seenAt: new Date("2026-10-21T00:00:00Z") }]);
    m.myAsks.mockResolvedValue([
      ask("new", "yes", { answeredAt: new Date("2026-10-22T00:00:00Z") }),
      ask("old", "no", { answeredAt: new Date("2026-10-20T00:00:00Z") }),
    ]);
    const rows = await loadYourRequests("u1", ON, NOW);
    expect(rows.map((r) => [r.id, r.unseen])).toEqual([["new", true], ["old", false]]);
  });

  it("after a No, names the OTHER friends with a spare of that card, most spares first", async () => {
    m.myAsks.mockResolvedValue([ask("a", "no", { answeredAt: NOW }), ask("b", "yes", { oracleId: "sol", answeredAt: NOW })]);
    m.spares.mockResolvedValue([
      { oracleId: "jace", friend: friend("Colin"), spare: 3 },
      { oracleId: "jace", friend: friend("Max"), spare: 1 },
      { oracleId: "jace", friend: friend("Chris"), spare: 2 },
      { oracleId: "sol", friend: friend("Ann"), spare: 4 },
    ]);
    const rows = await loadYourRequests("u1", ON, NOW);
    expect(m.spares).toHaveBeenCalledWith("u1", ["jace"]);
    expect(rows[0].othersWithSpare).toEqual(["Chris", "Max"]);
    expect(rows[1].othersWithSpare).toEqual([]);
  });
});
