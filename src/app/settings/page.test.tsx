// /settings (menu and Home PR 3): the route does not exist while SOCIAL_FRIENDS_ENABLED is off for the reader (it holds
// nothing else yet), and reads the collection list only when a card is kept back.
import { describe, expect, it, vi, beforeEach } from "vitest";

const m = vi.hoisted(() => ({
  env: {} as Record<string, string>,
  notFound: vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); }),
  loadCollectionList: vi.fn(),
  loadKeptBack: vi.fn(),
}));
vi.mock("next/navigation", () => ({ notFound: m.notFound }));
vi.mock("../../lib/auth", () => ({ requireUserId: async () => "user_me" }));
vi.mock("../../lib/switches/request", () => ({ requestSwitchEnv: async () => m.env }));
vi.mock("../../lib/social/spares", () => ({ listSharedPods: async () => [{ podId: "p1", name: "Thursday pod" }] }));
vi.mock("../../lib/social/spare-settings", () => ({ readSpareMin: async () => 2, loadKeptBack: m.loadKeptBack }));
vi.mock("../../lib/collection/payload", () => ({ loadCollectionList: m.loadCollectionList }));
vi.mock("../../components/settings/spares-section", () => ({ SparesSection: () => null }));

import SettingsPage from "./page";

beforeEach(() => {
  vi.clearAllMocks();
  m.loadKeptBack.mockResolvedValue([]);
  m.loadCollectionList.mockResolvedValue({ cards: [], pricesFailed: false });
});

describe("/settings", () => {
  it("404s with Friends off for the reader", async () => {
    m.env = {};
    await expect(SettingsPage()).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("draws the Spares section with the reader's threshold and shared pods", async () => {
    m.env = { SOCIAL_FRIENDS_ENABLED: "true" };
    const el = await SettingsPage();
    const section = (el.props as { children: { props: Record<string, unknown> } }).children;
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
    const section = (el.props as { children: { props: { kept: { quantity: number }[] } } }).children;
    expect(m.loadCollectionList).toHaveBeenCalledWith("user_me");
    expect(section.props.kept.map((k) => k.quantity)).toEqual([0]);
  });
});
