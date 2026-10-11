import { describe, expect, it, vi } from "vitest";

const rows = vi.hoisted(() => ({ rows: [] as unknown[] }));
vi.mock("../../db", () => ({ db: { execute: vi.fn(async () => ({ rows: rows.rows })) } }));

import { loadReadDecks, READ_DECKS_MAX } from "./the-read-load";

describe("loadReadDecks", () => {
  it("shows the judgement at most READ_DECKS_MAX decks, so a big account cannot outgrow the priced ceiling", async () => {
    rows.rows = Array.from({ length: READ_DECKS_MAX + 10 }, (_, i) => ({ id: `c${i}`, name: `Commander ${String(i).padStart(3, "0")}`, partner: null, tags: [] }));
    const decks = await loadReadDecks("u");
    expect(decks).toHaveLength(READ_DECKS_MAX);
    expect(decks[0].commander).toBe("Commander 000");
  });

  it("reads two decks led by one commander as one", async () => {
    rows.rows = [{ id: "a", name: "Alpha", partner: null, tags: [] }, { id: "a", name: "Alpha", partner: null, tags: [] }];
    expect(await loadReadDecks("u")).toHaveLength(1);
  });
});
