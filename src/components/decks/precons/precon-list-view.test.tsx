import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { PreconRow } from "../../../lib/precons/list";
import type { AnnouncedProps } from "../../../lib/precons/announced";
import { parsePreconParams } from "../../../lib/precons/list";

// The real write, so the live query sees the address the view wrote, as it does in the app.
vi.mock("../../../lib/url/mirror", () => ({ mirrorUrl: (href: string) => window.history.replaceState(null, "", href) }));
import { PreconListView } from "./precon-list-view";
import { PreconsDown } from "./precons-down";
import { arrivalsAcknowledged, resetArrivalsAcknowledged } from "../../home/arrivals-seen";

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

  it("draws the list thumb from the small render, and from the full one where there is none", async () => {
    const art = (name: string, over: Partial<PreconRow["commanders"][number]>) =>
      row(name, "2024-01-01", { commanders: [{ oracleId: `${name}-c`, name: `${name} C`, imageUri: `https://img/${name}-n.jpg`, colorIdentity: ["G"], ...over }] });
    const { container } = render(
      <PreconListView
        rows={[art("Small", { imageUriSmall: "https://img/Small-s.jpg" }), art("Plain", {})]}
        hasCollection fromNew={false} initial={{ q: "", colours: [], order: null, view: "rows" }} query=""
      />,
    );
    const seen = () => [...container.querySelectorAll('[data-commander-thumb="list"] img')].map((i) => i.getAttribute("src"));
    await waitFor(() => expect(seen()).toContain("https://img/Plain-n.jpg"));
    expect(seen()).toContain("https://img/Small-s.jpg");
    expect(seen()).not.toContain("https://img/Small-n.jpg");
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

  it("writes no view after a switch back to tiles, through a later filter's mirror", () => {
    view();
    fireEvent.click(screen.getByRole("button", { name: "Rows view" }));
    fireEvent.click(screen.getByRole("button", { name: "Tiles view" }));
    const search = screen.getAllByRole("searchbox")[0] ?? screen.getAllByRole("textbox")[0];
    fireEvent.change(search, { target: { value: "eldrazi" } });
    expect(window.location.search).toBe("?q=eldrazi");
    expect(screen.getByRole("button", { name: "Tiles view" })).toHaveAttribute("aria-pressed", "true");
  });
});

