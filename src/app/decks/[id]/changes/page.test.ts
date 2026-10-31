// The deck changes page counts its `still short` cards over the draft's incoming rows.
import { describe, expect, it, vi } from "vitest";

const DECK = "22222222-2222-4222-8222-222222222222";
const stub = vi.hoisted(() => ({
  count: vi.fn(async () => 0),
}));

vi.mock("next/navigation", () => ({
  notFound: () => { throw new Error("notFound"); },
  redirect: () => { throw new Error("redirect"); },
}));
vi.mock("../../../../lib/auth", () => ({ requireUserId: async () => "user_1" }));
vi.mock("../../../../lib/switches/request", () => ({ requestSwitchEnv: async () => ({}) }));
vi.mock("../../../../lib/decks/read", () => ({
  getDeckReviewHeader: async () => ({ built: 99, hasPartner: false, unresolvedCount: 0 }),
  loadSourceDeckFigures: async () => new Map(),
}));
vi.mock("../../../../lib/decks/draft-state", () => ({
  changeCount: () => 1,
  loadDraftRows: async () => ({
    state: { version: { id: "v1" } },
    rows: { in: [{ oracleId: "o1", proxied: false, bucket: "missing", availability: null }], out: [] },
  }),
  loadDraftShape: async () => [],
  loadVersionShape: async () => [],
}));
vi.mock("./admits-review", () => ({ admitsReview: () => true }));
vi.mock("../../../../lib/collection/summary-read", () => ({ countContestedCards: stub.count }));

const { default: ChangesPage } = await import("./page");

describe("the deck changes page", () => {
  it("counts contested cards over the incoming rows", async () => {
    // Only the count is under test: whatever the rest of the render does with these stubs is not.
    await ChangesPage({ params: Promise.resolve({ id: DECK }), searchParams: Promise.resolve({}) } as never).catch(() => null);
    expect(stub.count).toHaveBeenCalledTimes(1);
    expect(stub.count.mock.calls[0] as unknown[]).toEqual([["o1"], "user_1"]);
  });
});
