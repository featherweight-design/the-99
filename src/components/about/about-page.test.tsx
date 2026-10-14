import { collectionEditCopy } from "../../lib/copy/collection-edit";
import { ENV_VIEW } from "@/test/env-view";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { AboutPage } from "./about-page";
import { ABOUT_VERSION, aboutCopy, aboutEntries } from "../../lib/copy/about";
import { FIGURES } from "./figures";
import { availabilityCopy } from "../../lib/copy/availability";
import { refreshCopy } from "../../lib/copy/refresh";
import { gameLogCopy } from "../../lib/copy/game-log";
import { deckImportCopy } from "../../lib/copy/deck-import";
import { THEMES } from "../../lib/theme/themes";
import { deckVersioningCopy } from "../../lib/copy/deck-versioning";
import { exportLinkOutCopy, exportTabCopy } from "../../lib/copy/decks-builder";
import { ORDER_OPTIONS } from "../commanders/rack/order-options";
import { commandersCopy } from "../../lib/copy/lanes";
import { explainedCopy } from "../../lib/copy/commander-explained";
import { cardAssignmentsCopy } from "../../lib/copy/card-assignments";
import { collectionChassisCopy, printingPickerCopy } from "../../lib/copy/collection";
import { spokenFullManaCost, spokenManaCost, twoFacedCopy } from "../../lib/copy/card-surfaces";
import { CARD_MARK_ROWS, COSTS, DECK_ANALYSIS, GAME_SUMMARY } from "../../lib/about/fixtures";
import { cardMarkCopy } from "../../lib/copy/card-mark";
import { BRACKET_NAMES } from "../../lib/copy/deck-analysis";
import { declarationCopy } from "../../lib/copy/declaration";
import { deriveHeadline } from "../../lib/decks/game-headline";
import { comboAwarenessCopy } from "../../lib/copy/combo-awareness";
import { addPanelCopy } from "../../lib/copy/decks-builder";
import { DECK_GROUPING_LABELS, deckSortOrderLabel } from "../../lib/copy/deck-sort";
import { viewToggleCopy } from "../../lib/copy/card-surfaces";
import { mixSourceLine, recommendedMix, ROLE_ORDER } from "../../lib/decks/mix";

/** The specimen's own mix — `ch01-figures.tsx` draws the strip with no deck behind it, so the
 *  figures are the asserted baseline and the source line says so. */
const SPECIMEN_MIX = recommendedMix(null, false);
import { setPageCopy } from "../../lib/copy/set-collections";
import { PIP_ORDER } from "../../lib/copy/filter-chassis";
import { DECK_VERSIONS,
  SHOPPING_ROWS,
  CARDS,
  CONTESTED_ARRIVAL,
  DECKLIST_MARK_ROWS,
  IMPORT_SOURCES,
  FIT_DEGRADED_SCORE,
  FIT_LEGEND,
  LANE_ROW_DISCOVER,
  LANE_ROW_OWNED,
  DECK_SPINE,
  DECK_TABS,
  PARTNER_PROPOSAL,
  SYNERGY_ROWS,
  FIT_FULL_SCORE,
  READY_SLICE,
  SET_CELLS,
  SET_HEAD,
  PRINTING_ROWS,
  ISSUE_PARSE_ERROR,
  ISSUE_UNMATCHED,
  REPLACE_ROWS,
  REPLACE_SUMMARY,
} from "../../lib/about/fixtures";

// Every feature switch ON for this file, so every entry is drawn, figures included. The page with
// the switches off is `about-page-r6.test.tsx`'s, and a switched entry's own rules are
// `about-page-switch.test.tsx`'s.
const SWITCHES = ["NEVER_CUT_ENABLED", "CHANGE_COMMANDER_ENABLED", "HELP_ME_CHOOSE_ENABLED", "SWAP_TOOLS_ENABLED", "ANALYSIS_TAB_ENABLED", "TUNING_ENABLED", "DECK_STATS_ENABLED", "COLLECTION_EDIT_ENABLED", "DECK_BENCHMARKS_ENABLED", "SHOPPING_MARK_BOUGHT_ENABLED", "DECK_PRINTINGS_ENABLED", "MANA_BALANCE_ENABLED", "ALL_DECKS_CART_ENABLED", "PRECONS_ENABLED", "UPCOMING_PRECONS_ENABLED", "DECK_TOKENS_ENABLED", "DECK_NOTES_ENABLED", "ADDED_COPY_ENABLED", "LINEUP_ENABLED", "PROPOSED_CUTS_ENABLED", "FIND_A_DECK_READ_ENABLED"] as const;
beforeAll(() => {
  for (const k of SWITCHES) process.env[k] = "true";
});
afterAll(() => {
  for (const k of SWITCHES) delete process.env[k];
});

// The action is a server function; the page only needs it to exist as a form
// target, and importing it for real drags a database client into jsdom.
vi.mock("../../app/about/actions", () => ({ dismissAbout: vi.fn(), recordAboutVisit: vi.fn() }));
// `deck-import` mounts `ImportEntry`, which calls `useRouter`. There is no app
// router in jsdom, and without this the hook throws during render — which took
// down all 53 tests in this file rather than the one figure, because every
// test renders the whole page.
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

/**
 * The dismiss, at one width.
 *
 * The page draws TWO: one pinned to the phone's viewport foot, one in the
 * desktop contents rail — because a reader who opened this page for a new
 * feature should not have to scroll thirty-five entries to leave it. Each is
 * hidden at the other's width with `display:none`, so exactly one is in the
 * accessibility tree in a browser. jsdom computes no styles and finds both,
 * so every lookup here names the one it means.
 */
function dismissButtons(): HTMLElement[] {
  return screen.getAllByRole("button", { name: new RegExp("^" + aboutCopy.dismiss) });
}
const railDismiss = () =>
  dismissButtons().find((el) => el.closest("nav") !== null) as HTMLElement;
const phoneDismiss = () =>
  dismissButtons().find((el) => el.closest("nav") === null) as HTMLElement;

