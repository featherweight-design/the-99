// The intake catalog memo keeps the read that STARTED last. Around a catalog refresh an older
// generation's read can finish after a newer one, and two reads can share a millisecond, so the
// order is a ticket taken before the generation read, never the clock.

import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it, vi } from "vitest";

const execute = vi.hoisted(() => vi.fn());
const generations = vi.hoisted(() => [] as ((g: string) => void)[]);
vi.mock("../../db", () => ({ db: { execute } }));
vi.mock("../cache/catalog-generation", () => ({
  catalogGeneration: () => new Promise<string>((resolve) => generations.push(resolve)),
}));

const { loadIntakeThemes } = await import("./search");
const text = (q: SQL) => new PgDialect().sqlToQuery(q).sql;

describe("the intake catalog memo, around a refresh", () => {
  it("is never rolled back by an older read that finishes last in the same millisecond", async () => {
    execute.mockImplementation(async () => ({ rows: [] }));
    const vocabularyReads = () => execute.mock.calls.filter(([q]) => text(q).includes("commander_support")).length;

    const older = loadIntakeThemes(5_000);
    const newer = loadIntakeThemes(5_000);
    await vi.waitFor(() => expect(generations).toHaveLength(2));
    generations[1]("g2");
    await newer;
    generations[0]("g1");
    await older;
    const before = vocabularyReads();

    const third = loadIntakeThemes(5_000);
    await vi.waitFor(() => expect(generations).toHaveLength(3));
    generations[2]("g2");
    await third;
    expect(vocabularyReads()).toBe(before);
  });
});
