import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { availabilityCopy } from "../../lib/copy/availability";
import type { CommanderRowItem } from "../../lib/commanders/rankings";
import { toFreeDelta } from "../../lib/recs/free-delta";
import { CommandersView, type AvailMode } from "./commanders-view";
import { REVEAL_STEP } from "./reveal-control";
import type { LanePrintedIn } from "../../lib/sets/printed-in";

// The reveal control is unreachable on real data by design — the beta reference
// collection yields 24 generals and REVEAL_STEP is 25. These tests are therefore
// the primary evidence that the windowing works at all.

const params = new URLSearchParams();

// The scope control is the one thing here that navigates: a scope flip swaps
// which list component the route renders, so it goes through the router rather
// than the History API the other two controls use.
const routerReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useSearchParams: () => params,
  useRouter: () => ({ replace: routerReplace }),
}));

// The availability and reveal controls mirror to the URL through the History
// API — no navigation, so there is no router call left to assert on.
//
// The spy also feeds the write back into `params`, which is what the mocked
// `useSearchParams` reads. That is not test convenience: Next ADOPTS a
// `replaceState` URL into router state, so the hook agrees with the write a
// moment later, and the view now compares the live query against what it last
// wrote to tell an arriving navigation from the reader's own flip. A mock where
// the URL never moves cannot exercise that at all — it makes every flip look
// like a navigation, which is precisely the bug the comparison exists to avoid.
const realReplaceState = window.history.replaceState.bind(window.history);
const replaceState = vi
  .spyOn(window.history, "replaceState")
  .mockImplementation((state, title, url) => {
    // Still a real write: the mirror reads `window.location` to carry over the
    // parameters the lane does not own.
    realReplaceState(state, title, url ?? null);
    const query = String(url ?? "").split("?")[1] ?? "";
    for (const k of [...params.keys()]) params.delete(k);
    for (const [k, v] of new URLSearchParams(query)) params.append(k, v);
  });
const urls = () => replaceState.mock.calls.map((c) => c[2]);

const rememberCommandersAvail = vi.fn();
vi.mock("../../app/commanders/actions", () => ({
  retryRecs: vi.fn(),
  rememberCommandersAvail: (...a: unknown[]) => rememberCommandersAvail(...a),
}));

function results(n: number, colorIdentity: string[] = ["R"]): CommanderRowItem[] {
  return Array.from({ length: n }, (_, i) => ({
    oracleId: `oracle-${i}`,
    slug: `general-${i}`,
    name: `General ${i}`,
    typeLine: "Legendary Creature — Human",
    colorIdentity,
    colorPoolSize: 120,
    roleCounts: { ramp: 4, draw: 3, removal: 5, wipes: 1 },
    edhrecOwnedCount: 40,
    edhrecTotal: 100,
    receipts: "",
    fitPool: 12,
    fitRoles: 8,
    fitSynergy: 24,
    score: 100 - i,
    rankScore: 100 - i,
    measurableTotal: 100,
    imageUri: null,
    artCropUri: null,
    synergyState: "ok" as const,
    // The four the shared row draws, plus the price. Every row carries them now
    // — the owned lane joins them on in `loadCommanderRankings`.
    prose: `General ${i} decks grind value out of counters.`,
    gapSlot: { kind: "unplayed" as const, labels: ["Counters Matter"] },
    deckCount: 1209,
  }));
}

const allDegraded = (n: number): CommanderRowItem[] =>
  results(n).map((r) => ({ ...r, synergyState: "degraded" as const }));
const someDegraded = (n: number): CommanderRowItem[] =>
  results(n).map((r, i) => (i === 0 ? { ...r, synergyState: "degraded" as const } : r));

type Over = {
  avail?: AvailMode;
  /** The reader's saved mode, which the page sends beside the URL. */
  savedAvail?: AvailMode;
  /** An explicit `a=` on the URL, where a test needs one the saved mode does not imply. */
  urlAvail?: AvailMode;
  freeItems?: CommanderRowItem[] | null;
  availOk?: boolean;
  degraded?: boolean;
  printedIn?: LanePrintedIn;
};

// The mode is the URL's alone now, so a test that opens in `free` says so by
// setting the parameter the reader's own flip would have written.
function el(list: CommanderRowItem[], over: Over = {}) {
  const { avail = "all", freeItems = null, availOk = true, degraded = false, savedAvail, urlAvail } = over;
  // Through the URL, because that is where the view reads the lane from: it
  // compares against `window.location` and uses the hook only to re-render.
  // `replaceState` is spied above and feeds the write back into `params`, so
  // both halves of the mock stay in step the way Next keeps them in step.
  //
  // Only the one key it owns, leaving anything a test put there beside it — the
  // same rule the mirror itself follows.
  const live = new URLSearchParams(window.location.search);
  if (urlAvail) live.set("a", urlAvail);
  else if (avail === "free" && savedAvail !== "free") live.set("a", "free");
  else live.delete("a");
  const qs = live.toString();
  window.history.replaceState(null, "", qs ? `/commanders?${qs}` : "/commanders");
  return (
    <CommandersView
      results={list}
      degraded={degraded}
      uniqueCardsRead={1418}
      candidateCount={list.length}
      firstRun={false}
      // The tests state the free ranking as the list it is, and it reaches the
      // view the way the server sends it — through the diff. Every free-mode
      // assertion below therefore also asserts the round-trip.
      freeRanking={freeItems ? toFreeDelta(list, freeItems) : null}
      availOk={availOk}
      printedIn={over.printedIn}
      savedAvail={savedAvail}
    />
  );
}

