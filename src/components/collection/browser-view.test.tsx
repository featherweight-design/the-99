import { describe, expect, it, beforeEach, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(window.location.search),
  // The browser refreshes a page whose list a fields batch shows to be stale.
  useRouter: () => ({ refresh: () => {} }),
}));

import { CollectionBrowser, type ViewHint } from "./browser";
import { COLLECTION_VIEW_KEY } from "./filter-bar";
import { CardDetailProvider } from "../cards/card-detail-provider";
import type { BrowseListCard } from "../../lib/collection/browse";
import { viewToggleCopy } from "../../lib/copy/card-surfaces";

/**
 * Which list `/collection` opens as, and the order the three answers are asked
 * in: the URL first, then what this browser last chose, then the width.
 *
 * The URL has to win. `?view=` is in a link because somebody put it there, and
 * a stored habit overriding it would show the recipient a different list than
 * the sender was looking at. The stored choice has to beat the width, because
 * the width is only a guess at what a reader wants and the choice is the
 * reader saying it.
 */
const card = (over: Partial<BrowseListCard> = {}): BrowseListCard =>
  ({
    oracleId: "o1",
    name: "Lightning Bolt",
    quantity: 2,
    colorIdentity: ["R"],
    typeLine: "Instant",
    setCodes: ["LEA"],
    setCounts: [["LEA", 2]],
    primarySetCode: "LEA",
    rarity: "common",
    cmc: 1,
    ...over,
  }) as BrowseListCard;

function view() {
  return (
    <CardDetailProvider fetchCard={async () => null}>
      <CollectionBrowser cards={[card()]} ownedSets={[]} availabilityOk hasCollection />
    </CardDetailProvider>
  );
}

// jsdom's matchMedia answers phone, so the width default here is rows.
const rows = () => screen.getByRole("button", { name: viewToggleCopy.collection.rows });
const grid = () => screen.getByRole("button", { name: viewToggleCopy.collection.grid });

describe("CollectionBrowser — which view it opens as", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/collection");
  });

  it("falls back to the width when nothing else has an opinion", () => {
    render(view());
    expect(rows()).toHaveAttribute("aria-pressed", "true");
  });

  it("opens in the view the last visit chose", () => {
    render(view());
    fireEvent.click(grid());
    expect(grid()).toHaveAttribute("aria-pressed", "true");
    cleanup();

    // A genuinely fresh visit. Choosing mirrors the view into `?view=`, so
    // without this the second render would be reading the first one's URL
    // rather than what the browser kept.
    window.history.replaceState(null, "", "/collection");
    render(view());
    expect(grid()).toHaveAttribute("aria-pressed", "true");
  });

  it("lets a link's own ?view= beat the stored choice", () => {
    localStorage.setItem(COLLECTION_VIEW_KEY, "grid");
    window.history.replaceState(null, "", "/collection?view=rows");
    render(view());
    expect(rows()).toHaveAttribute("aria-pressed", "true");
  });

  // The URL mirror runs once after hydration, and on arrival it describes the URL the page came
  // in on. Writing that again is what Next's router adopted over a pending push, dropping the
  // reader's navigation (1f's startup diagnostic, 2026-09-29), so a mount writes nothing.
  it("makes no write on arrival when the URL already says what the page shows", () => {
    window.history.replaceState(null, "", "/collection?sort=quantity&view=rows");
    const replace = vi.spyOn(window.history, "replaceState");
    render(view());
    expect(replace).not.toHaveBeenCalled();
    replace.mockRestore();
  });

  // The STORED value stays out of the address bar: a reader who never touched
  // the toggle has an unmarked URL to share, whatever their habit is. Pressing
  // the toggle still writes `?view=`, as it did before storage existed — that
  // press is a choice made here, and it is what makes the list shareable. The
  // test after this one holds that half.
  it("keeps the stored choice out of the URL", () => {
    localStorage.setItem(COLLECTION_VIEW_KEY, "grid");
    render(view());
    expect(grid()).toHaveAttribute("aria-pressed", "true");
    expect(window.location.search).not.toContain("view=");
  });

  // Unchanged by this PR, and asserted because the comment above claims it: the
  // toggle writing `?view=` is what a shared link is made of.
  it("still writes the view a reader picks here", () => {
    render(view());
    fireEvent.click(grid());
    expect(window.location.search).toContain("view=grid");
  });
});

// THE SERVER RENDER (the rows-then-grid flash, `probe:view-flash`). The server could not see a
// reader's width or stored view, so it drew rows and hydration swapped in the grid. It now reads
// two cookie hints; with neither it draws both views and lets CSS pick. Read off the HTML the
// server sends, by each view's root class, which are the probe's selectors too.
describe("CollectionBrowser — what the server draws", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/collection");
    localStorage.clear();
  });
  const GRID = /grid-cols-2[^"]*minmax\(178px/;
  const ROWS = /gap-\[6px\][^"]*flex-col|flex-col[^"]*gap-\[6px\]/;
  const art = card({ imageUri: "https://cards.scryfall.io/normal/front/a.jpg" });
  const html = (viewHint?: ViewHint) =>
    renderToString(
      <CardDetailProvider fetchCard={async () => null}>
        <CollectionBrowser cards={[art]} ownedSets={[]} availabilityOk hasCollection viewHint={viewHint} />
      </CardDetailProvider>,
    );

  it("draws the stored choice the cookie carries, and only that view", () => {
    const out = html({ stored: "grid", wide: false });
    expect(out).toMatch(GRID);
    expect(out).not.toMatch(ROWS);
  });

  it("draws the width hint's default when nothing was chosen", () => {
    expect(html({ stored: null, wide: true })).toMatch(GRID);
    const narrow = html({ stored: null, wide: false });
    expect(narrow).toMatch(ROWS);
    expect(narrow).not.toMatch(GRID);
  });

  it("still lets a link's ?view= beat every hint", () => {
    window.history.replaceState(null, "", "/collection?view=rows");
    const out = html({ stored: "grid", wide: true });
    expect(out).toMatch(ROWS);
    expect(out).not.toMatch(GRID);
  });

  // The first visit: no hint at all. Both views, split at 768px, and the grid copy's eager art
  // marked lazy, since that copy is display:none on a phone.
  it("draws both views split by CSS when there is no hint, the grid's eager art lazy", () => {
    const out = html({ stored: null, wide: null });
    expect(out).toMatch(GRID);
    expect(out).toMatch(ROWS);
    expect(out).toMatch(/class="hidden md:block"/);
    expect(out).toMatch(/class="md:hidden"/);
    expect(out).toMatch(/<img[^>]*loading="lazy"/);
  });

  it("draws ONE view once the client can answer the width", () => {
    // jsdom answers the width query (narrow), so a client render picks rows: the split is a
    // server-render state only, never the page a reader is left on.
    const { container } = render(view());
    expect(container.innerHTML).toMatch(ROWS);
    expect(container.innerHTML).not.toMatch(GRID);
  });
});
