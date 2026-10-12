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
  row("Eldrazi Unbound", "2023-08-04", { built: [{ deckId: "d1", deckName: "HD - Eldrazi", shared: 73, sameCommanders: true, linked: false }] }),
  row("Calling All Angels", "2026-10-02", { identity: ["W"] }),
];

describe("PreconListView", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/decks/precons");
    window.localStorage.clear();
    document.cookie = "precons_view=; Max-Age=0; Path=/";
  });
  const view = (initial: Parameters<typeof PreconListView>[0]["initial"] = { q: "", colours: [], order: null, view: null }) =>
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
    view({ q: "", colours: ["B"], order: null, view: null });
    expect(screen.getByRole("button", { name: "Clear the colors" })).toBeInTheDocument();
  });

  it("clears only the search when a search and colors both emptied the list", () => {
    view({ q: "zzzz", colours: ["B"], order: null, view: null });
    fireEvent.click(screen.getByRole("button", { name: "Clear the search" }));
    expect(screen.getByRole("button", { name: "Clear the colors" })).toBeInTheDocument();
  });

  it("shows a search as a chip that clears it", () => {
    view({ q: "eldrazi", colours: [], order: null, view: null });
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
      ({ deckId: n, deckName: `Deck ${n}`, shared: 70 - i, sameCommanders: true, linked: false })) })];
    render(<PreconListView rows={three} hasCollection fromNew={false} initial={{ q: "", colours: [], order: null, view: null }} query="" />);
    for (const n of ["A", "B", "C"]) expect(screen.getByRole("link", { name: `Deck ${n}` })).toBeInTheDocument();
  });

  it("gives each deck its own row line once one is linked, the linked one saying so (K9)", () => {
    const linked = [row("Sultai Arisen", "2025-04-11", { built: [
      { deckId: "s", deckName: "HD Tune - Sultai Arisen", shared: 71, sameCommanders: true, linked: true },
      { deckId: "m", deckName: "HD Tune - Mutant Menace", shared: 52, sameCommanders: false, linked: false },
    ] })];
    render(<PreconListView rows={linked} hasCollection fromNew={false} initial={{ q: "", colours: [], order: null, view: "rows" }} query="" />);
    const lines = ["HD Tune - Sultai Arisen", "HD Tune - Mutant Menace"]
      .map((name) => screen.getByRole("link", { name }).parentElement!.textContent);
    expect(lines).toEqual([
      "your deck HD Tune - Sultai Arisen · built from this · 71 shared",
      "your deck HD Tune - Mutant Menace · 52 shared",
    ]);
  });

  it("draws a flat list, no year heads, in the most-owned order", () => {
    view({ q: "", colours: [], order: "owned", view: null });
    expect(screen.queryAllByRole("heading", { level: 2 })).toHaveLength(0);
  });

  it("draws tiles by default, the commander spoken in each tile's link", () => {
    view();
    expect(screen.getByRole("button", { name: "Tiles view" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("link", { name: /^Eldrazi Unbound, with Eldrazi Unbound Commander\. You own 10 of 80/ })).toBeInTheDocument();
    expect(window.location.search).toBe("");
  });

  it("switches to rows, writes view=rows and remembers it, and back to tiles writes nothing", () => {
    view();
    fireEvent.click(screen.getByRole("button", { name: "Rows view" }));
    expect(screen.getByRole("button", { name: "Rows view" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("link", { name: "Eldrazi Unbound. You own 10 of 80 of its cards." })).toBeInTheDocument();
    expect(window.location.search).toBe("?view=rows");
    expect(window.localStorage.getItem("the99:precons:view")).toBe("rows");
    expect(document.cookie).toContain("precons_view=rows");
    fireEvent.click(screen.getByRole("button", { name: "Tiles view" }));
    expect(window.location.search).toBe("");
  });

  it("draws the view the server read from the cookie, and the URL's over it", () => {
    render(<PreconListView rows={rows} hasCollection fromNew={false} initial={{ q: "", colours: [], order: null, view: null }} query="" storedView="rows" />);
    expect(screen.getByRole("button", { name: "Rows view" })).toHaveAttribute("aria-pressed", "true");
  });

  it("keeps the view through a search's mirror", () => {
    view({ q: "", colours: [], order: null, view: "rows" });
    const search = screen.getAllByRole("searchbox")[0] ?? screen.getAllByRole("textbox")[0];
    fireEvent.change(search, { target: { value: "eldrazi" } });
    expect(window.location.search).toBe("?q=eldrazi&view=rows");
  });

  it("keeps an explicit ?view=tiles through a filter's mirror, over a stored rows", () => {
    window.localStorage.setItem("the99:precons:view", "rows");
    window.history.replaceState(null, "", "/decks/precons?view=tiles");
    view({ q: "", colours: [], order: null, view: "tiles" });
    expect(screen.getByRole("button", { name: "Tiles view" })).toHaveAttribute("aria-pressed", "true");
    const search = screen.getAllByRole("searchbox")[0] ?? screen.getAllByRole("textbox")[0];
    fireEvent.change(search, { target: { value: "eldrazi" } });
    expect(window.location.search).toBe("?q=eldrazi&view=tiles");
  });
});
