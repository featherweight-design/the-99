// The shell: what it mounts around every page (the locked tab bar's height, the Friends badge, the menus' doors).
// The one-time About sheet it once mounted retired with About visual PR 6b.

import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let requestHeaders = new Headers();
vi.mock("next/headers", () => ({ headers: async () => requestHeaders }));
vi.mock("../../lib/moments/spent", () => ({ readSpentMoments: async () => [] }));
vi.mock("../../lib/social/after-game", () => ({ friendsAfterGameDue: async () => false }));
// The navigation-pending provider runs code-started pushes, so it reads the router; this suite
// renders it outside an app router, where the real hook throws.
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push: () => {} }),
}));
let signedInUser: string | null = "user_1";
// Set to make `auth()` throw, as Clerk does where the proxy never ran (a dotted 404, THE-99-1).
let authError: Error | null = null;
vi.mock("@clerk/nextjs/server", () => ({
  auth: async () => {
    if (authError) throw authError;
    return { userId: signedInUser };
  },
}));
let uniqueCards = 5;
vi.mock("../../lib/home/summary", () => ({ getCollectionStats: async () => ({ uniqueCards }) }));
// The props each menu's call site is handed, so the Friends row's switch can be read off them.
const navProps = vi.hoisted(() => [] as Record<string, unknown>[]);
vi.mock("./nav", () => ({
  NavRail: (p: Record<string, unknown>) => (navProps.push(p), null),
  TabBar: () => null,
  MobileHeader: (p: Record<string, unknown>) => (navProps.push(p), null),
}));
// The Friends badge (menu and Home PR 7): its count and the after() notice, read off the calls.
const feed = vi.hoisted(() => ({ unseenFriendsCount: vi.fn(async (..._a: unknown[]) => 3), noticeTradeMatches: vi.fn(async (..._a: unknown[]) => 0), after: vi.fn((_fn: () => unknown) => {}) }));
vi.mock("../../lib/feed/read", () => ({ unseenFriendsCount: feed.unseenFriendsCount, unseenCount: async () => 0 }));
vi.mock("../../lib/social/trade-match", () => ({ noticeTradeMatches: feed.noticeTradeMatches }));
vi.mock("next/server", async (importOriginal) => ({ ...(await importOriginal<typeof import("next/server")>()), after: feed.after }));

const Shell = (await import("./shell")).default;
const { DEFAULT_THEME } = await import("../../lib/theme/themes");
const { switchBits } = await import("../../lib/switches/resolve");

describe("Shell on a path the proxy never ran on (THE-99-1)", () => {
  it("draws the page signed out instead of throwing Clerk's error", async () => {
    authError = new Error("Clerk: auth() was called but Clerk can't detect usage of clerkMiddleware(). Please ensure the following:");
    try {
      await renderShell();
      expect(screen.getByText("page")).toBeTruthy();
    } finally {
      authError = null;
    }
  });
});

async function renderShell() {
  render(await Shell({ children: <p>page</p>, theme: DEFAULT_THEME }));
}

beforeEach(() => {
  requestHeaders = new Headers();
});
afterEach(() => {
  uniqueCards = 5;
  signedInUser = "user_1";
});

describe("Shell and the retired About sheet (About visual PR 6b)", () => {
  it("mounts no sheet, whatever a request's headers say", async () => {
    requestHeaders = new Headers({ "x-about-sheet-on": "1", "x-about-sheet": "0" });
    await renderShell();
    expect(document.querySelector("[data-about-sheet]")).toBeNull();
    expect(screen.queryByRole("region", { name: /^(New in About|About The\s99)$/ })).toBeNull();
  });
});

// The lock's tab bar is 88px (first-run-locked-nav 4.1). Set on the shell's
// wrapper, so the bar and every surface reserving its height read one figure.
describe("Shell and the locked tab bar height", () => {
  it("sets --tabbar-h to 88px while locked, around the bar and the main column", async () => {
    uniqueCards = 0;
    await renderShell();
    const main = screen.getByText("page").closest("main")!;
    const wrapper = main.closest<HTMLElement>("[style]")!;
    expect(wrapper.style.getPropertyValue("--tabbar-h")).toBe("88px");
    // The reserve is on the column <main> sits in (the Fan Content notice, a sibling of <main>, sits above it), not on <main>.
    expect(main.className).not.toContain("pb-[calc(var(--tabbar-h)");
    expect(main.parentElement!.className).toContain("pb-[var(--tabbar-h)]");
    // Outside the pending provider, whose loading overlay renders beside the shell rather than
    // inside it: that overlay has to read the same 88px or its foot sits under the bar.
    expect(wrapper.className).toBe("contents");
    expect(wrapper.parentElement?.closest("[style*='--tabbar-h']") ?? null).toBeNull();
  });

  it("leaves the global 74px alone once unlocked", async () => {
    await renderShell();
    const main = screen.getByText("page").closest("main")!;
    expect(main.closest<HTMLElement>("[style*='--tabbar-h']")).toBeNull();
  });
});

