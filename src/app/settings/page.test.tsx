// /settings (menu and Home PR 3 and 4): Notifications comes first, then Spares, Your decks and Account, with Store
// above them all while the store switch is on (store choice, call 1); the collection list is read only when a card is
// kept back.
import { describe, expect, it, vi, beforeEach } from "vitest";

const m = vi.hoisted(() => ({
  env: {} as Record<string, string>,
  loadCollectionList: vi.fn(),
  loadKeptBack: vi.fn(),
  loadNewsSettings: vi.fn(),
  readSpareMin: vi.fn(async () => 2),
  currentUser: vi.fn(),
  ensureSenderProfile: vi.fn(),
  ownDisplayName: vi.fn(),
  readHeldPaid: vi.fn(),
  readPlanFacts: vi.fn(),
  readerStore: vi.fn(async (): Promise<string> => "manapool"),
  readerStoreForPage: vi.fn(async (): Promise<string> => "manapool"),
}));
vi.mock("@clerk/nextjs/server", () => ({ currentUser: m.currentUser }));
vi.mock("../friends/sender-profile", () => ({ ensureSenderProfile: m.ensureSenderProfile }));
vi.mock("../../lib/social/friends", () => ({ ownDisplayName: m.ownDisplayName }));
vi.mock("../../lib/payments/held", () => ({ readHeldPaid: m.readHeldPaid }));
vi.mock("../../lib/payments/plan-read", () => ({ readPlanFacts: m.readPlanFacts }));
vi.mock("../../components/settings/account-section", () => ({ AccountSection: () => null }));
vi.mock("../../lib/auth", () => ({ requireUserId: async () => "user_me" }));
vi.mock("../../lib/flags/request", () => ({ requestFlags: async () => m.env }));
vi.mock("../../lib/social/spares", () => ({ listSharedPods: async () => [{ podId: "p1", name: "Thursday pod" }] }));
vi.mock("../../lib/social/deck-visibility", () => ({ loadFriendDeckPrefs: async () => ({ seeDecks: true, seeUnfinished: false }) }));
vi.mock("../../lib/social/spare-settings", () => ({ readSpareMin: m.readSpareMin, loadKeptBack: m.loadKeptBack }));
vi.mock("../../lib/collection/payload", () => ({ loadCollectionList: m.loadCollectionList }));
vi.mock("../../lib/feed/prefs", () => ({ loadNewsSettings: m.loadNewsSettings }));
vi.mock("../../components/settings/spares-section", () => ({ SparesSection: () => null }));
vi.mock("../../components/settings/friend-decks-section", () => ({ FriendDecksSection: () => null }));
vi.mock("../../lib/wishlist/sync-settings", () => ({ loadWishlistSyncSettings: async () => ({ on: false, decks: [] }) }));
vi.mock("../../components/settings/wishlist-section", () => ({ WishlistSection: () => null }));
vi.mock("../../components/settings/news-section", () => ({ NewsSection: () => null }));
vi.mock("../../components/settings/store-section", () => ({ StoreSection: () => null }));
vi.mock("../../lib/stores/preference", () => ({ readerStore: m.readerStore, readerStoreForPage: m.readerStoreForPage }));

import SettingsPage from "./page";
import { NewsSection } from "../../components/settings/news-section";
import { SparesSection } from "../../components/settings/spares-section";
import { WishlistSection } from "../../components/settings/wishlist-section";
import { FriendDecksSection } from "../../components/settings/friend-decks-section";
import { AccountSection } from "../../components/settings/account-section";
import { StoreSection } from "../../components/settings/store-section";
import { Suspense } from "react";
import { AccountSlot } from "./account-slot";

type El = { type: unknown; props: Record<string, unknown> };
// The view's children, false/null (a section not mounted) left out.
const sections = (el: unknown): El[] => ([] as unknown[]).concat((el as El).props.children).filter(Boolean) as El[];
const spares = (el: unknown) => sections(el).find((c) => c.type === SparesSection);
const news = (el: unknown) => sections(el).find((c) => c.type === NewsSection);

beforeEach(() => {
  vi.clearAllMocks();
  m.env = {};
  m.loadKeptBack.mockResolvedValue([]);
  m.loadCollectionList.mockResolvedValue({ cards: [], pricesFailed: false, comboPairCount: 0 });
  m.loadNewsSettings.mockResolvedValue([{ kind: "new-set", on: true }]);
  m.currentUser.mockResolvedValue({
    passwordEnabled: false,
    primaryEmailAddress: { emailAddress: "wren@example.com" },
    emailAddresses: [{ verification: { status: "verified" } }],
    externalAccounts: [{ provider: "oauth_google" }],
  });
  m.ensureSenderProfile.mockResolvedValue(undefined);
  m.ownDisplayName.mockResolvedValue("Wren Calloway");
  m.readHeldPaid.mockResolvedValue({ plan: 0, pack: 0 });
  m.readPlanFacts.mockResolvedValue(null);
});

