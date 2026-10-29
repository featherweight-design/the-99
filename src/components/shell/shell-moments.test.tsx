// The shell's half of M12 (discovery R1, PR 4): it reads whether the reader has a deck only while Help me choose is live
// and unspent, and hands the rail and the tab bar `helpMoment` for a reader with none.
import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  usePathname: () => "/commanders",
  useRouter: () => ({ push: () => {} }),
}));
vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ userId: "user_1" }) }));
const state = vi.hoisted(() => ({ hasDecks: false, spent: [] as string[], env: {} as NodeJS.ProcessEnv }));
const hasAnyDeck = vi.fn(async () => state.hasDecks);
vi.mock("../../lib/home/summary", () => ({
  getCollectionStats: async () => ({ uniqueCards: 5 }),
  hasAnyDeck: (...a: unknown[]) => hasAnyDeck(...(a as [])),
}));
vi.mock("../../lib/moments/spent", () => ({ readSpentMoments: async () => state.spent }));
vi.mock("../../lib/social/after-game", () => ({ friendsAfterGameDue: async () => false }));
vi.mock("../../lib/switches/request", () => ({ requestSwitchEnv: async () => state.env }));
const seen = vi.hoisted(() => ({ rail: undefined as unknown, tab: undefined as unknown }));
vi.mock("./nav", () => ({
  NavRail: (p: { helpMoment?: boolean }) => ((seen.rail = p.helpMoment), null),
  TabBar: (p: { helpMoment?: boolean }) => ((seen.tab = p.helpMoment), null),
  MobileHeader: () => null,
}));

const Shell = (await import("./shell")).default;
const { DEFAULT_THEME } = await import("../../lib/theme/themes");
const ON = { HELP_ME_CHOOSE_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;

async function renderShell() {
  render(await Shell({ children: <p>page</p>, theme: DEFAULT_THEME }));
}

afterEach(() => {
  Object.assign(state, { hasDecks: false, spent: [], env: {} });
  hasAnyDeck.mockClear();
});

describe("Shell and Help me choose's moment", () => {
  it("hands both bars the moment for a reader with no deck", async () => {
    state.env = ON;
    await renderShell();
    expect(seen.rail).toBe(true);
    expect(seen.tab).toBe(true);
  });

  it("withholds it from a reader with a deck", async () => {
    state.env = ON;
    state.hasDecks = true;
    await renderShell();
    expect(seen.rail).toBe(false);
    expect(seen.tab).toBe(false);
  });

  it("reads no deck once the moment is spent, or while it is not live", async () => {
    state.env = ON;
    state.spent = ["help-me-choose"];
    await renderShell();
    expect(seen.rail).toBe(false);
    state.spent = [];
    state.env = {} as unknown as NodeJS.ProcessEnv;
    await renderShell();
    expect(seen.tab).toBe(false);
    expect(hasAnyDeck).not.toHaveBeenCalled();
  });
});
