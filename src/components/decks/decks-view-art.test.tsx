import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

// Which tiles draw their commander's art at once. Every crop asked for shares a slow line with the
// page's own startup, so only the first screen's are: the rest wait to come within a screen of view.
vi.mock("../../app/decks/folder-actions", () => ({
  createFolderAction: async () => ({ ok: false }),
  moveDeckAction: async () => true,
  renameFolderAction: async () => ({ ok: false }),
  deleteFolderAction: async () => true,
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(window.location.search),
  useRouter: () => ({ refresh: vi.fn(), prefetch: vi.fn() }),
}));

import { DecksView, EAGER_ART_TILES } from "./decks-view";
import type { DeckListItem } from "../../lib/decks/read";

const NOW = "2026-09-07T12:00:00.000Z";
const crop = (n: number) => `https://cards.scryfall.io/art_crop/front/a/b/deck-${n}.jpg`;
const deck = (n: number): DeckListItem => ({
  id: `d${n}`, name: `Deck ${String(n).padStart(2, "0")}`, commanderName: "Atraxa, Praetors' Voice",
  commanderColorIdentity: ["W", "U", "B", "G"], commanderImageUri: null, commanderArtCropUri: crop(n),
  partnerName: null, partnerColorIdentity: null, folderId: null, folderName: null, statusPill: "Complete",
  bracket: null, built: 99, ownedCount: 99, toBuyCount: 0, unresolvedCount: 0, pendingChanges: 0,
  versionNumber: null, createdAt: new Date("2026-01-01T00:00:00Z"), lastPlayedAt: null,
  lastEditedAt: new Date("2026-09-01T00:00:00Z"), lastCommittedAt: null, inUseElsewhere: 0, proxiedCount: 0,
});

beforeEach(() => {
  window.history.replaceState(null, "", "/decks");
  // An observer that never reports: a deferred tile stays deferred for the whole test.
  vi.stubGlobal("IntersectionObserver", class { observe() {} disconnect() {} unobserve() {} takeRecords() { return []; } });
});

describe("DecksView: commander art", () => {
  it(`draws the first ${EAGER_ART_TILES} tiles' art at once, and defers every tile after`, () => {
    const decks = Array.from({ length: EAGER_ART_TILES + 3 }, (_, i) => deck(i + 1));
    render(
      <DecksView decks={decks} folders={[]} shopping={{ byDeck: new Map(), total: { copies: 0, cents: 0, pricedCopies: 0 } }} buildable={9} cards={1284} now={NOW} />,
    );
    const drawn = new Set(
      [...document.querySelectorAll<HTMLElement>(".art-wash-art")].map((el) => el.style.backgroundImage).filter(Boolean),
    );
    expect([...drawn].sort()).toEqual(decks.slice(0, EAGER_ART_TILES).map((d) => `url("${d.commanderArtCropUri}")`).sort());
  });
});
