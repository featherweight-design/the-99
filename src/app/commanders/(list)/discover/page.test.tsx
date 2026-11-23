// The view is handed the role basis the payload was COUNTED by, not the one the switch asked for
// (admin PR 6d-2, Copilot round 5): with the label read down, a labels request comes back counted by
// the classifier, and the fields fetch must ask for the classifier's figures to match its rows.
import { describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";
import { encodeDiscovery } from "../../../../lib/discovery/encode";
import type { DiscoveryList } from "../../../../lib/discovery/list";

const list = { items: [], sort: "fit", candidateCount: 0 } as unknown as DiscoveryList;
vi.mock("../../../../lib/auth", () => ({ requireUserId: async () => "user_1" }));
vi.mock("../../../../lib/flags/request", () => ({
  requestFlags: async () => ({ LABEL_ROLE_COUNTS_ENABLED: "true" }) as unknown as NodeJS.ProcessEnv,
}));
vi.mock("../../../../lib/home/summary", () => ({ getCollectionStats: async () => ({ uniqueCards: 10 }) }));
vi.mock("../../../../lib/sets/lane-printed-in", () => ({ lanePrintedInFor: async () => null }));
const loaded = vi.hoisted(() => ({ store: [] as unknown[] }));
vi.mock("../../../../lib/discovery/payload", () => ({
  loadDiscoveryPayload: async (_u: string, _sort: string, _env: unknown, store: unknown) => (
    loaded.store.push(store), { encoded: encodeDiscovery(list), oracleIds: [], basis: "classifier", fellBack: true }
  ),
}));
vi.mock("../../../../lib/stores/preference", () => ({ readerStoreForPage: async () => "tcgplayer" }));
vi.mock("../../../../components/commanders/discovery-view", () => ({ DiscoveryView: () => null }));

const { default: DiscoverPage } = await import("./page");
type Page = ReactElement<{ children: ReactElement<{ store: string; children: ReactElement<{ basis: string }> }> }>;

describe("/discover", () => {
  it("hands the view the basis the payload was counted by", async () => {
    const page = (await DiscoverPage({ searchParams: Promise.resolve({}) })) as Page;
    expect(page.props.children.props.children.props.basis).toBe("classifier");
  });

  // Store preference: the payload is priced at the reader's store, and the rows draw inside that store's provider.
  it("reads the payload at the reader's store and provides that store to the rows", async () => {
    loaded.store.length = 0;
    const page = (await DiscoverPage({ searchParams: Promise.resolve({}) })) as Page;
    expect(loaded.store).toEqual(["tcgplayer"]);
    expect(page.props.children.props.store).toBe("tcgplayer");
  });
});