describe("Shell and the Friends row (Social R1)", () => {
  it.each([[true], [false]])("hands both menus the reader's own switch (%s)", async (on) => {
    navProps.length = 0;
    requestHeaders = new Headers({ "x-switches": switchBits((on ? { SOCIAL_FRIENDS_ENABLED: "true" } : {}) as NodeJS.ProcessEnv) });
    await renderShell();
    expect(navProps).toHaveLength(2);
    for (const p of navProps) expect(p.friends).toBe(on);
  });
});

describe("Shell and the Friends badge (menu and Home PR 7)", () => {
  const as = (env: Record<string, string>) => new Headers({ "x-switches": switchBits(env as unknown as NodeJS.ProcessEnv) });

  it("counts the unseen trade matches onto the Friends slot, and notices new ones after the response", async () => {
    navProps.length = 0;
    feed.unseenFriendsCount.mockClear();
    feed.after.mockClear();
    feed.noticeTradeMatches.mockClear();
    requestHeaders = as({ SOCIAL_FRIENDS_ENABLED: "true" });
    await renderShell();
    expect(feed.unseenFriendsCount).toHaveBeenCalledWith("user_1", expect.anything());
    expect(navProps.some((n) => "badges" in n)).toBe(true);
    for (const p of navProps.filter((n) => "badges" in n)) expect(p.badges).toEqual({ friends: 3, friendsAt: expect.any(String) });
    expect(feed.noticeTradeMatches).not.toHaveBeenCalled();
    await feed.after.mock.calls[0][0]();
    expect(feed.noticeTradeMatches).toHaveBeenCalledWith("user_1", expect.anything());
  });

  it.each([
    ["Friends is off", {}],
  ])("reads no count and notices nothing while %s", async (_label, env) => {
    navProps.length = 0;
    feed.unseenFriendsCount.mockClear();
    feed.after.mockClear();
    requestHeaders = as(env);
    await renderShell();
    expect(feed.unseenFriendsCount).not.toHaveBeenCalled();
    expect(feed.after).not.toHaveBeenCalled();
    for (const p of navProps.filter((n) => "badges" in n)) expect(p.badges).toEqual({});
  });
});

// The Fan Content notice (launch epic A1): two mounts, one per branch, and nowhere else.
describe("Shell and the Fan Content notice", () => {
  it("mounts it once in the signed-in column, a sibling AFTER <main>, inside the column that holds the tab-bar reserve", async () => {
    await renderShell();
    const notices = document.querySelectorAll("[data-fan-content-notice]");
    expect(notices).toHaveLength(1);
    const notice = notices[0];
    const main = screen.getByText("page").closest("main")!;
    expect(notice.parentElement).toBe(main.parentElement);
    expect(main.contains(notice)).toBe(false);
    expect(main.compareDocumentPosition(notice) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(notice.tagName).toBe("FOOTER");
    // The notice is the column's footer landmark, not <main>'s: it is not inside the element the pending screen makes inert.
    expect(main.querySelector("footer[data-fan-content-notice]")).toBeNull();
  });

  it("makes <main> at least a screen tall, so the notice starts at or below the fold, and ignores the header height from md", async () => {
    await renderShell();
    const main = screen.getByText("page").closest("main")!;
    expect(main.className).toContain("min-h-[calc(100dvh-var(--header-h,79px)-var(--tabbar-h))]");
    expect(main.className).toContain("md:min-h-dvh");
  });

  it("mounts it once, centered, after the page in the bare signed-out branch, and nothing else is drawn around the page", async () => {
    signedInUser = null;
    render(await Shell({ children: <p>page</p>, theme: DEFAULT_THEME }));
    const notices = document.querySelectorAll("[data-fan-content-notice]");
    expect(notices).toHaveLength(1);
    expect(screen.getByText("page").compareDocumentPosition(notices[0]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(notices[0].querySelector("div")!.className).toContain("text-center");
    expect(document.querySelector("main")).toBeNull();
    // The page sits in a full-viewport column so a short one (the error fallback) still pushes the notice below the fold.
    expect(screen.getByText("page").parentElement!.className).toContain("min-h-dvh");
    expect(screen.getByText("page").parentElement!.contains(notices[0])).toBe(false);
  });
});

