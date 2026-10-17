import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

// A card opened from the search is shown by the search's own provider. A wishlist write made in it must ask the page
// behind for fresh tiles, but only on the Wishlist tab, whose tiles are the server's.
const nav = vi.hoisted(() => ({ pathname: "/collection/wishlist", refresh: vi.fn() }));
const captured = vi.hoisted(() => ({ onWishlistWrite: undefined as (() => void) | undefined }));

vi.mock("next/navigation", () => ({ usePathname: () => nav.pathname, useRouter: () => ({ refresh: nav.refresh }) }));
vi.mock("../cards/card-detail-provider", () => ({
  CardDetailProvider: (p: { onWishlistWrite?: () => void; children?: ReactNode }) => {
    captured.onWishlistWrite = p.onWishlistWrite;
    return null;
  },
  useCardDetail: () => ({ open: () => {}, pendingOracleId: null, openOracleId: null }),
}));

const { SearchLayer } = await import("./search-layer");

const props = {
  bodyEl: null,
  query: "",
  searching: false,
  phase: "idle" as const,
  rows: [],
  rowsFor: "",
  recentRows: [],
  recentsHeld: false,
  online: true,
  active: -1,
  returned: null,
  listboxId: "l",
  onPick: vi.fn(),
  onClear: vi.fn(),
  onRetry: vi.fn(),
  onAnnounce: vi.fn(),
  onCardDismissed: vi.fn(),
  onCardFailed: vi.fn(),
  onCardShown: vi.fn(),
  recentsFailed: false,
  open: true,
  openCardRef: { current: null },
};

describe("a wishlist write in a card the search opened", () => {
  it("asks the Wishlist tab behind for its tiles again", () => {
    nav.pathname = "/collection/wishlist";
    nav.refresh.mockClear();
    render(<SearchLayer {...props} />);
    captured.onWishlistWrite?.();
    expect(nav.refresh).toHaveBeenCalledTimes(1);
  });

  it("leaves every other route alone", () => {
    nav.pathname = "/collection";
    nav.refresh.mockClear();
    render(<SearchLayer {...props} />);
    expect(captured.onWishlistWrite).toBeTypeOf("function");
    captured.onWishlistWrite?.();
    expect(nav.refresh).not.toHaveBeenCalled();
  });
});
