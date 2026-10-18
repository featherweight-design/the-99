// Logging from a Rule 0 table (plan §PR 8). The seats are read only through the viewer's grant, in one statement (only
// the emitted SQL shows that); the prefill carries no other player's deck id, public id or account id (decision 5); and
// a save resolves a seat number only against the seating the prefill was drawn from.
import { describe, expect, it } from "vitest";
import { prefillFrom, resolveSeatsFrom, seatingHash, tablePrefill, tableSeatsQuery, type TableSeatRow } from "./rule-zero-log";

const VIEWER = "user_viewer";
const TABLE = "7a0e0000-0000-4000-8000-000000000001";
const MY_DECK = "d0000000-0000-4000-8000-000000000001";

const row = (over: Partial<TableSeatRow>): TableSeatRow => ({
  seat: 1, userId: VIEWER, displayName: "Hugh", publicId: "p0000000-0000-4000-8000-000000000001", friend: null,
  deckId: MY_DECK, deckName: "Ghalta Stompy", commanderOracleId: "c0000000-0000-4000-8000-000000000001", partnerOracleId: null,
  commanderName: "Ghalta, Primal Hunger", commanderArt: "https://art/ghalta.jpg", podName: "Thursday night", ...over,
});

const ROWS: TableSeatRow[] = [
  row({}),
  row({ seat: 2, userId: "user_colin", displayName: "Colin", publicId: "p0000000-0000-4000-8000-0000000000c0", friend: "user_colin",
    deckId: "d0000000-0000-4000-8000-0000000000c0", deckName: "Zimone Combo", commanderOracleId: "c0000000-0000-4000-8000-0000000000c0",
    commanderName: "Zimone, Quandrix Prodigy", commanderArt: "https://art/zimone.jpg" }),
  row({ seat: 3, userId: "user_peter", displayName: "Peter", publicId: "p0000000-0000-4000-8000-0000000000e0", friend: "user_peter",
    deckId: null, deckName: null, commanderOracleId: null, commanderName: null, commanderArt: null }),
  row({ seat: 4, userId: "user_max", displayName: "Max  the  Longest Display Name Anyone Typed", publicId: "p0000000-0000-4000-8000-0000000000a0",
    deckId: "d0000000-0000-4000-8000-0000000000a0", deckName: "Gisa Zombies", commanderOracleId: "c0000000-0000-4000-8000-0000000000a0",
    partnerOracleId: "c0000000-0000-4000-8000-0000000000a1", commanderName: "Gisa, Glorious Resurrector", commanderArt: "https://art/gisa.jpg" }),
];

describe("tableSeatsQuery", () => {
  const q = tableSeatsQuery(VIEWER, TABLE).toSQL();

  it("reads the seats in the same statement as the viewer's grant: seated, still in the pod, the table open", () => {
    expect(q.sql).toContain(`inner join "rule_zero_seats" "viewer_seat" on ("viewer_seat"."table_id" = "rule_zero_tables"."id" and "viewer_seat"."user_id" = $1)`);
    expect(q.sql).toContain(`inner join "pod_members" "viewer_in" on ("viewer_in"."pod_id" = "rule_zero_tables"."pod_id" and "viewer_in"."user_id" = $2)`);
    expect(q.sql).toContain(`inner join "pod_members" on ("pod_members"."pod_id" = "rule_zero_tables"."pod_id" and "pod_members"."user_id" = "rule_zero_seats"."user_id")`);
    expect(q.sql).toMatch(/where \("rule_zero_seats"\."table_id" = \$\d+ and "rule_zero_tables"\."expires_at" > now\(\)\)/);
  });

  it("reads a seat's deck only while it is that seat player's own", () => {
    expect(q.sql).toContain(`left join "decks" on ("decks"."id" = "rule_zero_seats"."deck_id" and "decks"."user_id" = "rule_zero_seats"."user_id")`);
  });
});

