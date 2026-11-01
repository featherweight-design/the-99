// The shell's half of the Home badge (menu and Home PR 6): Home's count is the feed's unseen items, read per request, and a failed read draws no badge rather than breaking the page. Friends' count is
// PR 7's (shell.test.tsx); here it reads none, so every bar carries Friends' zero beside Home's count.
import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

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
const unseenCount = vi.hoisted(() => vi.fn());
vi.mock("../../lib/home/summary", () => ({ getCollectionStats: async () => ({ uniqueCards: 5 }), hasAnyDeck: async () => true }));
vi.mock("../../lib/switches/request", () => ({ requestSwitchEnv: async () => state.env }));
vi.mock("../../lib/feed/read", () => ({ unseenCount, unseenFriendsCount: async () => 0 }));
// The Friends badge's reads, made on every signed-in render now that Friends is always in the bar: none here.
vi.mock("../../lib/social/spare-requests", () => ({ waitingAsksCount: async () => 0 }));
vi.mock("../../lib/social/trade-match", () => ({ noticeTradeMatches: async () => 0 }));
// The seat toast reads the reader's notices through a server action; these suites draw the shell only.
vi.mock("../rule-zero/seat-notice-host", () => ({ SeatNoticeHost: () => null }));
vi.mock("next/server", async (importOriginal) => ({ ...(await importOriginal<typeof import("next/server")>()), after: () => {} }));
const seen = vi.hoisted(() => ({ rail: undefined as unknown, tab: undefined as unknown, icon: undefined as unknown }));
vi.mock("../push/app-badge", () => ({ AppBadge: (p: { badges?: unknown }) => ((seen.icon = p.badges), null) }));
vi.mock("./nav", () => ({
  NavRail: (p: { badges?: unknown }) => ((seen.rail = p.badges), null),
  TabBar: (p: { badges?: unknown }) => ((seen.tab = p.badges), null),
  MobileHeader: () => null,
}));

const Shell = (await import("./shell")).default;
const NONE = { friends: 0, friendsAt: expect.any(String) };
const { DEFAULT_THEME } = await import("../../lib/theme/themes");

async function renderShell() {
  render(await Shell({ children: <p>page</p>, theme: DEFAULT_THEME }));
}

afterEach(() => {
  state.env = {} as NodeJS.ProcessEnv;
  seen.icon = undefined;
  unseenCount.mockReset();
});

describe("Shell and the Home badge", () => {
  it("hands both bars no badge when nothing is unseen", async () => {
    unseenCount.mockResolvedValue(0);
    await renderShell();
    expect(seen.rail).toEqual(NONE);
    expect(seen.tab).toEqual(NONE);
  });

  it("hands both bars the unseen count", async () => {
    unseenCount.mockResolvedValue(3);
    await renderShell();
    expect(unseenCount).toHaveBeenCalledWith("user_1", state.env);
    expect(seen.rail).toEqual({ ...NONE, home: 3 });
    expect(seen.tab).toEqual({ ...NONE, home: 3 });
  });

  it("draws no badge when the count cannot be read, and the page still renders", async () => {
    unseenCount.mockRejectedValue(new Error("down"));
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    await renderShell();
    expect(seen.rail).toEqual(NONE);
    err.mockRestore();
  });
});

describe("Shell and the app icon's badge (push PR 5, G6)", () => {
  const PUSH = { PUSH_ENABLED: "true" };

  it("hands the icon the bars' own counts with the switch on", async () => {
    state.env = { ...PUSH } as unknown as NodeJS.ProcessEnv;
    unseenCount.mockResolvedValue(3);
    await renderShell();
    expect(seen.icon).toEqual({ ...NONE, home: 3 });
    expect(seen.icon).toBe(seen.tab);
  });

  it("mounts no badge with the switch off", async () => {
    unseenCount.mockResolvedValue(3);
    state.env = { ...PUSH, PUSH_ENABLED: "" } as unknown as NodeJS.ProcessEnv;
    await renderShell();
    expect(seen.icon).toBeUndefined();
  });
});
