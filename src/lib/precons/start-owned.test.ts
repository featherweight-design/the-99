import { describe, expect, it, vi } from "vitest";
import { preconReservations, retryAnswer } from "./start-owned";

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

describe("retryAnswer", () => {
  it("answers with the deck this id made, and runs nothing", async () => {
    const committed = vi.fn(async () => true);
    expect(await retryAnswer(async () => "deck-1", committed, "id")).toEqual({ ok: true, deckId: "deck-1", entryId: "id" });
    expect(committed).not.toHaveBeenCalled();
  });

  it("finds the deck an overlapping retry committed after the first look, rather than calling the box failed", async () => {
    // The first look finds no deck; the twin request commits; the entry check then sees it.
    const made = vi.fn<() => Promise<string | "other" | null>>().mockResolvedValueOnce(null).mockResolvedValueOnce("deck-1");
    expect(await retryAnswer(made, async () => true, "id")).toEqual({ ok: true, deckId: "deck-1", entryId: "id" });
  });

  it("refuses an id another write used with no deck, and one that made another precon's deck", async () => {
    expect(await retryAnswer(async () => null, async () => true, "id")).toEqual({ ok: false, reason: "failed" });
    expect(await retryAnswer(async () => "other", async () => false, "id")).toEqual({ ok: false, reason: "failed" });
  });

  it("lets a fresh id run", async () => {
    expect(await retryAnswer(async () => null, async () => false, "id")).toBeNull();
  });
});
