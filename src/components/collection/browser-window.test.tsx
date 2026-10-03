import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(window.location.search),
  useRouter: () => ({ refresh: () => {} }),
}));

import { CollectionBrowser } from "./browser";
import { CardDetailProvider } from "../cards/card-detail-provider";
import type { BrowseListCard } from "../../lib/collection/browse";
import { collectionDrawFieldsFor, cutCollectionWindow, decodeCollection, encodeCollection } from "../../lib/collection/list-wire";
import { PAGE_SIZE, firstWindowIds, parseBrowseParams } from "../../lib/collection/window";

// `/collection`'s first window (list payload plan, PR 4): the page cuts every card outside its
// URL's first window to the columns filtering and sorting read, and the browser draws its first
// window by the same steps. These run the page's cut and then the browser, with the fields route
// answered by hand, so what is in flight at any moment is observable.
const card = (i: number): BrowseListCard =>
  ({
    oracleId: `${String(i).padStart(8, "0")}-0000-4000-8000-000000000000`,
    name: `Card ${String(i).padStart(3, "0")}`,
    typeLine: "Instant",
    manaCost: "{U}",
    rarity: "common",
    colorIdentity: ["U"],
    imageUri: `https://cards.example/${i}.jpg`,
    printedName: null,
    quantity: (i % 5) + 1,
    setCounts: [["RTR", 1]],
    primarySetCode: "RTR",
  }) as BrowseListCard;
const all = Array.from({ length: 450 }, (_, i) => card(i));

const pending: { ids: string[]; answer: () => void }[] = [];
beforeEach(() => {
  pending.length = 0;
  window.localStorage.clear();
  vi.stubGlobal("fetch", vi.fn((url: string) => new Promise<Response>((resolve) => {
    const ids = new URL(url, "http://x").searchParams.get("ids")!.split(",");
    pending.push({
      ids,
      answer: () => resolve(new Response(JSON.stringify({ fields: collectionDrawFieldsFor(all, new Set(ids)) }))),
    });
  })));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

/** The page's cut for the current URL, then the browser, as `/collection` mounts them. */
function mount() {
  const q = new URLSearchParams(window.location.search);
  const keep = firstWindowIds(all, parseBrowseParams((k) => q.get(k), true));
  const rows = decodeCollection(cutCollectionWindow(encodeCollection(all, null), keep));
  return render(
    <CardDetailProvider fetchCard={async () => null}>
      <CollectionBrowser cards={rows} ownedSets={[]} availabilityOk />
    </CardDetailProvider>,
  );
}
const busyNodes = () => document.querySelectorAll('[aria-busy]:not([aria-busy="false"])');
const tileNames = () => screen.queryAllByText(/^Card \d{3}$/).length;

describe("/collection's first window", () => {
  it.each(["?view=grid", "?view=grid&sort=quantity&dir=asc", "?view=rows&sort=name&dir=desc", "?view=grid&q=Card 1"])(
    "draws the URL's first window whole on arrival, not busy, for %s",
    (qs) => {
      window.history.replaceState(null, "", `/collection${qs}`);
      mount();
      expect(document.querySelector('[aria-busy="true"]')).toBeNull();
      expect(tileNames()).toBeGreaterThan(0);
    },
  );

  // Two windows of tiles in jsdom take ~2s alone and past the default 5s under the whole suite.
  it("holds the rows it drew under aria-busy while Show more's rows arrive, then draws them", { timeout: 30_000 }, async () => {
    window.history.replaceState(null, "", "/collection?view=grid");
    mount();
    const before = tileNames();
    expect(before).toBeGreaterThanOrEqual(PAGE_SIZE);
    fireEvent.click(screen.getByRole("button", { name: /Show more/ }));
    await waitFor(() => expect(pending.length).toBeGreaterThan(0), { timeout: 10_000 });
    // Busy, with the rows already drawn still standing.
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(tileNames()).toBe(before);
    // A second press while busy must be ignored. What proves it is the count once the fields
    // land: an ignored press draws exactly one more page, and one that went through would have
    // asked for a second page the answered batch does not cover, leaving the list busy.
    fireEvent.click(screen.getByRole("button", { name: /Show more/ }));
    expect(tileNames()).toBe(before);
    await act(async () => pending[0].answer());
    // The first window is one page; one more page doubles what is drawn (each tile's name is
    // in the document twice, so the count is read as a ratio, not as a number of tiles).
    await waitFor(() => expect(tileNames()).toBe(before * 2), { timeout: 3_000 });
    expect(busyNodes().length).toBe(0);
  });
});
