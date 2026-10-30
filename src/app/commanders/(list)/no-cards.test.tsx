// `/commanders` and `/discover` at zero cards (no-collection entry, Open 7): each reads `Nothing to rank yet`, its own
// body and `Add your cards`, from its copy key. The button goes to /collection.
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";

const env = vi.hoisted(() => ({ value: {} as unknown as NodeJS.ProcessEnv }));
vi.mock("../../../lib/auth", () => ({ requireUserId: async () => "user_1" }));
vi.mock("../../../lib/switches/request", () => ({ requestSwitchEnv: async () => env.value }));
vi.mock("../../../lib/home/summary", () => ({
  getCollectionStats: async () => ({ uniqueCards: 0, totalCards: 0 }),
  listRecentDecks: async () => [],
}));
vi.mock("../../../lib/commanders/avail-pref", () => ({ readCommandersAvail: async () => null }));
vi.mock("../../../lib/sets/lane-printed-in", () => ({
  loadCommanderPrintings: () => Promise.resolve(null),
  lanePrintedInFor: async () => null,
}));
vi.mock("../../../lib/commanders/rankings", () => ({
  commanderRankingsKey: () => ["commander-rankings"],
  loadCommanderRankings: async () => ({}),
}));
vi.mock("../../../lib/cache/user-lists", () => ({ cacheForUser: async () => ({}) }));
vi.mock("../actions", () => ({ retryRecs: async () => {} }));
vi.mock("../../../lib/discovery/payload", () => ({ loadDiscoveryPayload: async () => ({}) }));
vi.mock("../../../components/commanders/discovery-view", () => ({ DiscoveryView: () => null }));
vi.mock("../../../components/commanders/commanders-view", () => ({ CommandersView: () => null }));

const { default: CommandersPage } = await import("./page");
const { default: DiscoverPage } = await import("./discover/page");

afterEach(() => {
  env.value = {} as NodeJS.ProcessEnv;
});

async function draw(page: typeof CommandersPage) {
  render((await page({ searchParams: Promise.resolve({}) })) as ReactElement);
}

describe("the rankers at zero cards", () => {
  it("/commanders says there is nothing to rank yet and sends the player to add cards", async () => {
    await draw(CommandersPage);
    expect(screen.getByRole("heading", { name: "Nothing to rank yet" })).toBeInTheDocument();
    expect(
      screen.getByText("We rank commanders from the cards you own. Add some and every one you can build shows up here."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add your cards" })).toHaveAttribute("href", "/collection");
    expect(screen.queryByText("No collection yet")).toBeNull();
  });

  it("/discover names what it ranks in its own body", async () => {
    await draw(DiscoverPage);
    expect(screen.getByRole("heading", { name: "Nothing to rank yet" })).toBeInTheDocument();
    expect(
      screen.getByText("Discover finds commanders your cards are close to building. Add some and they show up here."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add your cards" })).toHaveAttribute("href", "/collection");
  });
});
