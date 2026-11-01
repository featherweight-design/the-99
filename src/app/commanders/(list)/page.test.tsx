// The rankings payload is filed only when it was counted by the basis its key names: a ranking
// counted by the classifier because the label read failed is served and never filed under the
// labels key (admin PR 6d-2, Copilot round 5).
import { describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";

const seen = vi.hoisted(() => ({
  store: undefined as ((v: { labelFallback?: true }) => boolean) | undefined,
  env: {} as Record<string, string>,
  candidateCount: 0,
  hiddenCount: 0,
}));
vi.mock("../../../lib/auth", () => ({ requireUserId: async () => "user_1" }));
vi.mock("../../../lib/switches/request", () => ({ requestSwitchEnv: async () => seen.env as NodeJS.ProcessEnv }));
vi.mock("../../../lib/home/summary", () => ({
  getCollectionStats: async () => ({ uniqueCards: 10 }),
  listRecentDecks: async () => [],
}));
vi.mock("../../../lib/commanders/avail-pref", () => ({ readCommandersAvail: async () => null }));
vi.mock("../../../lib/sets/lane-printed-in", () => ({
  loadCommanderPrintings: () => Promise.resolve(null),
  lanePrintedInFor: async () => null,
}));
vi.mock("../../../lib/commanders/rankings", () => ({
  commanderRankingsKey: () => ["commander-rankings"],
  loadCommanderRankings: async () => ({}),
}));
vi.mock("../../../lib/cache/user-lists", () => ({
  cacheForUser: async (_u: string, _k: string[], _load: unknown, opts: { store?: typeof seen.store } = {}) => {
    seen.store = opts.store;
    return {
      items: [], degraded: false, uniqueCardsRead: 10, candidateCount: seen.candidateCount,
      hiddenCount: seen.hiddenCount, freeRanking: null, availOk: true,
    };
  },
}));
vi.mock("../actions", () => ({ retryRecs: async () => {} }));

const { default: CommandersPage } = await import("./page");
const { CommandersView } = await import("../../../components/commanders/commanders-view");

describe("/commanders", () => {
  it("files a ranking only when it did not fall back to the classifier", async () => {
    await CommandersPage({ searchParams: Promise.resolve({}) });
    expect(seen.store).toBeTypeOf("function");
    expect(seen.store!({})).toBe(true);
    expect(seen.store!({ labelFallback: true })).toBe(false);
  });
});

// The page hands the view `firstRun` (no confirmed deck yet). Help me choose's door moved into the Commanders place head, so the page no longer passes the switch.
describe("/commanders' first-run flag", () => {
  it("passes firstRun and no Help me choose switch", async () => {
    seen.candidateCount = 3;
    const section = (await CommandersPage({ searchParams: Promise.resolve({}) })) as ReactElement<{ children: ReactElement }>;
    const el = section.props.children as ReactElement<{ helpMeChoose?: boolean; firstRun?: boolean }>;
    expect(el.type).toBe(CommandersView);
    expect(el.props.firstRun).toBe(true);
    expect(el.props.helpMeChoose).toBeUndefined();
    seen.candidateCount = 0;
  });
});

// Hide a commander, Edges state 11: a list the player emptied by hiding has candidates, all of them hidden,
// so it is the view's "Everything here is hidden" under its rack, not the page's no-candidates state.
describe("/commanders with every candidate hidden", () => {
  it("hands the view the hidden count instead of drawing no candidates", async () => {
    seen.candidateCount = 0;
    seen.hiddenCount = 3;
    const section = (await CommandersPage({ searchParams: Promise.resolve({}) })) as ReactElement<{ children: ReactElement }>;
    const el = section.props.children as ReactElement<{ hiddenCount?: number; candidateCount?: number }>;
    expect(el.type).toBe(CommandersView);
    expect(el.props.hiddenCount).toBe(3);
    expect(el.props.candidateCount).toBe(0);
    seen.hiddenCount = 0;
  });

  it("keeps the no-candidates state when nothing is hidden", async () => {
    seen.candidateCount = 0;
    const section = (await CommandersPage({ searchParams: Promise.resolve({}) })) as ReactElement<{ children: ReactElement }>;
    expect(section.props.children).not.toHaveProperty("type", CommandersView);
  });
});
