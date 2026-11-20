import { describe, expect, it } from "vitest";

import type { UpgradePanel } from "../precons/upgrade/run";
import { chunkCardIds, demoCardIds } from "./project-cards";
import { projectUpgrade, upgradeCardIds } from "./project-upgrade";
import { decodeDemo, encodeDemo } from "./wire";

const pair = (n: number) => ({ addId: `add-${n}`, cutId: `cut-${n}`, add: `Add ${n}`, cut: `Cut ${n}`, reason: "because" });
const run = (over: Record<string, unknown> = {}) => ({
  id: "run-1", status: "done", strategyKey: "muddle/3/spells", strategyLabel: "Spells", refunded: false, createdAt: new Date("2026-11-20T10:00:00.000Z"),
  pairs: [pair(1), pair(2)], buyTotalCents: 900, bracketBefore: 2, bracketAfter: 3, bracketTarget: 3, listFp: "fp", seenAt: new Date("2026-11-20T10:05:00.000Z"),
  unpicked: [], toBuy: { cards: 2, cents: 900 }, owned: 0, deck: { id: "d1", name: "Someone's deck" }, themes: {}, ...over,
});
const panel = (runs: unknown[]) => ({
  boxBracket: 2, boxPermits: [1, 2], commanders: [{ key: "a+b", isFace: false, cards: [{ oracleId: "muddle", name: "Muddle" }], line: null, strategies: [] }],
  runs, listFp: "fp", cards: {}, figures: {}, allowance: { used: 0, limit: 10, reopensAt: null, nextAt: null },
}) as unknown as UpgradePanel;

describe("projectUpgrade", () => {
  it("keeps the one run, drops the deck it started, and carries the set permits as the demo's bracket seed", () => {
    const other = run({ id: "run-0", strategyLabel: "Tokens" });
    const out = projectUpgrade({ precon: "Prismari Artistry", panel: panel([run(), other]), runId: "run-1", setPermits: [3, 4] });
    expect(out.panel.runs.map((r) => r.id)).toEqual(["run-1"]);
    expect(out.panel.runs[0].deck).toBeNull();
    expect(out).toMatchObject({ precon: "Prismari Artistry", runId: "run-1", setPermits: [3, 4] });
  });

  it("opens with every line picked, whatever picks the fixture account left stored", () => {
    const out = projectUpgrade({ precon: "Prismari Artistry", panel: panel([run({ unpicked: ["c-x"] })]), runId: "run-1", setPermits: null });
    expect(out.panel.runs[0].unpicked).toEqual([]);
  });

  it("keeps an unread set bracket as null", () => {
    expect(projectUpgrade({ precon: "P", panel: panel([run()]), runId: "run-1", setPermits: null }).setPermits).toBeNull();
  });

  it("refuses a run that is missing, unfinished, refunded or empty", () => {
    expect(() => projectUpgrade({ precon: "P", panel: panel([run()]), runId: "nope", setPermits: [3] })).toThrow(/not in the panel/);
    expect(() => projectUpgrade({ precon: "P", panel: panel([run({ status: "pending" })]), runId: "run-1", setPermits: [3] })).toThrow(/pending/);
    expect(() => projectUpgrade({ precon: "P", panel: panel([run({ refunded: true })]), runId: "run-1", setPermits: [3] })).toThrow(/refunded/);
    expect(() => projectUpgrade({ precon: "P", panel: panel([run({ pairs: [] })]), runId: "run-1", setPermits: [3] })).toThrow(/no swaps/);
  });

  it("names every card the step opens: each add and cut, and the offered commanders", () => {
    const u = projectUpgrade({ precon: "P", panel: panel([run()]), runId: "run-1", setPermits: [3] });
    expect(upgradeCardIds(u).sort()).toEqual(["add-1", "add-2", "cut-1", "cut-2", "muddle"]);
    expect(upgradeCardIds(undefined)).toEqual([]);
  });
});

describe("the format-3 file", () => {
  const u = projectUpgrade({ precon: "P", panel: panel([run()]), runId: "run-1", setPermits: [3] });

  it("round-trips through JSON with the panel's Dates restored", () => {
    const back = decodeDemo<{ format: number; upgrade?: typeof u }>(JSON.parse(JSON.stringify(encodeDemo({ format: 3, upgrade: u }))));
    expect(back.format).toBe(3);
    expect(back.upgrade?.panel.runs[0].createdAt).toBeInstanceOf(Date);
    expect(back.upgrade?.panel.runs[0].createdAt.toISOString()).toBe("2026-11-20T10:00:00.000Z");
    expect(back.upgrade?.panel.runs[0].seenAt).toBeInstanceOf(Date);
    expect(back.upgrade).toEqual(u);
  });

  it("a format-2 file decodes with no upgrade: the step is left out", () => {
    const back = decodeDemo<{ format: number; upgrade?: unknown }>(JSON.parse(JSON.stringify(encodeDemo({ format: 2 }))));
    expect(back.format).toBe(2);
    expect(back.upgrade).toBeUndefined();
  });

  it("puts the step's cards in their own chunk, and none without the step", () => {
    const base = {
      collection: { cards: [] }, decks: { played: { commander: { oracleId: "ash" }, commanderShopping: [], cards: [], siblings: [] }, over: { commander: { oracleId: "gia" }, commanderShopping: [], cards: [], siblings: [] }, under: { commander: { oracleId: "zim" }, commanderShopping: [], cards: [], siblings: [] } },
      cuts: { items: [] }, topOff: { candidates: [] }, mana: { ids: {} }, fits: { card: { oracleId: "swords" } },
    };
    const without = chunkCardIds(base as unknown as Parameters<typeof chunkCardIds>[0]);
    expect(without.upgrade).toEqual([]);
    const withStep = { ...base, upgrade: u } as unknown as Parameters<typeof chunkCardIds>[0];
    expect(chunkCardIds(withStep).upgrade.sort()).toEqual(["add-1", "add-2", "cut-1", "cut-2", "muddle"]);
    expect(demoCardIds(withStep)).toEqual(expect.arrayContaining(["add-1", "muddle"]));
  });
});
