import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { EntryPayload } from "../../lib/about/entries-payload";
import type { DeckView } from "../../lib/copy/about";
import { helpPanelCopy } from "../../lib/copy/discovery";
import { stubViewport } from "../../test-utils/stub-viewport";
import { usePublishBuilderScreen } from "../decks/builder-screen";
import { HALO_ATTR, HALO_MS, TargetsProvider, useTarget } from "../discovery/targets-provider";
import { HelpButton, HelpRoot } from "./help-root";
import { reveal } from "../../lib/ui/reveal";
import { Report } from "../shell/pending-report";
import { ARRIVE_MS, MomentsProvider, useMomentAnchor } from "../moments/moments-provider";

vi.mock("../../app/moments-actions", () => ({ spendMomentAction: vi.fn(async () => {}) }));

let pathname = "/collection";
vi.mock("next/navigation", () => ({ usePathname: () => pathname, useRouter: () => ({ push: vi.fn(), prefetch: vi.fn() }) }));
vi.mock("../../lib/ui/reveal", async (orig) => ({ ...(await orig<typeof import("../../lib/ui/reveal")>()), reveal: vi.fn() }));

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
  vi.mocked(reveal).mockReset();
  window.scrollY = 0;
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

type DrawOpts = { on?: boolean; deckView?: DeckView; control?: boolean; push?: (href: string) => void };
const draw = (opts: DrawOpts = {}) => render(tree(opts));
const tree = ({ on = true, deckView, control = false, push }: DrawOpts = {}) => {
  const help = (
    <TargetsProvider>
      <HelpRoot on={on}>
        <HelpButton place="rail" />
        {deckView && <Builder view={deckView} />}
        {control && <Control id="stand-ins" />}
        <button type="button">page</button>
      </HelpRoot>
    </TargetsProvider>
  );
  // The shell's pending provider, whose `push` runs a navigation that outlives the panel.
  return push ? (
    <Report.Provider value={{ report: () => {}, pathname, push, registerContentScope: () => {} }}>{help}</Report.Provider>
  ) : (
    help
  );
};

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

  it("closes on the ? again, giving focus back to it", async () => {
    stubViewport(1300);
    draw();
    await openIt();
    expect(panel().contains(document.activeElement)).toBe(true);
    fireEvent.click(q());
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(q().getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(q());
  });

  it("closes on leaving the page", async () => {
    stubViewport(1300);
    const r = draw();
    await openIt();
    pathname = "/decks";
    r.rerender(tree());
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(q().getAttribute("aria-expanded")).toBe("false");
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

  it("leaves the page usable from md: a Tab pressed in the page is the page's, not pulled into the panel", async () => {
    stubViewport(1300);
    draw();
    await openIt();
    const page = screen.getByRole("button", { name: "page" });
    page.focus();
    // fireEvent answers false when a listener cancelled the key.
    expect(fireEvent.keyDown(window, { key: "Tab" })).toBe(true);
    expect(document.activeElement).toBe(page);
  });

  it("holds Tab in the sheet below md, as a modal must", async () => {
    stubViewport(390);
    draw();
    await openIt();
    screen.getByRole("button", { name: "page" }).focus();
    // Held (jsdom draws nothing, so where the trap would send focus cannot be shown here).
    expect(fireEvent.keyDown(window, { key: "Tab" })).toBe(false);
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

  // The sheet's close steps back off its history entry, and that pop starts dialog.ts's scroll restoration, which
  // puts the page's old offset back for ~30 frames. Under reduced motion the reveal jumps at once, so a reveal made
  // inside that window was pulled straight back and the halo sat offscreen.
  it("from the sheet, reaches a target below the fold under reduced motion, and stays there", async () => {
    pathname = "/decks/d1";
    stubViewport(390);
    window.scrollY = 120;
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(((_x: number, y: number) => {
      window.scrollY = y;
    }) as typeof window.scrollTo);
    // Reduced motion's reveal: one jump to the target, far below the offset the sheet opened over.
    vi.mocked(reveal).mockImplementation(() => {
      window.scrollTo(0, 2400);
      return () => {};
    });
    draw({ deckView: "shopping", control: true });
    await openIt();
    const control = document.querySelector('[data-control="stand-ins"]') as HTMLElement;
    fireEvent.click(panel().querySelector('[data-help-show-me="stand-ins"]')!);
    expect(screen.queryByRole("dialog")).toBeNull();
    await waitFor(() => expect(control.hasAttribute(HALO_ATTR)).toBe(true), { timeout: 2000 });
    expect(reveal).toHaveBeenCalledTimes(1);
    // Past the restoration's 30 frames: the page is still where the reveal took it.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 700));
    });
    expect(window.scrollY).toBe(2400);
    scrollTo.mockRestore();
  });
});

describe("a link press", () => {
  // The press closes the panel, which unmounts the link: its own status could not carry a slow navigation to the
  // shell's loading screen, so the provider, which stays mounted, runs and reports it.
  it("hands an ordinary press to the pending provider, cancelling the link's own navigation, and closes", async () => {
    stubViewport(1300);
    const push = vi.fn();
    draw({ push });
    await openIt();
    const link = within(panel()).getByRole("link", { name: helpPanelCopy.footAll });
    const ran = fireEvent.click(link, { button: 0 });
    expect(ran).toBe(false);
    expect(push).toHaveBeenCalledWith("/about?tab=reference");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("hands a row's Read the whole entry to the provider too", async () => {
    stubViewport(1300);
    pathname = "/decks/d1";
    const push = vi.fn();
    draw({ push, deckView: "your-deck" });
    await openIt();
    fireEvent.click(panel().querySelector('[data-help-row="deck-a"] button')!);
    fireEvent.click(within(panel()).getByRole("link", { name: helpPanelCopy.readWhole }));
    expect(push).toHaveBeenCalledWith("/about?tab=reference#deck-a");
  });

  it("leaves a modified press to the browser, and the panel open", async () => {
    stubViewport(1300);
    const push = vi.fn();
    draw({ push });
    await openIt();
    const link = within(panel()).getByRole("link", { name: helpPanelCopy.footAll });
    link.addEventListener("click", (e) => e.preventDefault());
    fireEvent.click(link, { button: 0, metaKey: true });
    expect(push).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeNull();
  });

  it("only closes on a press to the page already open, a fragment on it included, and pushes nothing", async () => {
    stubViewport(1300);
    pathname = "/about";
    window.history.replaceState(null, "", "/about?tab=reference");
    const push = vi.fn();
    draw({ push });
    await openIt();
    const link = within(panel()).getByRole("link", { name: helpPanelCopy.footAll });
    // Read after React's handler (the document hears the click last): the default is left to the link itself.
    let prevented: boolean | null = null;
    const hear = (e: Event) => {
      prevented = e.defaultPrevented;
      e.preventDefault();
    };
    document.addEventListener("click", hear);
    fireEvent.click(link, { button: 0 });
    document.removeEventListener("click", hear);
    expect(prevented).toBe(false);
    expect(push).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("from the sheet, leaves its history entry under the new page rather than stepping back", async () => {
    stubViewport(390);
    const push = vi.fn();
    draw({ push });
    await openIt();
    const back = vi.spyOn(window.history, "back");
    fireEvent.click(within(panel()).getByRole("link", { name: helpPanelCopy.footAll }), { button: 0 });
    expect(push).toHaveBeenCalledWith("/about?tab=reference");
    expect(screen.queryByRole("dialog")).toBeNull();
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20));
    });
    expect(back).not.toHaveBeenCalled();
  });
});

describe("Show me and the moments", () => {
  // One fake observer: the test says when the control is on screen.
  let notify: ((entries: { target: Element; isIntersecting: boolean }[]) => void) | null = null;
  class FakeObserver {
    constructor(cb: (entries: { target: Element; isIntersecting: boolean }[]) => void) {
      notify = cb;
    }
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  beforeEach(() => {
    vi.stubGlobal("IntersectionObserver", FakeObserver);
    window.localStorage.clear();
  });
  afterEach(() => {
    vi.useRealTimers();
    notify = null;
  });

  function Anchor() {
    const anchor = useMomentAnchor("stand-ins", { eligible: true, copy: { tool: "Stand-ins", line: "opens Stand-ins." } });
    return (
      <button type="button" data-control="stand-ins" {...anchor}>
        control
      </button>
    );
  }

  const advance = async (ms: number) => {
    await act(async () => {
      vi.advanceTimersByTime(ms);
    });
  };

  // Closing the panel ends its moment hold, and the provider's arrival timer would bring a bubble up inside the
  // halo's 2.4s: the halo is the one guide on screen (rows 101 to 104).
  it("holds every bubble off through the halo, and lets them come again after it", async () => {
    pathname = "/decks/d1";
    stubViewport(1300);
    render(
      <TargetsProvider>
        <MomentsProvider live={["stand-ins"]} spent={[]}>
          <HelpRoot on>
            <HelpButton place="rail" />
            <Builder view="shopping" />
            <Anchor />
          </HelpRoot>
        </MomentsProvider>
      </TargetsProvider>,
    );
    await openIt();
    const control = document.querySelector('[data-control="stand-ins"]') as HTMLElement;
    vi.useFakeTimers();
    fireEvent.click(panel().querySelector('[data-help-show-me="stand-ins"]')!);
    expect(screen.queryByRole("dialog")).toBeNull();
    act(() => notify!([{ target: control, isIntersecting: true }]));
    await advance(0);
    expect(control.hasAttribute(HALO_ATTR)).toBe(true);
    await advance(ARRIVE_MS * 3);
    expect(control.hasAttribute(HALO_ATTR)).toBe(true);
    expect(screen.queryByRole("note")).toBeNull();
    // The halo ends and the hold with it: the moment may arrive again.
    await advance(HALO_MS);
    expect(control.hasAttribute(HALO_ATTR)).toBe(false);
    act(() => notify!([{ target: control, isIntersecting: false }]));
    act(() => notify!([{ target: control, isIntersecting: true }]));
    await advance(ARRIVE_MS);
    expect(screen.getByRole("note", { name: "Stand-ins, a tip" })).toBeTruthy();
  });
});
