// Add a card from anywhere, errata E5: the Edit copies toast in the shell, on a deck page. Where it stands is the
// page's (any provider's save lands in the deck stack), a sheet over the page holds it still, and the deck floor keeps
// one receipt, the newest, between it and I got it's.
import * as React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BrowseCard } from "../../lib/collection/browse";
import { collectionEditCopy } from "../../lib/copy/collection-edit";
import type { EditResult } from "./edit-copies-sheet";

vi.mock("next/navigation", () => ({
  usePathname: () => window.location.pathname,
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));
vi.mock("../../app/collection/actions", () => ({
  setCardArtPreference: vi.fn(async () => true),
  clearCardArtPreference: vi.fn(async () => {}),
}));
vi.mock("../../app/collection/edit-actions", () => ({ settleCollectionWrite: vi.fn(async () => {}) }));
vi.mock("../../app/collection/history-actions", () => ({ previewRevert: vi.fn(), revertCollectionEntry: vi.fn() }));
vi.mock("../../app/decks/assignment-actions", () => ({ assignCopy: vi.fn() }));
vi.mock("./revert-confirm", () => ({ RevertConfirm: () => <div role="dialog" aria-label="revert" /> }));
let sheetClose: (r: EditResult) => void = () => {};
vi.mock("./add-cards-sheet", () => ({
  AddCardsSheet: (p: { mode: string; card: { name: string }; onClose: (r: EditResult) => void }) => {
    sheetClose = p.onClose;
    return <div role="dialog" aria-label={`${p.mode} ${p.card.name}`} />;
  },
}));

const { CollectionEditToast, announceEditToast, armEditToast, TOAST_MS } = await import("./edit-toast");
const { DeckToastStackHost } = await import("../decks/deck-toast-stack");
const { COVERED_WITH_MAIN } = await import("../shell/covered-layer");
const { useInertPage } = await import("../../lib/a11y/inert-page");
const { CardDetailProvider, CardDetailTrigger } = await import("../cards/card-detail-provider");
await (await import("../cards/card-detail-provider")).warmCardModal();
const { CollectionEditScope } = await import("../cards/collection-edit-scope");
const { GotItReceipt } = await import("../decks/got-it-receipt");

const c = collectionEditCopy.copies;
const DECK_PATH = "/decks/441286bb-f632-4d1e-af0f-aa7282bbb40f";

beforeEach(() => {
  window.history.replaceState(null, "", DECK_PATH);
  vi.useFakeTimers({ shouldAdvanceTime: true });
});
afterEach(() => {
  cleanup();
  document.querySelectorAll("[data-deck-toast-stack]").forEach((el) => el.remove());
  window.history.replaceState(null, "", "/");
  vi.useRealTimers();
});

/** A sheet portalled into <main>, holding the rest of the page still as the app's side sheets do. */
function Sheet({ up }: { up: boolean }) {
  const [host, setHost] = React.useState<HTMLDivElement | null>(null);
  useInertPage(host, up);
  return <div ref={setHost} data-testid="sheet" />;
}

/** The shell's own shape around the toast: <main> in its column, the deck stack and the toast's wrapper beside it. */
function Shell({ children, sheetUp = false }: { children?: React.ReactNode; sheetUp?: boolean }) {
  return (
    <div>
      <div>
        <main>
          {children}
          <Sheet up={sheetUp} />
        </main>
      </div>
      <DeckToastStackHost />
      <div {...{ [COVERED_WITH_MAIN]: "" }} className="contents">
        <CollectionEditToast />
      </div>
    </div>
  );
}

const unowned: BrowseCard = {
  oracleId: "o-ghalta", name: "Ghalta, Primal Hunger", typeLine: "Creature", manaCost: "{10}{G}{G}", cmc: 12, oracleText: null,
  keywords: [], rarity: "rare", colorIdentity: ["G"], imageUri: null, printedName: null, quantity: 0, printings: [], setCodes: [],
  primarySetCode: "", preferredPrinting: null,
  availability: { owned: 0, hard: 0, soft: 0, free: 0, claims: [] } as unknown as BrowseCard["availability"],
};

describe("a save from a provider that is not the deck builder's, on a deck page", () => {
  it("stands its toast in the deck stack, as the search layer's provider (no deckId) does", async () => {
    render(
      <CollectionEditScope>
        <Shell>
          <CardDetailProvider fetchCard={vi.fn(async () => unowned)}>
            <CardDetailTrigger oracleId={unowned.oracleId} name={unowned.name}>open</CardDetailTrigger>
          </CardDetailProvider>
        </Shell>
      </CollectionEditScope>,
    );
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /View details for Ghalta/ })));
    await act(async () => fireEvent.click(await screen.findByTestId("edit-copies-link")));
    await screen.findByRole("dialog", { name: `edit ${unowned.name}` });
    await act(async () => sheetClose({ saved: { entryId: "e1", removed: false, total: 1, copiesRemoved: 0 } }));
    const toast = screen.getByText(c.saved(unowned.name, 1)).closest<HTMLElement>("[data-toast]")!;
    expect(toast.getAttribute("data-toast")).toBe("deck");
    expect(toast.closest("[data-deck-toast-stack]")).not.toBeNull();
  });
});