// `again` re-renders the SAME instance, so a test can move a prop the way the
// server does rather than mounting twice and missing the transition.
function view(list: CommanderRowItem[], over: Over = {}) {
  const r = render(el(list, over));
  return {
    ...r,
    again: (next: CommanderRowItem[], nextOver: Over = {}) =>
      r.rerender(el(next, nextOver)),
  };
}

const control = () => screen.queryByRole("button", { name: /^Show \d+ more commanders/ });

const cards = () =>
  screen
    .getAllByRole("listitem")
    .filter((li) => !li.querySelector("button[aria-label^='Show ']"));

// The rack's result line — the lane's only live count of what the filters left.
const resultLine = () =>
  screen.getByText(/commanders (you own and haven't built|match)/);

// The rack mounts ONE treatment, chosen in JS at `CHASSIS_WIDE_MIN_PX` — below it the colour
// pips and `Build from` live in a closed sheet and are not in the document
// at all. Every test here is about the list, so they all stand at the wide
// breakpoint; the narrow treatment is `filter-rack.test.tsx`'s subject.
beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  );
  // The mirror keeps whatever path it is mounted under, so the test has to
  // stand on the real one rather than jsdom's default `/`.
  window.history.replaceState(null, "", "/commanders");
  replaceState.mockClear();
});

afterEach(() => vi.unstubAllGlobals());

describe("CommandersView windowing", () => {
  it("renders one batch and a control naming what is left", () => {
    view(results(214));
    expect(cards()).toHaveLength(REVEAL_STEP);
    expect(control()).toHaveAccessibleName("Show 25 more commanders, 189 remaining");
    expect(screen.getByText("189 remaining")).toBeInTheDocument();
  });

  it("advances by a full batch on activation", () => {
    view(results(214));
    fireEvent.click(control()!);
    expect(cards()).toHaveLength(50);
    expect(control()).toHaveAccessibleName("Show 25 more commanders, 164 remaining");
  });

  it("keeps the label at the constant even when fewer than a batch remain", () => {
    view(results(30));
    expect(control()).toHaveAccessibleName("Show 25 more commanders, 5 remaining");
    expect(screen.getByText("Show 25 more")).toBeInTheDocument();
  });

  it("swaps the control for the end-of-ranking rule at exhaustion", () => {
    view(results(30));
    fireEvent.click(control()!);
    expect(cards()).toHaveLength(30);
    expect(control()).toBeNull();
    expect(screen.getByText("End of ranking · 30")).toBeInTheDocument();
  });

  it("clamps to the list length rather than overshooting on rapid activations", () => {
    const { container } = view(results(60));
    fireEvent.click(control()!);
    fireEvent.click(control()!);
    expect(cards()).toHaveLength(60);
    expect(control()).toBeNull();
    expect(container.querySelector('[aria-live="polite"]')).toHaveTextContent(
      "60 shown, 0 more below. Ranks 51 to 60 added.",
    );
  });

  it("renders neither control nor rule on a list too short to window", () => {
    view(results(24));
    expect(cards()).toHaveLength(24);
    expect(control()).toBeNull();
    expect(screen.queryByText(/End of ranking/)).toBeNull();
  });

  // The live region is no longer windowing's alone — the ranking toggle
  // announces through it, and that control exists on every list length. It
  // stays mounted and empty rather than being gated on a windowed list.
  it("leaves the short-list surface untouched — empty live region, no row focus targets", () => {
    const { container } = view(results(24));
    expect(container.querySelector('[aria-live="polite"]')).toHaveTextContent("");
    expect(container.querySelector("li[tabindex]")).toBeNull();
  });

  it("renders no windowing furniture at all when there are no results", () => {
    view(results(0));
    expect(control()).toBeNull();
    expect(screen.queryByText(/End of ranking/)).toBeNull();
    expect(screen.queryByText(/more below/)).toBeNull();
  });
});

