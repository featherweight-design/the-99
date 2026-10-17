import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import type { AnnouncedMatch } from "../../../lib/precons/arrivals";
import type { RevealedCommander } from "../../../lib/precons/revealed";
import type { UpcomingSet } from "../../../lib/precons/upcoming";
import { ANNOUNCED_KEY, AnnouncedGroup, announcedPrintings, useAnnouncedVisit, type AnnouncedGroupProps } from "./announced-group";
import { AnnouncedSet, TILE_FOCUS_RING } from "./announced-parts";
import { PRECON_TILES_CLASS } from "./precon-grid";
import { TILE_SHELL } from "../../ui/card-tile-caption";

// The shared card-details trigger and hover-preview provider, passed through untouched but recorded, so a test can
// say the revealed commanders are drawn by THOSE components (import identity) and with what.
const shared = vi.hoisted(() => ({ triggers: [] as Array<Record<string, unknown>>, previewProviders: 0 }));
vi.mock("../../cards/card-detail-provider", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../cards/card-detail-provider")>();
  return {
    ...actual,
    CardDetailTrigger: (props: Parameters<typeof actual.CardDetailTrigger>[0]) => {
      shared.triggers.push(props as unknown as Record<string, unknown>);
      return <span data-shared-trigger>{actual.CardDetailTrigger(props)}</span>;
    },
  };
});
// Card details' read, held open by the test so it can land after the group closed. The press's read and the intent
// prefetch a focused trigger starts are held alike, so whichever one the press waits on is the one a test resolves.
const details = vi.hoisted(() => ({ resolve: null as null | ((card: unknown) => void) }));
vi.mock("../../../app/card-detail-action", () => ({
  getCardDetail: vi.fn(() => new Promise((resolve) => { details.resolve = resolve; })),
}));
vi.mock("../../../lib/cards/fetch-card-detail", () => ({
  fetchCardDetail: vi.fn(() => new Promise((resolve) => { details.resolve = resolve; })),
}));
vi.mock("../../../app/collection/actions", () => ({
  setCardArtPreference: vi.fn(async () => true),
  clearCardArtPreference: vi.fn(async () => {}),
}));
vi.mock("../hover-preview", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../hover-preview")>();
  return {
    ...actual,
    HoverPreviewProvider: (props: Parameters<typeof actual.HoverPreviewProvider>[0]) => {
      shared.previewProviders += 1;
      return <div data-shared-preview>{actual.HoverPreviewProvider(props)}</div>;
    },
  };
});

/** The group with its visit state held one level up, as the list view holds it. */
function G(props: Omit<AnnouncedGroupProps, "visit">) {
  const visit = useAnnouncedVisit();
  return <AnnouncedGroup visit={visit} {...props} />;
}

const set = (code: string, name: string, releasesOn: string, over: Partial<UpcomingSet> = {}): UpcomingSet => ({
  code, name, releasesOn, released: false, cardCount: 40, parentName: null, arrivedAt: null, seen: false, ...over,
});
const commander = (n: number, name = `TRC commander ${n}`, colorIdentity = ["W"]): RevealedCommander => ({
  oracleId: `o${n}`, name, colorIdentity, imageUriSmall: `https://img/${n}.jpg`, imageUri: `https://img/normal/${n}.jpg`, collectorNumber: String(n),
  backImageUri: null, scryfallId: `s${n}`,
});
const match = (s: UpcomingSet, commanders: RevealedCommander[], revealed = commanders.length): AnnouncedMatch => ({
  set: s, commanders, matched: commanders.length, revealed,
});

const trcCards = [commander(78, "Christine Chapel, Combat Medic"), ...Array.from({ length: 14 }, (_, i) => commander(100 + i))];
const trc = match(set("trc", "Star Trek Commander", "2026-11-13"), trcCards);
const mdc = match(set("mdc", "Darkhold Destiny Commander", "2027-04-09"), [commander(1, "Gargantos, the Endbringer", ["B", "G"])]);

const draw = (over: Partial<Omit<AnnouncedGroupProps, "visit">> = {}) =>
  render(
    <G matches={[trc, mdc]} today="2026-10-14" newCodes={[]} opensByItself={false} view="tiles" listed={{}} {...over} />,
  );
const head = () => screen.getByRole("button", { name: /^Announced/ });
const region = (container: HTMLElement) => container.querySelector("#announced-sets") as HTMLElement;