describe("the page a first-time reader sees", () => {
  it("marks nothing, because all of it is new to them", () => {
    render(<AboutPage env={ENV_VIEW} seen={0} />);
    expect(screen.queryAllByText(aboutCopy.newBadge)).toHaveLength(0);
    expect(screen.queryByText(aboutCopy.newSinceEyebrow(1))).toBeNull();
  });

  it("draws every entry", () => {
    render(<AboutPage env={ENV_VIEW} seen={0} />);
    for (const entry of aboutEntries) {
      expect(screen.getByRole("heading", { name: new RegExp(escape(entry.title)) })).toBeTruthy();
    }
  });

  it("offers the dismiss only to a reader who was SENT here", () => {
    // Two conditions, and the second was missing. `behind` says there is
    // something to acknowledge; `?next=` says we INTERRUPTED them — the gate
    // is the only thing that puts it on this URL, and the account menu links
    // to a bare `/about`. A reader who came to look has a nav rail and a back
    // button, and `Got it — takes you home` would send them somewhere they
    // never asked to go.
    const sent = render(<AboutPage env={ENV_VIEW} seen={0} next="/decks" />);
    expect(dismissButtons()).toHaveLength(2);
    expect(railDismiss(), "no dismiss in the contents rail").toBeTruthy();
    expect(phoneDismiss(), "no dismiss pinned for the phone").toBeTruthy();
    // BOTH carry their own horizontal padding. `renderButton`'s BASE sets
    // none — every other call site supplies it — so the rail's `w-auto`
    // button drew its label edge to edge and read as a clipped word. A class
    // assertion is the only instrument here: jsdom lays nothing out, and the
    // defect is an absent utility rather than a wrong value.
    for (const button of dismissButtons()) {
      expect(button.className, "the dismiss has no horizontal padding").toMatch(/\bpx-\[/);
    }
    // The pinned bar's height, given back to the document. `<main>` reserves
    // `--tabbar-h` and nothing more, so without this the bar sits ON the last
    // entry: at 390px the final key line of `themes` was behind it, readable
    // only by someone who knew to keep scrolling into a control. Measured in a
    // browser, not inferred — jsdom lays nothing out, so what a unit test can
    // hold is that the spacer exists and is phone-only.
    const spacer = [...sent.container.querySelectorAll("div[aria-hidden]")].find((el) =>
      /\bh-\[\d+px\]/.test(el.className) && el.className.includes("min-[1000px]:hidden"),
    );
    expect(spacer, "nothing reserves the pinned dismiss's height").toBeTruthy();
    sent.unmount();

    // Behind, but came to look: nothing to press.
    render(<AboutPage env={ENV_VIEW} seen={0} />);
    expect(
      screen.queryAllByRole("button", { name: new RegExp("^" + aboutCopy.dismiss) }),
      "a reader who navigated here was offered a way out of a flow they never entered",
    ).toHaveLength(0);
  });
});

describe("the reader who is current", () => {
  it("has no dismiss to press", () => {
    render(<AboutPage env={ENV_VIEW} seen={ABOUT_VERSION} />);
    expect(screen.queryAllByRole("button", { name: new RegExp("^" + aboutCopy.dismiss) })).toHaveLength(0);
  });
});

describe("the reader who is behind", () => {
  // Every shipped entry is `since: 1` and ABOUT_VERSION is 1, so the marked
  // state cannot be reached with real copy at all. The first version of this
  // test recomputed the predicate against that copy and asserted the empty
  // array it was always going to get — green whatever `isNew` did, including
  // returning false unconditionally. This renders a version-2 page instead.
  const twoVersions = {
    ABOUT_VERSION: 2,
    aboutEntries: [
      { ...aboutEntries[0], id: "old", chapter: "01" as const, title: "Older entry", since: 1 },
      { ...aboutEntries[0], id: "new", chapter: "01" as const, title: "Newer entry", since: 2 },
    ],
  };

  it("marks the entry added since, and only that one", async () => {
    vi.resetModules();
    vi.doMock("../../lib/copy/about", async () => {
      const real = await vi.importActual<typeof import("../../lib/copy/about")>(
        "../../lib/copy/about",
      );
      return { ...real, ...twoVersions };
    });
    const { AboutPage: Page } = await import("./about-page");

    render(<Page env={ENV_VIEW} seen={1} />);
    const badges = screen.getAllByText(aboutCopy.newBadge);
    expect(badges).toHaveLength(1);
    expect(badges[0].closest("li")?.textContent).toContain("Newer entry");
    expect(screen.getByText(aboutCopy.newSinceEyebrow(1))).toBeTruthy();
    vi.doUnmock("../../lib/copy/about");
    vi.resetModules();
  });
});

describe("where the dismiss sends them", () => {
  it("carries a same-origin destination through", () => {
    render(<AboutPage env={ENV_VIEW} seen={0} next="/decks?sort=name" />);
    const form = railDismiss().closest("form");
    expect(form?.querySelector("input[name=next]")).toHaveValue("/decks?sort=name");
    expect(screen.getByText(aboutCopy.dismissDestination("/decks?sort=name"))).toBeTruthy();
  });

  it("refuses to print or carry another origin", () => {
    render(<AboutPage env={ENV_VIEW} seen={0} next="//evil.example" />);
    const form = railDismiss().closest("form");
    expect(form?.querySelector("input[name=next]")).toHaveValue("/");
    expect(screen.getByText(aboutCopy.dismissDestinationHome)).toBeTruthy();
  });
});

describe("the contents", () => {
  it("links every chapter that has entries", () => {
    render(<AboutPage env={ENV_VIEW} seen={0} />);
    // TWO navigations carry this label now — the in-flow list below the wide
    // stop and the sticky rail above it — so the compact one is taken by
    // position rather than by name alone.
    const [nav] = screen.getAllByRole("navigation", { name: aboutCopy.contentsLabel });
    for (const n of ["01", "02", "03", "04"] as const) {
      const link = within(nav).getByRole("link", {
        name: new RegExp(escape(aboutCopy.chapters[n].title)),
      });
      expect(link).toHaveAttribute("href", `#chapter-${n}`);
    }
  });
});

/** Escapes a title for use inside a RegExp — several carry em dashes and parens. */
function escape(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

describe("the dismiss control's accessible name", () => {
  it("says where pressing it lands", () => {
    // The clause beside the button is a sibling, so it is not part of the
    // button's name. Without this a screen-reader user hears "Got it" and
    // nothing about the destination.
    render(<AboutPage env={ENV_VIEW} seen={0} next="/decks" />);
    expect(
      screen.getAllByRole("button", {
        name: `${aboutCopy.dismiss}, ${aboutCopy.dismissDestination("/decks")}`,
      }),
    ).toBeTruthy();
  });
});

describe("a crafted link", () => {
  it("cannot pick a local route through an authority", async () => {
    // `//evil.example/decks` never leaves the origin, but it resolves to
    // /decks — a destination the reader never asked for, chosen by whoever
    // wrote the link. The page must not print or carry it.
    render(<AboutPage env={ENV_VIEW} seen={0} next="//evil.example/decks" />);
    const form = screen
      .getAllByRole("button", { name: new RegExp("^" + aboutCopy.dismiss) })[0]
      .closest("form");
    expect(form?.querySelector("input[name=next]")).toHaveValue("/");
    expect(screen.getByText(aboutCopy.dismissDestinationHome)).toBeTruthy();
  });
});

describe("the figures", () => {
  const figures = (c: HTMLElement): Record<string, HTMLElement> =>
    Object.fromEntries(
      [...c.querySelectorAll<HTMLElement>("[data-specimen]")].map((f) => [
        f.getAttribute("data-specimen") ?? "",
        f,
      ]),
    );

  it("draws one specimen for every entry that has a figure", () => {
    // DERIVED, not a hard-coded list. A literal set of labels has to be edited
    // every time a figure lands, which makes the test a chore rather than a
    // guard — and the thing worth catching is a figure REGISTERED in FIGURES
    // that renders nothing, which counting catches and a label list does not.
    const { container } = render(<AboutPage env={ENV_VIEW} seen={0} />);
    const drawn = container.querySelectorAll("[data-specimen]").length;
    const registered = aboutEntries.filter((e) => e.id in FIGURES).length;
    expect(registered, "no entry has a figure at all").toBeGreaterThan(0);
    expect(drawn).toBe(registered);
  });

  it("hides every figure from the reading order, and says it elsewhere", () => {
    // ONE FIGURE KIND NOW. The page used to draw two: a mounted specimen,
    // aria-hidden because it repeats what the caption and keys already say,
    // and a readable `Legend` for entries whose content existed NOWHERE else —
    // Discover's five orders and their glosses were drawn there and in no
    // caption. Chapter 04 converted the last four legends, so the helper and
    // its box are gone and `spokenAs` is the surviving way to put a figure's
    // content into the reading order.
    //
    // What replaces the two-population check is the rule that made it matter:
    // every figure is hidden, so every entry MUST carry its own prose. An
    // entry with an aria-hidden figure and nothing readable beside it would
    // hide its whole subject from the readers least able to recover it.
    const { container } = render(<AboutPage env={ENV_VIEW} seen={0} />);
    const all = Object.entries(figures(container));
    expect(all.length, "no figures at all").toBeGreaterThan(0);

    for (const [name, figure] of all) {
      expect(figure, name).toHaveAttribute("aria-hidden", "true");
      expect(figure, name).toHaveAttribute("inert");
      expect(figure.className, name).toContain("pointer-events-none");
    }

    for (const entry of aboutEntries) {
      if (!(entry.id in FIGURES)) continue;
      const prose = entry.caption.trim().length + entry.keys.join("").trim().length;
      expect(prose, `${entry.id} draws a hidden figure and says nothing`).toBeGreaterThan(0);
    }
  });


  it("draws the buy tag's four claims, which are not four ways of saying cost", () => {
    // The frame is not the figure: asserting `data-width` alone leaves three
    // of the four states deletable with the suite still green.
    const { container } = render(<AboutPage env={ENV_VIEW} seen={0} />);
    const plate = figures(container)["buy-tag"];
    // `sold out` is a live-row comparison, so it only appears when the fixture
    // is stale against the newest stamp — a wrong date silently makes it a
    // fourth priced tag.
    expect(plate.textContent).toContain("sold out");
    expect(plate.textContent).toContain("foil");
    // The priced state prints a figure; absent prints nothing at all.
    expect(plate.textContent).toMatch(/\$\d/);
    const tags = [...plate.querySelectorAll("span")].filter((el) =>
      el.className.toString().includes("rounded"),
    );
    expect(tags.length).toBeGreaterThanOrEqual(3);
  });

  it("draws the Stats curve card itself, from the fixture's counts, with Creature lit", () => {
    const { container } = render(<AboutPage env={ENV_VIEW} seen={0} />);
    const plate = figures(container)["deck-stats"];
    const columns = [...plate.querySelectorAll("[data-curve-column]")];
    expect(columns).toHaveLength(8);
    // Bucket sizes are the card's own figure, not a retyped list.
    expect(columns.map((c) => c.querySelector("span")?.textContent)).toEqual(["1", "9", "14", "13", "11", "8", "4", "4"]);
    expect(plate.querySelector('[data-type-chip="creature"]')).toHaveAttribute("aria-pressed", "true");
    expect(plate.querySelector('[data-type-chip="land"]')?.textContent).toContain("36");
  });

  it("draws How it plays in its rows layout for Scrappy Survivors: four dependency rows and no opener", () => {
    const { container } = render(<AboutPage env={ENV_VIEW} seen={0} />);
    const plate = figures(container)["deck-benchmarks"];
    const block = plate.querySelector("[data-benchmarks]")!;
    expect(block).not.toBeNull();
    // `rows` draws the phone layout at any width: no `md:` class reaches the grades container.
    expect(block.querySelector("[data-grades]")!.className).not.toMatch(/md:/);
    expect([...block.querySelectorAll("[data-grade]")].map((g) => g.getAttribute("data-grade"))).toEqual(["velocity", "flow", "interaction", "win"]);
    expect(block.querySelector('[data-grade="win"]')).toHaveAttribute("data-no-combo");
    expect([...block.querySelectorAll("[data-dependency]")].map((d) => [d.getAttribute("data-dependency"), d.getAttribute("data-strength")])).toEqual([
      ["graveyard", "heavy"],
      ["enchantments", "heavy"],
      ["creatures", "light"],
      ["combat", "heavy"],
    ]);
    // A figure offers no control that does nothing: no ledger opener anywhere. Two things hold this
    // (the figure passes no `onOpen`, and the fixture's ledgers are empty), so dropping either alone
    // leaves it green; the handoff gives the ledger counts but not their cards, so none are invented.
    expect(block.querySelectorAll('button[aria-haspopup="dialog"]')).toHaveLength(0);
  });

  it("mounts a real bar in each fit shape", () => {
    // `out of 100` and `out of 40` are SpecimenCell captions and print whether
    // or not FitBar returned anything, so the annotation cannot stand in for
    // the figure.
    const { container } = render(<AboutPage env={ENV_VIEW} seen={0} />);
    const plate = figures(container)["fit"];
    const tracks = [...plate.querySelectorAll("div")].filter((el) =>
      el.className.toString().includes("rounded-full"),
    );
    expect(tracks.length).toBeGreaterThanOrEqual(2);
  });

  it("gives an inset entry the inset frame and a plate entry the plate", () => {
    const { container } = render(<AboutPage env={ENV_VIEW} seen={0} />);
    const f = figures(container);
    // `width` is a field on every entry and was ignored at first, so the
    // buy-tag entry drew a full-width frame around one small mark.
    expect(f["buy-tag"]).toHaveAttribute("data-width", "inset");
    expect(f["availability"]).toHaveAttribute("data-width", "plate");
  });

  // Each figure is asserted on ITS OWN content. The first version of this
  // counted elements inside the frame, which counts the grid and the cells —
  // an empty plate has more than two of those and passed.
  it("draws the four availability states, including the one that draws nothing", () => {
    const { container } = render(<AboutPage env={ENV_VIEW} seen={0} />);
    const plate = figures(container)["availability"];

    // FOUR ROWS, as §3 draws them — a numeral and the marker beside it. The
    // figure was a four-column grid with a caption under every cell, which
    // forced each caption to say something the marker already said.
    const rows = [...plate.querySelectorAll(":scope > div > div")];
    expect(rows).toHaveLength(4);

    // Asserted on the MARKERS, never on the plate's text: three rounds running,
    // an assertion here measured this page's own annotation instead of the
    // app's output and stayed green with every AvailabilityMarker deleted.
    //
    // The numeral is the row's first child, so the marker is the second.
    const drawn = rows.map((row) => (row.children[1]?.textContent ?? "").trim());
    expect(drawn[0], "free draws no diamond, and that IS the state").toBe("no diamond at all");
    expect(drawn.slice(1).filter((t) => t.length > 0)).toHaveLength(3);
    expect(drawn.join(" ")).toContain("in a draft");
    expect(drawn.join(" ")).toContain("short 2");

    // Every row carries its numeral. "Annotation is a numeral and a line" is
    // the handoff's grammar, and a numeral with nothing to point at is a
    // bullet — which is what the four key lines below were before this.
    const numerals = rows.map((row) => row.firstElementChild?.textContent);
    expect(numerals).toEqual(["1", "2", "3", "4"]);
  });

  it("gives an availability row no caption to echo its mark with", () => {
    // The close-out contact sheet's finding: a cell drew `◆ none free` with
    // the words `none free` directly beneath it. Both halves individually
    // correct, which is why every other assertion in this file passed over it.
    //
    // That was fixed by rewording the captions. §3 removes the cause instead:
    // its rows carry a numeral and the marker and NOTHING ELSE, and the
    // explanation lives in the numbered lines below the figure. A row with no
    // caption cannot echo one, so this asserts the structure rather than
    // comparing two strings — the version it replaces stayed green whenever a
    // caption was reworded rather than removed.
    //
    // `free` is the single exception and states it: the marker draws nothing,
    // so the row has words of its own or it reads as a figure that failed.
    const { container } = render(<AboutPage env={ENV_VIEW} seen={0} />);
    const plate = container.querySelector('[data-specimen="availability"]')!;
    const rows = [...plate.querySelectorAll(":scope > div > div")];
    expect(rows.length).toBeGreaterThan(0);
    for (const [i, row] of rows.entries()) {
      expect(row.children, `row ${i + 1} is a numeral and a mark, nothing else`).toHaveLength(2);
    }
  });

  it("draws all seven statuses, each with the figure that explains it", () => {
    const { container } = render(<AboutPage env={ENV_VIEW} seen={0} />);
    const plate = figures(container)["status"];
    const pills = [...plate.querySelectorAll("span")].filter((el) =>
      el.className.toString().includes("rounded-[6px]"),
    );
    expect(pills).toHaveLength(7);
    // `TILE_CLASS` is the component's default and opens `absolute
    // bottom-[13px] left-[13px]`; defaulted here all seven leave flow.
    for (const pill of pills) {
      expect(pill.className).not.toContain("absolute");
      // The deck card's FOOTER treatment — 22px at 10.5px — not the tile's
      // 24px at 11px. The component defaults to the tile box, so copying that
      // box while merely removing `absolute` draws a badge a size too large.
      expect(pill.className).toContain("h-[22px]");
      expect(pill.className).toContain("text-[10.5px]");
    }
    // The clause beside the badge, in the app's own words.
    expect(plate.textContent).toContain("created today");
    expect(plate.textContent).toContain("2 lines unresolved");
    // The To buy clause carries its cost. A deck at a legal list you cannot
    // sleeve is explained by what the shop trip costs, not by the count alone.
    expect(plate.textContent).toContain("3 to buy · $12.40");

    // Building and Complete carry NO clause in the app — their count and their
    // bar are the whole explanation — so a sentence for either would be a
    // string the deck card never shows.
    expect(plate.textContent).not.toContain("87 cards");
    expect(plate.textContent).not.toContain("99 cards");
    expect(plate.textContent).toContain("87 / 99");

    // Six fills for seven statuses: `New` draws an empty track, which is what
    // an empty track means. `Draft` has a fill now — a draft is a draft at any
    // length, and the specimen draws one at 47 cards.
    const fills = plate.querySelectorAll("[data-status-fill]");
    expect(fills).toHaveLength(6);
  });

  it("draws the decklist marks as rows, at the row's own geometry", () => {
    const { container } = render(<AboutPage env={ENV_VIEW} seen={0} />);
    const plate = figures(container)["marks"];

    // The figure mounts `DecklistRow`, so each assertion below names a slot
    // the ROW owns. The page used to assemble its own row here, and every one
    // of these would have been an assertion about this test file's idea of a
    // decklist rather than about the list a reader meets.

    // The dot. `OwnershipDot` takes its size from the caller, and the row
    // passes classes rather than an inline style — so this reads the class the
    // row supplies. `rounded-full` alone matches every mana pip.
    const dots = [...plate.querySelectorAll("span")].filter((el) =>
      el.className.toString().includes("w-[7px]"),
    );
    expect(dots.length, "the ownership dots drew nothing").toBe(
      DECKLIST_MARK_ROWS.length,
    );
    // Both states, since the entry's first key line is that they differ. The
    // classes are `OwnershipDot`'s own, and a figure of five owned rows would
    // draw five dots and teach half the line.
    const dashed = dots.filter((el) => el.className.toString().includes("dashed"));
    expect(dashed.length, "every dot drew the owned state").toBe(2);

    expect(plate.textContent).toContain(CARDS.owned);

    // The availability slot's words. One row per state the marker speaks, and
    // the free row deliberately speaks none — a marker on every row would say
    // the opposite of the caption.
    expect(plate.textContent).toContain("in a draft");
    expect(plate.textContent).toContain("short 2");

    // The count. The entry's key line was corrected to the row's own rule —
    // `×N` beside the name, on `quantity > 1` only — so both halves are read:
    // the one row above a single copy prints it, and no other row does.
    expect(plate.textContent).toContain(addPanelCopy.row.quantity(2));
    expect(plate.textContent).not.toContain(addPanelCopy.row.quantity(1));

    // The auto tag, which the caption separates from the obstacle marks. It is
    // a control on the real row, so it is read as one.
    // Queried by attribute rather than by role: `Specimen` is `aria-hidden`,
    // so nothing inside it has an accessible role at all.
    const autoTags = [...plate.querySelectorAll("button")].filter((el) =>
      /Keep .* in this deck/.test(el.getAttribute("aria-label") ?? ""),
    );
    expect(autoTags.length, "the auto tag drew nothing").toBe(1);

    // The cost. jsdom answers false for every media query, so the row's
    // desktop track is `display:none` and the PHONE run is what renders here.
    // Asserting the 72px track would be asserting a branch this environment
    // never takes. The screenshot covers the desktop one.
    // `spoken` puts the whole cost in an sr-only span beside the pips, which
    // is the one part of the run that carries readable text.
    const spoken = [...plate.querySelectorAll("span.sr-only")].map(
      (el) => el.textContent ?? "",
    );
    expect(
      spoken.some((t) => t === spokenManaCost(DECKLIST_MARK_ROWS[2].manaCost ?? "")),
      "the cost drew nothing",
    ).toBe(true);

    // `collapsed` is a bare `$`; `full` is the shopping treatment and prints a
    // figure. This figure is not the Shopping list, so a price here would
    // teach the wrong mark. Leaf spans with no sr-only ANCESTOR: `collapsed`
    // keeps its sentence in an sr-only sibling, so every ancestor span reads
    // back as `$buy·$2.10` and the sr-only figure is itself a leaf.
    const visible = [...plate.querySelectorAll("span")]
      .filter((el) => el.childElementCount === 0 && el.closest(".sr-only") === null)
      .map((el) => el.textContent ?? "");
    expect(visible.some((t) => t.trim() === "$"), "the buy mark drew nothing").toBe(true);
    expect(visible.some((t) => /\$\d/.test(t)), "the shopping treatment leaked in").toBe(false);

    // The slot is SHARED: a card you are printing takes `P` instead of `$`,
    // and a figure that only ever drew the buy mark would document half of it.
    expect(visible.some((t) => t.trim() === "P"), "the proxy mark drew nothing").toBe(true);

    // The fourth key line's edge. The over-committed row carries it as an
    // inset ring rather than a border — 3px of real border would shunt one
    // row's contents sideways — so it is read off the computed box shadow.
    const over = [...plate.querySelectorAll("div")].filter((el) =>
      (el as HTMLElement).style.boxShadow.includes("--avail-over-border"),
    );
    expect(over.length, "the over-committed edge drew nothing").toBe(1);
  });

  // THE MEASURED SPECIMEN, and the two things about it that no other check here
  // sees. The `roles` entry above draws `recommendedMix(null, false)` — an
  // asserted starting point — so every assertion on it passes whatever the
  // measured payload says. This one is about the payload itself.
  it("draws the informed-build figure from a measured mix, wipes at zero", () => {
    const { container } = render(<AboutPage env={ENV_VIEW} seen={0} />);
    const plate = figures(container)["informed-build"];

    // PROVENANCE. The source line is the only place the strip says where its
    // numbers came from, and the two strings are one word apart in the model
    // and a whole claim apart on screen: this entry is about a mix measured
    // from real decklists, so a specimen quoting `A common starting point`
    // would illustrate the feature by showing its absence.
    expect(plate.textContent).toContain(mixSourceLine({ measured: true } as never));
    expect(plate.textContent).not.toContain(
      mixSourceLine({ measured: false } as never),
    );

    // THE TARGETS THEMSELVES, read off the denominator each cell draws. The
    // provenance check above passes whatever the numbers are, so without this
    // the figure could quote 37 lands at nobody and still say `EDHREC
    // averages` over the top — which is the exact overclaim the entry exists
    // to rule out. Read from the cell's own `/ N` span rather than from a
    // `textContent` match on the plate, because the numerator sits beside it
    // and `20` appears in both `20 / 20` and `4 / 20`.
    const denominators = [...plate.querySelectorAll("p > span")]
      .map((el) => el.textContent?.trim() ?? "")
      .filter((t) => t.startsWith("/"))
      .map((t) => t.slice(1).trim());
    expect(denominators, "the figure's measured targets moved").toEqual([
      "20",
      "8",
      "10",
      "0",
      "28",
    ]);

    // A MEASURED TARGET OF ZERO renders. `wipes: 0` against the fixture's one
    // wipe is a real measured answer for a commander whose bucket wipes
    // nothing, and the cell has to draw rather than divide its way out of
    // existing. NOT a check on the zero-divide guard in `roleCellState`: this
    // fixture is `1 / 0`, which is Infinity and clamps to 100 — the NaN case is
    // `0 / 0` and no figure on this page holds one. Asserting it here would be
    // a comment claiming coverage the fixture cannot give, and the mutation
    // run said so.
    const wipes = [...plate.querySelectorAll("p")].find((el) =>
      el.parentElement?.textContent?.includes("Wipes"),
    );
    expect(wipes, "the figure drew no Wipes cell").toBeTruthy();
  });

  it("draws the recommended mix as the deck page's own strip", () => {
    const { container } = render(<AboutPage env={ENV_VIEW} seen={0} />);
    const plate = figures(container)["roles"];

    // Five cells, which is the strip's own `ROLE_ORDER` rather than a number
    // chosen here: the entry is about roles, and a figure drawing four of them
    // would teach a mix that does not exist.
    for (const role of ROLE_ORDER) {
      // The cell uppercases with CSS, so the text node carries the label as
      // `mix.ts` writes it.
      expect(plate.textContent).toContain(SPECIMEN_MIX.cells[role].label);
    }
    expect(plate.textContent).toContain(mixSourceLine(SPECIMEN_MIX));

    // The two readings the key lines name, each on the cell that draws it. The
    // surplus is read by its COLOUR rather than by its figure: `12 / 10` is
    // still a pair of numbers with the state rule removed, and a cell over its
    // target is the one that says so by going green.
    // The numerator is the figure element's own first text node; the
    // denominator is a child span, so a `textContent` match would read
    // `12 / 10` and a childless filter would skip the element entirely.
    const over = [...plate.querySelectorAll("p")].find(
      (el) => el.firstChild?.textContent?.trim() === "12",
    );
    expect(over?.style.color ?? "", "the surplus cell drew no state").toContain(
      "var(--success)",
    );

    // The short cell keeps its action, and it is the ONLY kind that does — a
    // strip whose every cell offered `consider` would contradict the line it
    // illustrates.
    const considers = [...plate.querySelectorAll("button")].filter((el) =>
      /consider/i.test(el.textContent ?? ""),
    );
    expect(considers.length, "the short cells drew no action").toBe(2);

    // The disclosure, which is the third thing the entry's caption rests on:
    // the baselines are the format's, not this commander's.
    expect(plate.textContent).toContain(addPanelCopy.strip.rationaleToggle);
  });

  it("draws the decklist's own order bar, on the shopping filter", () => {
    const { container } = render(<AboutPage env={ENV_VIEW} seen={0} />);
    const plate = figures(container)["decklist-order"];

    // The two sections, which is the caption's first clause.
    expect(plate.textContent).toContain(DECK_GROUPING_LABELS.type);
    expect(plate.textContent).toContain(DECK_GROUPING_LABELS.role);

    // The order control reads the live order back, and the order it is given
    // is the one the caption's last clause is about. `deckSortOrderLabel`
    // rather than a literal: the figure is here so a rename reaches it.
    expect(plate.textContent).toContain(deckSortOrderLabel("price", "desc"));

    // Price is offered on the shopping filter ALONE, so the bar has to be
    // drawn there — and the way to tell which filter is open, without reading
    // a pill's styling, is the control the All filter carries and Shopping
    // does not: the list/card view toggle.
    expect(plate.textContent).not.toContain(viewToggleCopy.deck.card);
  });

  it("draws the Add panel: the field, the toggle, and rows under them", async () => {
    const { container } = render(<AboutPage env={ENV_VIEW} seen={0} />);
    const plate = figures(container)["add-cards"];

    // The caption's first clause, which the rows-only figure left with nothing
    // to point at: search what you own or all of Magic.
    expect(plate.querySelector("input")).not.toBeNull();
    expect(plate.textContent).toContain(addPanelCopy.quickAdd.ownedToggle);

    // The rows arrive through `useCardSearch`, which DEBOUNCES — so a
    // synchronous assertion here reads the empty list and passes only while
    // the figure draws no panel at all. Awaited, not flushed with a timer:
    // the resolver is a promise too, and a fake-timer flush would run the
    // debounce and then assert before it settled.
    await waitFor(() => {
      expect(plate.textContent).toContain(addPanelCopy.quickAdd.rowOwned(2));
    });
    expect(plate.textContent).toContain(addPanelCopy.quickAdd.rowNotOwned);

    // The caption's second sentence, which the retired figure did not draw at
    // all: a card a committed deck is holding still adds, carrying the mark.
    expect(plate.textContent).toContain(availabilityCopy.marker.hard);
  });

  it("draws a spent slot between two live rows", () => {
    const { container } = render(<AboutPage env={ENV_VIEW} seen={0} />);
    const plate = figures(container)["undo-removal"];

    // The receipt names the card, which is the caption's "naming it".
    expect(plate.textContent).toContain(
      addPanelCopy.undo.removed(DECKLIST_MARK_ROWS[1].name),
    );
    // And it is a real control, not a label — queried by attribute because
    // `Specimen` is `aria-hidden` and nothing inside it has a role.
    const undo = [...plate.querySelectorAll("button")].filter(
      (el) => el.textContent?.trim() === addPanelCopy.undo.action,
    );
    expect(undo.length, "the undo control drew nothing").toBe(1);

    // IN CONTEXT. The caption's verb is TURNS INTO, so the rows either side
    // have to be ordinary ones — a receipt shown alone is a component, and a
    // receipt between two live rows is the thing that happened to one of
    // them. The spent row draws no ownership dot — but it DOES draw a spacer
    // at the dot's exact size, to keep its name aligned with the rows above
    // and below, so a width filter counts three. `rounded-full` is what only
    // the real dot carries.
    const dots = [...plate.querySelectorAll("span")].filter((el) => {
      const c = el.className.toString();
      return c.includes("w-[7px]") && c.includes("rounded-full");
    });
    expect(dots.length, "the live rows either side drew nothing").toBe(2);
  });

  it("draws the import route's own door, with both modes and no link mode", () => {
    const { container } = render(<AboutPage env={ENV_VIEW} seen={0} />);
    const plate = figures(container)["deck-import"];

    // The two doors the route actually offers.
    expect(plate.textContent).toContain(deckImportCopy.entry.modePaste);
    expect(plate.textContent).toContain(deckImportCopy.entry.modeFile);

    // The caption's third sentence is the route's own copy, not this page's
    // gloss on it — the entry surface carries the unmatched-line promise
    // under its form, which is why mounting it says more than naming its
    // labels did.
    expect(plate.textContent).toContain(deckImportCopy.entry.aboutFailureHeading);

    // And NOT the route's page furniture. `compact` drops the heading and the
    // subtitle, which the entry above the figure already says in its own
    // words — at full size this figure measured 1000px, taller than the
    // viewport, and drew this route's title a second time directly under the
    // entry's own. A mutation restoring them scored nothing until this clause
    // existed.
    expect(plate.textContent).not.toContain(deckImportCopy.entry.heading);
    expect(plate.textContent).not.toContain(deckImportCopy.entry.sub);

    // And there is no third mode. R4's note on this entry says a link mode
    // "does not exist and is not being built", and the retired figure could
    // not have shown that — a legend of two rows proves nothing about a
    // third. A mounted toggle does.
    // Read off `aria-label`, not the text: each button renders BOTH the short
    // and the long label and hides one with a `md:` class, so jsdom — which
    // answers false for every media query and lays nothing out — reads the two
    // concatenated. The aria-label is the single name the component gives the
    // control at either width, which is why it exists.
    const modes = [...plate.querySelectorAll("button")].filter((el) =>
      ([deckImportCopy.entry.modePaste, deckImportCopy.entry.modeFile] as string[]).includes(
        el.getAttribute("aria-label") ?? "",
      ),
    );
    expect(modes.length, "the mode toggle drew nothing").toBe(2);
  });

  it("draws the version rail", () => {
    const { container } = render(<AboutPage env={ENV_VIEW} seen={0} />);
    const plate = figures(container)["versions"];

    // The rail. `initial` rather than `+99` is the v1 reading, and it is the
    // one a fixture can get wrong without anything else noticing.
    expect(plate.textContent).toContain(deckVersioningCopy.history.current);
    expect(plate.textContent).toContain(DECK_VERSIONS[0].note);
    expect(plate.textContent).toContain("initial");

    // The deck-state marks used to sit in this figure and are deliberately
    // NOT asserted: #738 removed them from the app, and main had dropped them
    // from here before this branch rebased onto it. A test still demanding
    // them would be pinning a feature that no longer exists.
  });

  it("draws the Shopping filter's two ways onto the list", () => {
    const { container } = render(<AboutPage env={ENV_VIEW} seen={0} />);
    const plate = figures(container)["shopping"];

    // Row one is unowned. Row two is the caption's load-bearing sentence: a
    // card you OWN, on the list because a committed deck holds every copy —
    // `isShoppingCard` answers true on the `over` state, and `deckRowTag` then
    // answers `buy` through `spokenFor`. A figure of unowned rows alone would
    // draw two buy tags and substantiate nothing.
    expect(plate.textContent).toContain(SHOPPING_ROWS[0].name);
    expect(plate.textContent).toContain(SHOPPING_ROWS[1].name);
    expect(plate.textContent).toContain(availabilityCopy.marker.over(2));

    // Both rows carry the buy mark, including the owned one.
    const dots = [...plate.querySelectorAll("span")].filter((el) => {
      const c = el.className.toString();
      return c.includes("w-[7px]") && c.includes("rounded-full");
    });
    expect(dots.filter((el) => el.className.toString().includes("dashed")).length).toBe(1);
    expect(dots.length).toBe(2);
  });

  it("draws the export dialog on the tab its key lines are about", () => {
    const { container } = render(<AboutPage env={ENV_VIEW} seen={0} />);
    const plate = figures(container)["export"];

    // Both tabs are present, and the SHOPPING one is the open one — the link
    // below renders on that tab alone, so a dialog opened on the decklist
    // would leave two of this entry's three key lines pointing at nothing.
    expect(plate.textContent).toContain(exportTabCopy.decklist);
    expect(plate.textContent).toContain(exportTabCopy.shopping);
    expect(plate.textContent).toContain(exportLinkOutCopy.shopping);

    // The frame's height differs BY WIDTH, and that is not decoration: the
    // phone draws a bottom sheet anchored to its container's foot at a fixed
    // 590px, so a single 470px frame clipped 120px off its top — the title and
    // both tabs — and left key line 1 pointing at a control that was not on
    // screen. Measured in a browser; what a unit test can hold is that the two
    // heights are still declared, because jsdom lays nothing out.
    const frame = [...plate.querySelectorAll("div")].find((el) =>
      el.className.includes("translateZ"),
    );
    expect(frame?.className, "the export frame has no phone height").toMatch(/\bh-\[\d+px\]/);
    expect(frame?.className, "the export frame does not resize by width").toMatch(
      /\bmd:h-\[\d+px\]/,
    );

    // The dialog is drawn INERT. Were it opened, `useDialogA11y` would write
    // `document.body.style.overflow` — locking the About page's own scroll,
    // which is the regression the prop exists to prevent and the one thing
    // here that is invisible in the markup.
    expect(document.body.style.overflow).toBe("");
  });

  it("draws both fit shapes and writes no prose inside the frame", () => {
    const { container } = render(<AboutPage env={ENV_VIEW} seen={0} />);
    const plate = figures(container)["fit"];
    // Rule 4 of the copy file: a figure may only draw what the app draws.
    // The decomposition and the denominators are annotation under the bar,
    // never sentences inside it.
    // The headline beside each bar is the lane's own string, so a reader can
    // check the sum against the figure the app would print.
    // BOTH denominators. §3 draws one shape; key line 1 names two — "where
    // synergy could not be measured the score is out of 40, and it is never
    // rescaled" — so a figure drawing only `/100` cannot substantiate the
    // caption printed beside it.
    expect(plate.textContent).toContain(explainedCopy.score.denominator);
    expect(plate.textContent).toContain(explainedCopy.score.denominatorMeasurable(40));
    expect(plate.textContent).toContain(String(FIT_FULL_SCORE));
    expect(plate.textContent).toContain(String(FIT_DEGRADED_SCORE));
    expect(plate.textContent).toContain(explainedCopy.score.bestInPool);

    // THE KEY, EXPANDED. The entry is about the three parts, and the figure
    // drew none of their explanations — only bars. Each part is asserted by
    // its own points over its own weight AND by its body, because the legend
    // row alone draws the numbers without ever saying what they mean.
    for (const seg of FIT_LEGEND) {
      expect(plate.textContent).toContain(`${seg.points}`);
      expect(plate.textContent).toContain(explainedCopy.key[seg.key].weight(seg.weight));
    }
    // THE PHONE BODIES, because jsdom answers false for every media query, so
    // `useIsDesktop` reports phone and the figure renders the branch a narrow
    // reader gets. That is the right thing to assert here: the figure used to
    // hardcode the desktop branch, which showed a phone reader a treatment the
    // commander page never gives them. The desktop branch is covered by the
    // screenshot, which is the only instrument that can see it.
    expect(plate.textContent).toContain(explainedCopy.key.roles.bodyMobile);
    expect(plate.textContent).toContain(explainedCopy.key.synergy.bodyMobile);
  });

  it("gives every entry a figure, and none of them an empty frame", () => {
    // This assertion used to be its own inverse — that an entry with NO figure
    // drew no frame — and it had a subject because 29 of the 34 entries had
    // none. The ledger is empty now, so the question worth asking flipped: the
    // page's unit is a figure with a caption, and an empty frame is the way
    // that unit fails quietly.
    const { container } = render(<AboutPage env={ENV_VIEW} seen={0} />);
    const entries = [...container.querySelectorAll("li")].filter((li) =>
      li.querySelector("h3"),
    );
    expect(entries).toHaveLength(aboutEntries.length);
    for (const li of entries) {
      const figure = li.querySelector("[data-specimen]");
      const title = li.querySelector("h3")?.textContent ?? "";
      expect(figure, `${title} has no figure`).toBeTruthy();
      // NOT `childElementCount`, not "has a leaf", and not raw `textContent`.
      // Every Specimen wraps its content in one div, so the count is 1 whatever
      // it holds; an EMPTY div is itself a leaf; and `textContent` includes
      // sr-only descendants, so a figure whose only words are hidden would
      // satisfy the very check meant to catch a blank one. Three attempts,
      // each passing over the emptiness the last one missed.
      const el = figure as HTMLElement;
      const visible = [...el.querySelectorAll("*")]
        .filter((n) => n.childElementCount === 0 && n.closest(".sr-only") === null)
        .map((n) => (n.textContent ?? "").trim())
        .join("");
      const art = el.querySelector("svg, img");
      expect(visible.length > 0 || art !== null, `${title} draws an empty frame`).toBe(true);
    }
  });
});

describe("the contents", () => {
  it("gives every chapter row a figure, new or not", () => {
    // A row that carried a count only when something was new would be blank
    // for every reader at launch, which is everyone.
    render(<AboutPage env={ENV_VIEW} seen={0} />);
    const [nav] = screen.getAllByRole("navigation", { name: aboutCopy.contentsLabel });
    const counts = within(nav).getAllByText(/\d+ (entries|entry|new)/);
    expect(counts).toHaveLength(4);
  });
});

describe("the contents rail", () => {
  it("draws beside the column at the wide stop and not below it", () => {
    // The page is about nine screens long. An in-flow list answers "what is
    // here" once and scrolls away; the rail is what says where you ARE, which
    // is the reason it was wrong to take Design's offer to cut it.
    const navs = screen.queryAllByRole("navigation", { name: aboutCopy.contentsLabel });
    expect(navs).toHaveLength(0);

    render(<AboutPage env={ENV_VIEW} seen={0} />);
    const [inFlow, rail] = screen.getAllByRole("navigation", {
      name: aboutCopy.contentsLabel,
    });
    // Each is present at exactly one width, and the pair is what makes the
    // links reachable at both.
    expect(inFlow.className).toContain("min-[1000px]:hidden");
    expect(rail.className).toContain("sticky");
    expect(rail.className).toContain("hidden");
    expect(rail.className).toContain("min-[1000px]:block");
    // 216px is the drawn width, and it reached the build as 220px — the width
    // is the whole of what the rail contributes to the page's measure, so it
    // is asserted here rather than left to a reader of the class list.
    expect(rail.className).toContain("w-[216px]");
  });

  it("marks where the reader is, for a screen reader as well as an eye", () => {
    render(<AboutPage env={ENV_VIEW} seen={0} />);
    const [, rail] = screen.getAllByRole("navigation", { name: aboutCopy.contentsLabel });
    const current = within(rail).getAllByRole("link").filter((a) => a.getAttribute("aria-current"));
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveAttribute("href", "#chapter-01");
  });

  it("follows the reader down the page, and back up it", () => {
    // jsdom has no IntersectionObserver, so without a stub the test above
    // asserts the initial useState and nothing else — deleting the entire
    // effect left every test in this file green, which the pre-open pass
    // proved by doing it.
    //
    // The stub is also what makes the REAL defect testable: the callback
    // receives only the entries whose state CHANGED, so a reading that sorts
    // "this callback's intersecting entries" answers "whichever chapter most
    // recently entered the band". Scrolling 01 → 02 delivers 02 alone.
    const callbacks: IntersectionObserverCallback[] = [];
    const observed: Element[] = [];
    class Stub {
      constructor(cb: IntersectionObserverCallback) {
        callbacks.push(cb);
      }
      observe(el: Element) {
        observed.push(el);
      }
      disconnect() {}
      unobserve() {}
      takeRecords() {
        return [];
      }
      root = null;
      rootMargin = "";
      thresholds = [];
    }
    vi.stubGlobal("IntersectionObserver", Stub);
    try {
      render(<AboutPage env={ENV_VIEW} seen={0} />);
      const [, rail] = screen.getAllByRole("navigation", { name: aboutCopy.contentsLabel });
      const marked = () =>
        within(rail)
          .getAllByRole("link")
          .find((a) => a.getAttribute("aria-current"))
          ?.getAttribute("href");

      // BOTH observers — the rail and the compact list each hold one, because
      // `aria-current` has to be true at both widths and a phone is where the
      // page is longest. Firing only the first marked whichever nav happened
      // to mount first and left the other static.
      const fire = (changes: { id: string; isIntersecting: boolean }[]) =>
        act(() => {
          for (const cb of callbacks) cb(
            changes.map((c) => ({
              target: observed.find((el) => el.id === `chapter-${c.id}`)!,
              isIntersecting: c.isIntersecting,
            })) as unknown as IntersectionObserverEntry[],
            {} as IntersectionObserver,
          );
        });

      // Everything starts on screen at the top of the page.
      fire([{ id: "01", isIntersecting: true }]);
      expect(marked()).toBe("#chapter-01");

      // Scrolling into 02 delivers ONE entry. 01 is still intersecting and is
      // absent from the callback — the case that broke the first version.
      fire([{ id: "02", isIntersecting: true }]);
      expect(marked()).toBe("#chapter-01");

      // 01 leaves the band. Now 02 is the first in order still on screen.
      fire([{ id: "01", isIntersecting: false }]);
      expect(marked()).toBe("#chapter-02");

      fire([{ id: "03", isIntersecting: true }, { id: "02", isIntersecting: false }]);
      expect(marked()).toBe("#chapter-03");

      // And back up: 02 returning takes the mark back, because it is earlier.
      fire([{ id: "02", isIntersecting: true }]);
      expect(marked()).toBe("#chapter-02");

      // The compact list carries the same mark. It is the ONLY navigation
      // below the wide stop, so a mark that lived on the rail alone answered
      // nobody on a phone.
      const [list] = screen.getAllByRole("navigation", { name: aboutCopy.contentsLabel });
      const listMarked = within(list)
        .getAllByRole("link")
        .find((a) => a.getAttribute("aria-current"));
      expect(listMarked).toHaveAttribute("href", "#chapter-02");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("links every chapter from the rail", () => {
    render(<AboutPage env={ENV_VIEW} seen={0} />);
    const [, rail] = screen.getAllByRole("navigation", { name: aboutCopy.contentsLabel });
    for (const n of ["01", "02", "03", "04"] as const) {
      expect(within(rail).getByRole("link", { name: new RegExp(escape(aboutCopy.chapters[n].title)) }))
        .toHaveAttribute("href", `#chapter-${n}`);
    }
  });
});

describe("what each chapter 01 figure actually draws", () => {
  // Counting frames is not coverage: `Specimen` creates the `[data-specimen]`
  // node itself, so a registered figure can return an empty frame and the
  // count assertion still passes. Six figures landed with no content check at
  // all, which is the fifth round in this feature that an assertion measured
  // the frame instead of the body.
  const plate = (label: string) => {
    const { container } = render(<AboutPage env={ENV_VIEW} seen={0} />);
    const el = container.querySelector(`[data-specimen="${label}"]`);
    expect(el, `${label} drew no specimen`).toBeTruthy();
    return el as HTMLElement;
  };

  it("collection-add: three lines, the holdings notes and a save bar naming copies", () => {
    const el = plate("collection-add");
    expect(el.querySelectorAll("li[aria-label='Sol Ring']")).toHaveLength(2);
    expect(el.querySelectorAll("li[aria-label='Cultivate']")).toHaveLength(1);
    expect(el.textContent).toContain(collectionEditCopy.add.owned(5, 7));
    expect(el.textContent).toContain(collectionEditCopy.add.summary(3, 4));
    expect(el.textContent).toContain(collectionEditCopy.add.save(4));
  });

  it("edit-copies: three lines, a lowered note and a raised one, and the diff beside Save", () => {
    const el = plate("edit-copies");
    expect(el.querySelectorAll("li[aria-label='Sol Ring']")).toHaveLength(3);
    expect(el.textContent).toContain("−1");
    expect(el.textContent).toContain("+1");
    expect(el.textContent).toContain(collectionEditCopy.copies.save);
  });

  it("upload-choice: both option cards, Replace picked, and the hand-edits warning", () => {
    const el = plate("upload-choice");
    expect(el.querySelector("[data-choice='replace'][aria-checked='true']")).toBeTruthy();
    expect(el.querySelector("[data-choice='add'][aria-checked='false']")).toBeTruthy();
    expect(el.textContent).toContain(collectionEditCopy.upload.replaceTitle);
    expect(el.textContent).toContain(collectionEditCopy.upload.addTitle);
    expect(el.textContent).toContain(collectionEditCopy.upload.overwriteCount(12, "Sep 12").slice(0, 12));
  });

  it("remove-card: the short-deck warning for Sol Ring, one deck named, the removal confirm", () => {
    const el = plate("remove-card");
    expect(el.textContent).toContain(collectionEditCopy.shortWarning.titleRemove("Sol Ring", 1));
    expect(el.textContent).toContain("HD - Kinnan");
    expect(el.textContent).toContain(collectionEditCopy.shortWarning.confirmRemove);
  });

  it("collection-history: a revert, the removal it undid marked Reverted, and an add opened to its five cards", () => {
    const el = plate("collection-history");
    expect(el.querySelectorAll("li")).toHaveLength(3 + 5);
    expect(el.textContent).toContain(collectionEditCopy.history.reverted);
    expect(el.textContent).toContain("Reverted “Rhystic Study”");
    expect(el.textContent).toContain("Swords to Plowshares");
    expect(el.querySelectorAll("button[aria-label^='Revert']")).toHaveLength(2);
    // No row carries an anchor here, so the Reverted-by note must not link to one.
    expect(el.querySelector("a[href^='#entry-']")).toBeNull();
  });

  it("sets: the set page, not a strip of cells", () => {
    const el = plate("sets");
    const h = SET_HEAD;

    // The head. Two ratios that disagree ON PURPOSE — `162 / 208` counts the
    // base run, `321 cells` counts the extras too — which is key line 3's
    // whole subject and had nothing on the figure to point at before.
    expect(el.textContent).toContain(h.name);
    expect(el.textContent).toContain(`${h.have} / ${h.base}`);
    expect(el.textContent).toContain(`${h.cells} cells`);
    expect(el.textContent).toContain(setPageCopy.head.ratioNote);

    // The cost strip, which key line 2 is about: the figure covers what
    // ManaPool stocks, and the card that never has is NAMED and left out
    // rather than priced at zero.
    expect(el.textContent).toContain(setPageCopy.cost.label);
    expect(el.textContent).toContain(h.cost);
    expect(el.textContent).toContain(setPageCopy.cost.line(h.costPriced, h.costMissing));
    expect(el.textContent).toContain(setPageCopy.cost.unpriced(h.costUnpriced));
    expect(el.textContent).toContain(setPageCopy.cost.send(h.sendCount));

    // THE PIPS RESOLVE. They rendered as five 16px boxes with
    // `background: url(undefined)` — no error, no failing test, nothing on
    // screen — because `PIP_SRC` lived in a `"use client"` module and a SERVER
    // component importing it gets a client reference rather than the value.
    // The browse figure was unaffected only because it is itself a client
    // module, which is exactly what made the difference invisible.
    //
    // Asserted on the emitted URL, not on the element count: five boxes are
    // present either way. Buttons since H10: the figure mounts the live row's
    // `ColourControl`, whose pips are the chassis's switches.
    const pips = [...el.querySelectorAll("span, button")].filter((n) =>
      (n.getAttribute("style") ?? "").includes("/mana/"),
    );
    expect(pips).toHaveLength(PIP_ORDER.length);
    for (const pip of pips) {
      expect(pip.getAttribute("style")).not.toContain("undefined");
    }

    // And the modifier beside them, as the live row draws it (H10). The figure drew
    // bare pips while the row carried `Any` / `Exactly`, a picture of a row that no
    // longer existed.
    expect(el.querySelector('[role="radiogroup"][aria-label="Color match"]')).not.toBeNull();

    // Six cells as drawn, and every one shows a price. This is an
    // INVARIANCE over the route's rule rather than a guard on this figure:
    // `SetCell` draws a price on a missing cell and the collection's own
    // figure on an owned one, in every sort, so the figure passes a price to
    // every cell and cannot break it. It fails if the figure ever stops using
    // the route's cell, which is the thing that could actually regress.
    // Scoped to the GRID. Swept over the whole plate the cost strip's own
    // `$188.66` counts as a cell price, so the check read 3 where the rule is
    // 2 — and a figure pricing every cell would have passed a looser form.
    const grid = el.querySelector('[class*="grid-cols-3"]');
    expect(grid, "the cell grid").not.toBeNull();
    // The COUNT first. Asserting only the priced descendants left the four
    // owned cells unprotected: dropping any one of them keeps both price tags
    // and every other assertion here intact, so "six cells as drawn" was a
    // claim the test did not make.
    expect(grid!.children).toHaveLength(SET_CELLS.length);
    const priced = [...grid!.querySelectorAll("*")].filter(
      (n) => n.children.length === 0 && /^\$[0-9.,]+$/.test(n.textContent ?? ""),
    );
    expect(priced).toHaveLength(SET_CELLS.length);
  });

  it("browse: a chip per narrowing, a count, and the reading choice", () => {
    const el = plate("browse");
    expect(el.textContent).toContain("1 color");
    expect(el.textContent).toContain("The Hobbit");
    expect(el.textContent).toContain("Showing");
    // The third key line is the grid-or-rows choice, which the first version
    // of this figure left out entirely.
    expect(el.textContent).toMatch(/rows/i);
    expect(el.textContent).toMatch(/grid/i);
  });

  it("ready-to-build: Home's own block, both cards, and the absence at zero", () => {
    const el = plate("ready-to-build");
    const c = refreshCopy.home;

    // Both commanders, and they are deliberately unlike — a pair of
    // near-identical cards teaches nothing about what the figures mean.
    for (const item of READY_SLICE.shown) {
      expect(el.textContent).toContain(item.name);
    }

    // Key line 2: cards that fit, THEN how many are already committed — and
    // the second clause is ABSENT at zero. The fixture gives one card 620 and
    // the other none, so a figure printing the clause unconditionally fails
    // here. A pair where both carried it could not show the absence at all.
    expect(el.textContent).toContain(c.fitLine(READY_SLICE.shown[0].colorPoolSize));
    expect(el.textContent).toContain(c.inUse(620));
    // COUNTED, not searched for by absence. `not.toContain(c.inUse(0))` looks
    // right and is a substring trap: `620 in use` contains `0 in use`, so it
    // failed against a correct build. Exactly one card carries the clause.
    const clauses = [...el.querySelectorAll("*")].filter(
      (n) => n.children.length === 0 && /^\d+ in use$/.test(n.textContent ?? ""),
    );
    expect(clauses).toHaveLength(1);

    // Key line 3: the floor is the lowest score actually shown, so the count
    // is checkable against the lane.
    expect(el.textContent).toContain(
      c.moreAbove(READY_SLICE.moreCount, READY_SLICE.floor!),
    );
  });

  it("commander-lane: Build from, chosen, and a row from the lane", () => {
    const el = plate("commander-lane");

    // BUILD FROM ALONE. The rack cannot show this control at About's width —
    // wide it overflows the plate, compact it sits inside a sheet an inert
    // specimen cannot open — so the figure drew a `Filters` trigger and never
    // the choice its caption is about. Round 1 named it; Hugh ruled drop the
    // rack, 2026-09-18.
    expect(el.textContent).toContain(commandersCopy.availability.all);
    // `freeShort` at the rack's 32px segment; the sheet's 44px pill takes the
    // whole phrase. Asserted as the control draws it rather than as the copy
    // module reads best.
    expect(el.textContent).toContain(commandersCopy.availability.freeShort);

    // CHOSEN, not merely present. The caption is about Build from choosing the
    // pool, and a control resting on its default draws both options while
    // showing no choice being made. Read off the pressed state, which the
    // labels alone cannot carry.
    const chosen = [...el.querySelectorAll('[aria-checked="true"],[aria-pressed="true"]')]
      .map((n) => n.textContent)
      .join(" ");
    expect(chosen).toContain(commandersCopy.availability.freeShort);

    // And the row, which was its own ask: a reader should see what the lane
    // actually lists, and dropping the rack is not a reason to drop that.
    expect(el.textContent).toContain(LANE_ROW_OWNED.name);
    expect(el.textContent).toContain(commandersCopy.row.fitDenominator);

    // NO PRICE, on this lane, ever. `CommanderRow` passes an absent slot for
    // every commander the reader owns, so a priced fixture drew a figure and a
    // ManaPool stamp the route never ships. Asserted as an absence because the
    // old fixture's `$0.15` passed every other check here.
    expect(el.textContent).not.toMatch(/\$[0-9]/);
  });

  it("keeps the discover panel open when the trigger is pressed", () => {
    // `pinnedOpen` skipped the document dismissal listeners and left the
    // TRIGGER toggling as normal, so the panel still closed when the control
    // itself was pressed — half a fix, and one the prop's own comment claimed
    // was whole. The reader-clicks-elsewhere case was proved in a browser and
    // this is the other door.
    //
    // `Specimen` puts `pointer-events: none` over the figure, which stops a
    // real pointer and does NOT stop a dispatched click, so the press has to
    // be guarded rather than assumed unreachable.
    const el = plate("discover");
    const trigger = el.querySelector("button");
    expect(trigger, "the order control's trigger").not.toBeNull();
    const before = el.querySelectorAll('[role="menuitemradio"]').length;
    expect(before).toBe(ORDER_OPTIONS.discover.length);
    fireEvent.click(trigger!);
    expect(el.querySelectorAll('[role="menuitemradio"]')).toHaveLength(before);

    // And picking an option is the third door. `pinnedOpen` guarded the
    // listeners, then the trigger, and left this one — three paths for one
    // claim, which is what the prop's comment promised and did not deliver
    // twice running.
    const option = el.querySelector('[role="menuitemradio"]');
    fireEvent.click(option!);
    expect(el.querySelectorAll('[role="menuitemradio"]')).toHaveLength(before);
  });

  it("discover: the order control alone, with every gloss", () => {
    const el = plate("discover");
    // The rack and the row came OUT on 2026-09-18. Both lanes share one rack
    // and one row, so drawing them twice said the same thing twice — this
    // entry's caption is the five orders, and that is all the figure is.
    for (const o of ORDER_OPTIONS.discover) {
      expect(el.textContent).toContain(o.label);
      if (o.gloss) expect(el.textContent).toContain(o.gloss);
    }
    expect(el.textContent).not.toContain(LANE_ROW_DISCOVER.name);
  });

  it("partners: the import proposal, and that it is reversible", () => {
    const el = plate("partners");
    // §3 drew two abstract halves and a row of union pips — a picture of
    // nothing the app renders. Hugh's ruling, 2026-09-18: partners are met on
    // DECK IMPORT, where a pasted list's second legend arrives as a proposal.
    expect(el.textContent).toContain(PARTNER_PROPOSAL.partner.name);
    expect(el.textContent).toContain(deckImportCopy.commander.proposed(2));

    // REVERSIBLE is the whole point of the slot: a proposal you cannot change
    // or remove is a decision the import made for you. Both controls, because
    // either alone is a different offer.
    const controls = [...el.querySelectorAll("button")].map((b) => b.textContent);
    expect(controls).toContain(deckImportCopy.commander.change);
    expect(controls).toContain(deckImportCopy.commander.remove);
  });

  it("import: the drop target and its two doors, as drawn", () => {
    const el = plate("import");
    // TRANSCRIBED from §3. The figure used to list four source names as pills
    // and repeat the entry's own replace sentence in a warning band — neither
    // of which Design drew, and the sentence is the caption directly above it.
    // The ROUTE's words, read from the copy module. §3's labels — `Drop a CSV
    // export`, `Upload a CSV`, `Paste a list` — are none of them what
    // `UploadEntry` says, and a reference page naming controls the app does
    // not have is the one failure this page cannot afford. Both forms are
    // asserted because the route forks them at `md`.
    expect(el.textContent).toContain(collectionChassisCopy.upload.dropCompact);
    expect(el.textContent).toContain(collectionChassisCopy.upload.dropWide);
    for (const source of IMPORT_SOURCES) {
      expect(el.textContent).toContain(source);
    }
    expect(el.textContent).toContain(collectionChassisCopy.upload.browse);
    expect(el.textContent).toContain(collectionChassisCopy.upload.paste);

    // The primary door is an INVERSION — `--fg` on `--bg`, the only one in
    // chapter 01 — and it is what makes one of the two read as the default.
    // Both doors present with identical skins would pass every check above.
    const primary = [...el.querySelectorAll("span")].find(
      (n) => n.textContent === collectionChassisCopy.upload.browse,
    );
    expect(primary?.className).toContain("bg-[color:var(--fg)]");
    expect(primary?.className).toContain("text-[color:var(--bg)]");

    // And the figure must NOT restate the caption's sentence.
    expect(el.textContent).not.toContain("replaces what is there");
  });

  // The figure used to print the summary's three section HEADINGS as mono
  // strings. §3 draws the thing the entry's key lines are actually about, and
  // this asserts that instead: both figures, a line per deck that felt the
  // replace, and a COUNT of the decks that did not.
  it("post-import: both figures, the decks that felt it, the count that did not", () => {
    const el = plate("post-import");
    expect(el.textContent).toContain(cardAssignmentsCopy.summary.eyebrow);

    // Key 1 — BEFORE and AFTER, so the change is checkable rather than
    // asserted. One figure alone would satisfy a looser assertion and say
    // nothing about the rule.
    expect(el.textContent).toContain("4,910");
    expect(el.textContent).toContain("5,132");

    // Keys 2 and 3 — THREE SECTIONS, and a row that is a card carrying the
    // deck that wanted it. The first rebuild of this figure followed the R4
    // canvas, which draws deck rows with a per-deck count — and it then
    // contradicted the three captions printed directly beneath it on the page.
    // A screenshot caught that; no assertion here could have.
    for (const head of [
      cardAssignmentsCopy.summary.sectionCleared(61),
      cardAssignmentsCopy.summary.sectionStill(12),
      cardAssignmentsCopy.summary.sectionShort(2),
    ]) {
      expect(el.textContent).toContain(head);
    }
    for (const row of REPLACE_ROWS) {
      expect(el.textContent).toContain(row.card);
      expect(el.textContent).toContain(row.deck);
    }

    // The route's own heading and lede, never figures the summary does not print.
    const s = cardAssignmentsCopy.summary;
    expect(el.textContent).toContain(s.heading(REPLACE_SUMMARY.after));
    expect(el.textContent).toContain(s.lede(REPLACE_SUMMARY.before, REPLACE_SUMMARY.arrived, REPLACE_SUMMARY.left));
    expect(el.textContent).not.toContain("no longer owned");
    expect(el.textContent).not.toContain("other decks unaffected");

    // THE CHOOSER. It was missing entirely, and it is the only thing on the
    // summary a reader can act on. Both committed decks are named, because a
    // chooser with one option is not a choice — the receipt's own test is at
    // least two committed claimants.
    for (const claimant of CONTESTED_ARRIVAL.claimants) {
      expect(el.textContent).toContain(claimant.deckName);
    }
    expect(el.textContent).toContain(CONTESTED_ARRIVAL.cardName);
    // A CONTROL, not just text: the chooser's subject is that you can act, and
    // the money sections above carry none. One radio per committed claimant —
    // the row draws `role="radio"` list items, so a count of buttons finds
    // nothing and passes for the wrong reason.
    expect(el.querySelectorAll('[role="radio"]')).toHaveLength(
      CONTESTED_ARRIVAL.claimants.length,
    );
  });

  // The old figure drew the two TAB LABELS as pills, which says the inspector
  // has two tabs and nothing about the entry's subject — that a misspelling and
  // a line we could not read are different failures, labelled differently. It
  // mounts the route's own two row views now, so the difference is the thing on
  // screen rather than a claim about it.
  it("import-issues: one row of each KIND, drawn by the route", () => {
    const el = plate("import-issues");
    expect(el.textContent).toContain(ISSUE_UNMATCHED.name);
    expect(el.textContent).toContain(ISSUE_PARSE_ERROR.reason);

    // The unmatched row carries the warning edge the route gives it. Two rows
    // of the same kind would satisfy every text assertion above.
    const warned = [...el.querySelectorAll("div")].filter((d) =>
      d.getAttribute("style")?.includes("var(--warning)"),
    );
    expect(warned.length).toBeGreaterThan(0);
  });

  it("card-detail: the printings list, with the app's marks", () => {
    const el = plate("card-detail");
    expect(el.textContent).toContain("Printings");
    for (const row of PRINTING_ROWS) {
      expect(el.textContent).toContain(row.set);
      expect(el.textContent).toContain(row.collector);
    }

    // §3's legend calls the filled diamond "the printing you own". The picker
    // has never meant that — ✓ is `Your pick`, ◇ is `Shown now` — and #653
    // already corrected that exact claim in this entry's caption. The layout
    // transfers from the drawing; the meaning comes from the app.
    expect(el.textContent).toContain("✓");
    expect(el.textContent).toContain("◇");
    expect(el.textContent).toContain(printingPickerCopy.printing.badgePicked);
    expect(el.textContent).toContain(printingPickerCopy.printing.badgeShownNow);

    // The caption promises the cost and the back face; the printings list
    // alone substantiates neither, and the first rebuild dropped both for it.
    //
    // ASSERTED APART, because BOTH draw the glyph `//` — a sweep of the
    // plate's text is satisfied by whichever survives, and dropping either one
    // left the run green. The test this replaced carried a comment warning of
    // exactly that, and deleting it is how the trap was walked into again.
    //
    // The cost is read through its SPOKEN form, which states both faces; the
    // mark through its own sr-only name.
    expect(el.textContent).toContain(twoFacedCopy.markAria);
    expect(el.textContent).toContain(spokenFullManaCost(COSTS.twoFaced));
  });
});

describe("the themes figure", () => {
  it("draws each theme's palette, not just its name", () => {
    // The generic empty-frame check cannot see this: remove all eighteen
    // swatches and the six names keep the frame non-empty, so the figure whose
    // whole subject is "a theme changes the palette" goes green while showing
    // no palette at all.
    const { container } = render(<AboutPage env={ENV_VIEW} seen={0} />);
    const plate = container.querySelector('[data-specimen="themes"]');
    expect(plate).toBeTruthy();
    const tiles = [...plate!.querySelectorAll("[data-theme]")];
    expect(tiles).toHaveLength(6);
    // Each tile is the PICKER'S OWN miniature now — a panel with `99` set in
    // that theme's display face over an accent bar — rather than three
    // coloured rectangles this page drew. The claim is that a theme changes
    // the palette and not the meaning, and a miniature of the app says that
    // where three swatches only assert it.
    //
    // `data-theme` is what makes each tile resolve against its own tokens, so
    // that attribute is the subject: a tile without it would draw the theme in
    // force six times over.
    for (const tile of tiles) {
      const key = tile.getAttribute("data-theme");
      expect(THEMES.some((t) => t.key === key), `${key} is not a theme`).toBe(true);
      expect(tile.textContent, `${key} draws no miniature`).toContain("99");
    }
    // Both halves of every name, in the picker's own vocabulary: the theme is
    // the label and the plane is the subtitle. An earlier figure had them the
    // other way up.
    for (const theme of THEMES) {
      expect(plate!.textContent).toContain(theme.name);
      expect(plate!.textContent).toContain(theme.short);
    }
  });
});

describe("what each legend must hold", () => {
  // The empty-frame gate is a floor, not coverage: a figure dropping a row —
  // Discover drawing four of its five orders — clears it, and those rows ARE
  // the entry. Where an entry's caption states a count, the figure is held to
  // it here rather than left to a photograph.
  //
  // This block read `dt` elements while these figures were legends. They are
  // mounted components now, so each check below reads whatever the real
  // control draws instead.

  it("gives Discover all five of its orders, in the real control", () => {
    // "two of them change which commanders the list holds" only means anything
    // beside the other three.
    //
    // The figure drew a `Legend` of five rows this module wrote; it mounts the
    // ROUTE's order control now, open, so the orders and their glosses come
    // from `ORDER_OPTIONS` and a rename reaches the figure by itself. The old
    // check counted legend rows and cannot see that.
    const { container } = render(<AboutPage env={ENV_VIEW} seen={0} />);
    const el = container.querySelector('[data-specimen="discover"]')!;
    expect(el, "discover drew no figure").toBeTruthy();
    for (const o of ORDER_OPTIONS.discover) {
      expect(el.textContent).toContain(o.label);
      if (o.gloss) expect(el.textContent).toContain(o.gloss);
    }
    // OPEN. A closed control draws its trigger and none of the options, which
    // are this entry's whole subject.
    // `menuitemradio` — the wide control is a menu, not a listbox. Counted
    // rather than taken from the text above, which a CLOSED control would also
    // satisfy if the labels happened to live in its trigger.
    expect(el.querySelectorAll('[role="menuitemradio"]')).toHaveLength(
      ORDER_OPTIONS.discover.length,
    );
  });

  it("deck-page: the badge, the bar and the tabs the key lines name", () => {
    const { container } = render(<AboutPage env={ENV_VIEW} seen={0} />);
    const el = container.querySelector('[data-specimen="deck-page"]')!;
    expect(el, "deck-page drew no figure").toBeTruthy();

    // NOT the whole header. `SpineDesktop` needs a wider row than About's
    // plate and `SpineMobile` is `md:hidden`, so the band cannot be shown at
    // this width — and no key line names it. These three are what the lines
    // are about.
    expect(el.textContent).toContain(DECK_SPINE.status);
    expect(el.textContent).toContain(`${DECK_SPINE.counts.built}`);

    // Key line 2: a tab DROPS its count rather than printing a nought, so the
    // Games tab carries no figure. Counted rather than searched for: three
    // tabs with counts and one without is the rule, and a fixture where every
    // tab had a figure would draw four alike and say nothing.
    const withCounts = DECK_TABS.filter((t) => typeof t.count === "number");
    expect(withCounts).toHaveLength(DECK_TABS.length - 1);
    for (const tab of DECK_TABS) {
      expect(el.textContent).toContain(tab.label);
      if (typeof tab.count === "number") {
        expect(el.textContent).toContain(String(tab.count));
      }
    }
    const games = DECK_TABS.find((t) => t.count === undefined)!;
    expect(games.label).toBe(gameLogCopy.tab.label);
  });

  it("deck-analysis: a range with its two chips, then the climb", () => {
    const { container } = render(<AboutPage env={ENV_VIEW} seen={0} />);
    const el = container.querySelector<HTMLElement>('[data-specimen="deck-analysis"]')!;
    expect(el, "deck-analysis drew no figure").toBeTruthy();

    // The fixture is a real profile through the real verdict, so the range is the rules' answer
    // and not the fixture's. Five Game Changers pass bracket 3's limit of three.
    expect(DECK_ANALYSIS.verdict.permits).toEqual([4, 5]);
    for (const b of DECK_ANALYSIS.verdict.permits) expect(el.textContent).toContain(BRACKET_NAMES[b]);

    // Key line 1: the range is unanswered, so its chips are drawn rather than an answer.
    const ask = el.querySelector(`[role="group"][aria-label="${declarationCopy.ask.groupAria}"]`);
    expect(ask, "no declaration chips").not.toBeNull();
    expect(ask!.querySelectorAll("button")).toHaveLength(2);

    // Key line 2: the climb draws three rungs, the bracket below, this one and the one above.
    expect(el.querySelectorAll('[data-testid="climb-rung"]')).toHaveLength(3);

    // The population foot the handoff forbids dropping.
    expect(el.textContent).toContain("9,730");
  });

  it("card-marks: a key naming only the facts its two rows carry", () => {
    const { container } = render(<AboutPage env={ENV_VIEW} seen={0} />);
    const el = container.querySelector<HTMLElement>('[data-specimen="card-marks"]')!;
    expect(el, "card-marks drew no figure").toBeTruthy();

    for (const card of CARD_MARK_ROWS) expect(el.textContent).toContain(card.name);

    // A deck is a closed set: mass land denial is on neither row, so the key does not name it.
    const key = el.querySelector('[role="group"]')!;
    expect(key.textContent).toContain(cardMarkCopy.gameChanger);
    expect(key.textContent).toContain(cardMarkCopy.extraTurns);
    expect(key.textContent).toContain(cardMarkCopy.tutor);
    expect(key.textContent).not.toContain(cardMarkCopy.massLandDenial);

    // The order rule, which only shows on a card with two marks: Game Changer before tutor.
    const marks = [...el.querySelectorAll('svg[role="img"][data-testid^="card-fact-"]')].map((m) =>
      m.getAttribute("data-testid"),
    );
    expect(marks).toEqual(["card-fact-gameChanger", "card-fact-tutor", "card-fact-extraTurns"]);
  });

  it("gives the resume rows all three verbs", () => {
    // edited, committed, played — the entry's line is that each row says which
    // event put it there, which two verbs cannot demonstrate.
    //
    // The figure used to TYPE the three strings as legend marks, which is the
    // one arrangement that cannot be wrong and cannot be right: `ResumeDecks`
    // picks its verb by ranking three stamps, so a typed figure keeps printing
    // them after the ranking changes. The fixture states dates now and the
    // block chooses, so this reads what it CHOSE.
    const { container } = render(<AboutPage env={ENV_VIEW} seen={0} />);
    const text =
      container.querySelector("[data-specimen='resume']")?.textContent ?? "";
    const c = refreshCopy.home.touched;
    for (const verb of [c.edited, c.committed, c.played]) {
      // The elapsed clause differs per row and is not the subject; the verb is.
      const stem = verb("").replace(/\s+$/, "");
      expect(text, `no row reads ${stem}`).toContain(stem);
    }
  });

});

// ── The commander-availability figure draws its four readings ─────────────
//
// The generic gates — "a figure is registered", "no entry ships undrawn" — stay
// green over a specimen that renders an empty box or somebody else's marks. This
// asserts the thing the entry claims: four readings, the marker count-only, and
// the dot the same at every one of them, which is the change the entry describes.
describe("the commander-availability figure", () => {
  it("draws all four readings, count-only, with one dot treatment", async () => {
    const { FIGURES } = await import("./figures");
    const Figure = FIGURES["commander-availability"]!;
    expect(Figure).toBeDefined();
    const { container } = render(<Figure width="plate" creditLimit={5} />);

    // Three readings print a label; `free` prints none, and that absence is the
    // fourth. Read from the copy module rather than pinned here.
    expect(screen.getByText(availabilityCopy.marker.soft(1))).toBeInTheDocument();
    expect(screen.getByText(availabilityCopy.marker.hard)).toBeInTheDocument();
    expect(screen.getByText(availabilityCopy.marker.over(2))).toBeInTheDocument();

    // Count-only: no deck name anywhere in the figure.
    expect(container.textContent).not.toMatch(/in [A-Z]/);

    // ONE DOT TREATMENT across every OWNED row — the feature's whole claim,
    // and the reason the fixture gives the four owned rows four different
    // claims. The dot is sized by the route's own row now rather than by this
    // page, so it is found by its ownership styling instead of a 6px width
    // this module used to set.
    const owned = SYNERGY_ROWS.filter((c) => c.owned);
    const dots = [...container.querySelectorAll("span")].filter((n) =>
      n.className.toString().includes("bg-[color:var(--success)]"),
    );
    expect(dots).toHaveLength(owned.length);

    // And the UNOWNED row carries a price, which no owned row ever does —
    // key line 3. An all-owned fixture draws none and passes everything above.
    expect(container.textContent).toMatch(/\$[0-9]/);
  });
});

describe("the page's own type, against the design table", () => {
  // `docs/superpowers/design-tables/about.md` states weight 700 on both
  // headings, and Tailwind's preflight gives an h1 and an h2 the BODY weight —
  // so `font-display` alone rendered them at 400 while the table said 700 and
  // the verification pass that wrote the table read past it. A row a machine
  // can check should not be left to a reader who has just written it down.
  it("gives every heading the weight and size the table specifies", () => {
    // Asserting `className` contains `font-bold` restates the change rather
    // than the property — and it covered two headings while the same preflight
    // default was left on the third. The entry title is an h3 with
    // `font-display` and no weight, which §3 draws at 600.
    render(<AboutPage env={ENV_VIEW} seen={0} />);
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1.className).toContain("font-bold");
    expect(h1.className).toContain("leading-[1.2]");
    expect(h1.className).toContain("text-[23px]");
    expect(h1.className).toContain("min-[1000px]:text-[29px]");

    for (const h2 of screen.getAllByRole("heading", { level: 2 })) {
      expect(h2.className).toContain("font-bold");
      expect(h2.className).toContain("text-[16px]");
      expect(h2.className).toContain("min-[1000px]:text-[21px]");
    }
    for (const h3 of screen.getAllByRole("heading", { level: 3 })) {
      // Tailwind's preflight gives an h3 the body weight, so the class is what
      // produces the 600 the table specifies — not decoration on top of it.
      expect(h3.className, "the entry title carries its own weight").toContain("font-semibold");
      expect(h3.className).toContain("text-[15px]");
      expect(h3.className).toContain("min-[1000px]:text-[15.5px]");
    }
  });

  // Both of the rows above were corrected on the desktop step alone in an
  // earlier pass, so a check that reads only the phone value certifies half a
  // fix. Every row here therefore asserts BOTH values — and these three
  // elements are reached structurally rather than by class, because a query
  // written from the class list can only find what it already describes.
  it("sizes the route link and the key line at both widths", () => {
    const { container } = render(<AboutPage env={ENV_VIEW} seen={0} />);

    // The route sits beside its own entry title, so the title's next sibling
    // is the link — no class in the selector.
    const titles = screen.getAllByRole("heading", { level: 3 });
    expect(titles.length).toBeGreaterThan(0);
    for (const title of titles) {
      const route = title.nextElementSibling;
      expect(route?.tagName).toBe("A");
      expect(route?.className).toContain("text-[11px]");
      expect(route?.className).toContain("min-[1000px]:text-[11.5px]");
    }

    // A key line is the text cell of a numbered key — the second child of an
    // `li` whose first child is the numeral. One size at both widths.
    const keyLines = [...container.querySelectorAll("ol > li > span[aria-hidden]")].map(
      (numeral) => numeral.nextElementSibling,
    );
    expect(keyLines.length).toBeGreaterThan(0);
    for (const line of keyLines) {
      expect(line?.className).toContain("text-[10.5px]");
      expect(line?.className).not.toContain("min-[1000px]:text-[");
    }
  });

  it("separates the intro from the h1 by the drawn 10px", () => {
    const { container } = render(<AboutPage env={ENV_VIEW} seen={0} />);
    // The intro is paragraphs now, so it is the block after the h1 rather than one <p>.
    const intro = container.querySelector("h1 + div");
    expect(intro?.className).toContain("mt-[10px]");
  });

  it("gives every plate and every inset its own padding, in both chassis", () => {
    // Two treatments in the canvas — 14px 16px and 12px — collapsed into one
    // row of the first table and then one blanket value in the code.
    //
    // EVERY frame, and BOTH WIDTHS. `Specimen` carries a padding branch per
    // width, so checking the first frame of each kind is the only way to reach
    // both — the earlier version of this checked the first plate and the first
    // inset and so tested one chassis twice, because there were two chassis
    // then. `LegendBox` was the second, and chapter 04 removed it with the
    // last legend.
    const { container } = render(<AboutPage env={ENV_VIEW} seen={0} />);
    const frames = [...container.querySelectorAll("[data-width]")];
    expect(frames.length).toBeGreaterThan(30);

    const kinds = { plate: 0, inset: 0 };
    for (const frame of frames) {
      const label = frame.getAttribute("data-specimen");
      const inset = frame.getAttribute("data-width") === "inset";
      if (inset) {
        expect(frame.className, `${label} inset padding`).toContain("p-[12px]");
      } else {
        expect(frame.className, `${label} plate padding`).toContain("px-[16px]");
        expect(frame.className, `${label} plate padding`).toContain("py-[14px]");
      }
      kinds[inset ? "inset" : "plate"] += 1;
    }
    // Both widths must actually be represented, or the loop above is checking
    // one branch twice.
    expect(kinds.plate, "no plate frames").toBeGreaterThan(0);
    expect(kinds.inset, "no inset frames").toBeGreaterThan(0);
  });
});

// ── Every entry is addressable ─────────────────────────────────────────────
//
// Chapters have carried an id since #673 and entries carried none, so nothing
// could address one: no deep link, and no acceptance cell, because
// `contact-sheet.mjs` waits on a selector and an entry below the fold offered
// nothing to wait for. Every feature ships an entry, so every inventory hit it.
describe("entry anchors", () => {
  // EQUALITY, not membership. Set membership passes with the ids attached to the
  // wrong entries, or with an extra anchored `li` the page never declared — and
  // the claim here is that each entry gets its OWN key, in order.
  it("gives every entry its own id, in order, and no others", () => {
    const { container } = render(<AboutPage env={ENV_VIEW} seen={ABOUT_VERSION} />);
    const ids = [...container.querySelectorAll("li[id]")].map((el) => el.id);
    expect(ids).toEqual(aboutEntries.map((e) => e.id));
  });

  // The pairing, which order alone does not prove: an anchor is only useful if
  // it sits on the element carrying that entry's own title.
  it("puts each id on the element that holds that entry's title", () => {
    const { container } = render(<AboutPage env={ENV_VIEW} seen={ABOUT_VERSION} />);
    for (const e of aboutEntries) {
      const li = container.querySelector(`li[id="${e.id}"]`);
      expect(li, `${e.id} has no anchor`).not.toBeNull();
      expect(li!.textContent, `${e.id} anchors the wrong entry`).toContain(e.title);
    }
  });

});

describe("the vocabulary on /about", () => {
  // The three-reading specimen went with the marks it drew. The figure returns
  // to its three legend rows, and the STATUS figure grows a seventh plate.
  it("draws no mark specimen in the versions figure", () => {
    const { container } = render(<AboutPage env={ENV_VIEW} seen={0} />);
    const figure = container.querySelector("[data-specimen='versions']");
    expect(figure).toBeTruthy();
    const plated = [...figure!.querySelectorAll("span")].filter(
      (el) => (el as HTMLElement).style.background !== "",
    );
    expect(plated).toHaveLength(0);
  });

  it("draws all seven statuses in the status figure", () => {
    const { container } = render(<AboutPage env={ENV_VIEW} seen={0} />);
    const figure = container.querySelector("[data-specimen='status']");
    for (const word of ["New", "Draft", "Over", "Building", "Unresolved", "To buy", "Complete"]) {
      expect(within(figure as HTMLElement).getByText(word), word).toBeInTheDocument();
    }
  });
});

// The four figures the About audit found contradicting their own key lines (2026-09-26): each
// now mounts the surface's own part, so each is asserted by the words that surface prints.
describe("figures that draw what their keys name", () => {
  const specimen = (c: HTMLElement, label: string) => c.querySelector<HTMLElement>(`[data-specimen="${label}"]`)!;

  it("role-coverage draws the commander page's group heads, not the retired chips", () => {
    const { container } = render(<AboutPage env={ENV_VIEW} seen={0} />);
    const el = specimen(container, "role-coverage");
    // Wipes: 1 owned against the 3 the specimen commander's decks run (its measured target).
    expect(el.textContent).toContain("1 owned");
    expect(el.textContent).toContain("2 short of the 3 its decks run");
    expect(el.textContent).not.toMatch(/short of baseline/);
    expect(el.textContent).not.toMatch(/\b1\/3\b/);
  });

  it("log-findings draws the heading its first key describes", () => {
    const { container } = render(<AboutPage env={ENV_VIEW} seen={0} />);
    const heading = deriveHeadline(GAME_SUMMARY)!.heading;
    expect(specimen(container, "log-findings").querySelector("h3")?.textContent).toBe(heading);
  });

  it("combo-awareness is drawn open, so the source marker its key names is there", () => {
    const { container } = render(<AboutPage env={ENV_VIEW} seen={0} />);
    expect(specimen(container, "combo-awareness").textContent).toContain(comboAwarenessCopy.modal.qualifier);
  });

  it("post-import's Still short is the contested row, with no receipt row under it", () => {
    const { container } = render(<AboutPage env={ENV_VIEW} seen={0} />);
    expect(specimen(container, "post-import").textContent).not.toContain("2 decks want 1 copy");
  });
});

// STATES-about-r2 B1/B2: one numeral ON the figure for every key line, placed on the part the
// line names. The page shipped with 21 of 26 keyed figures breaking it (the About audit,
// 2026-09-26), because nothing counted them. A key line with no mark is a bullet, and a mark with
// no line is noise, so the check is an exact set in both directions.
describe("every key line has its numeral on its figure", () => {
  // `marksPending` entries had their key lines rewritten ahead of their figures' marks (Hugh's
  // voice pass, 2026-10-07). They are held to the contract again as each figure is re-pinned and
  // the flag comes off; until then their marks are hidden and their key is unnumbered.
  const keyed = aboutEntries.filter((e) => e.keys.length > 0 && e.id in FIGURES && !e.marksPending);

  it("covers the entries it is about, plus the ones awaiting re-pinned marks", () => {
    const pending = aboutEntries.filter((e) => e.marksPending);
    expect(keyed.length + pending.length).toBeGreaterThanOrEqual(26);
  });

  it.each(keyed.map((e) => [e.id, e] as const))("%s", (_id, entry) => {
    const { container } = render(<AboutPage env={ENV_VIEW} seen={0} />);
    const figure = container.querySelector(`[id="${entry.id}"] [data-specimen]`);
    expect(figure, "no figure drawn").not.toBeNull();
    const drawn = [...figure!.querySelectorAll("[data-key-numeral]")]
      .map((n) => Number(n.getAttribute("data-key-numeral")))
      .sort((a, b) => a - b);
    expect(drawn).toEqual(entry.keys.map((_, i) => i + 1));
  });
});
