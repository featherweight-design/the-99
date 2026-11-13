// The account button's face (friends link G9): under the friend links switch the shell reads the player's own display
// name and signature art and hands them to both menus; off, or on a failed read, it reads nothing and hands none.
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("../../lib/moments/spent", () => ({ readSpentMoments: async () => [] }));
vi.mock("../../lib/social/after-game", () => ({ friendsAfterGameDue: async () => false }));
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  usePathname: () => "/decks",
  useRouter: () => ({ push: () => {} }),
}));
vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ userId: "user_1" }) }));
const state = vi.hoisted(() => ({ env: {} as NodeJS.ProcessEnv }));
vi.mock("../../lib/home/summary", () => ({ getCollectionStats: async () => ({ uniqueCards: 5 }), hasAnyDeck: async () => true }));
vi.mock("../../lib/flags/request", () => ({ requestFlags: async () => state.env }));
vi.mock("../../lib/feed/read", () => ({ unseenCount: async () => 0, unseenFriendsCount: async () => 0 }));
vi.mock("../../lib/social/spare-requests", () => ({ waitingAsksCount: async () => 0 }));
vi.mock("../../lib/social/friend-requests", () => ({ waitingFriendRequestsCount: async () => 0 }));
vi.mock("../../lib/social/trade-match", () => ({ noticeTradeMatches: async () => 0 }));
const face = vi.hoisted(() => vi.fn());
vi.mock("../../lib/social/friends", () => ({ ownHeaderFace: face }));
vi.mock("../rule-zero/seat-notice-host", () => ({ SeatNoticeHost: () => null }));
vi.mock("next/server", async (importOriginal) => ({ ...(await importOriginal<typeof import("next/server")>()), after: () => {} }));
const seen = vi.hoisted(() => ({ rail: undefined as unknown, header: undefined as unknown }));
vi.mock("./nav", () => ({
  NavRail: (p: { face?: unknown }) => ((seen.rail = p.face), null),
  TabBar: () => null,
  MobileHeader: (p: { face?: unknown }) => ((seen.header = p.face), null),
}));

const Shell = (await import("./shell")).default;
const { DEFAULT_THEME } = await import("../../lib/theme/themes");

async function renderShell() {
  render(await Shell({ children: <p>page</p>, theme: DEFAULT_THEME }));
}

const WREN = { name: "Wren Calloway", art: "https://cards.scryfall.io/art_crop/w.jpg" };

beforeEach(() => {
  face.mockReset();
  seen.rail = seen.header = undefined;
});

describe("the shell's account face", () => {
  it("hands both menus the player's own face with friend links on", async () => {
    state.env = { FRIEND_LINKS_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;
    face.mockResolvedValue(WREN);
    await renderShell();
    expect(face).toHaveBeenCalledWith("user_1");
    expect(seen.rail).toEqual(WREN);
    expect(seen.header).toEqual(WREN);
  });

  it("reads nothing and hands no face with friend links off", async () => {
    state.env = {} as NodeJS.ProcessEnv;
    await renderShell();
    expect(face).not.toHaveBeenCalled();
    expect(seen.rail).toBeNull();
    expect(seen.header).toBeNull();
  });

  it("hands no face when the read fails (the menu keeps Clerk's name), and the page still renders", async () => {
    state.env = { FRIEND_LINKS_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;
    face.mockRejectedValue(new Error("down"));
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    await renderShell();
    expect(screen.getByText("page")).toBeTruthy();
    expect(seen.rail).toBeNull();
    expect(seen.header).toBeNull();
    err.mockRestore();
  });
});
