import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const routerStub = vi.hoisted(() => ({ refresh: vi.fn() }));
// Hoisted so a test can make the move refuse: the create-from-move path reads
// the move's own answer, and refusing is a different outcome from filing.
const actionStub = vi.hoisted(() => ({ move: vi.fn(async () => true) }));

// The folder actions reach the database through the module they import, so the
// view's own tests stub them. Their behaviour is covered in
// `src/app/decks/folder-actions.test.ts` and against a real Postgres in
// `pnpm probe:folders`.
vi.mock("../../app/decks/folder-actions", () => ({
  createFolderAction: async (name: string) => ({
    ok: true,
    folder: { id: "f-new", name },
  }),
  moveDeckAction: (...args: unknown[]) => actionStub.move(...(args as [])),
  renameFolderAction: async (_id: string, name: string) => ({
    ok: true,
    folder: { id: "f-new", name },
  }),
  deleteFolderAction: async () => true,
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(window.location.search),
  // The view refreshes the route after a folder write: the server revalidates
  // `/decks`, and this client component is holding the payload it rendered with.
  useRouter: () => routerStub,
}));

import { DecksView } from "./decks-view";
import { folderCopy } from "../../lib/copy/folders";
import type { DeckListItem } from "../../lib/decks/read";
import type { DeckFolderWithCount } from "../../lib/decks/folders";
import type { ShoppingRollup } from "../../lib/decks/shopping-rollup";

const NOW = "2026-09-07T12:00:00.000Z";

function deckOf(over: Partial<DeckListItem> = {}): DeckListItem {
  return {
    id: "d1",
    name: "Atraxa, Praetors' Voice",
    commanderName: "Atraxa, Praetors' Voice",
    commanderColorIdentity: ["W", "U", "B", "G"],
    commanderImageUri: null,
    commanderArtCropUri: null,
    partnerName: null,
    partnerColorIdentity: null,
    folderId: null,
    folderName: null,
    statusPill: "Complete",
    bracket: null,
    built: 99,
    ownedCount: 99,
    toBuyCount: 0,
    unresolvedCount: 0,
    pendingChanges: 0,
  versionNumber: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    lastPlayedAt: new Date("2026-09-02T00:00:00Z"),
    lastEditedAt: new Date("2026-09-01T00:00:00Z"),
    lastCommittedAt: null,
    inUseElsewhere: 0,
  proxiedCount: 0,
    ...over,
  };
}

const SHOPPING: ShoppingRollup = {
  byDeck: new Map(),
  total: { copies: 0, cents: 0, pricedCopies: 0 },
};

/** A promise the test settles, so a state can be read while an action is in flight. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function view(decks: DeckListItem[], folders: DeckFolderWithCount[] = []) {
  return (
    <DecksView
      decks={decks}
      folders={folders}
      shopping={SHOPPING}
      buildable={9}
      cards={1284}
      now={NOW}
    />
  );
}

beforeEach(() => {
  window.history.replaceState(null, "", "/decks");
  actionStub.move.mockClear();
  routerStub.refresh.mockClear();
  actionStub.move.mockResolvedValue(true);
  // `renderWide` replaces this stub; restore the phone default every test, or
  // the first wide render silently re-forms every test after it.
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: false, media: query, onchange: null,
      addEventListener: () => {}, removeEventListener: () => {},
      addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false,
    }),
  });
});

/**
 * jsdom's `matchMedia` stub reports `matches: false`, so the chassis renders its
 * compact form here and every dimension lives in the sheet. That is the real
 * phone path rather than a test artifact — the desktop panels are only mounted
 * above 1000px, and a hidden duplicate of an `aria-modal` sheet is exactly what
 * `use-min-width.ts` exists to prevent.
 */
function openFilters() {
  fireEvent.click(screen.getByRole("button", { name: /Filter decks/ }));
}

/** Re-stub `matchMedia` so the chassis takes its wide form for one test. */
function renderWide(ui: React.ReactElement) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: true, media: query, onchange: null,
      addEventListener: () => {}, removeEventListener: () => {},
      addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false,
    }),
  });
  return render(ui);
}

