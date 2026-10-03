import { beforeEach, describe, expect, it, vi } from "vitest";

// `saveIntent` is the empty-state field's write (through `saveDeckDescription`), separate from
// the pencil's `saveDeckHeader` — but both touch the same `decks` row, and Home's resume order
// and "edited" timestamp (`src/lib/decks/touched.ts`) read `lastEditedAt` with no way to tell
// which entry point wrote it.
const calls = vi.hoisted(() => ({ sets: [] as { set: unknown }[], rows: [{ id: "deck_1" }] as { id: string }[] }));

vi.mock("../../db", () => ({
  db: {
    update: () => ({
      set: (values: unknown) => ({
        where: () => ({
          returning: async () => {
            calls.sets.push({ set: values });
            return calls.rows;
          },
        }),
      }),
    }),
    transaction: async () => { throw new Error("not used by saveIntent"); },
  },
}));

import { saveIntent } from "./run-store";

beforeEach(() => {
  calls.sets.length = 0;
  calls.rows = [{ id: "deck_1" }];
});

describe("saveIntent (round 6: the shared touch stamp)", () => {
  it("stamps lastEditedAt, same as the pencil's saveDeckHeader does", async () => {
    const result = await saveIntent("deck_1", "user_1", "A new description.");
    expect(result).toBe("saved");
    expect(calls.sets[0].set).toMatchObject({ intent: "A new description.", intentSeeded: false });
    expect(calls.sets[0].set).toHaveProperty("lastEditedAt");
  });

  it("clears the intent to null, still stamping lastEditedAt", async () => {
    const result = await saveIntent("deck_1", "user_1", "   ");
    expect(result).toBe("saved");
    expect(calls.sets[0].set).toMatchObject({ intent: null, intentSeeded: false });
    expect(calls.sets[0].set).toHaveProperty("lastEditedAt");
  });

  it("refuses an over-cap line without writing", async () => {
    const result = await saveIntent("deck_1", "user_1", "a".repeat(241));
    expect(result).toBe("tooLong");
    expect(calls.sets).toHaveLength(0);
  });

  it("refuses when no row matches the deck and the reader together", async () => {
    calls.rows = [];
    const result = await saveIntent("deck_1", "user_1", "Text.");
    expect(result).toBe("refused");
  });
});