// The rack replaced the bar's two `WindowCount` copies with one result line.
// The reveal control still owns the window's own figures, and the rack must not
// restate them: two counts on one screen that disagree by design read as a bug.
describe("CommandersView result line", () => {
  it("states the lane at rest rather than printing a ratio", () => {
    view(results(214));
    expect(resultLine()).toHaveTextContent(
      "214 commanders you own and haven't built",
    );
    expect(screen.queryByText(/214 of 214/)).toBeNull();
  });

  it("prints the ratio once a filter narrows the lane", () => {
    const mixed = [
      ...results(40, ["R"]),
      ...results(4, ["U"]).map((r, i) => ({ ...r, slug: `u-${i}`, oracleId: `u-${i}` })),
    ];
    view(mixed);
    fireEvent.click(screen.getByRole("switch", { name: "Red" }));
    expect(resultLine()).toHaveTextContent("40 of 44 commanders match");
  });

  it("never restates the reveal control's own window figures", () => {
    view(results(214));
    expect(screen.queryByText(/more below/)).toBeNull();
    // The window's remainder is the reveal control's alone, and it is still there.
    expect(screen.getByText("189 remaining")).toBeInTheDocument();
  });
});

describe("CommandersView windowing under the colour filter", () => {
  const filterToRed = () =>
    fireEvent.click(screen.getByRole("switch", { name: "Red" }));

  it("resets the window and recounts against the filtered length", () => {
    const mixed = [...results(40, ["R"]), ...results(40, ["U"]).map((r, i) => ({
      ...r,
      slug: `blue-${i}`,
      oracleId: `blue-${i}`,
    }))];
    view(mixed);
    fireEvent.click(control()!);
    expect(cards()).toHaveLength(50);

    filterToRed();
    expect(cards()).toHaveLength(REVEAL_STEP);
    expect(control()).toHaveAccessibleName("Show 25 more commanders, 15 remaining");
  });

  it("does not renumber ranks — they stay global Fit ranks", () => {
    const mixed = [
      ...results(3, ["U"]).map((r, i) => ({ ...r, slug: `blue-${i}`, oracleId: `blue-${i}` })),
      ...results(2, ["R"]),
    ];
    view(mixed);
    filterToRed();
    const [first] = cards();
    // Three blue generals were filtered out, so the first red row keeps rank 4.
    expect(within(first).getAllByText("4").length).toBeGreaterThan(0);
  });
});

// The lane lists cards the reader OWNS, so a renamed copy is captioned with the name
// printed on it — and then the controls that read a name have to read both, or the row
// becomes unreachable by a name it is legitimately known by.
describe("CommandersView · a renamed copy", () => {
  const renamed = () => {
    const [row, ...rest] = results(3);
    return [
      { ...row, name: "Iroas, God of Victory", printedName: "Freya, Queen of the Valkyries" },
      ...rest,
    ];
  };
  const searchFor = (q: string) =>
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: q } });

  it("finds the row by the name on the card", () => {
    view(renamed());
    searchFor("freya");

    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByText("Freya, Queen of the Valkyries")).toBeTruthy();
  });

  // The oracle name is what a player who knows the card types, and it is the only name
  // `/discover` has — so dropping it would be a regression on both lanes at once.
  it("finds it by the oracle name as well", () => {
    view(renamed());
    searchFor("iroas");

    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });

  // A-Z is alphabetical in the names on screen or it is not alphabetical at all: sorted
  // on the oracle name, `Freya` files under I and reads as one card out of place.
  it("orders A-Z by the name drawn", () => {
    // Through the URL, as the `free` mode above is: `o=name` is what the reader's own
    // press writes, and the view reads its order from `window.location`.
    window.history.replaceState(null, "", "/commanders?o=name");
    // `Freya` sorts first among `General 1`/`General 2`; `Iroas` would sort last.
    view(renamed());

    const names = screen.getAllByRole("listitem").map((li) => li.textContent ?? "");
    expect(names[0]).toContain("Freya, Queen of the Valkyries");
    window.history.replaceState(null, "", "/commanders");
  });
});