describe("DecksView", () => {
  it("counts what it renders", () => {
    render(view([deckOf(), deckOf({ id: "d2", statusPill: "Draft", built: 0 })]));
    expect(screen.getByText("2 decks")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  // The shell reserves exactly `--tabbar-h` under `<main>`, so a list with no
  // bottom padding of its own ends flush against the phone's tab bar — the last
  // tile's edge and the bar's edge with nothing between them. Desktop is
  // unaffected: `sm:p-[18px_22px]` pays all four sides there.
  it("leaves room under the last tile on a phone", () => {
    const { container } = render(view([deckOf()]));
    const list = container.querySelector("ul.flex-auto")!;

    expect(list.className).toContain("pb-[14px]");
    expect(list.className).not.toContain("pb-0");
  });

  it("keeps the count and the grid in step while filtering", () => {
    render(
      view([
        deckOf({ id: "a", statusPill: "Draft", built: 0 }),
        deckOf({ id: "b", statusPill: "Complete" }),
      ]),
    );
    openFilters();
    fireEvent.click(screen.getAllByRole("checkbox", { name: "Draft" })[0]);
    expect(screen.getByText("1 of 2 decks match")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });

  it("writes the filter to the URL without navigating", () => {
    render(view([deckOf()]));
    openFilters();
    fireEvent.click(screen.getAllByRole("checkbox", { name: "Draft" })[0]);
    expect(window.location.search).toBe("?status=Draft");
  });

  it("writes the default sort as an absence", () => {
    render(view([deckOf()]));
    openFilters();
    fireEvent.click(screen.getAllByRole("checkbox", { name: "Draft" })[0]);
    expect(window.location.search).not.toContain("sort=");
  });

  it("shows a removable chip per active value, and Clear", () => {
    render(view([deckOf()]));
    openFilters();
    fireEvent.click(screen.getAllByRole("checkbox", { name: "Draft" })[0]);
    // The shared chip does not lowercase its label, where /decks' own chip row
    // did. It cannot: the same control carries `/collection`'s set names, and
    // "duskmourn" is wrong in a way "draft" never was.
    fireEvent.click(screen.getByRole("button", { name: "Remove filter: Draft" }));
    expect(window.location.search).toBe("");
  });

  it("offers the filtered empty, not the zero state, when filters exclude everything", () => {
    render(view([deckOf()]));
    openFilters();
    fireEvent.click(screen.getAllByRole("checkbox", { name: "Draft" })[0]);
    expect(screen.getByText("No decks match")).toBeInTheDocument();
    expect(screen.queryByText("No decks yet")).toBeNull();
    expect(screen.getByRole("button", { name: "Clear filters" })).toBeInTheDocument();
  });

  it("Clear filters restores every deck and empties the URL", () => {
    render(view([deckOf()]));
    openFilters();
    fireEvent.click(screen.getAllByRole("checkbox", { name: "Draft" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getByText("1 deck")).toBeInTheDocument();
    expect(window.location.search).toBe("");
  });

  it("mounts the chassis inline above the grid, with no sidebar left", () => {
    const { container } = renderWide(view([deckOf()]));
    // The 262px the column took is the whole visible point of this round.
    expect(container.querySelector("[data-filter-column]")).toBeNull();
    expect(container.querySelector("[data-chassis-row='controls']")).toBeTruthy();
    expect(container.querySelector("[data-chassis-row='chips']")).toBeTruthy();
    expect(container.querySelector("[data-chassis-row='result']")).toBeTruthy();
  });

  it("gives the wide form its five dimensions, sort separated by a hairline", () => {
    const { container } = renderWide(view([deckOf()]));
    // Search, status, colour, last-played — then sort, past the hairline,
    // because sort is not a filter.
    expect(screen.getByLabelText("Search decks")).toBeInTheDocument();
    expect(screen.getAllByRole("switch")).toHaveLength(5);
    expect(container.querySelector("[data-chassis-hairline]")).toBeTruthy();
  });

  it("states its count in the chassis rather than the page header", () => {
    renderWide(view([deckOf(), deckOf({ id: "d2" })]));
    const result = document.querySelector("[data-chassis-row='result']");
    expect(result?.textContent).toContain("2 decks");
  });

  it("tells assistive tech the compact triggers open a dialog", () => {
    render(view([deckOf()]));
    for (const name of [/Filter decks/, /Search decks/]) {
      const trigger = screen.getByRole("button", { name });
      expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
      expect(trigger).toHaveAttribute("aria-expanded", "false");
    }
    openFilters();
    expect(screen.getByRole("button", { name: /Filter decks/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("keeps search reachable on the compact form", () => {
    // The old phone header carried a search trigger; dropping it would have
    // left search reachable only by opening the sheet on some other errand.
    render(view([deckOf()]));
    fireEvent.click(screen.getByRole("button", { name: /Search decks/ }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("opens a visible sheet across the whole compact band, not just under 640px", () => {
    // `DeckFilterSheet` was `sm:hidden`. With the chassis switching at 1000,
    // that left 640-999px opening a dialog CSS had already hidden — the
    // filters unreachable across the entire band.
    render(view([deckOf()]));
    openFilters();
    const dialog = screen.getByRole("dialog");
    expect(dialog.parentElement?.className ?? "").not.toMatch(/\bsm:hidden\b/);
  });

  it("does not remount an open sheet after a trip through the wide form", () => {
    // Crossing to wide unmounts the sheet; leaving `open` true would reopen it
    // on the way back, unasked, with the search field taking focus.
    const { rerender } = render(view([deckOf()]));
    openFilters();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    Object.defineProperty(window, "matchMedia", {
      writable: true, configurable: true,
      value: (query: string) => ({
        matches: true, media: query, onchange: null,
        addEventListener: () => {}, removeEventListener: () => {},
        addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false,
      }),
    });
    rerender(view([deckOf()]));
    expect(screen.queryByRole("dialog")).toBeNull();
    // The trigger the sheet would restore focus to unmounts with it, so the
    // wide form's search field takes the focus rather than losing it to body.
    expect(screen.getByLabelText("Search decks")).toHaveFocus();
  });

  it("clears every filter and leaves a non-default sort alone", () => {
    // The real version of the assertion the sheet's test could no longer make:
    // `Clear all filters` names the sort as unchanged, so a sort that is not
    // the default has to survive the clear — in state and on the URL.
    window.history.replaceState(null, "", "/decks?sort=name&status=Draft");
    render(view([deckOf()]));
    fireEvent.click(
      screen.getByRole("button", { name: "Clear all filters. The sort is unchanged." }),
    );
    expect(window.location.search).toBe("?sort=name");
  });

  it("keeps New deck and Import in the header at every state", () => {
    render(view([deckOf()]));
    openFilters();
    fireEvent.click(screen.getAllByRole("checkbox", { name: "Draft" })[0]);
    // Two of each: the desktop header pair and the phone action row, one of
    // which is display:none at any width.
    expect(screen.getAllByRole("link", { name: "New deck" })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: /Import/ })).toHaveLength(2);
  });

  it("draws the zero state, with both routes in, when no deck exists at all", () => {
    render(view([]));
    expect(screen.getByText("No decks yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse commanders" })).toBeInTheDocument();
    // The zero header drops the count and the filter controls, and keeps the
    // two buttons.
    expect(screen.queryByText("0 of 0")).toBeNull();
    expect(screen.getByText("9 commanders buildable from 1,284 cards")).toBeInTheDocument();
  });

  // ── The shelf (PR 1 of the folders round) ───────────────────────────────
  //
  // Nothing draws a shelf yet, so these drive it the way PR 1 actually exposes
  // it: through the URL. What is proved is that the shelf narrows the grid
  // before the filters run, that both denominators follow it, that clearing the
  // filters does not clear it, and that a shelf which stops existing falls back
  // instead of showing an empty grid.

  const FOLDER_A = "11111111-1111-4111-8111-111111111111";
  const FOLDER_B = "22222222-2222-4222-8222-222222222222";
  const shelvedDecks = () => [
    deckOf({ id: "a1", name: "Filed one", folderId: FOLDER_A, folderName: "Cube night" }),
    deckOf({ id: "a2", name: "Filed two", folderId: FOLDER_A, folderName: "Cube night" }),
    deckOf({ id: "b1", name: "Other shelf", folderId: FOLDER_B, folderName: "Commander night" }),
    deckOf({ id: "u1", name: "Unfiled one" }),
  ];
  const twoFolders: DeckFolderWithCount[] = [
    { id: FOLDER_A, name: "Cube night", createdAt: new Date("2026-09-01"), deckCount: 2 },
    { id: FOLDER_B, name: "Commander night", createdAt: new Date("2026-09-02"), deckCount: 1 },
  ];
  /** A shelf segment by its accessible name, which carries its count. */
  const segment = (name: string, decks: number) =>
    document.querySelector(
      `[data-shelf-line] button[aria-label="${name}, ${decks === 1 ? "1 deck" : `${decks} decks`}"]`,
    );
  const said = () =>
    [...document.querySelectorAll("[aria-live='polite']")].map((r) => r.textContent);
  /** Moves a deck from its own card's menu. */
  function moveFromCard(deckName: string, to: string) {
    const card = screen.getByText(deckName).closest("li")!;
    fireEvent.click(within(card).getByRole("button", { name: /^Actions for/ }));
    fireEvent.click(within(card).getByRole("button", { name: /^Move / }));
    fireEvent.click(within(card).getByRole("button", { name: to }));
  }

  it("narrows the grid to the shelf named on the URL", () => {
    window.history.replaceState(null, "", `/decks?folder=${FOLDER_A}`);
    renderWide(view(shelvedDecks(), twoFolders));
    expect(screen.getByText("Filed one")).toBeInTheDocument();
    expect(screen.getByText("Filed two")).toBeInTheDocument();
    expect(screen.queryByText("Other shelf")).toBeNull();
    expect(screen.queryByText("Unfiled one")).toBeNull();
  });

  it("divides the result line by the shelf, not by the library", () => {
    window.history.replaceState(null, "", `/decks?folder=${FOLDER_A}`);
    renderWide(view(shelvedDecks(), twoFolders));
    // Four decks exist; two are on this shelf.
    expect(document.querySelector("[data-chassis-row='result']")?.textContent).toContain("2 decks");
  });

  it("holds only the unfiled decks on `none`", () => {
    window.history.replaceState(null, "", "/decks?folder=none");
    renderWide(view(shelvedDecks(), twoFolders));
    expect(screen.getByText("Unfiled one")).toBeInTheDocument();
    expect(screen.queryByText("Filed one")).toBeNull();
  });

  it("draws an empty shelf as an empty grid, with the chassis still mounted", () => {
    const empty: DeckFolderWithCount[] = [
      { id: FOLDER_A, name: "Cube night", createdAt: new Date("2026-09-01"), deckCount: 0 },
    ];
    window.history.replaceState(null, "", `/decks?folder=${FOLDER_A}`);
    const { container } = renderWide(view([deckOf({ id: "u1", name: "Unfiled one" })], empty));
    expect(screen.queryByText("Unfiled one")).toBeNull();
    // The chassis is never replaced by an emptiness — STATES' first invariant.
    expect(container.querySelector("[data-chassis-row='controls']")).toBeTruthy();
  });

  it("keeps the shelf when the filters are cleared", () => {
    window.history.replaceState(null, "", `/decks?folder=${FOLDER_A}&q=filed`);
    renderWide(view(shelvedDecks(), twoFolders));
    fireEvent.click(screen.getByRole("button", { name: /Clear all filters/ }));
    expect(window.location.search).toBe(`?folder=${FOLDER_A}`);
    expect(screen.getByText("Filed one")).toBeInTheDocument();
    expect(screen.queryByText("Unfiled one")).toBeNull();
  });

  it("falls back to All decks when a URL names a folder the player does not have", () => {
    // Read at mount: the shelf is resolved against the folders that exist.
    window.history.replaceState(null, "", `/decks?folder=${FOLDER_A}`);
    renderWide(view(shelvedDecks(), []));
    expect(screen.getByText("Unfiled one")).toBeInTheDocument();
    expect(screen.getByText("Filed one")).toBeInTheDocument();
    expect(window.location.search).toBe("");
  });

  it("falls back when the selected folder disappears UNDER the mounted view", () => {
    // What a delete actually leaves behind. The action revalidates `/decks`, and
    // the router can hand this client component new props without remounting it
    // — so the mount-time resolution above never runs again, and the shelf would
    // otherwise go on naming a folder that is gone.
    window.history.replaceState(null, "", `/decks?folder=${FOLDER_A}`);
    const { rerender } = renderWide(view(shelvedDecks(), twoFolders));
    expect(screen.queryByText("Unfiled one")).toBeNull();

    rerender(view(shelvedDecks(), [twoFolders[1]]));
    expect(screen.getByText("Unfiled one")).toBeInTheDocument();
    expect(screen.getByText("Other shelf")).toBeInTheDocument();
    expect(window.location.search).toBe("");
    expect(document.querySelector("[data-chassis-row='result']")?.textContent).toContain("4 decks");
  });

  it("writes no URL on a delete until the payload without the folder lands", async () => {
    // The action's promise resolves on its return value, while the revalidated
    // payload is still streaming behind it. A `replaceState` at that moment made
    // the router settle on the OLD tree (Hugh's staging walk, 2026-09-28), so the
    // delete leaves the URL alone and the fallback comes from the new props.
    window.history.replaceState(null, "", `/decks?folder=${FOLDER_A}`);
    const { rerender } = renderWide(view(shelvedDecks(), twoFolders));
    const line = document.querySelector<HTMLElement>("[data-shelf-line]")!;
    fireEvent.click(within(line).getByRole("button", { name: /^Actions for/ }));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete folder" }));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Delete folder" })).toBeNull());
    expect(window.location.search).toBe(`?folder=${FOLDER_A}`);

    rerender(view(shelvedDecks(), [twoFolders[1]]));
    expect(window.location.search).toBe("");
    expect(screen.getByText("Unfiled one")).toBeInTheDocument();
    await waitFor(() =>
      expect(document.activeElement).toBe(
        document.querySelector("[data-shelf-line] button[aria-current='true']"),
      ),
    );
  });

  it("leaves Unfiled when the last folder is deleted under the mounted view", () => {
    // Unfiled has no segment until a folder exists, so a reader standing on it
    // when the last one goes is standing somewhere nothing can show.
    window.history.replaceState(null, "", "/decks?folder=none");
    const oneFolder = [twoFolders[0]];
    const { rerender } = renderWide(view(shelvedDecks(), oneFolder));
    expect(screen.queryByText("Filed one")).toBeNull();

    rerender(view(shelvedDecks(), []));
    expect(screen.getByText("Filed one")).toBeInTheDocument();
    expect(window.location.search).toBe("");
  });

  it("gives the compact sheet the shelf's denominator too", () => {
    // The sheet prints and announces its own `shown of total`; the chassis's
    // result line is a different element, so asserting that one proves nothing
    // about this one.
    window.history.replaceState(null, "", `/decks?folder=${FOLDER_A}`);
    render(view(shelvedDecks(), twoFolders));
    openFilters();
    // Scoped to the sheet: the chassis prints the same sentence, so an unscoped
    // query passes whatever the sheet was handed.
    // `N of M match` in the sheet's own header, where M is the shelf and not
    // the library. Scoped to the dialog because the chassis states the same
    // figure elsewhere, so an unscoped query passes whatever the sheet was
    // handed.
    const sheet = screen.getByRole("dialog");
    expect(within(sheet).getByText("2 of 2 match")).toBeInTheDocument();
  });

  it("strips a bare `?folder=` from the URL", () => {
    window.history.replaceState(null, "", "/decks?folder=");
    renderWide(view(shelvedDecks(), twoFolders));
    expect(window.location.search).toBe("");
  });

  it("draws the shelf line above the chassis on the wide form", () => {
    const { container } = renderWide(view(shelvedDecks(), twoFolders));
    const line = container.querySelector("[data-shelf-line]");
    const chassis = container.querySelector("[data-chassis-row='controls']");
    expect(line).toBeTruthy();
    // Above, and on its own ground — two different surfaces, not one strip.
    expect(line!.compareDocumentPosition(chassis!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("draws a trigger rather than a line on the compact form", () => {
    const { container } = render(view(shelvedDecks(), twoFolders));
    expect(container.querySelector("[data-shelf-line]")).toBeNull();
    expect(container.querySelector("[data-shelf-trigger]")).toBeTruthy();
  });

  it("draws S2 on an empty named shelf, and offers no Clear filters", () => {
    const empty: DeckFolderWithCount[] = [
      { id: FOLDER_A, name: "Draft pile", createdAt: new Date("2026-09-01"), deckCount: 0 },
    ];
    window.history.replaceState(null, "", `/decks?folder=${FOLDER_A}`);
    const { container } = renderWide(view([deckOf({ id: "u1", name: "Unfiled one" })], empty));
    expect(screen.getByText("Nothing filed here")).toBeInTheDocument();
    expect(screen.getByText("Draft pile · 0 decks")).toBeInTheDocument();
    // No filter caused this, so the filtered empty's way out would be the wrong
    // one — and the chassis stays mounted above it either way.
    expect(screen.queryByRole("button", { name: "Clear filters" })).toBeNull();
    expect(container.querySelector("[data-chassis-row='controls']")).toBeTruthy();
  });

  it("draws S3 with a count and no body copy when everything is filed", () => {
    const filed = [
      deckOf({ id: "a1", name: "Filed one", folderId: FOLDER_A, folderName: "Cube night" }),
      deckOf({ id: "b1", name: "Other", folderId: FOLDER_B, folderName: "Commander night" }),
    ];
    window.history.replaceState(null, "", "/decks?folder=none");
    renderWide(view(filed, twoFolders));
    expect(screen.getByText("Nothing unfiled")).toBeInTheDocument();
    expect(screen.getByText("2 decks across 2 folders")).toBeInTheDocument();
    expect(screen.queryByText(/from its own/)).toBeNull();
  });

  it("keeps the filtered empty state when a filter emptied a populated shelf", () => {
    // N4, not N2: the shelf has decks and a filter took them, so the way out is
    // to clear the filter rather than to leave the shelf.
    window.history.replaceState(null, "", `/decks?folder=${FOLDER_A}&q=zzzz`);
    renderWide(view(shelvedDecks(), twoFolders));
    expect(screen.getByRole("button", { name: "Clear filters" })).toBeInTheDocument();
    expect(screen.queryByText("Nothing filed here")).toBeNull();
  });

  it("draws no shelf line at all when the player has no decks", () => {
    const { container } = renderWide(view([], twoFolders));
    expect(container.querySelector("[data-shelf-line]")).toBeNull();
    expect(container.querySelector("[data-shelf-trigger]")).toBeNull();
  });

  it("selects a shelf from the line and writes it to the URL", () => {
    renderWide(view(shelvedDecks(), twoFolders));
    fireEvent.click(screen.getByRole("button", { name: /Commander night, 1 deck/ }));
    expect(window.location.search).toBe(`?folder=${FOLDER_B}`);
    expect(screen.getByText("Other shelf")).toBeInTheDocument();
    expect(screen.queryByText("Filed one")).toBeNull();
  });

  it("closes the shelf sheet when the reader crosses to the wide form", () => {
    // The trigger that opened it is the compact form's alone, so leaving the
    // sheet open would remount a modal on the way back that nobody asked for.
    const { rerender } = render(view(shelvedDecks(), twoFolders));
    fireEvent.click(screen.getByRole("button", { name: /^Shelf: / }));
    expect(screen.getByRole("dialog", { name: "Shelves" })).toBeInTheDocument();

    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: (query: string) => ({
        matches: true, media: query, onchange: null,
        addEventListener: () => {}, removeEventListener: () => {},
        addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false,
      }),
    });
    rerender(view(shelvedDecks(), twoFolders));
    expect(screen.queryByRole("dialog", { name: "Shelves" })).toBeNull();
  });

  it("announces a wide shelf change by name, since two shelves can read alike", async () => {
    const { container } = renderWide(view(shelvedDecks(), twoFolders));
    fireEvent.click(screen.getByRole("button", { name: /Commander night, 1 deck/ }));
    await waitFor(() => {
      const said = [...container.querySelectorAll("[aria-live='polite']")]
        .map((r) => r.textContent);
      expect(said).toContain("Commander night, 1 deck");
    });
  });

  it("announces the shelf from a region that outlives the sheet", async () => {
    // The sheet unmounts on selection, so its own region cannot carry this —
    // and the chassis's is silent behind an aria-modal.
    const { container } = render(view(shelvedDecks(), twoFolders));
    fireEvent.click(screen.getByRole("button", { name: /^Shelf: / }));
    fireEvent.click(screen.getByRole("button", { name: "Cube night, 2 decks" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Shelves" })).toBeNull());
    const regions = [...container.querySelectorAll("[aria-live='polite']")]
      .map((r) => r.textContent);
    expect(regions).toContain("Cube night, 2 decks");
  });

  // Scoped to the line: every deck tile carries an `Actions for <deck>` trigger
  // of its own, so an unscoped query finds those instead.
  const shelfActions = (container: HTMLElement) =>
    [...container.querySelectorAll("[data-shelf-line] button[aria-label^='Actions for']")];

  it("gives the selected named shelf its own actions, and nothing else one", () => {
    window.history.replaceState(null, "", `/decks?folder=${FOLDER_A}`);
    const { container } = renderWide(view(shelvedDecks(), twoFolders));
    // Never on an unselected segment (W2), and never on the two that are not
    // folders (W4, errata E7).
    expect(shelfActions(container).map((b) => b.getAttribute("aria-label"))).toEqual([
      "Actions for Cube night",
    ]);
  });

  it("gives the compact form the same shelf actions", () => {
    // The phone gets rename and delete too: the wide assertions above run under
    // renderWide, so without this a regression could take the actions off the
    // phone with every other test green.
    window.history.replaceState(null, "", `/decks?folder=${FOLDER_A}`);
    const { container } = render(view(shelvedDecks(), twoFolders));
    expect(
      container.querySelectorAll("[data-shelf-trigger] button[aria-label^='Actions for']"),
    ).toHaveLength(1);
  });

  it("draws no compact shelf actions on All decks", () => {
    const { container } = render(view(shelvedDecks(), twoFolders));
    expect(
      container.querySelectorAll("[data-shelf-trigger] button[aria-label^='Actions for']"),
    ).toHaveLength(0);
  });

  it("draws no shelf actions on All decks", () => {
    const { container } = renderWide(view(shelvedDecks(), twoFolders));
    expect(shelfActions(container)).toHaveLength(0);
  });

  it("draws no shelf actions on Unfiled", () => {
    window.history.replaceState(null, "", "/decks?folder=none");
    const { container } = renderWide(view(shelvedDecks(), twoFolders));
    expect(shelfActions(container)).toHaveLength(0);
  });

  it("does not move the reader when a folder is created", async () => {
    // Hugh's call, 2026-09-13 (errata E20): the new shelf is empty, so walking
    // the reader to it confirms nothing. The segment appears in the line and
    // the region says it was made.
    //
    // Started on a NAMED shelf on purpose. From All decks the URL is already
    // empty, so asserting it is still empty passes whether the reader moved or
    // not — the assertion has to be able to fail.
    window.history.replaceState(null, "", `/decks?folder=${FOLDER_A}`);
    const { container } = renderWide(view(shelvedDecks(), twoFolders));
    fireEvent.click(screen.getByRole("button", { name: /New folder/ }));
    fireEvent.change(screen.getByLabelText("Folder name"), { target: { value: "Draft pile" } });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    await waitFor(() =>
      expect(
        [...container.querySelectorAll("[aria-live='polite']")].map((r) => r.textContent),
      ).toContain("Folder “Draft pile” created."),
    );
    expect(new URLSearchParams(window.location.search).get("folder")).toBe(FOLDER_A);
    // And the shelf the reader is still on is the one whose decks are shown.
    expect(screen.getByText("Filed one")).toBeInTheDocument();
    // The new segment is in the line without a refresh landing first.
    expect(
      [...container.querySelectorAll("[data-shelf-line] button")].some((b) =>
        b.textContent?.startsWith("Draft pile"),
      ),
    ).toBe(true);
  });

  it("closes the panel that asked for a folder once the deck is filed", async () => {
    // The other half of errata E21. A move from the destination list closes the
    // panel in `deck-card-overflow`; a move performed BY THE CREATE DIALOG never
    // reaches that handler, so without the signal this panel sits open in move
    // mode behind a dialog that already did the work.
    renderWide(view(shelvedDecks(), twoFolders));
    fireEvent.click(screen.getAllByRole("button", { name: /^Actions for/ })[0]);
    fireEvent.click(screen.getByRole("button", { name: /^Move / }));
    // The move list's own last row, not the shelf line's button beside it.
    const rows = screen.getAllByRole("button", { name: /New folder/ });
    fireEvent.click(rows[rows.length - 1]);
    fireEvent.change(screen.getByLabelText("Folder name"), { target: { value: "Draft pile" } });
    // The trigger, not the Move row: the row only exists in the panel's MENU
    // mode, so it is already absent while the destination list is up and an
    // assertion against it would pass with no fix at all.
    const trigger = screen.getAllByRole("button", { name: /^Actions for/ })[0];
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    await waitFor(() => expect(trigger).toHaveAttribute("aria-expanded", "false"));
  });

  it("takes the deck back when the move the create asked for is refused", async () => {
    // M6: a refused move changes nothing. The create files the deck through the
    // same optimistic move as every other door, so the deck takes the new shelf
    // on the press and the prediction drops once the refusal lands.
    const answer = deferred<boolean>();
    actionStub.move.mockReturnValueOnce(answer.promise);
    renderWide(view(shelvedDecks(), twoFolders));
    const card = screen.getByText("Unfiled one").closest("li")!;
    fireEvent.click(within(card).getByRole("button", { name: /^Actions for/ }));
    fireEvent.click(within(card).getByRole("button", { name: /^Move / }));
    const rows = screen.getAllByRole("button", { name: /New folder/ });
    fireEvent.click(rows[rows.length - 1]);
    fireEvent.change(screen.getByLabelText("Folder name"), { target: { value: "Draft pile" } });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    await waitFor(() => expect(segment("Draft pile", 1)).not.toBeNull());
    expect(segment("Unfiled", 0)).not.toBeNull();
    await act(async () => answer.resolve(false));
    await waitFor(() => expect(segment("Draft pile", 0)).not.toBeNull());
    expect(segment("Unfiled", 1)).not.toBeNull();
  });

  it("says the move failed when it threw", async () => {
    // A throw is not a refusal: the reader can act on it. The folder was made
    // either way, so both halves are said.
    actionStub.move.mockRejectedValueOnce(new Error("outage"));
    const { container } = renderWide(view(shelvedDecks(), twoFolders));
    const trigger = screen.getAllByRole("button", { name: /^Actions for/ })[0];
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("button", { name: /^Move / }));
    const rows = screen.getAllByRole("button", { name: /New folder/ });
    fireEvent.click(rows[rows.length - 1]);
    fireEvent.change(screen.getByLabelText("Folder name"), { target: { value: "Draft pile" } });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    await waitFor(() =>
      expect(
        [...container.querySelectorAll("[aria-live='polite']")].map((r) => r.textContent),
      ).toContain("Folder “Draft pile” created. That did not save. Try again."),
    );
    // And the route is refetched, for the same reason the destination list
    // refetches on a throw: the action may have committed with its response
    // lost, and nothing else is coming.
    expect(routerStub.refresh).toHaveBeenCalledTimes(1);
  });

  it("files the deck, and says so, when the create came from a move", async () => {
    renderWide(view(shelvedDecks(), twoFolders));
    fireEvent.click(screen.getAllByRole("button", { name: /^Actions for/ })[0]);
    fireEvent.click(screen.getByRole("button", { name: /^Move / }));
    const rows = screen.getAllByRole("button", { name: /New folder/ });
    fireEvent.click(rows[rows.length - 1]);
    fireEvent.change(screen.getByLabelText("Folder name"), { target: { value: "Draft pile" } });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    // The deck whose panel asked — read off the tile the panel belongs to,
    // because the grid's order is the sort's and not this test's — onto the
    // folder the create returned.
    const first = screen.getAllByRole("listitem")[0].querySelector("h3")?.textContent;
    const asked = shelvedDecks().find((d) => d.name === first)?.id;
    // Both in the same wait: the call proves the action was reached, and the
    // announcement proves `onCreate` resumed after awaiting it.
    await waitFor(() => {
      expect(actionStub.move).toHaveBeenCalledWith(asked, "f-new");
      expect(
        [...document.querySelectorAll("[aria-live='polite']")].map((r) => r.textContent),
      ).toContain("Filed under Draft pile.");
    });
    // E21's other half: focus goes back to the card's own ⋯, which survives on
    // All decks. Not left on the dismissed dialog, and not on the body.
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getAllByRole("button", { name: /^Actions for/ })[0]),
    );
  });

  it("refetches the route only when a move threw", async () => {
    // Every other outcome reaches this view through the action's own
    // `revalidatePath`, and asking for the route again on top of that fetched an
    // expensive payload twice per write. A rejection is the exception: it may
    // have committed with its response lost, so no payload is coming.
    actionStub.move.mockResolvedValueOnce(false);
    renderWide(view(shelvedDecks(), twoFolders));
    fireEvent.click(screen.getAllByRole("button", { name: /^Actions for/ })[0]);
    fireEvent.click(screen.getByRole("button", { name: /^Move / }));
    fireEvent.click(screen.getByRole("button", { name: "Commander night" }));
    await waitFor(() => expect(actionStub.move).toHaveBeenCalled());
    expect(routerStub.refresh).not.toHaveBeenCalled();

    actionStub.move.mockRejectedValueOnce(new Error("outage"));
    // The panel closed on the press, so it is opened again.
    fireEvent.click(screen.getAllByRole("button", { name: /^Actions for/ })[0]);
    fireEvent.click(screen.getByRole("button", { name: /^Move / }));
    fireEvent.click(screen.getByRole("button", { name: "Commander night" }));
    await waitFor(() => expect(routerStub.refresh).toHaveBeenCalledTimes(1));
  });

  it("reports a refused move as one, so the view can rescue focus", async () => {
    // `false` means the deck or the folder is gone, which on All decks can take
    // this card with it. A throw means nothing moved, so the card stays and the
    // flag stays false.
    actionStub.move.mockResolvedValueOnce(false);
    renderWide(view(shelvedDecks(), twoFolders));
    fireEvent.click(screen.getAllByRole("button", { name: /^Actions for/ })[0]);
    fireEvent.click(screen.getByRole("button", { name: /^Move / }));
    fireEvent.click(screen.getByRole("button", { name: "Commander night" }));
    // The selected segment in the line, which is where `focusShelfControl`
    // puts it at this width.
    await waitFor(() =>
      expect(document.activeElement).toBe(
        document.querySelector("[data-shelf-line] button[aria-current='true']"),
      ),
    );
  });

  it("closes the panel and hands focus to the shelf when the card leaves the grid", async () => {
    // The named-shelf half of E21. The deck moves OFF the shelf being viewed, so
    // the card unmounts with the panel on it and there is no ⋯ left to focus —
    // the view puts focus on the shelf instead.
    window.history.replaceState(null, "", `/decks?folder=${FOLDER_A}`);
    renderWide(view(shelvedDecks(), twoFolders));
    // A DECK's menu. The shelf line's own menu carries the same label prefix and
    // comes first on a selected shelf, and it opens rename and delete.
    const card = screen.getAllByRole("listitem")[0];
    fireEvent.click(within(card).getByRole("button", { name: /^Actions for/ }));
    fireEvent.click(within(card).getByRole("button", { name: /^Move / }));
    fireEvent.click(within(card).getByRole("button", { name: "Commander night" }));
    await waitFor(() =>
      expect(document.activeElement).toBe(
        document.querySelector("[data-shelf-line] button[aria-current='true']"),
      ),
    );
    // And the card went with the press rather than staying in the grid until
    // the payload lands: the move is optimistic (H24).
    expect(card).not.toBeInTheDocument();
  });

  // ── The optimistic move (Hugh's walk, H24) ──────────────────────────────
  //
  // Every case holds the action open with a deferred promise, so what is read
  // before it settles is what the reader sees during the round trip.

  it("moves the deck and its counts on the press, before the action answers", async () => {
    const answer = deferred<boolean>();
    actionStub.move.mockReturnValueOnce(answer.promise);
    window.history.replaceState(null, "", "/decks?folder=none");
    const { rerender } = renderWide(view(shelvedDecks(), twoFolders));
    expect(segment("Unfiled", 1)).not.toBeNull();
    moveFromCard("Unfiled one", "Commander night");
    // Still unanswered, and the deck has already left the Unfiled shelf.
    expect(actionStub.move).toHaveBeenCalledWith("u1", FOLDER_B);
    expect(screen.queryByText("Unfiled one")).toBeNull();
    expect(segment("Unfiled", 0)).not.toBeNull();
    expect(segment("Commander night", 2)).not.toBeNull();
    // The payload agreeing, then the answer: nothing moves back.
    const moved = shelvedDecks().map((d) =>
      d.id === "u1" ? { ...d, folderId: FOLDER_B, folderName: "Commander night" } : d,
    );
    rerender(view(moved, twoFolders));
    await act(async () => answer.resolve(true));
    expect(segment("Commander night", 2)).not.toBeNull();
    expect(routerStub.refresh).not.toHaveBeenCalled();
  });

  // React entangles every async transition in flight, so a promise left
  // pending would hold every later test's prediction too. Each one is settled.
  it("names the new shelf on the deck's own Move row before the action answers", async () => {
    const answer = deferred<boolean>();
    actionStub.move.mockReturnValueOnce(answer.promise);
    renderWide(view(shelvedDecks(), twoFolders));
    moveFromCard("Unfiled one", "Commander night");
    const card = screen.getByText("Unfiled one").closest("li")!;
    fireEvent.click(within(card).getByRole("button", { name: /^Actions for/ }));
    expect(within(card).getByRole("button", { name: /^Move / })).toHaveTextContent(
      "Move · Commander night",
    );
    await act(async () => answer.resolve(true));
  });

  it("announces the move on the press", async () => {
    const answer = deferred<boolean>();
    actionStub.move.mockReturnValueOnce(answer.promise);
    renderWide(view(shelvedDecks(), twoFolders));
    moveFromCard("Unfiled one", "Commander night");
    expect(said()).toContain("Filed under Commander night.");
    await act(async () => answer.resolve(true));
  });

  it("puts the deck and the counts back when the action refuses", async () => {
    const answer = deferred<boolean>();
    actionStub.move.mockReturnValueOnce(answer.promise);
    window.history.replaceState(null, "", "/decks?folder=none");
    renderWide(view(shelvedDecks(), twoFolders));
    moveFromCard("Unfiled one", "Commander night");
    expect(screen.queryByText("Unfiled one")).toBeNull();
    await act(async () => answer.resolve(false));
    await waitFor(() => expect(screen.getByText("Unfiled one")).toBeInTheDocument());
    expect(segment("Unfiled", 1)).not.toBeNull();
    expect(segment("Commander night", 1)).not.toBeNull();
    // A refusal revalidated on its way back; only a throw refetches.
    expect(routerStub.refresh).not.toHaveBeenCalled();
    // The press already said "Filed under", so the revert is said too.
    expect(said()).toContain(folderCopy.move.refused);
  });

  it("says a thrown move failed, puts the deck back and refetches", async () => {
    const answer = deferred<boolean>();
    actionStub.move.mockReturnValueOnce(answer.promise);
    renderWide(view(shelvedDecks(), twoFolders));
    moveFromCard("Unfiled one", "Commander night");
    expect(segment("Commander night", 2)).not.toBeNull();
    await act(async () => answer.reject(new Error("outage")));
    expect(said()).toContain("That did not save. Try again.");
    await waitFor(() => expect(segment("Commander night", 1)).not.toBeNull());
    expect(segment("Unfiled", 1)).not.toBeNull();
    expect(routerStub.refresh).toHaveBeenCalledTimes(1);
  });

  it("ignores a hand-edited folder id", () => {
    window.history.replaceState(null, "", "/decks?folder=nope");
    renderWide(view(shelvedDecks(), twoFolders));
    expect(screen.getByText("Unfiled one")).toBeInTheDocument();
    expect(document.querySelector("[data-chassis-row='result']")?.textContent).toContain("4 decks");
  });
});

// The order has three sources and they rank: the URL, then what this browser
// last chose, then `lastPlayed`.
describe("DecksView remembers the order", () => {
  const sortTrigger = () => screen.getByRole("button", { name: /^Sort · / });

  // The label is not the feature. A regression that kept `Sort · Name` in sync
  // and handed the default to `sortDecks` would pass every case above.
  // Read off the list items, not `getAllByRole("heading")`: the tile's `h3` sits
  // inside an `aria-hidden` block — the overlay link carries the accessible name
  // — so the heading role is not exposed at all.
  const namesInOrder = () =>
    screen.getAllByRole("listitem").map((li) => li.querySelector("h3")?.textContent);

  // Three orders, three different sequences. Two of them agreeing by accident is
  // how an ordering assertion passes while measuring nothing:
  //   name        → Atraxa, Míriel, Zur
  //   newest      → Zur, Míriel, Atraxa
  //   last played → Zur, Atraxa, Míriel
  const threeDecks = () => [
    deckOf({ id: "d1", name: "Míriel", createdAt: new Date("2026-03-01T00:00:00Z"),
      lastPlayedAt: new Date("2026-09-04T00:00:00Z") }),
    deckOf({ id: "d2", name: "Atraxa", createdAt: new Date("2026-01-01T00:00:00Z"),
      lastPlayedAt: new Date("2026-09-05T00:00:00Z") }),
    deckOf({ id: "d3", name: "Zur", createdAt: new Date("2026-06-01T00:00:00Z"),
      lastPlayedAt: new Date("2026-09-06T00:00:00Z") }),
  ];


  beforeEach(() => localStorage.clear());

  it("keeps the chosen order for the next visit", () => {
    const { unmount } = renderWide(view([deckOf()]));
    fireEvent.click(sortTrigger());
    fireEvent.click(screen.getByRole("menuitemradio", { name: "Name" }));
    expect(sortTrigger()).toHaveAccessibleName("Sort · Name");
    // A press IS a choice made here, so it writes the URL as well — that is what
    // makes the list shareable.
    expect(window.location.search).toBe("?sort=name");

    unmount();
    window.history.replaceState(null, "", "/decks");
    renderWide(view([deckOf()]));
    expect(sortTrigger()).toHaveAccessibleName("Sort · Name");
    // ...and the STORED value is never serialised. A bare `/decks` showing your
    // own order leaves the address bar bare, so a URL still means somebody chose
    // this here.
    expect(window.location.search).toBe("");
  });

  it("lets the URL outrank what this browser stored", () => {
    // Three decks, not one: with a single row every order produces the same
    // list, so a regression letting storage reach `sortDecks` would pass a test
    // named for precedence.
    localStorage.setItem("the99:decks:sort", "name");
    window.history.replaceState(null, "", "/decks?sort=newest");
    renderWide(view(threeDecks()));
    expect(sortTrigger()).toHaveAccessibleName("Sort · Newest");
    expect(namesInOrder()).toEqual(["Zur", "Míriel", "Atraxa"]);
  });

  it("falls back to last played when neither has an opinion", () => {
    renderWide(view([deckOf()]));
    expect(sortTrigger()).toHaveAccessibleName("Sort · Last played");
  });

  it("ignores a stored value that is no longer an order", () => {
    localStorage.setItem("the99:decks:sort", "popularity");
    renderWide(view([deckOf()]));
    expect(sortTrigger()).toHaveAccessibleName("Sort · Last played");
  });

  it("puts the decks in the URL's order, not just the label", () => {
    window.history.replaceState(null, "", "/decks?sort=newest");
    renderWide(view(threeDecks()));
    expect(namesInOrder()).toEqual(["Zur", "Míriel", "Atraxa"]);
  });

  it("puts the decks in the stored order when the URL has no opinion", () => {
    localStorage.setItem("the99:decks:sort", "name");
    renderWide(view(threeDecks()));
    expect(namesInOrder()).toEqual(["Atraxa", "Míriel", "Zur"]);
  });

  it("keeps an explicit `lastPlayed` on the URL through a filter click", () => {
    // `serializeDeckSort` drops the default because absence and default used to
    // mean the same thing. They no longer do — absence means "follow storage" —
    // so a rewritten URL would hand this list to a stored `name` on the next
    // visit, and the shared link would stop describing what its sender meant.
    localStorage.setItem("the99:decks:sort", "name");
    window.history.replaceState(null, "", "/decks?sort=lastPlayed");
    renderWide(view(threeDecks()));
    expect(sortTrigger()).toHaveAccessibleName("Sort · Last played");

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "r" } });
    expect(window.location.search).toContain("sort=lastPlayed");
    expect(sortTrigger()).toHaveAccessibleName("Sort · Last played");
  });

  it("re-reads the URL when it changes, not only at mount", () => {
    // The shell's `Decks` link clears the query without unmounting this view. An
    // absence now means "follow what this browser stored", so a reader who chose
    // `Newest` would otherwise have kept it over their own stored order while
    // the address bar said nothing. `useLiveQuery` wraps `replaceState`, so
    // moving the URL IS the navigation here.
    localStorage.setItem("the99:decks:sort", "name");
    window.history.replaceState(null, "", "/decks?sort=newest");
    renderWide(view(threeDecks()));
    expect(namesInOrder()).toEqual(["Zur", "Míriel", "Atraxa"]);

    act(() => {
      window.history.replaceState(null, "", "/decks");
    });
    expect(namesInOrder()).toEqual(["Atraxa", "Míriel", "Zur"]);
  });

  it("reconciles every parameter it owns, not only the sort", () => {
    // One rule for the whole of this view's URL-owned state: the same navigation
    // would otherwise leave a status filter on with a bare URL.
    window.history.replaceState(null, "", "/decks?q=Zur");
    renderWide(view(threeDecks()));
    expect(namesInOrder()).toEqual(["Zur"]);

    act(() => {
      window.history.replaceState(null, "", "/decks");
    });
    expect(namesInOrder()).toHaveLength(3);
  });

  it("keeps an order chosen from a bare URL, against a stored one", () => {
    // The case a first attempt at this reconciliation got wrong: it recorded the
    // written query against `useSearchParams`, which had NOT heard the write, so
    // the next render reconciled from the stale query and the choice undid
    // itself. `useLiveQuery` hears it, so the round trip agrees either way —
    // `apply`'s own `setSeenQuery` saves a re-render rather than a defect, and
    // removing it leaves this green.
    localStorage.setItem("the99:decks:sort", "name");
    renderWide(view(threeDecks()));
    fireEvent.click(sortTrigger());
    fireEvent.click(screen.getByRole("menuitemradio", { name: "Newest" }));
    expect(sortTrigger()).toHaveAccessibleName("Sort · Newest");
    expect(namesInOrder()).toEqual(["Zur", "Míriel", "Atraxa"]);
  });

  it("holds the stored order through a filter click, which writes no sort", () => {
    // `apply` rewrites every parameter the view owns. Serialising the effective
    // order there would pin the stored preference onto the URL; serialising the
    // default would be the same absence. It has to stay an absence.
    localStorage.setItem("the99:decks:sort", "name");
    renderWide(view([deckOf(), deckOf({ id: "d2", name: "Zur" })]));
    expect(sortTrigger()).toHaveAccessibleName("Sort · Name");
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Zur" } });
    expect(sortTrigger()).toHaveAccessibleName("Sort · Name");
    expect(window.location.search).not.toContain("sort=");
  });
});

describe("the Deck state facet", () => {
  // ONE row. The phase it used to carry is `New` and `Draft` in Status now.
  const clean = () => deckOf({
    id: "clean", name: "a deck", lastCommittedAt: new Date("2026-09-01T00:00:00Z"), pendingChanges: 0,
  });
  const moved = () => deckOf({
    id: "moved", name: "mid-tinker", lastCommittedAt: new Date("2026-09-01T00:00:00Z"), pendingChanges: 4,
  });

  it("filters to the edited drafts from the sheet, and writes the URL", () => {
    render(view([clean(), moved()]));
    openFilters();
    fireEvent.click(screen.getAllByRole("checkbox", { name: "Edited since last version" })[0]);
    expect(window.location.search).toBe("?state=pending");
    expect(screen.getByText("mid-tinker")).toBeInTheDocument();
    expect(screen.queryByText("a deck")).not.toBeInTheDocument();
  });

  it("offers no row for the phase, which Status owns now", () => {
    render(view([clean(), moved()]));
    openFilters();
    expect(screen.queryByRole("checkbox", { name: "Not committed yet" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("checkbox", { name: "Draft" }).length).toBeGreaterThan(0);
  });

  it("carries a removable chip like every other value", () => {
    render(view([clean(), moved()]));
    openFilters();
    fireEvent.click(screen.getAllByRole("checkbox", { name: "Edited since last version" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Remove filter: Edited since last version" }));
    expect(window.location.search).toBe("");
  });

  it("draws its own heading in the wide form, after Status", () => {
    renderWide(view([clean(), moved()]));
    const status = screen.getByRole("button", { name: /Status/ });
    const state = screen.getByRole("button", { name: /Deck state/ });
    expect(status.compareDocumentPosition(state) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
