import { beforeEach, describe, expect, it, vi } from "vitest";

const stub = vi.hoisted(() => ({ search: vi.fn(), signedIn: vi.fn(async () => "user_1") }));
vi.mock("../../lib/auth", () => ({ requireUserId: stub.signedIn }));
// No box is behind a switch: Help me choose's retired 2026-11-01 (always on), and Suggested changes' boxes followed the
// Analysis tab, whose switch retired too (2026-11-01).
vi.mock("../../lib/decks/notes-store", () => ({ searchNoteCards: stub.search }));

const { searchTagCards } = await import("./tag-actions");

beforeEach(() => { stub.search.mockReset().mockResolvedValue([{ oracleId: "a", name: "Sol Ring", commanderLegal: true }]); stub.signedIn.mockClear(); });

describe("searchTagCards", () => {
  it("searches every surface for a signed-in reader", async () => {
    for (const surface of ["intake", "tuning", "description", "gameNote"] as const) {
      expect(await searchTagCards(surface, "sol"), surface).toEqual([{ oracleId: "a", name: "Sol Ring", commanderLegal: true }]);
    }
    expect(stub.signedIn).toHaveBeenCalled();
  });

  it("asks for only the cards a commander deck may hold, in the query itself, since a tag here is a requirement", async () => {
    await searchTagCards("intake", "o");
    expect(stub.search).toHaveBeenCalledWith("o", { commanderLegalOnly: true });
  });

  it("answers null, searching nothing, for an unknown surface or a non-string query", async () => {
    expect(await searchTagCards("deck" as never, "sol")).toBeNull();
    expect(await searchTagCards("__proto__" as never, "sol")).toBeNull();
    expect(await searchTagCards("intake", 7 as never)).toBeNull();
    expect(stub.search).not.toHaveBeenCalled();
  });

  it("answers null when the lookup throws", async () => {
    stub.search.mockRejectedValueOnce(new Error("db down"));
    expect(await searchTagCards("intake", "sol")).toBeNull();
  });
});
