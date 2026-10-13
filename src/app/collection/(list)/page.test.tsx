import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("../../../lib/auth", () => ({ requireUserId: async () => "u1" }));
// The reader's resolved switches: the environment, so `vi.stubEnv` still sets them.
vi.mock("../../../lib/switches/request", () => ({ requestSwitchEnv: async () => process.env }));
vi.mock("../../../lib/home/summary", () => ({ getCollectionStats: async () => ({ uniqueCards: 0, totalCards: 0 }) }));
vi.mock("../../../lib/collection/browse", async (orig) => ({
  ...(await orig<typeof import("../../../lib/collection/browse")>()),
  loadOwnedSetMeta: async () => [],
}));
vi.mock("../../../lib/collection/payload", () => ({ loadCollectionList: async () => ({ cards: [], pricesFailed: false }) }));
vi.mock("../../../lib/decks/availability-query", () => ({ loadAvailability: async () => null }));
vi.mock("../../../components/collection/add-cards-sheet", () => ({ AddCardsSheet: () => null }));
vi.mock("../../../components/collection/collection-client", () => ({ CollectionClient: () => null }));

const { default: CollectionPage } = await import("./page");

async function renderEmpty() {
  render(await CollectionPage({ searchParams: Promise.resolve({}) }));
}

describe("/collection, empty collection", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("switch off: the shipped single Upload button and body, no doors", async () => {
    vi.stubEnv("COLLECTION_EDIT_ENABLED", "");
    await renderEmpty();
    expect(screen.getByRole("link", { name: "Upload your CSV" }).getAttribute("href")).toBe("/collection/replace");
    expect(screen.getByText(/Upload a CSV and the table fills/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Add cards/ })).toBeNull();
    expect(screen.queryByText("Upload a file")).toBeNull();
  });

  it("switch on: two doors replace the single button", async () => {
    vi.stubEnv("COLLECTION_EDIT_ENABLED", "true");
    await renderEmpty();
    expect(screen.queryByRole("link", { name: "Upload your CSV" })).toBeNull();
    expect(screen.getByRole("link", { name: /Upload a file/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Add cards/ })).toBeTruthy();
    expect(screen.getByText(/Bring a file over, or add cards one at a time/)).toBeTruthy();
  });
});
