// The view is handed the role basis the payload was COUNTED by, not the one the switch asked for
// (admin PR 6d-2, Copilot round 5): with the label read down, a labels request comes back counted by
// the classifier, and the fields fetch must ask for the classifier's figures to match its rows.
import { describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";
import { encodeDiscovery } from "../../lib/discovery/encode";
import type { DiscoveryList } from "../../lib/discovery/list";

const list = { items: [], sort: "fit", candidateCount: 0 } as unknown as DiscoveryList;
vi.mock("../../lib/auth", () => ({ requireUserId: async () => "user_1" }));
vi.mock("../../lib/switches/request", () => ({
  requestSwitchEnv: async () => ({ LABEL_ROLE_COUNTS_ENABLED: "true" }) as unknown as NodeJS.ProcessEnv,
}));
vi.mock("../../lib/home/summary", () => ({ getCollectionStats: async () => ({ uniqueCards: 10 }) }));
vi.mock("../../lib/sets/lane-printed-in", () => ({ lanePrintedInFor: async () => null }));
vi.mock("../../lib/discovery/payload", () => ({
  loadDiscoveryPayload: async () => ({ encoded: encodeDiscovery(list), oracleIds: [], basis: "classifier", fellBack: true }),
}));
vi.mock("../../components/commanders/discovery-view", () => ({ DiscoveryView: () => null }));

const { default: DiscoverPage } = await import("./page");

describe("/discover", () => {
  it("hands the view the basis the payload was counted by", async () => {
    const page = (await DiscoverPage({ searchParams: Promise.resolve({}) })) as ReactElement<{ children: ReactElement<{ basis: string }> }>;
    expect(page.props.children.props.basis).toBe("classifier");
  });
});
