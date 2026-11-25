import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BrowsePrinting } from "../../lib/collection/browse";
import { PrintingStrip, type StripPrinting } from "./printing-strip";
import { panelGroups } from "./printings-panel";
import { printingStripCopy } from "../../lib/copy/collection";

vi.mock("../../lib/ui/reveal", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../lib/ui/reveal")>()),
  reveal: vi.fn(() => () => {}),
}));

afterEach(cleanup);

const p = (over: Partial<StripPrinting>): StripPrinting => ({
  setCode: "AAA", setName: "Alpha Set", collectorNumber: "1", releasedAt: "2021-04-23", quantity: 0,
  finishes: {}, imageUri: null, flavorName: null, ...over,
} as BrowsePrinting);

const A = p({ scryfallId: "a", setCode: "AAA", setName: "Alpha Set", collectorNumber: "1" });
const B = p({ scryfallId: "b", setCode: "BBB", setName: "Beta Set", collectorNumber: "22", mine: true, quantity: 2 });
const B2 = p({ scryfallId: "b2", setCode: "BBB", setName: "Beta Set", collectorNumber: "23" });
const C = p({ scryfallId: "c", setCode: "SLD", setName: "Secret Lair Drop", collectorNumber: "999", mine: true, quantity: 1, pick: true });

describe("panelGroups", () => {
  it("lists yours first, then the rest, with counts in the heads", () => {
    const { groups } = panelGroups([A, B, B2, C], "");
    expect(groups.map((g) => g.label)).toEqual(["In your collection · 2", "Other printings · 2"]);
    expect(groups[0].items.map((x) => x.scryfallId)).toEqual(["b", "c"]);
  });
  it("is one ungrouped grid when nothing is owned", () => {
    const { groups } = panelGroups([A, B2], "");
    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe("");
  });
  it("drops the other-printings head when everything is owned", () => {
    const { groups } = panelGroups([B, C], "");
    expect(groups.map((g) => g.label)).toEqual(["In your collection · 2"]);
  });
  it("matches set name, set code and collector number, grouped by set in list order", () => {
    expect(panelGroups([A, B, B2, C], "beta").groups.map((g) => [g.label, g.items.length])).toEqual([["Beta Set", 2]]);
    expect(panelGroups([A, B, B2, C], "sld").hits.map((x) => x.scryfallId)).toEqual(["c"]);
    expect(panelGroups([A, B, B2, C], "23").hits.map((x) => x.scryfallId)).toEqual(["b2"]);
  });
  it("finds nothing for a query that matches no printing", () => {
    expect(panelGroups([A, B], "zzz").hits).toEqual([]);
  });
});

function Harness({ onSelect = vi.fn() }: { onSelect?: (x: StripPrinting) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <PrintingStrip
      printings={[A, B, B2, C]} shownKey="a" onSelect={onSelect} onAnnounce={() => {}} cardName="Swan Song"
      colorIdentity={["U"]} paddles panelOpen={open} onPanelOpen={() => setOpen(true)} onPanelClose={() => setOpen(false)}
    />
  );
}

describe("the Search tile and panel", () => {
  it("draws the tile only on desktop, ahead of the thumbs, and keeps the shown thumb the one tab stop", () => {
    render(<Harness />);
    const tile = screen.getByRole("button", { name: printingStripCopy.searchTileAria });
    expect(tile.tabIndex).toBe(-1);
    expect(screen.getAllByRole("button", { pressed: true })[0].tabIndex).toBe(0);
  });
  it("is absent without the desktop flag", () => {
    render(<PrintingStrip printings={[A, B]} shownKey="a" onSelect={() => {}} onAnnounce={() => {}} cardName="X" colorIdentity={[]} />);
    expect(screen.queryByRole("button", { name: printingStripCopy.searchTileAria })).toBeNull();
  });
  it("opens on the tile with focus on the panel, not the search field, and closes on the X, returning focus to the tile", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: printingStripCopy.searchTileAria }));
    expect(screen.getByTestId("printings-panel")).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByTestId("printings-panel"));
    expect(document.activeElement).not.toBe(screen.getByPlaceholderText("Search 4 printings by set"));
    fireEvent.click(screen.getByRole("button", { name: printingStripCopy.panelClose }));
    expect(screen.queryByTestId("printings-panel")).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: printingStripCopy.searchTileAria }));
  });
  it("filters by a query, counts the matches, and says so when none match", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: printingStripCopy.searchTileAria }));
    const field = screen.getByPlaceholderText("Search 4 printings by set");
    fireEvent.change(field, { target: { value: "beta" } });
    expect(screen.getByText("2 of 4 printings")).toBeTruthy();
    fireEvent.change(field, { target: { value: "zzz" } });
    expect(screen.getByText("No printings match “zzz”")).toBeTruthy();
  });
  it("selects a printing without closing the panel", () => {
    const onSelect = vi.fn();
    render(<Harness onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: printingStripCopy.searchTileAria }));
    const panel = screen.getByTestId("printings-panel");
    fireEvent.click(panel.querySelector('button[aria-label^="Beta Set, number 23"]')!);
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ scryfallId: "b2" }));
    expect(screen.getByTestId("printings-panel")).toBeTruthy();
  });
  it("labels an owned thumb with its count and a pick with the diamond", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: printingStripCopy.searchTileAria }));
    const panel = screen.getByTestId("printings-panel");
    expect(panel.textContent).toContain("BBB ×2");
    expect(panel.textContent).toContain("◆ SLD");
  });
});