describe("seatingHash", () => {
  it("is the same for the same seating, whatever order the rows come in", () => {
    expect(seatingHash(TABLE, ROWS)).toBe(seatingHash(TABLE, [...ROWS].reverse()));
    expect(seatingHash(TABLE, ROWS)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("moves on a renumber, a new player, another table or a changed deck", () => {
    const base = seatingHash(TABLE, ROWS);
    const swapped = ROWS.map((r) => (r.seat === 2 ? { ...r, seat: 4 } : r.seat === 4 ? { ...r, seat: 2 } : r));
    expect(seatingHash(TABLE, swapped)).not.toBe(base);
    expect(seatingHash(TABLE, ROWS.slice(0, 3))).not.toBe(base);
    expect(seatingHash("7a0e0000-0000-4000-8000-000000000002", ROWS)).not.toBe(base);
    // A player changing deck with no reseat: the form drew the old deck, so the save must refuse.
    expect(seatingHash(TABLE, ROWS.map((r, i) => (i === 1 ? { ...r, deckId: "dec0dec0-0000-4000-8000-0000000000ff" } : r)))).not.toBe(base);
    // A commander or partner changed in place (same deck), or a renamed player: everything the save stores is in it.
    for (const change of [{ commanderOracleId: "c0c0c0c0-0000-4000-8000-0000000000ff" }, { partnerOracleId: "c0c0c0c0-0000-4000-8000-0000000000fe" }, { displayName: "Renamed" }]) {
      expect(seatingHash(TABLE, ROWS.map((r, i) => (i === 1 ? { ...r, ...change } : r)))).not.toBe(base);
    }
  });
});

describe("prefillFrom", () => {
  const prefill = prefillFrom(ROWS, VIEWER, TABLE, MY_DECK)!;

  it("draws every other seat, waiting ones too, and counts the whole table", () => {
    expect(prefill.podName).toBe("Thursday night");
    expect(prefill.podSize).toBe(4);
    expect(prefill.table).toEqual({ id: TABLE, seating: seatingHash(TABLE, ROWS) });
    expect(prefill.seats).toEqual([
      { seat: 2, name: "Colin", deckName: "Zimone Combo", commanderName: "Zimone, Quandrix Prodigy", artCropUri: "https://art/zimone.jpg", friend: true },
      { seat: 3, name: "Peter", deckName: null, commanderName: null, artCropUri: null, friend: true },
      { seat: 4, name: ROWS[3].displayName, deckName: "Gisa Zombies", commanderName: "Gisa, Glorious Resurrector", artCropUri: "https://art/gisa.jpg", friend: false },
    ]);
  });

  // Decision 5: the prefill reaches a client, so nothing in it may name another player's deck, profile or account.
  it("carries no deck id, public id or account id of any seat", () => {
    const wire = JSON.stringify(prefill);
    for (const r of ROWS) {
      for (const id of [r.deckId, r.publicId, r.userId, r.commanderOracleId, r.partnerOracleId]) {
        if (id !== null) expect(wire, id).not.toContain(id);
      }
    }
  });

  it("is null when the viewer's seat does not hold the page's deck, or the viewer is not seated", () => {
    expect(prefillFrom(ROWS, VIEWER, TABLE, "d0000000-0000-4000-8000-0000000000c0")).toBeNull();
    expect(prefillFrom(ROWS, "user_stranger", TABLE, MY_DECK)).toBeNull();
    expect(prefillFrom([], VIEWER, TABLE, MY_DECK)).toBeNull();
  });

  it("refuses a malformed table or deck id before reading anything", async () => {
    expect(await tablePrefill(VIEWER, "x", MY_DECK)).toBeNull();
    expect(await tablePrefill(VIEWER, ["7a0e0000-0000-4000-8000-000000000001"], MY_DECK)).toBeNull();
    expect(await tablePrefill(VIEWER, TABLE, "x")).toBeNull();
  });
});

describe("resolveSeatsFrom", () => {
  const table = { id: TABLE, seating: seatingHash(TABLE, ROWS) };

  it("turns a friend into an ask by their public id and deck, and anyone else into their deck's commanders and name", () => {
    expect(resolveSeatsFrom(ROWS, VIEWER, table, [4, 2, 3])).toEqual([
      { kind: "other", commander: "c0000000-0000-4000-8000-0000000000a0", partner: "c0000000-0000-4000-8000-0000000000a1", label: "Max the Longest Display Name A" },
      { kind: "friend", friend: "p0000000-0000-4000-8000-0000000000c0", deck: "d0000000-0000-4000-8000-0000000000c0" },
      { kind: "friend", friend: "p0000000-0000-4000-8000-0000000000e0", deck: null },
    ]);
  });

  it("seats a waiting stranger by name alone", () => {
    const waiting = ROWS.map((r) => (r.seat === 4 ? { ...r, deckId: null, deckName: null } : r));
    expect(resolveSeatsFrom(waiting, VIEWER, { id: TABLE, seating: seatingHash(TABLE, waiting) }, [4])).toEqual([
      { kind: "other", commander: null, partner: null, label: "Max the Longest Display Name A" },
    ]);
  });

  it("refuses a lapsed grant, a moved seating, the viewer's own seat, a seat not at the table, or one asked twice", () => {
    expect(resolveSeatsFrom([], VIEWER, table, [2])).toBeNull();
    const reseated = ROWS.map((r) => (r.seat === 2 ? { ...r, seat: 4 } : r.seat === 4 ? { ...r, seat: 2 } : r));
    expect(resolveSeatsFrom(reseated, VIEWER, table, [2])).toBeNull();
    expect(resolveSeatsFrom(ROWS, VIEWER, table, [1])).toBeNull();
    expect(resolveSeatsFrom(ROWS, VIEWER, table, [6])).toBeNull();
    expect(resolveSeatsFrom(ROWS, VIEWER, table, [2, 2])).toBeNull();
  });
});
