import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import type { PreconRow } from "../../../lib/precons/list";

// The real write, so the live query sees the address the view wrote, as it does in the app.
vi.mock("../../../lib/url/mirror", () => ({ mirrorUrl: (href: string) => window.history.replaceState(null, "", href) }));
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
  beforeEach(() => window.history.replaceState(null, "", "/decks/precons"));
  const view = (initial = { q: "", colours: [] as string[], order: null }) =>
    render(<PreconListView rows={rows} hasCollection fromNew={false} initial={initial} query="" />);

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

  it("clears only the search when a search and colors both emptied the list", () => {
    view({ q: "zzzz", colours: ["B"], order: null });
    fireEvent.click(screen.getByRole("button", { name: "Clear the search" }));
    expect(screen.getByRole("button", { name: "Clear the colors" })).toBeInTheDocument();
  });

  it("shows a search as a chip that clears it", () => {
    view({ q: "eldrazi", colours: [], order: null });
    expect(screen.queryByText("No filters on")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /eldrazi/i }));
    expect(screen.getByText("Calling All Angels")).toBeInTheDocument();
  });

  it("follows a navigation to another precons URL while it stays mounted", () => {
    view();
    expect(screen.getByText("Eldrazi Unbound")).toBeInTheDocument();
    act(() => {
      window.history.pushState(null, "", "/decks/precons?q=angels");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(screen.queryByText("Eldrazi Unbound")).toBeNull();
    expect(screen.getAllByRole("searchbox")[0] ?? screen.getAllByRole("textbox")[0]).toHaveValue("angels");
  });

  it("names every shared deck, however many", () => {
    const three = [row("Eldrazi Unbound", "2023-08-04", { built: ["A", "B", "C"].map((n, i) =>
      ({ deckId: n, deckName: `Deck ${n}`, shared: 70 - i, sameCommanders: true })) })];
    render(<PreconListView rows={three} hasCollection fromNew={false} initial={{ q: "", colours: [], order: null }} query="" />);
    for (const n of ["A", "B", "C"]) expect(screen.getByRole("link", { name: `Deck ${n}` })).toBeInTheDocument();
  });

  it("draws a flat list, no year heads, in the most-owned order", () => {
    view({ q: "", colours: [], order: "owned" as never });
    expect(screen.queryAllByRole("heading", { level: 2 })).toHaveLength(0);
  });
});
