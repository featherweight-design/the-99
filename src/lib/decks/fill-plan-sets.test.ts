import { beforeEach, describe, expect, it, vi } from "vitest";
import { envViewWith } from "@/test/env-view";
import type { FillCandidate } from "./fill";

// buildFillPlan's WIRING of the asked sets: one printings read over the owned pool, the mark on the
// owned candidates printed in them, and nothing read or marked when no set was asked. The order the
// mark produces is `fill.test.ts`'s; here `planFill` is a stub that records its candidates.
const m = vi.hoisted(() => ({
  planFill: vi.fn(),
  execute: vi.fn(),
}));

vi.mock("../../db", () => ({ db: { execute: m.execute } }));
vi.mock("./suggestions-read", () => ({
  ownedColorLegalPool: vi.fn(async () => [
    { oracleId: "owned-in", name: "Rock", typeLine: "Artifact", oracleText: "{T}: Add {C}.", keywords: [], manaCost: null, layout: "normal", ownedQuantity: 1 },
    { oracleId: "owned-out", name: "Pebble", typeLine: "Artifact", oracleText: "{T}: Add {C}.", keywords: [], manaCost: null, layout: "normal", ownedQuantity: 1 },
    { oracleId: "forest", name: "Forest", typeLine: "Basic Land — Forest", oracleText: null, keywords: [], manaCost: null, layout: "normal", ownedQuantity: 9 },
  ]),
  unownedTopCards: vi.fn(async () => []),
}));
vi.mock("../edhrec/client", () => ({ getEdhrecData: vi.fn(async () => ({ data: { inclusionByName: {}, topCards: [] } })) }));
vi.mock("../staples/fill-staples", () => ({ gatherFillStaples: vi.fn(async () => []) }));
vi.mock("./catalog-basics", () => ({ loadCatalogBasics: vi.fn(async () => []) }));
vi.mock("../../app/commanders/[slug]/synergy-read", () => ({ readSynergyCards: vi.fn(async () => []) }));
vi.mock("../profile/load", () => ({ loadSkeletonForCommanders: vi.fn(async () => ({ skeleton: null })) }));
vi.mock("../labels/read", () => ({ readLabelRoleSets: vi.fn(async () => new Map()) }));
vi.mock("./availability-query", () => ({ loadAvailability: vi.fn(async () => new Map()) }));
vi.mock("../intake/fill-facts", () => ({
  loadFillGate: vi.fn(async () => undefined),
  loadBudgetLeftCents: vi.fn(async () => null),
  loadBracketGateFacts: vi.fn(),
}));
vi.mock("./fill", async (importActual) => ({
  ...(await importActual<typeof import("./fill")>()),
  planFill: m.planFill,
}));

import { buildFillPlan } from "./fill-plan";

const commanders = [{ oracleId: "cmd", name: "C", colorIdentity: ["G"], manaCost: "{G}" }];
const env = envViewWith({});
const call = (sets?: string[], own = false) =>
  buildFillPlan("u", commanders, new Set(), {
    selected: [], env,
    answers: { budgetCents: null, bracket: null, cardOracleId: null, ...(sets ? { sets } : {}) },
    ...(own ? { pool: "sleeveable" as const } : {}),
  });
const candidates = () => m.planFill.mock.calls[0][0] as FillCandidate[];
const marked = () => candidates().filter((c) => c.inPreferredSets).map((c) => c.oracleId);
/** The parameters the printings read was given, whatever the SQL object nests them in. */
const paramsOf = (node: unknown, out: unknown[] = []): unknown[] => {
  if (Array.isArray(node)) { node.forEach((n) => paramsOf(n, out)); return out; }
  if (node && typeof node === "object") {
    const rec = node as Record<string, unknown>;
    if ("value" in rec && "encoder" in rec) out.push(rec.value);
    if (Array.isArray(rec.queryChunks)) paramsOf(rec.queryChunks, out);
  }
  return out;
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  m.planFill.mockReturnValue({ rows: [] });
  // The stub answers "printed in" for the basic too, to prove the plan never asks it.
  m.execute.mockResolvedValue({ rows: [{ oracle_id: "owned-in" }, { oracle_id: "forest" }] });
});

describe("buildFillPlan's set preference", () => {
  it("marks the owned cards printed in the asked sets, with one read over the non-basic pool", async () => {
    await call(["blb"]);
    expect(m.execute).toHaveBeenCalledTimes(1);
    const params = paramsOf(m.execute.mock.calls[0][0]);
    expect(params).toContainEqual(["owned-in", "owned-out"]);
    expect(params).toContainEqual(["blb"]);
    expect(marked()).toEqual(["owned-in"]);
  });

  it("never marks a basic land, whatever the read says", async () => {
    await call(["blb"]);
    expect(candidates().find((c) => c.oracleId === "forest")!.inPreferredSets).toBeUndefined();
  });

  it("reads and marks nothing when no set was asked", async () => {
    await call();
    await call([]);
    expect(m.execute).not.toHaveBeenCalled();
    expect(marked()).toEqual([]);
  });

  it("marks under own-only too", async () => {
    await call(["blb"], true);
    expect(marked()).toEqual(["owned-in"]);
  });

  it("fills without the preference when the read fails, rather than failing the fill", async () => {
    m.execute.mockRejectedValue(new Error("down"));
    await call(["blb"]);
    expect(marked()).toEqual([]);
  });
});
