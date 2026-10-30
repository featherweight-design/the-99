// /settings (menu and Home PR 3 and 4): the route does not exist while BOTH SOCIAL_FRIENDS_ENABLED and HOME_FEED_ENABLED
// are off for the reader; Notifications comes first, Spares only with Friends on; the collection list is read only
// when a card is kept back.
import { describe, expect, it, vi, beforeEach } from "vitest";

const m = vi.hoisted(() => ({
  env: {} as Record<string, string>,
  notFound: vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); }),
  loadCollectionList: vi.fn(),
  loadKeptBack: vi.fn(),
  loadNewsSettings: vi.fn(),
  readSpareMin: vi.fn(async () => 2),
}));
vi.mock("next/navigation", () => ({ notFound: m.notFound }));
vi.mock("../../lib/auth", () => ({ requireUserId: async () => "user_me" }));
vi.mock("../../lib/switches/request", () => ({ requestSwitchEnv: async () => m.env }));
vi.mock("../../lib/social/spares", () => ({ listSharedPods: async () => [{ podId: "p1", name: "Thursday pod" }] }));
vi.mock("../../lib/social/spare-settings", () => ({ readSpareMin: m.readSpareMin, loadKeptBack: m.loadKeptBack }));
vi.mock("../../lib/collection/payload", () => ({ loadCollectionList: m.loadCollectionList }));
vi.mock("../../lib/feed/prefs", () => ({ loadNewsSettings: m.loadNewsSettings }));
vi.mock("../../components/settings/spares-section", () => ({ SparesSection: () => null }));
vi.mock("../../components/settings/news-section", () => ({ NewsSection: () => null }));

import SettingsPage from "./page";
import { NewsSection } from "../../components/settings/news-section";
import { SparesSection } from "../../components/settings/spares-section";

type El = { type: unknown; props: Record<string, unknown> };
// The view's children, false/null (a section not mounted) left out.
const sections = (el: unknown): El[] => ([] as unknown[]).concat((el as El).props.children).filter(Boolean) as El[];
const spares = (el: unknown) => sections(el).find((c) => c.type === SparesSection);
const news = (el: unknown) => sections(el).find((c) => c.type === NewsSection);

beforeEach(() => {
  vi.clearAllMocks();
  m.loadKeptBack.mockResolvedValue([]);
  m.loadCollectionList.mockResolvedValue({ cards: [], pricesFailed: false });
  m.loadNewsSettings.mockImplementation(async (_u: string, env: Record<string, string>) =>
    env.HOME_FEED_ENABLED === "true" ? [{ kind: "new-set", on: true }] : []);
});

describe("/settings", () => {
  it("404s with Friends and the Home feed both off for the reader", async () => {
    m.env = {};
    await expect(SettingsPage()).rejects.toThrow("NEXT_NOT_FOUND");
    expect(m.loadNewsSettings).not.toHaveBeenCalled();
  });

  it("draws the news section alone with only the Home feed on, reading nothing for Spares", async () => {
    m.env = { HOME_FEED_ENABLED: "true" };
    const el = await SettingsPage();
    expect(sections(el).map((c) => c.type)).toEqual([NewsSection]);
    expect(news(el)!.props.kinds).toEqual([{ kind: "new-set", on: true }]);
    expect(m.readSpareMin).not.toHaveBeenCalled();
    expect(m.loadKeptBack).not.toHaveBeenCalled();
  });

  it("draws news first, then Spares, with both on", async () => {
    m.env = { HOME_FEED_ENABLED: "true", SOCIAL_FRIENDS_ENABLED: "true" };
    const el = await SettingsPage();
    expect(sections(el).map((c) => c.type)).toEqual([NewsSection, SparesSection]);
  });

  it("draws the Spares section with the reader's threshold and shared pods; news gets no kinds with the feed off", async () => {
    m.env = { SOCIAL_FRIENDS_ENABLED: "true" };
    const el = await SettingsPage();
    expect(news(el)!.props.kinds).toEqual([]);
    const section = spares(el)!;
    expect(section.props.spareMin).toBe(2);
    expect(section.props.pods).toEqual(["Thursday pod"]);
    expect(m.loadCollectionList).not.toHaveBeenCalled();
  });

  it("reads the collection list when a card is kept back", async () => {
    m.env = { SOCIAL_FRIENDS_ENABLED: "true" };
    m.loadKeptBack.mockResolvedValue([{
      oracleId: "11111111-1111-4111-8111-111111111111", name: "Sol Ring", typeLine: "Artifact", manaCost: "{1}",
      rarity: "uncommon", colorIdentity: [], imageUri: null, layout: "normal",
    }]);
    const el = await SettingsPage();
    const kept = spares(el)!.props.kept as { quantity: number }[];
    expect(m.loadCollectionList).toHaveBeenCalledWith("user_me");
    expect(kept.map((k) => k.quantity)).toEqual([0]);
  });
});
