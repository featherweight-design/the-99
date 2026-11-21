// The sealed Start roster (ruling (b)): only this server opens it, only for its own table, and it carries no id in the clear.
import { describe, expect, it } from "vitest";
import { openRoster, rosterSecret, sealRoster } from "./rule-zero-roster";

const SECRET = "a".repeat(64);
const TABLE = "7a0e0000-0000-4000-8000-000000000001";
const OTHER = "7a0e0000-0000-4000-8000-000000000002";
const DECK = "d0000000-0000-4000-8000-000000000001";
const SEATS = [
  { seat: 2, userId: "user_b", deckId: null },
  { seat: 1, userId: "user_a", deckId: DECK },
];

describe("sealRoster / openRoster", () => {
  it("opens to the seats in seat order, with nothing readable in the token", () => {
    const token = sealRoster(SECRET, TABLE, SEATS);
    expect(token).not.toContain("user_a");
    expect(Buffer.from(token, "base64url").toString("latin1")).not.toContain("user_a");
    expect(openRoster(SECRET, TABLE, token)?.seats).toEqual([SEATS[1], SEATS[0]]);
  });

  it("carries when it was issued", () => {
    expect(openRoster(SECRET, TABLE, sealRoster(SECRET, TABLE, SEATS, 1_763_600_000_000))?.startedAt).toBe(1_763_600_000_000);
    const now = Date.now();
    expect(openRoster(SECRET, TABLE, sealRoster(SECRET, TABLE, SEATS))!.startedAt).toBeGreaterThanOrEqual(now);
  });

  it("refuses another table, another key, an altered token and junk", () => {
    const token = sealRoster(SECRET, TABLE, SEATS);
    expect(openRoster(SECRET, OTHER, token)).toBeNull();
    expect(openRoster("b".repeat(64), TABLE, token)).toBeNull();
    const raw = Buffer.from(token, "base64url");
    raw[14] ^= 1;
    expect(openRoster(SECRET, TABLE, raw.toString("base64url"))).toBeNull();
    for (const junk of [undefined, 7, "", "not base64!", "a".repeat(5000)]) expect(openRoster(SECRET, TABLE, junk)).toBeNull();
  });

  it("refuses a well-sealed body of the wrong shape", () => {
    expect(openRoster(SECRET, TABLE, sealRoster(SECRET, TABLE, []))).toBeNull();
    expect(openRoster(SECRET, TABLE, sealRoster(SECRET, TABLE, [SEATS[0], { ...SEATS[0], seat: 3 }]))).toBeNull();
    expect(openRoster(SECRET, TABLE, sealRoster(SECRET, TABLE, [{ seat: 1, userId: "user_a", deckId: "nope" }]))).toBeNull();
    expect(openRoster(SECRET, TABLE, sealRoster(SECRET, TABLE, SEATS, 0))).toBeNull();
  });
});

describe("rosterSecret", () => {
  it("takes 64+ hex characters only, so a missing or short secret seals nothing", () => {
    expect(rosterSecret({ INVITE_CODE_SECRET: SECRET })).toBe(SECRET);
    expect(rosterSecret({})).toBeNull();
    expect(rosterSecret({ INVITE_CODE_SECRET: "abc" })).toBeNull();
  });
});
