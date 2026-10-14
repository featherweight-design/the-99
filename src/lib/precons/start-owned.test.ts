import { describe, expect, it } from "vitest";
import { preconReservations } from "./start-owned";

describe("preconReservations", () => {
  const deck = { cards: [{ oracleId: "signet", quantity: 1 }, { oracleId: "plains", quantity: 10 }, { oracleId: "sol", quantity: 1 }, { oracleId: "elf", quantity: 2 }] };

  it("reserves what the box brought, up to what the deck lists, sorted by card", () => {
    const brought = new Map([["signet", 1], ["sol", 3], ["elf", 1], ["plains", 10]]);
    expect(preconReservations(deck, brought, new Set(["plains"]))).toEqual([
      { oracleId: "elf", copies: 1 },
      { oracleId: "signet", copies: 1 },
      { oracleId: "sol", copies: 1 },
    ]);
  });

  it("reserves no basic, and nothing the box did not bring", () => {
    expect(preconReservations(deck, new Map([["plains", 10]]), new Set(["plains"]))).toEqual([]);
  });
});
