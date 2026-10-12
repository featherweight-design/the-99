import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { PreconRow } from "../../../lib/precons/list";

vi.mock("../../../lib/url/mirror", () => ({ mirrorUrl: vi.fn() }));
import { PreconListView } from "./precon-list-view";

const row = (name: string, releaseDate: string, over: Partial<PreconRow> = {}): PreconRow => ({
  fileName: name.replace(/\W/g, ""), name, setCode: "SET", releaseDate, twinName: null,
  commanders: [{ oracleId: `${name}-c`, name: `${name} Commander`, imageUri: null, colorIdentity: ["G"] }],
  identity: ["G"], owned: 10, of: 80, unmapped: 0, built: [], ...over,
});

const rows = [
  row("Eldrazi Unbound", "2023-08-04", { built: [{ deckId: "d1", deckName: "HD - Eldrazi", shared: 73, sameCommanders: true }] }),
  row("Calling All Angels", "2026-10-02", { identity: ["W"] }),
];

describe("PreconListView", () => {
  const view = (initial = { q: "", colours: [] as string[], order: null }) =>
    render(<PreconListView rows={rows} hasCollection fromNew={false} initial={initial} />);

  it("lists newest first under year heads, with the shared deck linked", () => {
    view();
    const heads = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(heads[0]).toMatch(/^2026/);
    expect(screen.getByRole("link", { name: "HD - Eldrazi" })).toHaveAttribute("href", "/decks/d1");
  });

  it("searches by commander, and offers to clear a search that matches nothing", () => {
    view();
    const search = screen.getAllByRole("searchbox")[0] ?? screen.getAllByRole("textbox")[0];
    fireEvent.change(search, { target: { value: "angels commander" } });
    expect(screen.queryByText("Eldrazi Unbound")).toBeNull();
    fireEvent.change(search, { target: { value: "zzzz" } });
    expect(screen.getByRole("button", { name: "Clear the search" })).toBeInTheDocument();
  });

  it("offers to clear the colors when only the colors emptied the list", () => {
    view({ q: "", colours: ["B"], order: null });
    expect(screen.getByRole("button", { name: "Clear the colors" })).toBeInTheDocument();
  });

  it("draws a flat list, no year heads, in the most-owned order", () => {
    view({ q: "", colours: [], order: "owned" as never });
    expect(screen.queryAllByRole("heading", { level: 2 })).toHaveLength(0);
  });
});
