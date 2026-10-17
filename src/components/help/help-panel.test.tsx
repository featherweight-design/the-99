import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { EntryPayload } from "../../lib/about/entries-payload";
import type { DeckView } from "../../lib/copy/about";
import { helpPanelCopy } from "../../lib/copy/discovery";
import { stubViewport } from "../../test-utils/stub-viewport";
import { usePublishBuilderScreen } from "../decks/builder-screen";
import { HALO_ATTR, TargetsProvider, useTarget } from "../discovery/targets-provider";
import { HelpButton, HelpRoot } from "./help-root";

let pathname = "/collection";
vi.mock("next/navigation", () => ({ usePathname: () => pathname, useRouter: () => ({ push: vi.fn(), prefetch: vi.fn() }) }));
vi.mock("../../lib/ui/reveal", () => ({ reveal: vi.fn() }));

const entry = (id: string, screen: EntryPayload["screen"], view?: DeckView, caption = `${id} first. ${id} rest.`, keys: string[] = []): EntryPayload => ({
  id, title: `Title ${id}`, caption, keys, screen, ...(view ? { view } : {}),
});

const ENTRIES: EntryPayload[] = [
  entry("deck-a", "deck", "your-deck", "Deck a first. Deck a rest of the paragraph.\n\nNot this.", ["k one", "k two", "k three"]),
  entry("deck-b", "deck", "your-deck"),
  entry("stand-ins", "deck", "shopping", "Cheaper stand-ins. More about combo pieces."),
  entry("friend-spares", "deck", "shopping"),
  entry("deck-stats", "deck", "stats"),
  entry("col-a", "collection"),
  entry("col-b", "collection"),
  entry("card-a", "card-details"),
  entry("sets-a", "sets"),
  entry("home-a", "home"),
];

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  pathname = "/collection";
  window.history.replaceState(null, "", "/collection");
  fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ entries: ENTRIES }) }));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function Builder({ view }: { view: DeckView }) {
  usePublishBuilderScreen(view);
  return null;
}

function Control({ id }: { id: "stand-ins" }) {
  const ref = useTarget(id);
  return <button ref={ref} type="button" data-control={id}>control</button>;
}

const draw = ({ on = true, deckView, control = false }: { on?: boolean; deckView?: DeckView; control?: boolean } = {}) =>
  render(
    <TargetsProvider>
      <HelpRoot on={on}>
        <HelpButton place="rail" />
        {deckView && <Builder view={deckView} />}
        {control && <Control id="stand-ins" />}
        <button type="button">page</button>
      </HelpRoot>
    </TargetsProvider>,
  );

const q = () => screen.getByRole("button", { name: helpPanelCopy.button });
const panel = () => screen.getByRole("dialog", { name: helpPanelCopy.button });
const openIt = async () => {
  fireEvent.click(q());
  await waitFor(() => expect(panel().querySelector("[data-help-here], [data-help-empty]")).not.toBeNull());
};
const rowIds = () => [...panel().querySelectorAll("[data-help-row]")].map((r) => r.getAttribute("data-help-row"));

