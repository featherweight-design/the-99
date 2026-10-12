import { describe, expect, it, vi } from "vitest";

vi.mock("../../db", () => ({ db: {} }));
const { stillOpen } = await import("./fits-read-load");

describe("stillOpen", () => {
  const listed = [{ id: "d1" }, { id: "d2" }, { id: "d3" }];
  const decks = [{ id: "d1" }, { id: "d2" }];
  const lists = [
    { deck_id: "d1", oracle_id: "other" },
    { deck_id: "d2", oracle_id: "subject" },
  ];

  it("drops a candidate whose list came to hold the card, or that was deleted, since the candidates were read", () => {
    expect(stillOpen(listed, decks, lists, "subject").map((c) => c.id)).toEqual(["d1"]);
  });
});
