// /settings (menu and Home PR 3 and 4): Notifications comes first, then Spares and Your decks; the collection list is
// read only when a card is kept back.
import { describe, expect, it, vi, beforeEach } from "vitest";

const m = vi.hoisted(() => ({
  env: {} as Record<string, string>,
  loadCollectionList: vi.fn(),
  loadKeptBack: vi.fn(),
  loadNewsSettings: vi.fn(),
  readSpareMin: vi.fn(async () => 2),
}));
vi.mock("../../lib/auth", () => ({ requireUserId: async () => "user_me" }));
vi.mock("../../lib/switches/request", () => ({ requestSwitchEnv: async () => m.env }));
vi.mock("../../lib/social/spares", () => ({ listSharedPods: async () => [{ podId: "p1", name: "Thursday pod" }] }));
vi.mock("../../lib/social/deck-visibility", () => ({ loadFriendDeckPrefs: async () => ({ seeDecks: true, seeUnfinished: false }) }));
vi.mock("../../lib/social/spare-settings", () => ({ readSpareMin: m.readSpareMin, loadKeptBack: m.loadKeptBack }));
vi.mock("../../lib/collection/payload", () => ({ loadCollectionList: m.loadCollectionList }));
vi.mock("../../lib/feed/prefs", () => ({ loadNewsSettings: m.loadNewsSettings }));
vi.mock("../../components/settings/spares-section", () => ({ SparesSection: () => null }));
vi.mock("../../components/settings/friend-decks-section", () => ({ FriendDecksSection: () => null }));
vi.mock("../../components/settings/news-section", () => ({ NewsSection: () => null }));

import SettingsPage from "./page";
import { NewsSection } from "../../components/settings/news-section";
import { SparesSection } from "../../components/settings/spares-section";
import { FriendDecksSection } from "../../components/settings/friend-decks-section";

type El = { type: unknown; props: Record<string, unknown> };
// The view's children, false/null (a section not mounted) left out.
const sections = (el: unknown): El[] => ([] as unknown[]).concat((el as El).props.children).filter(Boolean) as El[];
const spares = (el: unknown) => sections(el).find((c) => c.type === SparesSection);
const news = (el: unknown) => sections(el).find((c) => c.type === NewsSection);

beforeEach(() => {
  vi.clearAllMocks();
  m.loadKeptBack.mockResolvedValue([]);
  m.loadCollectionList.mockResolvedValue({ cards: [], pricesFailed: false });
  m.loadNewsSettings.mockResolvedValue([{ kind: "new-set", on: true }]);
});

describe("/settings", () => {
  it("draws news first, then Spares, then Your decks", async () => {
    const el = await SettingsPage();
    expect(sections(el).map((c) => c.type)).toEqual([NewsSection, SparesSection, FriendDecksSection]);
    expect(news(el)!.props.kinds).toEqual([{ kind: "new-set", on: true }]);
  });

  it("draws the Spares section with the reader's threshold and shared pods", async () => {
    const el = await SettingsPage();
    const section = spares(el)!;
    expect(section.props.spareMin).toBe(2);
    expect(section.props.pods).toEqual(["Thursday pod"]);
    expect(m.loadCollectionList).not.toHaveBeenCalled();
  });

  it("reads the collection list when a card is kept back", async () => {
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
