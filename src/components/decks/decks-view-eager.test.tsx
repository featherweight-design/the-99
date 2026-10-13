import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";

// Which tiles opt into the phone prefetch. Each one is a full deck render on the server, so the
// count is what bounds a /decks visit's cost: the first two tiles the list draws, and no others.
vi.mock("../../app/decks/folder-actions", () => ({
  createFolderAction: async () => ({ ok: false }),
  moveDeckAction: async () => true,
  renameFolderAction: async () => ({ ok: false }),
  deleteFolderAction: async () => true,
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(window.location.search),
  useRouter: () => ({ refresh: vi.fn() }),
}));
// The link records the eager form it was given, so the test reads what the view asked for.
vi.mock("../ui/intent-prefetch-link", () => ({
  IntentPrefetchLink: ({ eager, href, onPrefetch, prefetch: _p, ...rest }: Record<string, unknown> & { href: string }) => (
    <a href={href} data-eager={String(eager ?? false)} onClick={() => eager && (onPrefetch as () => void)()} {...rest} />
  ),
}));

import { DecksView } from "./decks-view";
import type { DeckListItem } from "../../lib/decks/read";

const NOW = "2026-09-07T12:00:00.000Z";
const deck = (id: string, name: string, statusPill: DeckListItem["statusPill"] = "Complete"): DeckListItem => ({
  id, name, commanderName: "Atraxa, Praetors' Voice", commanderColorIdentity: ["W", "U", "B", "G"],
  commanderImageUri: null, commanderArtCropUri: null, partnerName: null, partnerColorIdentity: null,
  folderId: null, folderName: null, statusPill, bracket: null, built: 99, ownedCount: 99, toBuyCount: 0,
  unresolvedCount: 0, pendingChanges: 0, versionNumber: null, createdAt: new Date("2026-01-01T00:00:00Z"),
  lastPlayedAt: null, lastEditedAt: new Date("2026-09-01T00:00:00Z"), lastCommittedAt: null,
  inUseElsewhere: 0, proxiedCount: 0,
});
const DECKS = [deck("c", "Cyclonic"), deck("a", "Atraxa"), deck("d", "Dimir", "Draft"), deck("b", "Brago")];

function eagerTiles(): string[] {
  render(
    <DecksView decks={DECKS} folders={[]} shopping={{ byDeck: new Map(), total: { copies: 0, cents: 0, pricedCopies: 0 } }} buildable={9} cards={1284} now={NOW} />,
  );
  return [...document.querySelectorAll<HTMLAnchorElement>('a[data-eager="phone-in-view"]')].map((a) => a.getAttribute("href")!);
}

beforeEach(() => window.history.replaceState(null, "", "/decks"));

describe("DecksView: the tiles that prefetch on a phone", () => {
  it("are the first two the list draws", () => {
    expect(eagerTiles()).toEqual(["/decks/a", "/decks/b"]);
  });

  // The mocked link "starts" its prefetch on a click, so a test decides when the budget is spent.
  const shopping = { byDeck: new Map(), total: { copies: 0, cents: 0, pricedCopies: 0 } };
  const view = (cards: number) => <DecksView decks={DECKS} folders={[]} shopping={shopping} buildable={9} cards={cards} now={NOW} />;
  const eager = () =>
    [...document.querySelectorAll<HTMLAnchorElement>('a[data-eager="phone-in-view"]')].map((a) => a.getAttribute("href")!);

  it("move with the list until a prefetch has started, as a stored sort landing after hydration does", () => {
    const { rerender } = render(view(1284));
    expect(eager()).toEqual(["/decks/a", "/decks/b"]);
    act(() => window.history.replaceState(null, "", "/decks?status=Draft"));
    rerender(view(1283));
    expect(eager()).toEqual(["/decks/d"]);
  });

  it("promote no more once two prefetches have started in the visit", () => {
    const { rerender } = render(view(1284));
    act(() => {
      for (const a of document.querySelectorAll<HTMLAnchorElement>('a[data-eager="phone-in-view"]')) a.click();
    });
    act(() => window.history.replaceState(null, "", "/decks?status=Draft"));
    rerender(view(1283));
    expect([...document.querySelectorAll("a[data-eager]")].map((a) => a.getAttribute("href"))).toEqual(["/decks/d"]);
    expect(eager()).toEqual([]);
  });

  it("never makes a spent deck eager again, even when it returns to the top", () => {
    const { rerender } = render(view(1284));
    act(() => document.querySelector<HTMLAnchorElement>('a[href="/decks/a"]')!.click());
    act(() => window.history.replaceState(null, "", "/decks?status=Draft"));
    rerender(view(1283));
    act(() => window.history.replaceState(null, "", "/decks"));
    rerender(view(1282));
    expect(eager()).toEqual(["/decks/b"]);
  });
});
