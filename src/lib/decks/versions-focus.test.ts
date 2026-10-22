import { describe, expect, it, vi } from "vitest";

vi.mock("../../db", () => ({ db: {} }));

import { commitVersion } from "./versions";
import type { Tx } from "../../db";

const STOP = new Error("stop after the version insert");

/**
 * A transaction that answers `commitVersion`'s reads from a queue and records the version row it inserts, then stops:
 * only the insert's values are under test. Every select is a chain that resolves to the next queued answer.
 */
function recordingTx(deck: Record<string, unknown>) {
  const answers: unknown[][] = [[deck], []]; // the deck row, then no previous version
  const inserted: Record<string, unknown>[] = [];
  const chain = (): unknown => {
    const rows = answers.shift() ?? [];
    const c: Record<string, unknown> = {};
    for (const k of ["from", "where", "for", "orderBy", "limit", "innerJoin", "leftJoin"]) c[k] = () => c;
    c.then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve(rows).then(res, rej);
    return c;
  };
  const tx = {
    select: () => chain(),
    insert: () => ({
      values: (v: Record<string, unknown>) => {
        inserted.push(v);
        throw STOP;
      },
    }),
  };
  return { tx: tx as unknown as Tx, inserted };
}

const deckRow = (strategyFocus: string | null) => ({
  id: "deck-1", userId: "user-1", commanderOracleId: null, partnerOracleId: null, strategyFocus,
});

describe("commitVersion copies the deck's focus into the version", () => {
  it.each([["tokens"], ["typal:Elf"], [null]])("carries %s as it stands", async (focus) => {
    const { tx, inserted } = recordingTx(deckRow(focus));
    await expect(commitVersion("deck-1", null, tx, undefined, {} as NodeJS.ProcessEnv)).rejects.toBe(STOP);
    expect(inserted).toHaveLength(1);
    expect(inserted[0].strategyFocus).toBe(focus);
  });
});
