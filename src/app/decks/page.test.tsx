// /decks hands its zero state Help me choose's switch as this reader resolves it (discovery R3 E1): the boundary
// between the page and DecksZeroActions. Every loader is stubbed; what is asserted is the element the page returns.
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";

const stub = vi.hoisted(() => ({ env: {} as Record<string, string> }));

vi.mock("../../lib/auth", () => ({ requireUserId: async () => "user_1" }));
vi.mock("../../lib/switches/request", () => ({ requestSwitchEnv: async () => stub.env as NodeJS.ProcessEnv }));
vi.mock("../../lib/cache/page-cache", () => ({
  cachePageForUser: async (_u: string, _p: string, _k: string[], load: (env: NodeJS.ProcessEnv) => Promise<{ value: unknown }>, env: NodeJS.ProcessEnv) =>
    (await load(env)).value,
}));
vi.mock("../../lib/decks/read", () => ({ listDecksWithStats: async () => [] }));
vi.mock("../../lib/decks/folders", () => ({ listFolders: async () => [] }));
vi.mock("../../lib/decks/shopping-rollup", () => ({ loadShoppingRollup: async () => ({}) }));
vi.mock("../../lib/recs/ranked-list", () => ({ getRankedList: async () => null }));
vi.mock("../../lib/home/summary", () => ({ getCollectionStats: async () => ({ totalCards: 0, uniqueCards: 0 }) }));
vi.mock("../../lib/precons/summary", () => ({ readPreconSummary: async () => null }));
vi.mock("../../lib/lineup/cached", () => ({ readLineupCached: async () => null }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));

const { default: DecksPage } = await import("./page");
const { DecksView } = await import("../../components/decks/decks-view");

const visit = async () =>
  (await DecksPage({ searchParams: Promise.resolve({}) })) as ReactElement<{ helpMeChoose?: boolean }>;

beforeEach(() => {
  stub.env = {};
});

describe("/decks' zero-state door (discovery R3 E1)", () => {
  it("hands the view HELP_ME_CHOOSE_ENABLED on", async () => {
    stub.env = { HELP_ME_CHOOSE_ENABLED: "true" };
    const page = await visit();
    expect(page.type).toBe(DecksView);
    expect(page.props.helpMeChoose).toBe(true);
  });

  it("hands it off for anything but the switch on", async () => {
    expect((await visit()).props.helpMeChoose).toBe(false);
    stub.env = { HELP_ME_CHOOSE_ENABLED: "off" };
    expect((await visit()).props.helpMeChoose).toBe(false);
  });
});
