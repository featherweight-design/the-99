// The shell's half of the open lock (no-collection entry, call 6): it hands the nav `openLock` only while locked
// with the line's switch on, and reads the deck probe only then, so every other render keeps the shipped reads.
import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("../../lib/moments/spent", () => ({ readSpentMoments: async () => [] }));
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push: () => {} }),
}));
vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ userId: "user_1" }) }));
const state = vi.hoisted(() => ({ uniqueCards: 0, hasDecks: false, env: {} as NodeJS.ProcessEnv }));
const hasAnyDeck = vi.fn(async () => state.hasDecks);
vi.mock("../../lib/home/summary", () => ({
  getCollectionStats: async () => ({ uniqueCards: state.uniqueCards }),
  hasAnyDeck: (...a: unknown[]) => hasAnyDeck(...(a as [])),
}));
vi.mock("../../lib/switches/request", () => ({ requestSwitchEnv: async () => state.env }));
const seen = vi.hoisted(() => ({ rail: undefined as unknown, tab: undefined as unknown }));
vi.mock("./nav", () => ({
  NavRail: (p: { openLock?: unknown }) => ((seen.rail = p.openLock), null),
  TabBar: (p: { openLock?: unknown }) => ((seen.tab = p.openLock), null),
  MobileHeader: () => null,
}));

const Shell = (await import("./shell")).default;
const { DEFAULT_THEME } = await import("../../lib/theme/themes");
const ON = { COLLECTION_EDIT_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;

async function renderShell() {
  render(await Shell({ children: <p>page</p>, theme: DEFAULT_THEME }));
}

afterEach(() => {
  Object.assign(state, { uniqueCards: 0, hasDecks: false, env: {} });
  hasAnyDeck.mockClear();
});

describe("Shell and the open lock", () => {
  it("opens the lock on first run (no cards, no decks) with the switch on", async () => {
    state.env = ON;
    await renderShell();
    expect(seen.rail).toEqual({ hasDecks: false });
    expect(seen.tab).toEqual({ hasDecks: false });
  });

  it("says so when the account has a deck", async () => {
    state.env = ON;
    state.hasDecks = true;
    await renderShell();
    expect(seen.rail).toEqual({ hasDecks: true });
  });

  it("hands the shipped lock (null) and reads no deck with collection editing off", async () => {
    for (const env of [{}]) {
      state.env = env as unknown as NodeJS.ProcessEnv;
      await renderShell();
      expect(seen.rail).toBeNull();
      expect(seen.tab).toBeNull();
    }
    expect(hasAnyDeck).not.toHaveBeenCalled();
  });

  it("reads no deck once a card lands", async () => {
    state.env = ON;
    state.uniqueCards = 3;
    await renderShell();
    expect(seen.rail).toBeNull();
    expect(hasAnyDeck).not.toHaveBeenCalled();
  });
});
