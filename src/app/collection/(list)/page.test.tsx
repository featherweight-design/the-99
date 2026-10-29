import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("../../../lib/auth", () => ({ requireUserId: async () => "u1" }));
// The reader's resolved switches: the environment, so `vi.stubEnv` still sets them.
vi.mock("../../../lib/switches/request", async () => {
  const { ENV_VIEW } = await import("@/test/env-view");
  return { requestSwitchEnv: async () => ENV_VIEW };
});
const h = vi.hoisted(() => ({ unique: 0, receiptReads: [] as unknown[], receiptFails: false }));
vi.mock("../../../lib/home/summary", () => ({ getCollectionStats: async () => ({ uniqueCards: h.unique, totalCards: h.unique }) }));
vi.mock("../../../lib/precons/pick-receipt-read", () => ({
  readPickReceipt: async (_u: string, claim: unknown) => {
    h.receiptReads.push(claim);
    if (h.receiptFails) throw new Error("ledger down");
    return { entryIds: ["e1"], names: ["Abzan Armor"], copies: 100, tokens: 10 };
  },
}));
vi.mock("../../../components/home/precon-pick-receipt", () => ({
  PreconPickReceipt: ({ receipt }: { receipt: { names: string[] } }) => <div role="status">receipt: {receipt.names.join(", ")}</div>,
}));
vi.mock("../../../lib/collection/browse-read", async (orig) => ({
  ...(await orig<typeof import("../../../lib/collection/browse-read")>()),
  loadOwnedSetMeta: async () => [],
}));
vi.mock("../../../lib/collection/payload", () => ({ loadCollectionList: async () => ({ cards: [], pricesFailed: false }) }));
vi.mock("../../../lib/decks/availability-query", () => ({ loadAvailability: async () => null }));
vi.mock("../../../components/collection/add-cards-sheet", () => ({ AddCardsSheet: () => null }));
vi.mock("../../../components/collection/collection-client", () => ({ CollectionClient: () => <div data-testid="browser" /> }));

const { default: CollectionPage } = await import("./page");

async function renderEmpty() {
  render(await CollectionPage({ searchParams: Promise.resolve({}) }));
}

describe("/collection, empty collection", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("collection editing off: the shipped single Upload button and body, no doors", async () => {
    vi.stubEnv("COLLECTION_EDIT_ENABLED", "");
    await renderEmpty();
    expect(screen.getByRole("link", { name: "Upload your CSV" }).getAttribute("href")).toBe("/collection/replace");
    expect(screen.getByText(/Upload a CSV and the table fills/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Add cards/ })).toBeNull();
    expect(screen.queryByText("Upload a file")).toBeNull();
  });

  it("collection editing on: one Upload tile, the ways group, and the body that names it (S13)", async () => {
    vi.stubEnv("COLLECTION_EDIT_ENABLED", "true");
    vi.stubEnv("PRECONS_ENABLED", "true");
    await renderEmpty();
    expect(screen.getAllByRole("link", { name: /Upload a file/ })).toHaveLength(1);
    const group = screen.getByRole("group", { name: "No file? Start another way" });
    expect(Array.from(group.querySelectorAll("a")).map((a) => a.getAttribute("href"))).toEqual([
      "/decks/precons?pick=own&from=collection",
      "/decks/import",
    ]);
    expect(screen.getByText("A pile of possibilities waiting for a commander. Bring a file over, or start another way.")).toBeTruthy();
  });

  it("collection editing on with precons off: the group without Precons I own (S15)", async () => {
    vi.stubEnv("COLLECTION_EDIT_ENABLED", "true");
    vi.stubEnv("PRECONS_ENABLED", "");
    await renderEmpty();
    expect(screen.getByRole("group", { name: "No file? Start another way" })).toBeTruthy();
    expect(screen.queryByText("Precons I own")).toBeNull();
  });

  it("without collection editing the page draws the shipped single button (S16)", async () => {
    vi.stubEnv("COLLECTION_EDIT_ENABLED", "");
    await renderEmpty();
    expect(screen.getByRole("link", { name: "Upload your CSV" })).toBeTruthy();
    expect(screen.queryByRole("group", { name: "No file? Start another way" })).toBeNull();
  });
});

// S19: a pick opened from Collection lands here with Home's receipt strip under the tabs, above the collection.
describe("/collection, after a precon pick", () => {
  const LINE = () => {
    vi.stubEnv("COLLECTION_EDIT_ENABLED", "true");
    vi.stubEnv("PRECONS_ENABLED", "true");
  };
  const visit = async (query: Record<string, string>) => render(await CollectionPage({ searchParams: Promise.resolve(query) }));
  afterEach(() => { vi.unstubAllEnvs(); h.unique = 0; h.receiptReads = []; h.receiptFails = false; });

  it("draws the receipt the address claims, first, above the collection", async () => {
    LINE();
    h.unique = 40;
    const { container } = await visit({ precons: "e1" });
    expect(h.receiptReads).toEqual(["e1"]);
    const strip = screen.getByRole("status");
    expect(strip).toHaveTextContent("receipt: Abzan Armor");
    expect(container.querySelector("section")!.firstElementChild).toBe(strip);
    expect(strip.compareDocumentPosition(screen.getByTestId("browser")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("reads nothing and draws nothing without a claim, or with collection editing off", async () => {
    LINE();
    h.unique = 40;
    await visit({});
    vi.stubEnv("COLLECTION_EDIT_ENABLED", "");
    await visit({ precons: "e1" });
    expect(h.receiptReads).toEqual([]);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("reads nothing and draws nothing with precons off, collection editing on", async () => {
    LINE();
    vi.stubEnv("PRECONS_ENABLED", "");
    h.unique = 40;
    await visit({ precons: "e1" });
    expect(h.receiptReads).toEqual([]);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("draws the collection without a strip when the receipt cannot be read", async () => {
    LINE();
    h.unique = 40;
    h.receiptFails = true;
    vi.spyOn(console, "error").mockImplementation(() => {});
    await visit({ precons: "e1" });
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getByTestId("browser")).toBeTruthy();
  });
});
