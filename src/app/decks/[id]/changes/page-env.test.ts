// The deck changes page hands its `still short` count the reader's resolved switches (admin PR 6f-2): the
// count's claim read decides NEVER_CUT_ENABLED's `locked` key and CHANGE_COMMANDER_ENABLED's pending clause
// from that env, and a dropped argument would read the environment, which has both the other way here.
import { describe, expect, it, vi } from "vitest";
import { envViewWith } from "@/test/env-view";

const DECK = "22222222-2222-4222-8222-222222222222";
const stub = vi.hoisted(() => ({
  env: null as NodeJS.ProcessEnv | null,
  count: vi.fn(async () => 0),
}));

vi.mock("next/navigation", () => ({
  notFound: () => { throw new Error("notFound"); },
  redirect: () => { throw new Error("redirect"); },
}));
vi.mock("../../../../lib/auth", () => ({ requireUserId: async () => "user_1" }));
vi.mock("../../../../lib/switches/request", () => ({ requestSwitchEnv: async () => stub.env }));
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
  it("counts contested cards under the reader's resolved env, by identity", async () => {
    vi.stubEnv("NEVER_CUT_ENABLED", "false");
    vi.stubEnv("CHANGE_COMMANDER_ENABLED", "false");
    stub.env = envViewWith({ NEVER_CUT_ENABLED: "true", CHANGE_COMMANDER_ENABLED: "true" });
    try {
      // Only the count is under test: whatever the rest of the render does with these stubs is not.
      await ChangesPage({ params: Promise.resolve({ id: DECK }), searchParams: Promise.resolve({}) } as never).catch(() => null);
      expect(stub.count).toHaveBeenCalledTimes(1);
      const call = stub.count.mock.calls[0] as unknown[];
      expect(call[0]).toEqual(["o1"]);
      expect(call[2] === stub.env).toBe(true);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