describe("/settings", () => {
  it("draws news first, then Spares, then Wishlist, then Your decks, then Account", async () => {
    const el = await SettingsPage();
    expect(sections(el).map((c) => c.type)).toEqual([NewsSection, SparesSection, WishlistSection, FriendDecksSection, Suspense]);
    // Account streams in behind its own boundary: the page never waits on Clerk's read.
    expect((sections(el)[4].props.children as El).type).toBe(AccountSlot);
    expect(m.currentUser).not.toHaveBeenCalled();
    expect(news(el)!.props.kinds).toEqual([{ kind: "new-set", on: true }]);
  });

  it("draws Store first, at the reader's store, while the store switch is on for them (store choice, call 1)", async () => {
    m.env = { STORE_PREFERENCE_ENABLED: "true" };
    m.readerStore.mockResolvedValueOnce("tcgplayer");
    const el = await SettingsPage();
    expect(sections(el).map((c) => c.type)).toEqual([StoreSection, NewsSection, SparesSection, WishlistSection, FriendDecksSection, Suspense]);
    expect(sections(el)[0].props.store).toBe("tcgplayer");
  });

  it("draws no Store section and reads no store for it while the switch is off", async () => {
    const el = await SettingsPage();
    expect(sections(el).some((c) => c.type === StoreSection)).toBe(false);
    expect(m.readerStore).not.toHaveBeenCalled();
  });

  it("draws no Store section, rather than Mana Pool checked, when the store read fails", async () => {
    m.env = { STORE_PREFERENCE_ENABLED: "true" };
    m.readerStore.mockRejectedValueOnce(new Error("db down"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const el = await SettingsPage();
    expect(sections(el).some((c) => c.type === StoreSection)).toBe(false);
    expect(sections(el)[0].type).toBe(NewsSection);
    spy.mockRestore();
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
    expect(m.loadCollectionList).toHaveBeenCalledWith("user_me", "manapool");
    expect(kept.map((k) => k.quantity)).toEqual([0]);
  });

  it("hands Account the reader's stored name and Clerk's email and methods, making no profile when one exists", async () => {
    const el = (await AccountSlot({ userId: "user_me" })) as unknown as El;
    expect(el.type).toBe(AccountSection);
    expect(el.props.facts).toEqual({ name: "Wren Calloway", email: "wren@example.com", methods: ["google", "code"], held: { plan: 0, pack: 0 }, planLive: false });
    expect(m.ensureSenderProfile).not.toHaveBeenCalled();
  });

  it("makes the profile as /friends does when there is none, then reads its name", async () => {
    m.ownDisplayName.mockResolvedValueOnce(null).mockResolvedValueOnce("Player");
    const el = (await AccountSlot({ userId: "user_me" })) as unknown as El;
    expect(m.ensureSenderProfile).toHaveBeenCalledWith("user_me");
    expect((el.props.facts as { name: string }).name).toBe("Player");
  });

  it("draws Account with less when Clerk's read fails, never taking Settings down", async () => {
    m.currentUser.mockRejectedValue(new Error("clerk 503"));
    const el = (await AccountSlot({ userId: "user_me" })) as unknown as El;
    expect(el.props.facts).toEqual({ name: "Wren Calloway", email: "", methods: [], held: { plan: 0, pack: 0 }, planLive: false });
  });

  it("hands the delete its money facts: the paid credits held and whether a plan is live, past-due included", async () => {
    m.readHeldPaid.mockResolvedValue({ plan: 50, pack: 40 });
    m.readPlanFacts.mockResolvedValue({ status: "past_due" });
    const el = (await AccountSlot({ userId: "user_me" })) as unknown as El;
    expect(el.props.facts).toMatchObject({ held: { plan: 50, pack: 40 }, planLive: true });
  });

  it("draws no money facts when their reads fail, and an ended plan is not live", async () => {
    m.readHeldPaid.mockRejectedValue(new Error("db"));
    m.readPlanFacts.mockResolvedValue({ status: "canceled" });
    const el = (await AccountSlot({ userId: "user_me" })) as unknown as El;
    expect(el.props.facts).toMatchObject({ held: null, planLive: false });
  });
});
