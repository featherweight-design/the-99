import { describe, expect, it } from "vitest";

import { stampFirstSeenIn } from "./first-seen";

// A transaction that holds `existing` keys of one kind and records what is inserted.
function fakeTx(existing: string[]) {
  const inserted: { kind: string; key: string; baseline: boolean; firstSeenAt: Date }[] = [];
  const tx = {
    select: () => ({ from: () => ({ where: async () => [{ n: existing.length }] }) }),
    insert: () => ({
      values: (rows: typeof inserted) => ({
        onConflictDoNothing: () => ({
          returning: async () => {
            const fresh = rows.filter((r) => !existing.includes(r.key));
            inserted.push(...fresh);
            return fresh.map((r) => ({ key: r.key }));
          },
        }),
      }),
    }),
  };
  return { tx: tx as unknown as Parameters<typeof stampFirstSeenIn>[0], inserted };
}

const NOW = new Date("2026-10-14T09:00:00Z");

describe("stampFirstSeenIn", () => {
  it("stamps the first run for a kind as the baseline: they were already there", async () => {
    const { tx, inserted } = fakeTx([]);
    const r = await stampFirstSeenIn(tx, "set", ["trk", "trc", "fra"], NOW);
    expect(r).toEqual({ added: 3, baseline: true });
    expect(inserted.every((x) => x.baseline && x.kind === "set" && x.firstSeenAt === NOW)).toBe(true);
  });

  it("stamps only what it has not seen after that, as arrivals, and counts them", async () => {
    const { tx, inserted } = fakeTx(["trk", "fra"]);
    const r = await stampFirstSeenIn(tx, "set", ["trk", "fra", "mdc"], NOW);
    expect(r).toEqual({ added: 1, baseline: false });
    expect(inserted).toEqual([{ kind: "set", key: "mdc", firstSeenAt: NOW, baseline: false }]);
  });

  it("reads an empty feed as nothing to stamp, never as a baseline", async () => {
    const { tx, inserted } = fakeTx([]);
    expect(await stampFirstSeenIn(tx, "precon", [], NOW)).toEqual({ added: 0, baseline: false });
    expect(inserted).toEqual([]);
  });

  it("stamps a repeated key once", async () => {
    const { tx, inserted } = fakeTx([]);
    await stampFirstSeenIn(tx, "precon", ["A_FDC", "A_FDC"], NOW);
    expect(inserted).toHaveLength(1);
  });
});
