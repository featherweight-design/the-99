import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { swapToolsCopy } from "../../lib/copy/swap-tools";
import type { FitsRead } from "../../lib/swaps/fits";
import type { FitsReadPanel } from "../../lib/swaps/fits-read-run";
import type { StoredFitsRead } from "../../lib/swaps/fits-read-state";
import { FitsViewDrawing, fitsCandidateKey, fitsCandidates, type FitsViewDrawingProps } from "./fits-view-drawing";

// The drawing half draws from props alone: no server action is mocked here because none is imported.
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
  useLinkStatus: () => ({ pending: false }),
}));

// The preview itself is `hover-preview.test.tsx`'s.
vi.mock("../ui/preview-button", () => ({
  PreviewButton: ({ imageUri, ...props }: { imageUri: string | null } & React.ButtonHTMLAttributes<HTMLButtonElement>) =>
    <button data-preview={imageUri ?? ""} {...props} />,
}));

const copy = swapToolsCopy.fits;
const r = copy.read;

const fitsRead = (over: Partial<FitsRead> = {}): FitsRead => ({
  card: { oracleId: "o-ajani", name: "Ajani Unrelenting", colorIdentity: ["W"], commanderLegal: true, role: "other" },
  staple: false, owned: 1, free: 1,
  fits: [
    { id: "d-gob", name: "Goblins", commanders: ["Krenko, Mob Boss"], need: null, reason: null },
    { id: "d-kra", name: "Kratos", commanders: ["Kratos, God of War"], need: null, reason: null },
  ],
  holds: [{ id: "d-held", name: "Angels", commanders: ["Aurelia"], quantity: 1 }],
  excluded: [],
  ...over,
});
const stored = (over: Partial<StoredFitsRead> = {}): StoredFitsRead => ({
  readId: "r1", outcome: "picks", refunded: false, at: "2026-10-12T20:00:00Z", candidates: 2,
  changed: [], setChanged: false, resolved: [], current: true,
  picks: [{
    deckId: "d-gob", planSource: "v2", cut: "o-cut",
    parts: [{ card: "o-ajani" }, { text: " makes a body for " }, { card: "o-krenko" }, { text: " to double." }],
    cites: [],
  }],
  ...over,
});
const allowance = { used: 1, limit: 5, nextAt: null, reopensAt: null } as unknown as FitsReadPanel["allowance"];
const panelOf = (view: Partial<FitsReadPanel["view"]> = {}): FitsReadPanel => ({
  fits: fitsRead(), candidates: 2, planSources: { "d-gob": "v2", "d-kra": "none" },
  names: { "o-ajani": "Ajani Unrelenting", "o-krenko": "Krenko, Mob Boss", "o-cut": "Goblin Instigator" },
  images: {}, commanderIds: { "d-gob": ["o-krenko"] },
  allowance, view: { pending: null, stored: null, failed: null, ...view },
});

const fns = () => ({
  onBack: vi.fn(), onOpenCard: vi.fn(), onPress: vi.fn(), onToggleFold: vi.fn(), onRetryList: vi.fn(),
  onSwap: vi.fn(), onAddRead: vi.fn(), onAddFree: vi.fn(),
});
const props = (over: Partial<FitsViewDrawingProps> = {}): FitsViewDrawingProps => {
  const read = fitsRead();
  return {
    card: { oracleId: "o-ajani", colorIdentity: ["W"] }, name: "Ajani Unrelenting", owned: 1, freeNow: 1, countsKnown: true,
    panel: panelOf(),
    list: { read, shown: read.fits, holds: read.holds, role: "other", loadState: "ready", busy: null, refused: null, noteFor: () => null },
    running: null, now: 0, runCount: null, pressFailed: false, tooBigFor: null, fresh: null, foldOpen: false,
    busy: false, writing: false, refused: null, actFor: () => null, announced: "", bodyReady: true, restored: false, leaving: false,
    headingRef: createRef<HTMLHeadingElement>(),
    ...fns(), ...over,
  };
};