describe("the ?", () => {
  it("is not drawn with the switch off, and nothing is fetched", () => {
    draw({ on: false });
    expect(screen.queryByRole("button", { name: helpPanelCopy.button })).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("opens the panel, holds aria-expanded while open, and fetches once for the visit", async () => {
    stubViewport(1300);
    draw();
    expect(q().getAttribute("aria-expanded")).toBe("false");
    await openIt();
    expect(q().getAttribute("aria-expanded")).toBe("true");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/about/entries", expect.anything());
    fireEvent.click(q());
    expect(screen.queryByRole("dialog")).toBeNull();
    await openIt();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("fetches on intent at the rail's ?", () => {
    draw();
    fireEvent.pointerEnter(q());
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("moves focus into the panel, and Escape closes it and gives focus back to the ?", async () => {
    stubViewport(1300);
    draw();
    q().focus();
    await openIt();
    expect(panel().contains(document.activeElement)).toBe(true);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(q());
  });

  it("closes on ✕", async () => {
    draw();
    await openIt();
    fireEvent.click(within(panel()).getByRole("button", { name: helpPanelCopy.close }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("the two forms", () => {
  it("is a non-modal panel from md, with no scrim or grabber", async () => {
    stubViewport(1300);
    draw();
    await openIt();
    expect(panel().getAttribute("aria-modal")).toBe("false");
    expect(panel().tagName).toBe("SECTION");
    expect(document.querySelector("[data-help-scrim]")).toBeNull();
    expect(document.querySelector("[data-help-grabber]")).toBeNull();
  });

  it("is a modal sheet below md, over a scrim that closes it, with a grabber", async () => {
    stubViewport(390);
    draw();
    await openIt();
    expect(panel().getAttribute("aria-modal")).toBe("true");
    expect(document.querySelector("[data-help-grabber]")).not.toBeNull();
    fireEvent.click(document.querySelector("[data-help-scrim]")!);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("the list", () => {
  it("lists this screen's entries under its name and count, with Elsewhere in Collection", async () => {
    draw();
    await openIt();
    expect(within(panel()).getByRole("heading").textContent).toBe("Collection · Cards");
    expect(panel().querySelector("[data-help-here]")!.textContent).toBe(helpPanelCopy.here("Cards"));
    expect(panel().querySelector("[data-help-count]")!.textContent).toBe(helpPanelCopy.count(2));
    expect(rowIds()).toEqual(["col-a", "col-b"]);
    expect(within(panel()).getByText(helpPanelCopy.elsewhere.collection)).toBeTruthy();
    const chips = [...panel().querySelectorAll("[data-help-chip]")].map((c) => c.textContent);
    expect(chips).toEqual(["Card details 1", "Sets 1"]);
  });

  it("opens one row at a time: the rest of its paragraph, up to two keys and Read the whole entry", async () => {
    pathname = "/decks/d1";
    draw({ deckView: "your-deck" });
    await openIt();
    const press = (id: string) => within(panel().querySelector(`[data-help-row="${id}"]`) as HTMLElement).getAllByRole("button")[0];
    fireEvent.click(press("deck-a"));
    expect(press("deck-a").getAttribute("aria-expanded")).toBe("true");
    const open = panel().querySelector("[data-help-open]") as HTMLElement;
    expect(open.textContent).toContain("Deck a rest of the paragraph.");
    expect(open.textContent).not.toContain("Not this.");
    expect(open.querySelectorAll("[data-help-key]")).toHaveLength(2);
    const link = within(open).getByRole("link", { name: helpPanelCopy.readWhole });
    expect(link.getAttribute("href")).toBe("/about?tab=reference#deck-a");
    fireEvent.click(press("deck-b"));
    expect(press("deck-a").getAttribute("aria-expanded")).toBe("false");
    expect(panel().querySelectorAll("[data-help-open]")).toHaveLength(1);
  });

  it("on the deck page reads the builder's view, and a chip swaps the list in place", async () => {
    pathname = "/decks/d1";
    draw({ deckView: "shopping" });
    await openIt();
    expect(within(panel()).getByRole("heading").textContent).toBe("A deck · Shopping");
    expect(rowIds()).toEqual(["stand-ins", "friend-spares"]);
    const chips = () => [...panel().querySelectorAll("[data-help-chip]")].map((c) => c.textContent);
    expect(chips()).toEqual(["All 2", "Stats 1"]);
    fireEvent.click(panel().querySelector('[data-help-chip="deck-your-deck"]')!);
    expect(rowIds()).toEqual(["deck-a", "deck-b"]);
    expect(panel().querySelector("[data-help-here]")!.textContent).toBe(helpPanelCopy.here("Your deck"));
    expect(panel().querySelector("[data-help-count]")!.textContent).toBe(helpPanelCopy.count(2));
    expect(chips()).toEqual(["Shopping 2", "Stats 1"]);
    // The title stays the screen in view.
    expect(within(panel()).getByRole("heading").textContent).toBe("A deck · Shopping");
  });

  it("draws G21's line above the search on a screen with no entries, and no list", async () => {
    pathname = "/decks/shopping";
    draw();
    await openIt();
    const empty = panel().querySelector("[data-help-empty]")!;
    expect(empty.textContent).toBe(helpPanelCopy.empty);
    const search = within(panel()).getByRole("searchbox");
    expect(empty.compareDocumentPosition(search) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(panel().querySelector("[data-help-here]")).toBeNull();
    expect(panel().querySelector("[data-help-chip]")).toBeNull();
    expect(within(panel()).getByRole("link", { name: helpPanelCopy.footAll }).getAttribute("href")).toBe("/about?tab=reference");
  });
});

describe("search", () => {
  it("replaces the list with hits from every screen, the match marked", async () => {
    draw();
    await openIt();
    fireEvent.change(within(panel()).getByRole("searchbox"), { target: { value: "combo" } });
    expect(panel().querySelector("[data-help-here]")).toBeNull();
    expect(within(panel()).getByRole("status").textContent).toBe(helpPanelCopy.hits(1, "combo"));
    const hit = panel().querySelector('[data-help-hit="stand-ins"]') as HTMLElement;
    expect(hit.getAttribute("href")).toBe("/about?tab=reference#stand-ins");
    expect(hit.textContent).toContain("A deck · Shopping");
    expect(hit.querySelector("mark")!.textContent).toBe("combo");
  });

  it("says none, with no suggestion, and links to every entry", async () => {
    draw();
    await openIt();
    fireEvent.change(within(panel()).getByRole("searchbox"), { target: { value: "sideboard" } });
    const none = panel().querySelector("[data-help-none]") as HTMLElement;
    expect(none.textContent).toContain(helpPanelCopy.none("sideboard"));
    expect(none.textContent).toContain(helpPanelCopy.noneNote);
    expect(within(none).getAllByRole("link")).toHaveLength(1);
    expect(within(none).getByRole("link", { name: helpPanelCopy.noneOut }).getAttribute("href")).toBe("/about?tab=reference");
  });
});

describe("Show me", () => {
  it("is drawn only for an entry whose control is registered and drawn", async () => {
    pathname = "/decks/d1";
    draw({ deckView: "shopping", control: true });
    await openIt();
    expect(panel().querySelector('[data-help-show-me="stand-ins"]')).not.toBeNull();
    // Friends' spares is a tool too, but its control is not on this page.
    expect(panel().querySelector('[data-help-show-me="friend-spares"]')).toBeNull();
  });

  it("is absent with no control registered", async () => {
    pathname = "/decks/d1";
    draw({ deckView: "shopping" });
    await openIt();
    expect(panel().querySelector("[data-help-show-me]")).toBeNull();
  });

  it("closes the panel and haloes the control, never pressing it", async () => {
    pathname = "/decks/d1";
    stubViewport(1300);
    draw({ deckView: "shopping", control: true });
    await openIt();
    const control = document.querySelector('[data-control="stand-ins"]') as HTMLElement;
    const pressed = vi.fn();
    control.addEventListener("click", pressed);
    fireEvent.click(panel().querySelector('[data-help-show-me="stand-ins"]')!);
    expect(screen.queryByRole("dialog")).toBeNull();
    await waitFor(() => expect(control.hasAttribute(HALO_ATTR)).toBe(true));
    expect(pressed).not.toHaveBeenCalled();
    await act(async () => {});
  });
});
