import { describe, expect, it, vi } from "vitest";
import type { DeckGame } from "./games";
import type { GameOpponent } from "./game-opponents";
import { loadDeckOpponents } from "./deck-opponents-read";

const ON = { SOCIAL_FRIENDS_ENABLED: "true", SOCIAL_GAMES_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;
const game = (id: string): DeckGame => ({
  id, result: "loss", podSize: 4, playedAt: new Date("2026-10-01"), versionNumber: null, note: null, worked: [], hurt: [],
});
const seat: GameOpponent = {
  seat: 1, friend: null, deckName: null, commander: { oracleId: "y", name: "Yuriko" }, partner: null,
  colorIdentity: ["U", "B"], label: null, won: true,
};

describe("loadDeckOpponents", () => {
  it("reads nothing and answers null while the switch is off, or when its parent is", async () => {
    const read = vi.fn();
    expect(await loadDeckOpponents("d", "u", [game("g1")], {} as NodeJS.ProcessEnv, read)).toBeNull();
    expect(await loadDeckOpponents("d", "u", [game("g1")], { SOCIAL_GAMES_ENABLED: "true" } as unknown as NodeJS.ProcessEnv, read)).toBeNull();
    expect(read).not.toHaveBeenCalled();
  });

  it("reads nothing for a deck with no games", async () => {
    const read = vi.fn();
    expect(await loadDeckOpponents("d", "u", [], ON, read)).toBeNull();
    expect(read).not.toHaveBeenCalled();
  });

  it("returns the seats and the matchups drawn from them", async () => {
    const read = vi.fn().mockResolvedValue(new Map([["g1", [seat]]]));
    const out = await loadDeckOpponents("d", "u", [game("g1"), game("g2")], ON, read);
    expect(read).toHaveBeenCalledWith("d", "u");
    expect(out?.opponents.get("g1")).toEqual([seat]);
    expect([out?.matchups.games, out?.matchups.recorded]).toEqual([2, 1]);
  });

  it("degrades a failed read to null and logs it, never throwing into the deck page", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const read = vi.fn().mockRejectedValue(new Error("neon is down"));
    await expect(loadDeckOpponents("d", "u", [game("g1")], ON, read)).resolves.toBeNull();
    expect(error).toHaveBeenCalledTimes(1);
    error.mockRestore();
  });
});