describe("PreconListView, the Announced group (upcoming precons)", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/decks/precons");
    window.localStorage.clear();
    document.cookie = "precons_view=; Max-Age=0; Path=/";
    document.cookie = "precons_announced=; Max-Age=0; Path=/";
  });
  const trc: AnnouncedProps["sets"][number] = {
    code: "trc", name: "Star Trek Commander", releasesOn: "2026-11-13", released: false, cardCount: 41,
    parentName: null, arrivedAt: null, seen: false,
  };
  const announced: AnnouncedProps = {
    sets: [trc],
    commanders: { trc: [{ oracleId: "chapel", name: "Christine Chapel, Combat Medic", colorIdentity: ["W"], imageUriSmall: null, collectorNumber: "78" }] },
    today: "2026-10-14",
    newCodes: [],
    opensByItself: false,
  };
  const draw = (initial: Parameters<typeof PreconListView>[0]["initial"] = { q: "", colours: [], order: null, view: null }, over: Partial<Parameters<typeof PreconListView>[0]> = {}) =>
    render(<PreconListView rows={rows} hasCollection fromNew={false} initial={initial} query="" announced={announced} {...over} />);
  const group = () => screen.queryByTestId("announced-group");

  it("sits above the newest year in Newest order", () => {
    draw();
    const heads = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(heads[0]).toMatch(/^Announced/);
    expect(heads[1]).toMatch(/^2026/);
  });

  it("is hidden under Most owned (T7)", () => {
    draw({ q: "", colours: [], order: "owned", view: null });
    expect(group()).toBeNull();
  });

  it("is hidden under a Most owned this browser saved, and drawn when the URL says sort=newest", () => {
    window.localStorage.setItem("the99:precons:order", "owned");
    const { unmount } = draw();
    expect(group()).toBeNull();
    unmount();
    window.history.replaceState(null, "", "/decks/precons?sort=newest#announced");
    draw({ q: "", colours: [], order: "newest", view: null }, { query: "sort=newest" });
    expect(group()).not.toBeNull();
    expect(screen.getByRole("button", { name: /^Announced/ })).toHaveAttribute("aria-expanded", "true");
  });

  it("filters with the list, adds the sets to the result line, and draws no-match only when both are empty (T6)", () => {
    draw();
    const search = screen.getAllByRole("searchbox")[0] ?? screen.getAllByRole("textbox")[0];
    fireEvent.change(search, { target: { value: "chapel" } });
    expect(screen.getAllByText("0 of 2 decklists · 1 announced set").length).toBeGreaterThan(0);
    expect(group()).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Clear the search" })).toBeNull();
    fireEvent.change(search, { target: { value: "zzzz" } });
    expect(group()).toBeNull();
    expect(screen.getByRole("button", { name: "Clear the search" })).toBeInTheDocument();
  });

  it("opens the group while a search matches a set in it, closed as stored otherwise", () => {
    draw();
    const head = () => screen.getByRole("button", { name: /^Announced/ });
    expect(head()).toHaveAttribute("aria-expanded", "false");
    const search = screen.getAllByRole("searchbox")[0] ?? screen.getAllByRole("textbox")[0];
    fireEvent.change(search, { target: { value: "chapel" } });
    expect(head()).toHaveAttribute("aria-expanded", "true");
    fireEvent.change(search, { target: { value: "" } });
    expect(head()).toHaveAttribute("aria-expanded", "false");
  });

  it("hands the cookie's press to the group, so the server draws it open", () => {
    draw(undefined, { storedAnnounced: "open" });
    expect(screen.getByRole("button", { name: /^Announced/ })).toHaveAttribute("aria-expanded", "true");
  });

  const head = () => screen.getByRole("button", { name: /^Announced/ });
  const searchBox = () => screen.getAllByRole("searchbox")[0] ?? screen.getAllByRole("textbox")[0];
  const pickOrder = (label: RegExp) => {
    fireEvent.click(screen.getByRole("button", { name: /^Sort · / }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: label }));
  };

  it("keeps a #announced arrival open through a no-match search and its clearing (the mirror drops the hash)", () => {
    window.localStorage.setItem("the99:precons:announced", "closed");
    window.history.replaceState(null, "", "/decks/precons#announced");
    draw();
    expect(head()).toHaveAttribute("aria-expanded", "true");
    fireEvent.change(searchBox(), { target: { value: "zzzz" } });
    expect(group()).toBeNull();
    expect(window.location.hash).toBe("");
    fireEvent.change(searchBox(), { target: { value: "" } });
    expect(head()).toHaveAttribute("aria-expanded", "true");
  });

  it("keeps a news group the reader closed by hand closed through a no-match search", () => {
    draw(undefined, { announced: { ...announced, opensByItself: true, newCodes: ["trc"] } });
    expect(head()).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(head());
    fireEvent.change(searchBox(), { target: { value: "zzzz" } });
    expect(group()).toBeNull();
    fireEvent.change(searchBox(), { target: { value: "" } });
    expect(head()).toHaveAttribute("aria-expanded", "false");
  });

  it("keeps the visit's state through Most owned and back", () => {
    window.history.replaceState(null, "", "/decks/precons#announced");
    draw(undefined, { announced: { ...announced, opensByItself: true, newCodes: ["trc"] } });
    fireEvent.click(head());
    expect(head()).toHaveAttribute("aria-expanded", "false");
    pickOrder(/Most owned/);
    expect(group()).toBeNull();
    pickOrder(/Newest/);
    expect(head()).toHaveAttribute("aria-expanded", "false");
  });

  it("keeps a #announced arrival open through Most owned and back", () => {
    window.localStorage.setItem("the99:precons:announced", "closed");
    window.history.replaceState(null, "", "/decks/precons#announced");
    draw();
    pickOrder(/Most owned/);
    expect(group()).toBeNull();
    pickOrder(/Newest/);
    expect(head()).toHaveAttribute("aria-expanded", "true");
  });

  it("keeps an explicit sort=newest through a filter's mirror, so a reload still reads Newest over a saved Most owned", () => {
    window.localStorage.setItem("the99:precons:order", "owned");
    window.history.replaceState(null, "", "/decks/precons?sort=newest#announced");
    draw({ q: "", colours: [], order: "newest", view: null }, { query: "sort=newest" });
    fireEvent.change(searchBox(), { target: { value: "chapel" } });
    expect(window.location.search).toBe("?q=chapel&sort=newest");
    expect(parsePreconParams(new URLSearchParams(window.location.search)).order).toBe("newest");
    // The view toggle's mirror keeps it too.
    fireEvent.click(screen.getByRole("button", { name: "Rows view" }));
    expect(new URLSearchParams(window.location.search).get("sort")).toBe("newest");
  });

  it("still writes Newest as absence when the address never named it", () => {
    draw();
    fireEvent.change(searchBox(), { target: { value: "chapel" } });
    expect(window.location.search).toBe("?q=chapel");
  });

  it("draws nothing when there is no announced data (switch off or read failed, T1, T9)", () => {
    draw(undefined, { announced: null });
    expect(group()).toBeNull();
  });

  it("marks a precon listed in the last 14 days `new ·` before `you own` (L2, L3)", () => {
    draw(undefined, { newFileNames: ["CallingAllAngels"] });
    const tiles = screen.getAllByRole("listitem").filter((li) => li.textContent?.includes("you own"));
    const angels = tiles.find((t) => t.textContent?.includes("Calling All Angels"))!;
    const eldrazi = tiles.find((t) => t.textContent?.includes("Eldrazi Unbound"))!;
    expect(angels.textContent).toContain("new · you own");
    expect(eldrazi.textContent).not.toContain("new ·");
  });

  it("tells Home's banner its visit acknowledged the arrivals, only when the page says it wrote keys", () => {
    resetArrivalsAcknowledged();
    const initial = { q: "", colours: [], order: null, view: null };
    const quiet = render(<PreconListView rows={rows} hasCollection fromNew={false} initial={initial} query="" />);
    expect(arrivalsAcknowledged(["trc"])).toBe(false);
    quiet.unmount();
    render(<PreconListView rows={rows} hasCollection fromNew={false} initial={initial} query="" acknowledgesArrivals={["trc"]} />);
    expect(arrivalsAcknowledged(["trc"])).toBe(true);
    expect(arrivalsAcknowledged(["trc", "lists:trc"])).toBe(false);
    resetArrivalsAcknowledged();
  });

  it("never acknowledges from the list's down state, which wrote nothing", () => {
    resetArrivalsAcknowledged();
    render(<PreconsDown />);
    expect(arrivalsAcknowledged(["trc"])).toBe(false);
  });
});