afterEach(cleanup);

describe("FitsViewDrawing (props only)", () => {
  it("draws the header, the offer and the free list, and each press calls its prop", () => {
    const p = props();
    render(<FitsViewDrawing {...p} />);
    expect(screen.getByRole("heading", { name: copy.pickerTitle })).toBeInTheDocument();
    expect(screen.getByTestId("fits-copies")).toHaveTextContent(copy.copies(1, 1));
    expect(screen.getByTestId("read-band-offer")).toHaveTextContent(r.offerLead(2, "Ajani Unrelenting"));
    expect(screen.getAllByTestId("fits-row")).toHaveLength(2);
    expect(screen.getByTestId("fits-holds-row")).toHaveTextContent("Angels");
    fireEvent.click(screen.getByRole("button", { name: r.backAria("Ajani Unrelenting") }));
    expect(p.onBack).toHaveBeenCalledTimes(1);
    fireEvent.click(within(screen.getByTestId("read-band-offer")).getByRole("button", { name: r.pressAria("Ajani Unrelenting") }));
    expect(p.onPress).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: copy.addUsesFreeAria("Ajani Unrelenting", "Kratos") }));
    expect(p.onAddFree).toHaveBeenCalledWith(expect.objectContaining({ id: "d-kra" }));
  });

  it("draws nothing under the header until the body is ready", () => {
    render(<FitsViewDrawing {...props({ bodyReady: false })} />);
    expect(screen.getByRole("heading", { name: copy.pickerTitle })).toBeInTheDocument();
    expect(screen.queryByTestId("read-band-offer")).toBeNull();
    expect(screen.queryAllByTestId("fits-row")).toHaveLength(0);
  });

  it("draws a stored read's row, folds the free list under it, and hands the row's presses their deck", () => {
    const p = props({ panel: panelOf({ stored: stored() }) });
    render(<FitsViewDrawing {...p} />);
    expect(screen.getByRole("region", { name: r.resultHead })).toBeInTheDocument();
    expect(screen.getByTestId("read-row-sentence")).toHaveTextContent("Ajani Unrelenting makes a body for Krenko, Mob Boss to double.");
    // The free list is folded behind its toggle once a read is drawn.
    expect(screen.queryAllByTestId("fits-row")).toHaveLength(0);
    fireEvent.click(screen.getByTestId("fits-fold"));
    expect(p.onToggleFold).toHaveBeenCalledTimes(1);
    const row = screen.getByTestId("read-row");
    fireEvent.click(within(row).getByRole("button", { name: r.swapInAria("Ajani Unrelenting", "Goblins", "Goblin Instigator") }));
    expect(p.onSwap).toHaveBeenCalledWith("d-gob", "o-cut", "Goblin Instigator");
  });

  it("draws the failed list with its retry, and the none-fit line when no deck can take the card", () => {
    const failed = props({ list: { ...props().list, read: null, shown: [], holds: [], loadState: "failed" }, panel: null });
    const { unmount } = render(<FitsViewDrawing {...failed} />);
    fireEvent.click(screen.getByRole("button", { name: swapToolsCopy.sheet.retry }));
    expect(failed.onRetryList).toHaveBeenCalledTimes(1);
    unmount();
    const none = fitsRead({ fits: [], holds: [] });
    render(<FitsViewDrawing {...props({ panel: panelOf(), list: { ...props().list, read: none, shown: [], holds: [] } })} />);
    expect(screen.getByText(copy.noneByColorsOne("Ajani Unrelenting", "white"))).toBeInTheDocument();
  });

  it("counts the decks a read would be for from the list as last read, falling back to the panel", () => {
    const panel = panelOf();
    expect(fitsCandidates(panel, null)).toBe(2);
    expect(fitsCandidates(panel, fitsRead({ fits: [] }))).toBe(0);
    expect(fitsCandidates(null, fitsRead())).toBe(0);
    expect(fitsCandidateKey(panel, null)).toBe("d-gob,d-kra");
  });
});