describe("a sheet over the page", () => {
  for (const [label, path] of [["the centre slot", "/collection"], ["the deck stack", DECK_PATH]] as const) {
    it(`makes the toast in ${label} inert and holds its window`, async () => {
      window.history.replaceState(null, "", path);
      const { rerender } = render(<Shell />);
      act(() => announceEditToast({ entryId: "e1", removed: false, text: c.saved("Sol Ring", 1) }));
      act(() => armEditToast());
      rerender(<Shell sheetUp />);
      // Under the sheet: Undo cannot be pressed, and the eight seconds do not run.
      expect(screen.getByRole("button", { name: c.undo, hidden: true }).closest("[inert]")).not.toBeNull();
      await act(async () => void vi.advanceTimersByTime(TOAST_MS + 1000));
      expect(screen.queryByText(c.saved("Sol Ring", 1))).not.toBeNull();
      // The sheet goes: the toast is live again and its window runs out.
      rerender(<Shell />);
      expect(screen.getByRole("button", { name: c.undo }).closest("[inert]")).toBeNull();
      await act(async () => void vi.advanceTimersByTime(TOAST_MS + 1000));
      expect(screen.queryByText(c.saved("Sol Ring", 1))).toBeNull();
    });
  }
});

describe("the deck floor's one receipt, the newest", () => {
  const written = { entryId: "g1", facts: { tookCopy: [], stillNeeds: 0 }, quantity: 1, setCode: "mom", collectorNumber: "137", finish: "nonfoil" as const };
  const host = () => ({ start: vi.fn(), end: vi.fn(), failedAway: vi.fn() });
  const gotIt = (onExpire: () => void) => (
    <GotItReceipt deckId="d1" oracleId="o-etali" cardName="Etali, Primal Conqueror" written={written} host={host()} onExpire={onExpire} />
  );

  it("dismisses I got it's receipt when an Add to collection's toast arrives after it", () => {
    const onExpire = vi.fn();
    render(<Shell>{gotIt(onExpire)}</Shell>);
    expect(onExpire).not.toHaveBeenCalled();
    act(() => announceEditToast({ entryId: "e1", removed: false, text: c.saved("Sol Ring", 1) }));
    expect(screen.getByText(c.saved("Sol Ring", 1))).toBeTruthy();
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it("dismisses the Add to collection toast when I got it's receipt arrives after it, and never for its own claim", () => {
    const { rerender } = render(<Shell />);
    act(() => announceEditToast({ entryId: "e1", removed: false, text: c.saved("Sol Ring", 1) }));
    expect(screen.getByText(c.saved("Sol Ring", 1))).toBeTruthy();
    rerender(<Shell>{gotIt(vi.fn())}</Shell>);
    expect(screen.queryByText(c.saved("Sol Ring", 1))).toBeNull();
  });
});