// Which zero state answers for an empty list follows which control emptied it.
// The colour state promises a pip to drop; a query has no pip, so a search-only
// zero used to fall through to an empty list under a rack still claiming
// `0 of 40 commanders match` — a count with nothing under it explaining itself.
describe("CommandersView zero states", () => {
  const searchFor = (q: string) =>
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: q } });

  // `cards()` throws on an empty list, which is the case under test.
  const noRows = () => expect(screen.queryAllByRole("listitem")).toHaveLength(0);

  // The rack's own search field also offers `Clear search`, so the state's
  // primary is reached through the state rather than by label alone.
  const zeroState = () =>
    within(screen.getByText("No commander by that name").parentElement!);

  it("explains a search that matched nothing, and offers the other lane", () => {
    view(results(40));
    searchFor("jodah");
    noRows();
    expect(screen.getByText("No commander by that name")).toBeInTheDocument();
    expect(screen.getByText(/the 40 you own/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Search Discover" })).toHaveAttribute(
      "href",
      "/discover?q=jodah",
    );
  });

  it("clears the search from the state's own primary", () => {
    view(results(40));
    searchFor("jodah");
    fireEvent.click(zeroState().getByRole("button", { name: "Clear search" }));
    expect(cards()).toHaveLength(REVEAL_STEP);
  });

  it("keeps naming a pip when one is lit, since that state has a correction", () => {
    view(results(40, ["R"]));
    fireEvent.click(screen.getByRole("switch", { name: "Blue" }));
    noRows();
    expect(screen.getByText("Nothing in the pile matches")).toBeInTheDocument();
    expect(screen.queryByText("No commander by that name")).toBeNull();
  });

  // The sentence offers to bring a named row BACK, so it has to name it the way the row
  // is captioned. Every other name read in this file moved to the drawn one; this is the
  // one that reaches a zero state, where no row is on screen to correct it.
  it("names the recoverable row by the name its row draws", () => {
    const [row, ...rest] = results(3, ["R"]);
    view([
      { ...row, name: "Iroas, God of Victory", printedName: "Freya, Queen of the Valkyries" },
      ...rest,
    ]);
    fireEvent.click(screen.getByRole("switch", { name: "Blue" }));
    noRows();

    expect(screen.getByText(/Freya, Queen of the Valkyries/)).toBeInTheDocument();
    expect(screen.queryByText(/Iroas, God of Victory/)).toBeNull();
  });

  it("shows no zero state when nothing narrowed the lane", () => {
    view(results(0));
    expect(screen.queryByText("Nothing in the pile matches")).toBeNull();
    expect(screen.queryByText("No commander by that name")).toBeNull();
  });
});