describe("AnnouncedGroup", () => {
  beforeEach(() => {
    shared.triggers.length = 0;
    shared.previewProviders = 0;
    details.resolve = null;
    window.localStorage.clear();
    window.history.replaceState(null, "", "/decks/precons");
    document.cookie = "precons_announced=; Max-Age=0; Path=/";
  });

  it("is closed by default, a heading button with the count and the next release (C1)", () => {
    const { container } = draw();
    expect(screen.getByRole("heading", { level: 2 })).toContainElement(head());
    expect(head()).toHaveAttribute("aria-expanded", "false");
    expect(head()).toHaveAttribute("aria-controls", "announced-sets");
    expect(head()).toHaveTextContent("2 sets · next Nov 13");
    expect(region(container)).toHaveAttribute("inert");
  });

  it("opens by itself when it holds news, and shows the new tag (C2)", () => {
    const { container } = draw({ opensByItself: true, newCodes: ["trc"] });
    expect(head()).toHaveAttribute("aria-expanded", "true");
    expect(head()).toHaveTextContent("2 sets");
    expect(head()).not.toHaveTextContent("next");
    expect(region(container)).not.toHaveAttribute("inert");
    const trcBlock = screen.getAllByTestId("announced-set")[0];
    expect(within(trcBlock).getByRole("heading", { level: 3 })).toHaveTextContent("Star Trek Commander");
    expect(within(trcBlock).getByText("new")).toBeInTheDocument();
  });

  it("opens by itself on the banner's #announced link", () => {
    window.history.replaceState(null, "", "/decks/precons?sort=newest#announced");
    draw();
    expect(head()).toHaveAttribute("aria-expanded", "true");
  });

  it("stays open after the link's fragment leaves the address (a search mirror, the decklist jump)", () => {
    window.history.replaceState(null, "", "/decks/precons?sort=newest#announced");
    draw();
    window.history.replaceState(null, "", "/decks/precons?q=chapel");
    fireEvent(window, new HashChangeEvent("hashchange"));
    window.location.hash = "#precons-2026";
    fireEvent(window, new HashChangeEvent("hashchange"));
    expect(head()).toHaveAttribute("aria-expanded", "true");
  });

  it("holds this browser's last press when there is no news, and a press writes it", () => {
    window.localStorage.setItem(ANNOUNCED_KEY, "open");
    const { unmount } = draw();
    expect(head()).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(head());
    expect(head()).toHaveAttribute("aria-expanded", "false");
    expect(window.localStorage.getItem(ANNOUNCED_KEY)).toBe("closed");
    unmount();
    draw();
    expect(head()).toHaveAttribute("aria-expanded", "false");
  });

  it("lets news open it over a stored close, and a press still closes it", () => {
    window.localStorage.setItem(ANNOUNCED_KEY, "closed");
    draw({ opensByItself: true, newCodes: ["trc"] });
    expect(head()).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(head());
    expect(head()).toHaveAttribute("aria-expanded", "false");
  });

  it("names every revealed card as the control that opens it, its full name and colors spoken once (T4, T5)", () => {
    draw({ opensByItself: true });
    const [trcBlock, mdcBlock] = screen.getAllByTestId("announced-set");
    expect(within(trcBlock).getAllByTestId("revealed-tile")).toHaveLength(15);
    const chapel = within(trcBlock).getByRole("button", { name: "View details for Christine Chapel, Combat Medic, White. Revealed commander." });
    expect(chapel).toHaveAttribute("data-testid", "revealed-press");
    // Spoken once: the press IS the drawn name (its label replaces the text), the art is hidden, and no sr-only
    // sentence repeats it.
    expect(within(trcBlock).queryByText(/Revealed commander\.$/)).toBeNull();
    expect(chapel).toHaveTextContent("Christine Chapel, Combat Medic");
    expect(within(chapel.closest("li") as HTMLElement).getByTestId("revealed-art")).toHaveAttribute("aria-hidden", "true");
    expect(within(chapel.closest("li") as HTMLElement).getAllByRole("button")).toHaveLength(1);
    expect(within(mdcBlock).getByRole("button", { name: "View details for Gargantos, the Endbringer, Black, Green. Revealed commander." })).toBeInTheDocument();
    expect(within(trcBlock).getByText("TRC · Nov 13, 2026 · in 30 days · 15 commanders revealed")).toBeInTheDocument();
    expect(within(trcBlock).getByText("Nov 13, 2026 · in 30 days")).toBeInTheDocument();
    expect(within(mdcBlock).getByText("MDC · Apr 9, 2027 · in 6 months · 1 commander revealed")).toBeInTheDocument();
  });

  describe("revealed commanders open card details (Hugh, 2026-10-15, reversing G2)", () => {
    it("draws tiles in the precon list's own grid and tile shell", () => {
      draw({ opensByItself: true });
      const [trcBlock] = screen.getAllByTestId("announced-set");
      const grid = within(trcBlock).getByTestId("revealed-tiles");
      expect(grid.className).toBe(PRECON_TILES_CLASS);
      for (const tile of within(grid).getAllByTestId("revealed-tile")) expect(tile.className.startsWith(`${TILE_SHELL} `)).toBe(true);
      // Inside the set's dashed block (the ruling's option 3), which is the set's own list item.
      expect(trcBlock.className).toContain("border-dashed");
      expect(trcBlock).toContainElement(grid);
    });

    it("makes the whole tile the press, and draws its focus ring on the tile, which clips", () => {
      draw({ opensByItself: true });
      const tile = screen.getAllByTestId("revealed-tile")[0];
      const press = within(tile).getByTestId("revealed-press");
      // Stretched over the tile as PreconTile's link is: the tile is the positioned box.
      expect(press.className).toContain("after:absolute");
      expect(press.className).toContain("after:inset-0");
      expect(tile.className).toContain("relative");
      // The press draws no ring the tile's overflow would cut; the tile draws it.
      expect(press.className).toContain("focus-visible:outline-none");
      expect(tile.className).toContain(TILE_FOCUS_RING);
    });

    it("draws each one with the shared trigger and NO hover preview, in tiles (Hugh, 2026-10-16 UTC, superseding the 2026-10-15 reversal for tiles)", () => {
      draw({ opensByItself: true });
      const presses = screen.getAllByTestId("revealed-press");
      expect(presses).toHaveLength(16);
      for (const p of presses) expect(p.parentElement).toHaveAttribute("data-shared-trigger");
      // Every trigger a tile mounts leaves `preview` off, so no hover handler is bound to the tile or its art.
      expect(shared.triggers).toHaveLength(16);
      for (const t of shared.triggers) expect(t.preview, `${String(t.name)} previews in a tile`).toBeFalsy();
      const chapel = shared.triggers.find((t) => t.oracleId === "o78")!;
      expect(chapel).toMatchObject({ imageUri: "https://img/normal/78.jpg", name: "Christine Chapel, Combat Medic" });
      // Prev/Next pages the set's own commanders.
      expect(chapel.siblings).toEqual(trcCards.map((c) => c.oracleId));
    });

    it("draws card details where the reader can use it when the read lands after the group closed", async () => {
      const { warmCardModal } = await import("../../cards/card-detail-provider");
      await warmCardModal();
      const { container } = draw({ opensByItself: true });
      const chapel = screen.getByRole("button", { name: "View details for Christine Chapel, Combat Medic, White. Revealed commander." });
      chapel.focus();
      await act(async () => { fireEvent.click(chapel); });
      // The reader closes the group before the details arrive.
      fireEvent.click(head());
      expect(region(container)).toHaveAttribute("inert");
      await act(async () => {
        details.resolve!({
          oracleId: "o78", name: "Christine Chapel, Combat Medic", typeLine: "Legendary Creature — Human Doctor",
          manaCost: "{2}{W}", cmc: 3, oracleText: null, keywords: [], rarity: "rare", colorIdentity: ["W"], imageUri: null,
          printedName: null, quantity: 0, printings: [], setCodes: [], primarySetCode: "", preferredPrinting: null,
        });
      });
      const dialog = await screen.findByRole("dialog", { name: /Christine Chapel, Combat Medic/ });
      // Outside the closed region: not inert, not hidden, and it holds focus.
      expect(region(container)).not.toContainElement(dialog);
      // The modal views the announced printing the tile pictures (the read itself names no printing).
      expect(dialog).toHaveTextContent("SetTRC · 78");
      expect(dialog.closest("[inert]")).toBeNull();
      expect(dialog.closest(".invisible")).toBeNull();
      await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
      expect(document.body.style.overflow).toBe("hidden");
      await act(async () => { fireEvent.click(within(dialog).getAllByRole("button", { name: "Close card details" })[0]); });
      await waitFor(() => expect(screen.queryByRole("dialog", { name: /Christine Chapel/ })).toBeNull());
      expect(document.body.style.overflow).not.toBe("hidden");
      // The opener is inside the closed, inert region, so focus goes back to the group's own disclosure.
      expect(document.activeElement).toBe(head());
    });

    it("returns focus to the row's head when the reader closed that row before the details landed", async () => {
      const { warmCardModal } = await import("../../cards/card-detail-provider");
      await warmCardModal();
      draw({ view: "rows", opensByItself: true });
      const trcRow = screen.getAllByTestId("announced-row")[0];
      const rowHead = within(trcRow).getByRole("button", { name: /Star Trek Commander/ });
      fireEvent.click(rowHead);
      const chapel = within(trcRow).getByRole("button", { name: "View details for Christine Chapel, Combat Medic, White. Revealed commander." });
      chapel.focus();
      await act(async () => { fireEvent.click(chapel); });
      fireEvent.click(rowHead);
      expect(chapel.closest("[hidden]")).not.toBeNull();
      await act(async () => { details.resolve!({
          oracleId: "o78", name: "Christine Chapel, Combat Medic", typeLine: "Legendary Creature — Human Doctor",
          manaCost: "{2}{W}", cmc: 3, oracleText: null, keywords: [], rarity: "rare", colorIdentity: ["W"], imageUri: null,
          printedName: null, quantity: 0, printings: [], setCodes: [], primarySetCode: "", preferredPrinting: null,
        }); });
      const dialog = await screen.findByRole("dialog", { name: /Christine Chapel, Combat Medic/ });
      await act(async () => { fireEvent.click(within(dialog).getAllByRole("button", { name: "Close card details" })[0]); });
      await waitFor(() => expect(screen.queryByRole("dialog", { name: /Christine Chapel/ })).toBeNull());
      expect(document.activeElement).toBe(rowHead);
    });

    it("walks out to the group's head when the row's head is inside the closed group", async () => {
      const { warmCardModal } = await import("../../cards/card-detail-provider");
      await warmCardModal();
      draw({ view: "rows", opensByItself: true });
      const trcRow = screen.getAllByTestId("announced-row")[0];
      const rowHead = within(trcRow).getByRole("button", { name: /Star Trek Commander/ });
      fireEvent.click(rowHead);
      const chapel = within(trcRow).getByRole("button", { name: "View details for Christine Chapel, Combat Medic, White. Revealed commander." });
      chapel.focus();
      await act(async () => { fireEvent.click(chapel); });
      // The row closes, then the group: the row's head is itself inside a collapsed region.
      fireEvent.click(rowHead);
      fireEvent.click(head());
      await act(async () => { details.resolve!({
          oracleId: "o78", name: "Christine Chapel, Combat Medic", typeLine: "Legendary Creature — Human Doctor",
          manaCost: "{2}{W}", cmc: 3, oracleText: null, keywords: [], rarity: "rare", colorIdentity: ["W"], imageUri: null,
          printedName: null, quantity: 0, printings: [], setCodes: [], primarySetCode: "", preferredPrinting: null,
        }); });
      const dialog = await screen.findByRole("dialog", { name: /Christine Chapel, Combat Medic/ });
      await act(async () => { fireEvent.click(within(dialog).getAllByRole("button", { name: "Close card details" })[0]); });
      await waitFor(() => expect(screen.queryByRole("dialog", { name: /Christine Chapel/ })).toBeNull());
      expect(document.activeElement).toBe(head());
    });

    it("views the announced printing over a reprint the reader owns from another set", async () => {
      const { warmCardModal } = await import("../../cards/card-detail-provider");
      await warmCardModal();
      draw({ opensByItself: true });
      const chapel = screen.getByRole("button", { name: "View details for Christine Chapel, Combat Medic, White. Revealed commander." });
      await act(async () => { fireEvent.click(chapel); });
      await act(async () => {
        details.resolve!({
          oracleId: "o78", name: "Christine Chapel, Combat Medic", typeLine: "Legendary Creature — Human Doctor",
          manaCost: "{2}{W}", cmc: 3, oracleText: null, keywords: [], rarity: "rare", colorIdentity: ["W"], imageUri: "https://img/owned.jpg",
          printedName: null, quantity: 1, printings: [], setCodes: ["SLD"], primarySetCode: "SLD",
          preferredPrinting: { setCode: "SLD", collectorNumber: "9" },
        });
      });
      const dialog = await screen.findByRole("dialog", { name: /Christine Chapel, Combat Medic/ });
      expect(dialog).toHaveTextContent("SetTRC · 78");
      expect(dialog).not.toHaveTextContent("SLD · 9");
    });

    it("views each commander at its announced set's printing, the first set's when two reveal one card", () => {
      const one = (code: string, n: string) => ({
        set: { code } as AnnouncedMatch["set"], matched: 1, revealed: 1,
        commanders: [{ oracleId: "x", name: "X", colorIdentity: [], imageUriSmall: `s${n}`, imageUri: `n${n}`, backImageUri: `b${n}`, collectorNumber: n, scryfallId: `id${n}` }],
      });
      expect(announcedPrintings([one("aaa", "1"), one("bbb", "2")])).toEqual({
        x: { setCode: "AAA", collectorNumber: "1", scryfallId: "id1", imageUri: "n1", backImageUri: "b1" },
      });
    });

    it("draws each one with the shared trigger in rows, at the strip's unchanged size", () => {
      draw({ view: "rows", opensByItself: true });
      const trcRow = screen.getAllByTestId("announced-row")[0];
      fireEvent.click(within(trcRow).getByRole("button", { name: /Star Trek Commander/ }));
      const chapel = within(trcRow).getByRole("button", { name: "View details for Christine Chapel, Combat Medic, White. Revealed commander." });
      expect(chapel.parentElement).toHaveAttribute("data-shared-trigger");
      expect(chapel.closest("[data-shared-preview]")).not.toBeNull();
      expect(chapel.className).toContain("h-[106px] w-[76px]");
      expect(chapel.className).toContain("md:h-[117px] md:w-[84px]");
      expect(shared.triggers.find((t) => t.oracleId === "o78")).toMatchObject({ preview: true, imageUri: "https://img/normal/78.jpg" });
    });

    it("draws the art alone, unpressable, with the name spoken beside it, where there is no provider (About)", () => {
      render(<ul><AnnouncedSet match={mdc} today="2026-10-14" isNew={false} listed={null} /></ul>);
      expect(screen.queryByRole("button")).toBeNull();
      expect(screen.getByText("Gargantos, the Endbringer, Black, Green. Revealed commander.")).toHaveClass("sr-only");
    });

    it("draws About's specimen compact: the small strip, not a lone decklist-sized tile", () => {
      render(<ul><AnnouncedSet match={mdc} today="2026-10-14" isNew={false} listed={null} compact /></ul>);
      expect(screen.getByTestId("revealed-strip")).toBeInTheDocument();
      expect(screen.queryByTestId("revealed-tiles")).toBeNull();
      expect(screen.getByTestId("revealed-card")).toBeInTheDocument();
    });
  });

  it("draws one plate for a set with none revealed (T2)", () => {
    draw({ matches: [match(set("mdc", "Darkhold Destiny Commander", "2027-04-09"), [])], opensByItself: true });
    expect(screen.getByTestId("none-plate")).toHaveTextContent("none revealed yet");
    expect(screen.getByText("MDC · Apr 9, 2027 · in 6 months · no commanders revealed yet")).toBeInTheDocument();
  });

  it("reads `out` on release day, and offers the jump to listed decklists (L1, L2)", () => {
    const out = match(set("trc", "Star Trek Commander", "2026-11-13", { released: true }), trcCards);
    draw({ matches: [out, mdc], today: "2026-11-13", opensByItself: true, listed: { mdc: { count: 2, year: "2027" } } });
    expect(screen.getByText("TRC · out Nov 13, 2026 · decklists not listed yet · 15 commanders revealed")).toBeInTheDocument();
    expect(screen.getByText("Out Nov 13, 2026 · decklists not listed yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "2 decklists listed ↓" })).toHaveAttribute("href", "#precons-2027");
    // The next release a closed head names is the next one still to come.
    fireEvent.click(head());
    expect(head()).toHaveTextContent("2 sets · next Apr 9");
  });

  it("says how many of the revealed match when a filter narrowed them (T6)", () => {
    draw({ matches: [match(trc.set, [trcCards[0]], 15)], opensByItself: true });
    expect(screen.getByText("TRC · Nov 13, 2026 · in 30 days · 1 of 15 revealed matches")).toBeInTheDocument();
    expect(head()).toHaveTextContent("1 set");
  });

  it("draws nothing when no set survives (T1, T9)", () => {
    const { container } = draw({ matches: [] });
    expect(container).toBeEmptyDOMElement();
  });

  it("draws the press the cookie carries on the server, so the group never opens after hydration", () => {
    const html = (serverPress: "open" | "closed" | null) => renderToString(
      <G matches={[trc, mdc]} today="2026-10-14" newCodes={[]} opensByItself={false} view="tiles" listed={{}} serverPress={serverPress} />,
    );
    expect(html("open")).toMatch(/aria-expanded="true"/);
    expect(html("closed")).toMatch(/aria-expanded="false"/);
    expect(html(null)).toMatch(/aria-expanded="false"/);
    // And no transition is armed until the page has settled.
    expect(html("open")).toMatch(/data-settled="false"/);
    expect(html("open")).not.toMatch(/transition-\[grid-template-rows/);
  });

  it("mirrors a press into the cookie the server reads", () => {
    document.cookie = "precons_announced=; Max-Age=0; Path=/";
    draw();
    fireEvent.click(head());
    expect(document.cookie).toContain("precons_announced=open");
    fireEvent.click(head());
    expect(document.cookie).toContain("precons_announced=closed");
  });

  it("opens while a filter is on and a set matches it, over a stored close; a press still wins", () => {
    window.localStorage.setItem(ANNOUNCED_KEY, "closed");
    const { rerender } = draw({ filtering: true });
    expect(head()).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(head());
    expect(head()).toHaveAttribute("aria-expanded", "false");
    // Derived, never stored: the press wrote `closed`, the filter wrote nothing.
    expect(window.localStorage.getItem(ANNOUNCED_KEY)).toBe("closed");
    rerender(<G matches={[trc, mdc]} today="2026-10-14" newCodes={[]} opensByItself={false} view="tiles" listed={{}} filtering={false} />);
    expect(head()).toHaveAttribute("aria-expanded", "false");
  });

  it("leaves the filter's open unstored: with the filter off it falls back to the stored press", () => {
    window.localStorage.setItem(ANNOUNCED_KEY, "closed");
    const { rerender } = draw({ filtering: true });
    expect(head()).toHaveAttribute("aria-expanded", "true");
    rerender(<G matches={[trc, mdc]} today="2026-10-14" newCodes={[]} opensByItself={false} view="tiles" listed={{}} filtering={false} />);
    expect(head()).toHaveAttribute("aria-expanded", "false");
    expect(window.localStorage.getItem(ANNOUNCED_KEY)).toBe("closed");
  });

  describe("the rows view's strip", () => {
    // jsdom lays nothing out: the strip's widths and the observer are stood in for.
    let wide = 0;
    beforeEach(() => {
      vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
      vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockImplementation(() => wide);
      vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(() => 300);
    });
    afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

    const openTrc = () => fireEvent.click(within(screen.getAllByTestId("announced-row")[0]).getByRole("button", { name: /Star Trek Commander/ }));

    it("is a named region while it scrolls sideways, and no stop of its own: its cards are", () => {
      wide = 1200;
      draw({ view: "rows", opensByItself: true });
      openTrc();
      const strip = screen.getByRole("region", { name: "15 revealed commanders" });
      expect(strip).not.toHaveAttribute("tabindex");
      expect(within(strip).getAllByRole("button")).toHaveLength(15);
    });

    it("re-measures when a filter grows the strip without either box resizing (a search cleared)", () => {
      wide = 300;
      const one = match(trc.set, trc.commanders.slice(0, 1), 15);
      const { rerender } = draw({ view: "rows", opensByItself: true, matches: [one] });
      openTrc();
      expect(screen.queryByRole("region", { name: /revealed commander/ })).toBeNull();
      wide = 1200;
      rerender(<G matches={[trc]} today="2026-10-14" newCodes={[]} opensByItself view="rows" listed={{}} />);
      expect(screen.getByRole("region", { name: "15 revealed commanders" })).toBeInTheDocument();
    });

    it("is no stop at all once it wraps and fits", () => {
      wide = 300;
      draw({ view: "rows", opensByItself: true });
      openTrc();
      const strips = screen.getAllByTestId("revealed-strip");
      expect(strips[0]).not.toHaveAttribute("tabindex");
      expect(strips[0]).not.toHaveAttribute("role");
      expect(screen.queryByRole("region", { name: /revealed commander/ })).toBeNull();
    });
  });

  describe("rows (Q1–Q3)", () => {
    it("draws one faint dot for a colorless set, as tiles do, and none for a set with nothing revealed", () => {
      const colorless = match(set("zzc", "Colorless Commander", "2026-12-01"), [commander(5, "Karn", [])]);
      const none = match(set("mdc", "Darkhold Destiny Commander", "2027-04-09"), []);
      draw({ view: "rows", opensByItself: true, matches: [colorless, none] });
      const [cRow, nRow] = screen.getAllByTestId("announced-row");
      const dots = within(cRow).getByTestId("row-dots").children;
      expect(dots).toHaveLength(1);
      expect((dots[0] as HTMLElement).style.background).toBe("var(--fg-faint)");
      expect(within(cRow).getByText("Colorless")).toHaveClass("sr-only");
      expect(within(nRow).queryByTestId("row-dots")).toBeNull();
    });

    it("takes the same closed head, then one precon-shaped row per set", () => {
      draw({ view: "rows" });
      expect(head()).toHaveAttribute("aria-expanded", "false");
      fireEvent.click(head());
      const [trcRow, mdcRow] = screen.getAllByTestId("announced-row");
      expect(within(trcRow).getByText("Christine Chapel, Combat Medic and 14 more")).toBeInTheDocument();
      expect(within(trcRow).getByText("in 30 days")).toBeInTheDocument();
      expect(within(trcRow).getByText("TRC · Nov 13, 2026")).toBeInTheDocument();
      expect(within(mdcRow).getAllByText("Gargantos, the Endbringer")[0]).toHaveClass("truncate");
      expect(within(mdcRow).getByText("in 6 months")).toBeInTheDocument();
    });

    it("opens a row's cards under its own disclosure, closed every visit", () => {
      draw({ view: "rows", opensByItself: true });
      const trcRow = screen.getAllByTestId("announced-row")[0];
      const press = within(trcRow).getByRole("button");
      expect(within(trcRow).getByRole("heading", { level: 3 })).toContainElement(press);
      expect(press).toHaveAttribute("aria-expanded", "false");
      expect(within(trcRow).queryAllByTestId("revealed-card").filter((c) => c.closest("[hidden]") === null)).toHaveLength(0);
      fireEvent.click(press);
      expect(press).toHaveAttribute("aria-expanded", "true");
      expect(within(trcRow).getAllByTestId("revealed-card").filter((c) => c.closest("[hidden]") === null)).toHaveLength(15);
    });

    it("does not open a set with nothing revealed (R2)", () => {
      draw({ view: "rows", opensByItself: true, matches: [match(set("mdc", "Darkhold Destiny Commander", "2027-04-09"), [])] });
      const row = screen.getByTestId("announced-row");
      expect(within(row).queryByRole("button")).toBeNull();
      expect(within(row).getByText("No commanders revealed yet")).toBeInTheDocument();
      expect(within(row).getByTestId("row-plate")).toBeInTheDocument();
    });
  });
});

// Addendum A1: a large reveal folds to its first row.
describe("Announced collapse (A1)", () => {
  const actualComputed = window.getComputedStyle.bind(window);
  /** jsdom lays nothing out: the grid reports `n` columns, as a browser would. */
  const withColumns = (n: number) =>
    vi.spyOn(window, "getComputedStyle").mockImplementation((el: Element, pseudo?: string | null) => {
      const real = actualComputed(el, pseudo);
      if (!(el as HTMLElement).matches?.("[data-testid=revealed-tiles]")) return real;
      return new Proxy(real, { get: (t, k) => (k === "gridTemplateColumns" ? Array(n).fill("100px").join(" ") : Reflect.get(t, k)) });
    });
  const cards = (n: number) => Array.from({ length: n }, (_, i) => commander(200 + i, `Card ${i}`));
  const group = (n: number) => match(set("trc", "Star Trek Commander", "2026-11-13"), cards(n));
  const open = (n: number, over: Partial<Omit<AnnouncedGroupProps, "visit">> = {}) => draw({ matches: [group(n)], opensByItself: true, ...over });
  const shown = () => screen.getAllByTestId("revealed-tile").filter((t) => t.style.display !== "none");
  const toggle = () => screen.getByRole("button", { name: /^Show (all|fewer)/ });

  afterEach(() => vi.restoreAllMocks());
  beforeEach(() => { window.localStorage.clear(); document.cookie = "precons_announced=; Max-Age=0; Path=/"; });

  it("folds fifteen to one row at two columns, with the shared toggle naming the set", () => {
    withColumns(2);
    open(15);
    expect(shown()).toHaveLength(2);
    expect(toggle()).toHaveTextContent("Show all 15");
    expect(toggle()).toHaveAccessibleName("Show all 15 commanders revealed for Star Trek Commander");
    expect(toggle()).toHaveAttribute("aria-expanded", "false");
    expect(toggle()).toHaveAttribute("aria-controls", screen.getByTestId("revealed-tiles").id);
  });

  it("holds the threshold at its edges: 4 stay whole at two columns, 5 fold", () => {
    withColumns(2);
    const four = open(4);
    expect(shown()).toHaveLength(4);
    expect(screen.queryByRole("button", { name: /^Show (all|fewer)/ })).toBeNull();
    four.unmount();
    open(5);
    expect(shown()).toHaveLength(2);
    expect(toggle()).toHaveTextContent("Show all 5");
  });

  it("opens in place, keeps focus on the toggle, and folds back with Show fewer", () => {
    withColumns(2);
    open(15);
    toggle().focus();
    fireEvent.click(toggle());
    expect(shown()).toHaveLength(15);
    expect(toggle()).toHaveTextContent("Show fewer");
    expect(toggle()).toHaveAccessibleName("Show fewer commanders revealed for Star Trek Commander");
    expect(toggle()).toHaveAttribute("aria-expanded", "true");
    expect(document.activeElement).toBe(toggle());
    const scrolled = vi.fn();
    Element.prototype.scrollIntoView = scrolled;
    fireEvent.click(toggle());
    expect(shown()).toHaveLength(2);
    expect(document.activeElement).toBe(toggle());
    // Show fewer brings the toggle back into the window if the fold lifted it out; opening does not scroll.
    expect(scrolled).toHaveBeenCalledTimes(1);
    expect(scrolled).toHaveBeenCalledWith({ block: "nearest" });
  });

  it("folds nothing while a filter is on", () => {
    withColumns(2);
    open(15, { filtering: true });
    expect(shown()).toHaveLength(15);
    expect(screen.queryByRole("button", { name: /^Show (all|fewer)/ })).toBeNull();
  });

  it("keeps the press across a view switch for the visit, and pages every commander, hidden or not", () => {
    withColumns(2);
    const view = render(<G matches={[group(15)]} today="2026-10-14" newCodes={[]} opensByItself view="tiles" listed={{}} />);
    fireEvent.click(toggle());
    expect(shown()).toHaveLength(15);
    view.rerender(<G matches={[group(15)]} today="2026-10-14" newCodes={[]} opensByItself view="rows" listed={{}} />);
    view.rerender(<G matches={[group(15)]} today="2026-10-14" newCodes={[]} opensByItself view="tiles" listed={{}} />);
    expect(shown()).toHaveLength(15);
    const last = shared.triggers.at(-1) as { siblings: string[] };
    expect(last.siblings).toHaveLength(15);
  });

  it("hands card details' focus to Show all when the reader folds the set before an opened tile's read lands", async () => {
    const { warmCardModal } = await import("../../cards/card-detail-provider");
    await warmCardModal();
    withColumns(2);
    open(15);
    fireEvent.click(toggle());
    const later = screen.getByRole("button", { name: /View details for Card 5, White\. Revealed commander\./ });
    later.focus();
    await act(async () => { fireEvent.click(later); });
    // Show fewer folds the opener away while its details are still in flight.
    fireEvent.click(toggle());
    expect(later.closest("li")).toHaveAttribute("hidden");
    await act(async () => {
      details.resolve!({
        oracleId: "o205", name: "Card 5", typeLine: "Legendary Creature", manaCost: "{W}", cmc: 1, oracleText: null, keywords: [],
        rarity: "rare", colorIdentity: ["W"], imageUri: null, printedName: null, quantity: 0, printings: [], setCodes: [],
        primarySetCode: "", preferredPrinting: null,
      });
    });
    const dialog = await screen.findByRole("dialog", { name: /Card 5/ });
    await act(async () => { fireEvent.click(within(dialog).getAllByRole("button", { name: "Close card details" })[0]); });
    await waitFor(() => expect(screen.queryByRole("dialog", { name: /Card 5/ })).toBeNull());
    expect(document.activeElement).toBe(toggle());
  });

  it("leaves the hidden tiles out of the tab order", () => {
    withColumns(2);
    open(15);
    const hidden = screen.getAllByTestId("revealed-tile").filter((t) => t.style.display === "none");
    expect(hidden).toHaveLength(13);
    // display: none removes them from focus and reading order; the press inside each is not reachable.
    expect(hidden.every((t) => t.querySelector("button") !== null)).toBe(true);
  });

  it("draws the first-paint CSS on the server, with no toggle, until the columns are measured", () => {
    const html = renderToString(<G matches={[group(15)]} today="2026-10-14" newCodes={[]} opensByItself view="tiles" listed={{}} />);
    expect(html).toContain('data-collapse="trc"');
    expect(html).toContain("li:nth-child(n+3)");
    expect(html).not.toContain("Show all");
  });
});

