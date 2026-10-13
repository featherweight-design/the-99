// The contested-card reads hand the claim model the env they are given (admin PR 6f-2), including the one
// handoff inside the module that is not a claim read's own call site: the receipt's chooser
// (`loadSummaryView` → `chooserFor` → `loadChooserCards`). A dropped argument would read the environment,
// which has NEVER_CUT_ENABLED and CHANGE_COMMANDER_ENABLED the other way here.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { envViewWith } from "@/test/env-view";

const stub = vi.hoisted(() => ({
  upload: null as unknown,
  loadAvailability: vi.fn(async () => new Map()),
}));

vi.mock("../../db", () => ({
  db: { select: () => ({ from: () => ({ where: async () => (stub.upload ? [stub.upload] : []) }) }) },
}));
vi.mock("../decks/availability-query", () => ({ loadAvailability: stub.loadAvailability }));

const { countContestedCards, loadChooserCards, loadContestedCard, loadContestedCards, loadSummaryView } = await import("./summary-read");

const ENV = envViewWith({ NEVER_CUT_ENABLED: "true", CHANGE_COMMANDER_ENABLED: "true" });
const envOf = (i: number) => (stub.loadAvailability.mock.calls[i] as unknown as [string, { env?: unknown }])[1].env;

beforeEach(() => {
  vi.stubEnv("NEVER_CUT_ENABLED", "false");
  vi.stubEnv("CHANGE_COMMANDER_ENABLED", "false");
  stub.loadAvailability.mockClear();
});
afterEach(() => vi.unstubAllEnvs());

describe("summary-read's claim reads", () => {
  it("hands each reader's env to the claim model, by identity", async () => {
    await loadContestedCards(["o1"], "u1", ENV);
    await countContestedCards(["o1"], "u1", ENV);
    await loadContestedCard("o1", "u1", { unownedAsZero: true, env: ENV });
    await loadChooserCards(["o1"], "u1", {}, ENV);
    expect(stub.loadAvailability).toHaveBeenCalledTimes(4);
    for (let i = 0; i < 4; i++) expect(envOf(i) === ENV).toBe(true);
  });

  it("hands the receipt's contested read and its chooser the page's env, by identity", async () => {
    stub.upload = {
      id: "up1", filename: "f.csv", createdAt: new Date(0), confirmedAt: new Date(0),
      summaryPayload: {
        contested: [{ oracleId: "c1", arrived: 1, ownedBefore: 0 }],
        cleared: [{ oracleId: "g1", deckId: "d1" }],
        still: [],
        went: { g1: { kind: "held", copies: 1, ownedBefore: 0 } },
        names: { cards: {}, decks: {} },
      },
    };
    await loadSummaryView("up1", "u1", { addedCopy: true, env: ENV });
    // The contested cards' read, then the chooser's (`loadChooserCards`, reached through `chooserFor`).
    expect(stub.loadAvailability).toHaveBeenCalledTimes(2);
    expect((stub.loadAvailability.mock.calls[1] as unknown as [string, { oracleIds: string[] }])[1].oracleIds).toEqual(["g1"]);
    expect(envOf(0) === ENV).toBe(true);
    expect(envOf(1) === ENV).toBe(true);
  });
});