describe("CommandersView Printed in", () => {
  // Rows 0 and 1 were printed in HOB, row 2 in CMM, and rows 3 and 4 in neither. Aligned to the
  // rows by position, as the page ships it.
  const index: LanePrintedIn = {
    sets: [
      { code: "hob", name: "The Hobbit" },
      { code: "cmm", name: "Commander Masters" },
    ],
    rows: [[0], [0], [1], [], []],
  };
  const withSets = (qs: string) => window.history.replaceState(null, "", `/commanders?${qs}`);
  const names = () => cards().map((c) => c.textContent ?? "");

  it("keeps the commanders printed in a chosen set", () => {
    withSets("p=hob");
    view(results(5), { printedIn: index });
    expect(names()).toEqual([expect.stringContaining("General 0"), expect.stringContaining("General 1")]);
  });

  it("keeps a commander printed in ANY of several chosen sets", () => {
    withSets("p=hob,cmm");
    view(results(5), { printedIn: index });
    expect(cards()).toHaveLength(3);
    expect(names().some((n) => n.includes("General 3"))).toBe(false);
  });

  it("applies nothing when the lane shipped no index", () => {
    withSets("p=hob");
    view(results(5));
    expect(cards()).toHaveLength(5);
    // Nor draws a chip claiming it did.
    expect(screen.queryByRole("button", { name: /Printed in HOB/ })).not.toBeInTheDocument();
  });

  // The one-fix sentence counts Printed in as ONE control. Here the pip gives back one row and
  // the set filter gives back four, so the set filter is the fix it names.
  it("names the set filter when dropping it gives back the most rows", () => {
    const list = results(5, ["R"]);
    list[2] = { ...list[2], colorIdentity: ["G"] };
    withSets("c=r&p=cmm");
    view(list, { printedIn: index });
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
    expect(screen.getByText(/Drop the set filter and you get 4 rows back/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Drop Printed in CMM" }));
    expect(cards()).toHaveLength(4);
    expect(new URLSearchParams(window.location.search).get("p")).toBeNull();
  });
});

describe("CommandersView ranking toggle", () => {
  // The control switches the data, not a panel, so it is a radiogroup rather
  // than the tablist its shape suggests.
  // The segments are labelled by their aria strings, not their visible text.
  // One treatment is mounted, so these are single elements — the bar's paired
  // desktop/mobile subtrees are gone.
  const segments = (name: string) => screen.getAllByRole("radio", { name });
  const ALL = "All my cards";
  const FREE = "Free cards only";

  describe("the saved mode (Hugh, 2026-09-27)", () => {
    beforeEach(() => rememberCommandersAvail.mockClear());

    it("opens in the saved mode when the URL names none, and writes no a=", () => {
      view(results(3), { savedAvail: "free", freeItems: results(3) });
      for (const s of segments(FREE)) expect(s).toHaveAttribute("aria-checked", "true");
      expect(window.location.search).not.toContain("a=");
      expect(rememberCommandersAvail).not.toHaveBeenCalled();
    });

    it("lets an explicit a=all win over a saved free", () => {
      view(results(3), { savedAvail: "free", urlAvail: "all", freeItems: results(3) });
      for (const s of segments(ALL)) expect(s).toHaveAttribute("aria-checked", "true");
    });

    it("remembers the reader's flip, and writes a= only where it differs from the saved mode", () => {
      view(results(3), { savedAvail: "free", freeItems: results(3) });
      fireEvent.click(segments(ALL)[0]);
      expect(rememberCommandersAvail).toHaveBeenCalledWith("all");
      expect(urls().at(-1)).toBe("/commanders?a=all");
      fireEvent.click(segments(FREE)[0]);
      expect(rememberCommandersAvail).toHaveBeenLastCalledWith("free");
      expect(urls().at(-1)).toBe("/commanders");
    });

    // Round 1 of #1068: a same-route navigation to a bare /commanders after a flip must read the
    // NEW choice, before any fresh payload arrives with it.
    it("reads a bare URL against the choice just made, not the payload's", () => {
      const list = results(3);
      const { again } = view(list, { freeItems: list });
      fireEvent.click(segments(FREE)[0]);
      // `again` re-renders with the SAME payload (saved `all`) at a bare /commanders.
      again(list, { freeItems: list });
      expect(window.location.search).not.toContain("a=");
      for (const s of segments(FREE)) expect(s).toHaveAttribute("aria-checked", "true");
    });

    // Round 3 of #1068: after a flip moved the client's baseline, an address that names a mode
    // keeps naming it, and a bare one stays bare.
    it("keeps an explicit a=all after a flip, and leaves a bare address bare", () => {
      const list = results(3);
      const { again } = view(list, { freeItems: list });
      fireEvent.click(segments(FREE)[0]);
      again(list, { freeItems: list, urlAvail: "all" });
      for (const s of segments(ALL)) expect(s).toHaveAttribute("aria-checked", "true");
      expect(window.location.search).toContain("a=all");
      again(list, { freeItems: list });
      expect(window.location.search).not.toContain("a=");
    });

    it("remembers nothing when no flip happened", () => {
      view(results(3, ["R"]), { freeItems: results(3, ["R"]) });
      fireEvent.click(screen.getByRole("switch", { name: "Red" }));
      expect(rememberCommandersAvail).not.toHaveBeenCalled();
    });

    it("does not save the climb-down when a saved free cannot be served, nor pin it in the URL", () => {
      view(results(3), { savedAvail: "free", availOk: false });
      for (const s of segments(ALL)) expect(s).toHaveAttribute("aria-checked", "true");
      expect(rememberCommandersAvail).not.toHaveBeenCalled();
      expect(window.location.search).not.toContain("a=");
    });

    // Availability is inside Clear's scope in the chassis (badge, chips and Clear share one
    // counter), so a Clear that resets it is a choice, and is saved.
    it("saves All when Clear resets a saved Free", () => {
      view(results(3, ["R"]), { savedAvail: "free", freeItems: results(3, ["R"]) });
      fireEvent.click(screen.getByRole("switch", { name: "Red" }));
      fireEvent.click(screen.getAllByRole("button", { name: /^Clear/ })[0]);
      expect(rememberCommandersAvail).toHaveBeenCalledWith("all");
    });
  });

  it("opens on the mode the URL asked for", () => {
    view(results(3), { avail: "free", freeItems: results(3) });
    for (const s of segments(FREE)) expect(s).toHaveAttribute("aria-checked", "true");
    for (const s of segments(ALL)) expect(s).toHaveAttribute("aria-checked", "false");
  });

  // Both rankings arrive in one render, so the flip is a state change: the list
  // swaps in place, and the URL is mirrored without a navigation.
  it("swaps the list on the flip, mirroring the mode into the URL", () => {
    const all = results(3);
    view(all, { freeItems: [all[2], all[0], all[1]] });
    fireEvent.click(segments(FREE)[0]);
    expect(cards()[0]).toHaveTextContent("General 2");
    for (const s of segments(FREE)) expect(s).toHaveAttribute("aria-checked", "true");
    // `all` is the parameter module's default, so `free` is the mode that gets
    // written — the reverse of what the shipped bar serialised.
    expect(urls().at(-1)).toBe("/commanders?a=free");
  });

  // The mirror writes the whole parameter object together. Written from the
  // colours alone, a pip clicked after a flip would drop the mode from the URL.
  it("keeps the mode in the URL when a colour lands after the flip", () => {
    view(results(3, ["R"]), { freeItems: results(3, ["R"]) });
    fireEvent.click(segments(FREE)[0]);
    fireEvent.click(screen.getByRole("switch", { name: "Red" }));
    expect(urls().at(-1)).toBe("/commanders?c=r&a=free");
  });

  // Coming back from a commander restores the tree the server rendered before
  // the flip — the flip only ever mirrored itself into the URL, and Next adopts
  // that URL without re-rendering. The URL is therefore the only thing that still
  // knows what the reader chose, and the seed reads it in both directions.
  it("opens on free when the URL asks for it, whatever the payload was rendered for", () => {
    const all = results(3);
    view(all, { avail: "free", freeItems: [all[2], all[0], all[1]] });
    for (const s of segments(FREE)) expect(s).toHaveAttribute("aria-checked", "true");
    expect(cards()[0]).toHaveTextContent("General 2");
  });

  // The other direction, and it is the same defect: a reader who flipped BACK to
  // `All my cards` left a URL with no mode on it, over a tree the server had
  // rendered in free mode. A seed that preferred the payload reopened free.
  it("opens on all when the URL carries no mode, even with a free ranking present", () => {
    const all = results(3);
    view(all, { avail: "all", freeItems: [all[2], all[0], all[1]] });
    for (const s of segments(ALL)) expect(s).toHaveAttribute("aria-checked", "true");
    expect(cards()[0]).toHaveTextContent("General 0");
  });

  // `?a=free` is a request, not a promise — the same rule the flip itself
  // follows. With no second ranking to switch to there is nothing to honour.
  it("refuses the URL's request when no free ranking was produced", () => {
    // `avail: "free"` is what puts `a=free` ON the URL — the helper writes the
    // lane key rather than passing a prop, because that is where the view reads
    // it. Seeding the URL by hand and then passing `all` deleted the very
    // request this is here to exercise.
    // `el` writes the lane key onto the URL, because that is where the view reads
    // it — so the request is made before the render rather than passed as a prop.
    // Seeding it by hand and then passing `all` deleted the very request this is
    // here to exercise.
    const element = el(results(3), { avail: "free", freeItems: null, availOk: false });
    expect(window.location.search).toBe("?a=free");

    render(element);

    for (const s of segments(ALL)) expect(s).toHaveAttribute("aria-checked", "true");
    for (const s of segments(FREE)) expect(s).toHaveAttribute("aria-checked", "false");
    // And the refusal reaches the URL as well as the control: a request the
    // payload cannot serve is not left standing in the address bar.
    expect(window.location.search).toBe("");
  });

  // The primary nav pointing back at `/commanders` while the reader stands in
  // `Free cards only`. Next keeps this instance mounted for that navigation and
  // restores the tree it already has, with identical props and no word from
  // `useSearchParams`, so the URL moving is the only signal there is — and
  // `useLiveQuery` is what listens for it. The platform's notification is
  // dispatched here as `popstate`, which is the event jsdom has; a browser with
  // the Navigation API raises `currententrychange` for the same move, and
  // `live-query.test.tsx` covers that path against a stub.
  const navigateTo = (url: string) =>
    act(() => {
      window.history.pushState(null, "", url);
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

  it("follows the URL when a navigation lands on this instance", () => {
    const all = results(3);
    view(all, { avail: "free", freeItems: [all[2], all[0], all[1]] });
    for (const s of segments(FREE)) expect(s).toHaveAttribute("aria-checked", "true");

    navigateTo("/commanders");

    for (const s of segments(ALL)) expect(s).toHaveAttribute("aria-checked", "true");
    expect(cards()[0]).toHaveTextContent("General 0");
  });

  // And the reason that matters beyond the segment reading wrong: the rack builds
  // each control's next state from the params it was rendered with. Stale, the
  // first interaction after the navigation writes the previous lane back into a
  // URL the navigation had just reset.
  it("does not write the old lane back on the first interaction after one", () => {
    const all = results(3, ["R"]);
    view(all, { avail: "free", freeItems: [all[2], all[0], all[1]] });

    navigateTo("/commanders");
    fireEvent.click(screen.getByRole("switch", { name: "Red" }));

    expect(urls().at(-1)).toBe("/commanders?c=r");
  });

  it("follows the URL on a fresh mount too", () => {
    const all = results(3);
    view(all, { avail: "free", freeItems: [all[2], all[0], all[1]] });
    for (const s of segments(FREE)) expect(s).toHaveAttribute("aria-checked", "true");
  });

  // The reader's own flip must never be mistaken for one of those navigations:
  // it changes state first and the URL a moment later, and a reconciliation
  // comparing against the params rather than against what was written would
  // revert it inside that gap.
  it("does not undo the reader's own flip before the URL catches up", () => {
    const all = results(3);
    view(all, { freeItems: [all[2], all[0], all[1]] });
    fireEvent.click(segments(FREE)[0]);
    for (const s of segments(FREE)) expect(s).toHaveAttribute("aria-checked", "true");
    expect(cards()[0]).toHaveTextContent("General 2");
  });

  // The climb-down is derived, not recorded — so a reader who returns to the same
  // `?a=free` once the ranking is back gets the free lane, not a remembered
  // refusal. A stored overlay would have outlived the reason it was written.
  it("honours the same request again once the payload can serve it", () => {
    const all = results(3);
    const { again } = view(all, { avail: "free", freeItems: null, availOk: false });
    for (const s of segments(ALL)) expect(s).toHaveAttribute("aria-checked", "true");

    // The reader asks again — `avail` is the URL the helper writes, not a prop —
    // and this time the ranking is there.
    again(all, { avail: "free", freeItems: [all[2], all[0], all[1]] });

    for (const s of segments(FREE)) expect(s).toHaveAttribute("aria-checked", "true");
    expect(cards()[0]).toHaveTextContent("General 2");
  });

  // A revalidation can take the ranking away under a reader already standing in
  // it: an availability rollup that fails on the next read arrives as
  // `availOk: false` with no free ranking. Without a climb-down the list falls
  // back to the canonical one while the segment and the URL still say `free`.
  it("hands the mode back when a later payload cannot serve it", () => {
    const all = results(3);
    const { again } = view(all, { avail: "free", freeItems: [all[2], all[0], all[1]] });
    for (const s of segments(FREE)) expect(s).toHaveAttribute("aria-checked", "true");

    again(all, { avail: "all", freeItems: null, availOk: false });

    for (const s of segments(ALL)) expect(s).toHaveAttribute("aria-checked", "true");
    for (const s of segments(FREE)) expect(s).toHaveAttribute("aria-checked", "false");
    expect(cards()[0]).toHaveTextContent("General 0");
    // The URL climbs down with the control: `all` is the lane's default, so the
    // mode leaves the query string rather than being written out.
    expect(urls().at(-1)).not.toContain("a=free");
  });

  it("ranks against the free list once the server sends one", () => {
    const all = results(3);
    const free = [all[2], all[0], all[1]];
    view(all, { avail: "free", freeItems: free });
    expect(cards()[0]).toHaveTextContent("General 2");
  });

  // Unlike the colour filter, this changes the score itself, so frozen numerals
  // would read 3, 1, 2 down a page whose own order contradicts them.
  it("renumbers on a re-rank, where the colour filter would not", () => {
    const all = results(3);
    view(all, { avail: "free", freeItems: [all[2], all[0], all[1]] });
    expect(within(cards()[0]).getAllByText("1").length).toBeGreaterThan(0);
  });

  // Only a flip announces. On mount there is no re-rank to report, and a page
  // that announces itself the moment it loads is noise.
  it("announces the re-rank, and says nothing on first paint", () => {
    const { container } = view(results(3), { freeItems: results(2) });
    const live = container.querySelector('[aria-live="polite"]')!;
    expect(live).toHaveTextContent("");
    fireEvent.click(segments(FREE)[0]);
    expect(live).toHaveTextContent("Ranked from free cards only · 2 commanders");
  });

  // The rack's `Build from` has no struck-out segment — the banner below it
  // is what says the deck read failed. The flip is still refused.
  it("refuses the flip when we cannot read the decks", () => {
    view(results(3), { availOk: false });
    fireEvent.click(segments(FREE)[0]);
    for (const s of segments(ALL)) expect(s).toHaveAttribute("aria-checked", "true");
  });

  // `availOk` and a missing `freeItems` are separate failures — the second is
  // what would render an empty list if the flip were allowed through.
  it("refuses the flip when no free ranking arrived", () => {
    view(results(3), { freeItems: null });
    fireEvent.click(segments(FREE)[0]);
    for (const s of segments(ALL)) expect(s).toHaveAttribute("aria-checked", "true");
  });

  it("is one tab stop, and the arrows move within it", () => {
    view(results(3), { freeItems: results(3) });
    const all = segments(ALL)[0];
    expect(all).toHaveAttribute("tabindex", "0");
    expect(segments(FREE)[0]).toHaveAttribute("tabindex", "-1");
    fireEvent.keyDown(all, { key: "ArrowRight" });
    for (const s of segments(FREE)) expect(s).toHaveAttribute("aria-checked", "true");
  });

  it("leaves the arrows inert while the free ranking is unavailable", () => {
    view(results(3), { availOk: false });
    fireEvent.keyDown(segments(ALL)[0], { key: "ArrowRight" });
    for (const s of segments(ALL)) expect(s).toHaveAttribute("aria-checked", "true");
  });

  // The struck segment says a control is gone; the banner is the only thing
  // that says why, and offers the way back.
  it("banners the failed deck read", () => {
    view(results(3), { availOk: false });
    // Two, and exactly two: the banner always renders both width branches, so an
    // exact count is what catches a second banner sneaking in.
    expect(screen.getAllByText(availabilityCopy.degraded.heading)).toHaveLength(2);
    expect(screen.queryByText("Synergy data unavailable")).toBeNull();
  });

  // Two failures are one "try again" to the player, and `retryRecs` re-runs the
  // whole page — so stacking two banners would put two identical buttons on it.
  it("folds two failures into one banner", () => {
    view(allDegraded(3), { availOk: false, degraded: true });
    expect(
      screen.getAllByText(availabilityCopy.degraded.bodyWithSynergy),
    ).toHaveLength(2);
    expect(screen.queryByText("Synergy data unavailable")).toBeNull();
  });

  // The flag is raised by ANY degraded row, so a list with one whole row and one
  // degraded row must not claim the whole ranking fell back.
  it("says some, in the folded banner too, when only some rows are degraded", () => {
    view(someDegraded(3), { availOk: false, degraded: true });
    expect(
      screen.getAllByText(availabilityCopy.degraded.bodyWithSomeSynergy),
    ).toHaveLength(2);
    expect(screen.queryByText(availabilityCopy.degraded.bodyWithSynergy)).toBeNull();
  });

  it("leaves the synergy banner alone when only EDHREC is down", () => {
    view(allDegraded(3), { degraded: true });
    expect(screen.getAllByText("Synergy data unavailable")).toHaveLength(2);
    expect(screen.queryByText(availabilityCopy.degraded.heading)).toBeNull();
    expect(screen.queryByText(/some scores|some fit scores/)).toBeNull();
  });

  it("says some scores when EDHREC is down for only some of the rows", () => {
    view(someDegraded(3), { degraded: true });
    expect(
      screen.getByText(
        "EDHREC is unreachable, so some scores count only your cards and the roles they fill.",
      ),
    ).toBeInTheDocument();
  });
});

describe("CommandersView reveal a11y", () => {
  it("announces the new range against the filtered length", () => {
    const { container } = view(results(214));
    const live = container.querySelector('[aria-live="polite"]')!;
    expect(live).toHaveTextContent("");
    fireEvent.click(control()!);
    expect(live).toHaveTextContent("50 shown, 164 more below. Ranks 26 to 50 added.");
  });

  it("clears the announcement when a filter resets the window", () => {
    const mixed = [...results(40, ["R"]), ...results(40, ["U"]).map((r, i) => ({
      ...r,
      slug: `blue-${i}`,
      oracleId: `blue-${i}`,
    }))];
    const { container } = view(mixed);
    const live = container.querySelector('[aria-live="polite"]')!;
    fireEvent.click(control()!);
    expect(live).toHaveTextContent(/Ranks 26 to 50 added/);
    fireEvent.click(screen.getByRole("switch", { name: "Red" }));
    expect(live).toHaveTextContent("");
  });

  it("moves focus to the first revealed row, not to the control", () => {
    view(results(214));
    fireEvent.click(control()!);
    expect(document.activeElement).toBe(cards()[REVEAL_STEP]);
  });
});

// The rack's writes, per the URL table: every control is one parameter,
// defaults serialise as absences, and nothing navigates.
describe("CommandersView URL writes", () => {
  it("writes only the parameters that are off their default", () => {
    view(results(3, ["B"]));
    fireEvent.click(screen.getByRole("switch", { name: "Black" }));
    expect(urls().at(-1)).toBe("/commanders?c=b");
  });

  it("writes nothing back once every control returns to its default", () => {
    view(results(3, ["B"]));
    fireEvent.click(screen.getByRole("switch", { name: "Black" }));
    fireEvent.click(screen.getByRole("switch", { name: "Black" }));
    expect(urls().at(-1)).toBe("/commanders");
  });

  it("writes with replaceState rather than navigating", () => {
    view(results(3, ["B"]));
    routerReplace.mockClear();
    fireEvent.click(screen.getByRole("switch", { name: "Black" }));
    expect(routerReplace).not.toHaveBeenCalled();
    expect(replaceState).toHaveBeenCalled();
  });

  it("preserves parameters it does not own, read off the live URL", () => {
    window.history.replaceState(null, "", "/commanders?ref=email");
    view(results(3, ["B"]));
    fireEvent.click(screen.getByRole("switch", { name: "Black" }));
    expect(urls().at(-1)).toBe("/commanders?ref=email&c=b");
  });

  it("renders the colour-match control greyed with no pip lit", () => {
    view(results(3));
    expect(screen.getByRole("radiogroup", { name: "Color match" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });
});

describe("CommandersView — the rows' art and their place in the list", () => {
  it("draws the first screen's art at once and holds the rows below it", () => {
    // An observer that never reports, so a held row stays held while the test reads it.
    vi.stubGlobal("IntersectionObserver", class { observe() {} disconnect() {} });
    try {
      const withArt = results(8).map((r, i) => ({ ...r, artCropUri: `https://cards.scryfall.io/art_crop/front/${i}.jpg` }));
      const { container } = view(withArt);
      const layers = [...container.querySelectorAll<HTMLElement>(".art-wash-art")];
      expect(layers.length).toBeGreaterThan(5);
      expect(layers.slice(0, 5).every((l) => l.style.backgroundImage.includes("art_crop"))).toBe(true);
      expect(layers[5].style.backgroundImage).toBe("");
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
