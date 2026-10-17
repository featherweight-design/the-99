import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { MutableRefObject, ReactNode } from "react";
import type { OpenCard } from "./search-layer";

// The veil over the page lifts when the card the search opened is DRAWN. The provider names the card open as soon as
// its data arrives, but keeps it pending until the modal's code has loaded and the dialog is up: lifting on the first
// would show the page again for the length of that download.
const detail = vi.hoisted(() => ({ openOracleId: null as string | null, pendingOracleId: null as string | null, open: vi.fn() }));

vi.mock("next/navigation", () => ({ usePathname: () => "/collection", useRouter: () => ({ refresh: () => {} }) }));
vi.mock("../cards/card-detail-provider", () => ({
  CardDetailProvider: ({ children }: { children?: ReactNode }) => <>{children}</>,
  useCardDetail: () => detail,
}));

const { SearchLayer } = await import("./search-layer");

const shown = vi.fn();
const failed = vi.fn();
const openCardRef: MutableRefObject<OpenCard | null> = { current: null };
const props = () => ({
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
  onCardFailed: failed,
  onCardShown: shown,
  recentsFailed: false,
  open: false,
  openCardRef,
});

describe("lifting the veil", () => {
  it("waits for the dialog, not for the card's data", () => {
    const view = render(<SearchLayer {...props()} />);
    openCardRef.current?.("o-1", [], null, null);

    // The read is out.
    detail.pendingOracleId = "o-1";
    view.rerender(<SearchLayer {...props()} />);
    expect(shown).not.toHaveBeenCalled();

    // The data is in, the modal's code is not: still pending.
    detail.openOracleId = "o-1";
    view.rerender(<SearchLayer {...props()} />);
    expect(shown).not.toHaveBeenCalled();
    expect(failed).not.toHaveBeenCalled();

    // The dialog is drawn.
    detail.pendingOracleId = null;
    view.rerender(<SearchLayer {...props()} />);
    expect(shown).toHaveBeenCalledTimes(1);
    expect(failed).not.toHaveBeenCalled();
  });
});
