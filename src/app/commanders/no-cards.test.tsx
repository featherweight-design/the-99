// `/commanders` and `/discover` at zero cards (no-collection entry, Open 7): with NO_COLLECTION_ENTRY_ENABLED each
// reads `Nothing to rank yet`, its own body and `Add your cards`, from its copy key; without it, the shipped words.
// The button goes to /collection either way.
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";

const env = vi.hoisted(() => ({ value: {} as unknown as NodeJS.ProcessEnv }));
vi.mock("../../lib/auth", () => ({ requireUserId: async () => "user_1" }));
vi.mock("../../lib/switches/request", () => ({ requestSwitchEnv: async () => env.value }));
vi.mock("../../lib/home/summary", () => ({
  getCollectionStats: async () => ({ uniqueCards: 0, totalCards: 0 }),
  listRecentDecks: async () => [],
}));
vi.mock("../../lib/commanders/avail-pref", () => ({ readCommandersAvail: async () => null }));
vi.mock("../../lib/sets/lane-printed-in", () => ({
  loadCommanderPrintings: () => Promise.resolve(null),
  lanePrintedInFor: async () => null,
}));
vi.mock("../../lib/commanders/rankings", () => ({
  commanderRankingsKey: () => ["commander-rankings"],
  loadCommanderRankings: async () => ({}),
}));
vi.mock("../../lib/cache/user-lists", () => ({ cacheForUser: async () => ({}) }));
vi.mock("./actions", () => ({ retryRecs: async () => {} }));
vi.mock("../../lib/discovery/payload", () => ({ loadDiscoveryPayload: async () => ({}) }));
vi.mock("../../components/commanders/discovery-view", () => ({ DiscoveryView: () => null }));
vi.mock("../../components/commanders/commanders-view", () => ({ CommandersView: () => null }));

const { default: CommandersPage } = await import("./page");
const { default: DiscoverPage } = await import("../discover/page");

const ON = { NO_COLLECTION_ENTRY_ENABLED: "true", COLLECTION_EDIT_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;

afterEach(() => {
  env.value = {} as NodeJS.ProcessEnv;
});

async function draw(page: typeof CommandersPage) {
  render((await page({ searchParams: Promise.resolve({}) })) as ReactElement);
}

describe("the rankers at zero cards, with the no-collection entry on", () => {
  it("/commanders says there is nothing to rank yet and sends the player to add cards", async () => {
    env.value = ON;
    await draw(CommandersPage);
    expect(screen.getByRole("heading", { name: "Nothing to rank yet" })).toBeInTheDocument();
    expect(
      screen.getByText("We rank commanders from the cards you own. Add some and every one you can build shows up here."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add your cards" })).toHaveAttribute("href", "/collection");
    expect(screen.queryByText("No collection yet")).toBeNull();
  });

  it("/discover names what it ranks in its own body", async () => {
    env.value = ON;
    await draw(DiscoverPage);
    expect(screen.getByRole("heading", { name: "Nothing to rank yet" })).toBeInTheDocument();
    expect(
      screen.getByText("Discover finds commanders your cards are close to building. Add some and they show up here."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add your cards" })).toHaveAttribute("href", "/collection");
  });
});

describe("the rankers at zero cards, with the switch off", () => {
  // Collection editing alone does not turn the line on: the line's own switch needs it, not the reverse.
  for (const off of [{}, { COLLECTION_EDIT_ENABLED: "true" }, { NO_COLLECTION_ENTRY_ENABLED: "true" }]) {
    for (const [name, page] of [
      ["/commanders", CommandersPage],
      ["/discover", DiscoverPage],
    ] as const) {
      it(`${name} keeps the shipped words and link under ${JSON.stringify(off)}`, async () => {
        env.value = off as unknown as NodeJS.ProcessEnv;
        await draw(page);
        expect(screen.getByRole("heading", { name: "No collection yet" })).toBeInTheDocument();
        expect(screen.getByText("Upload your cards and we’ll rank every commander you can build.")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Upload collection" })).toHaveAttribute("href", "/collection");
        expect(screen.queryByText("Nothing to rank yet")).toBeNull();
      });
    }
  }
});
