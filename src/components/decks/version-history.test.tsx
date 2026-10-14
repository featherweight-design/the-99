import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { VersionRail } from "./version-history";
import { deckVersioningCopy, historyOriginCopy } from "../../lib/copy/deck-versioning";
import { preconsCopy } from "../../lib/copy/precons";
import type { DeckOrigin } from "../../lib/precons/origin";
import type { VersionSummary } from "../../lib/decks/versions";

// The rail never fetches. Only an opened row does, and the diff's own suite
// covers that — here the mock exists so mounting the rail does not reach a
// module that throws at import in a browser, and so the rail's own cache can be
// asserted by counting reads.
const getVersionDiff = vi.fn<
  (deckId: string, versionId: string) => Promise<{ in: never[]; out: never[] }>
>(async () => ({ in: [], out: [] }));
vi.mock("../../app/decks/actions", () => ({
  getVersionDiff: (deckId: string, versionId: string) => getVersionDiff(deckId, versionId),
}));
const unlinkPrecon = vi.fn(async (deckId: string, fileName: string) => { void deckId; void fileName; });
vi.mock("../../app/decks/precon-link-actions", () => ({
  linkPrecon: vi.fn(),
  unlinkPrecon: (deckId: string, fileName: string) => unlinkPrecon(deckId, fileName),
}));

const copy = deckVersioningCopy.history;

function version(over: Partial<VersionSummary> = {}): VersionSummary {
  return {
    id: `v_${over.number ?? 1}`,
    number: 1,
    committedAt: new Date("2026-09-01T00:00:00Z"),
    note: null,
    commanderOracleId: "cmd",
    partnerOracleId: null,
    commanderSince: new Date("2026-08-01T00:00:00Z"),
    partnerSince: null,
    cardCount: 99,
    adds: 0,
    removes: 0,
    manaValue: 3.1,
    gamesHeld: 0,
    commanderName: "Korvold",
    partnerName: null,
    ...over,
  };
}

function mount(versions: VersionSummary[]) {
  return render(<VersionRail deckId="deck_1" versions={versions} />);
}

// Newest first, as `listVersions` returns them.
const THREE = [
  version({ number: 3, adds: 4, removes: 2, note: "swapped the ramp", gamesHeld: 2 }),
  version({ number: 2, adds: 6, removes: 6, gamesHeld: 5, committedAt: new Date("2026-08-20T00:00:00Z") }),
  version({ number: 1, committedAt: new Date("2026-08-01T00:00:00Z"), gamesHeld: 9 }),
];

describe("VersionRail", () => {
  it("draws one row per version, newest first", () => {
    mount(THREE);
    const rows = screen.getAllByRole("button", { expanded: false });
    expect(rows).toHaveLength(3);
    expect(rows[0].textContent).toContain("v3");
    expect(rows[2].textContent).toContain("v1");
  });

  // The newest version is the list the deck is sleeved as, so it wears the
  // marker — and only it does.
  it("marks the newest version as current and no other", () => {
    mount(THREE);
    const rows = screen.getAllByRole("button", { expanded: false });
    expect(within(rows[0]).getAllByText(copy.current).length).toBeGreaterThan(0);
    expect(within(rows[1]).queryByText(copy.current)).toBeNull();
    expect(within(rows[2]).queryByText(copy.current)).toBeNull();
  });

  // Never "+99". The migration stamped a list that was already there;
  // ninety-nine decisions were not taken that day.
  it("says `initial` on a v1 rather than crediting it with adds", () => {
    mount(THREE);
    const rows = screen.getAllByRole("button", { expanded: false });
    expect(within(rows[2]).getAllByText(copy.initial).length).toBeGreaterThan(0);
    expect(rows[2].textContent).not.toContain("+99");
  });

  // `initial` means "nothing came before it", which is a fact about the rail's
  // shape. A version that swapped one card back for another has a nought delta
  // and is emphatically not the deck's first list.
  it("reads `initial` off the absence of a predecessor, not off a nought delta", () => {
    mount([
      version({ number: 3, adds: 2, removes: 2 }),
      version({ number: 2, adds: 0, removes: 0 }),
      version({ number: 1, adds: 0, removes: 0 }),
    ]);
    const rows = screen.getAllByRole("button", { expanded: false });
    expect(within(rows[1]).queryByText(copy.initial)).toBeNull();
    expect(within(rows[2]).getAllByText(copy.initial).length).toBeGreaterThan(0);
  });

  it("states the adds and the removes for a version that changed the list", () => {
    mount(THREE);
    const row = screen.getAllByRole("button", { expanded: false })[0];
    expect(row.textContent).toContain("+4");
    expect(row.textContent).toContain("−2");
  });

  it("stands in for an absent note rather than leaving the row short", () => {
    mount(THREE);
    const row = screen.getAllByRole("button", { expanded: false })[1];
    const absent = within(row).getAllByText(copy.noNote)[0];
    expect(absent.className).toContain("italic");
  });

  // A version still accumulating games has no settled tally, so the figure
  // beside it would be wrong by the next evening.
  it("states the games a past version held, and never the current one's", () => {
    mount(THREE);
    const rows = screen.getAllByRole("button", { expanded: false });
    expect(rows[1].textContent).toContain(copy.gamesHeld(5));
    expect(rows[0].textContent).not.toContain(copy.gamesHeld(2));
  });

  it("omits the tally for a version that held no games", () => {
    mount([THREE[0], version({ number: 2, adds: 1, removes: 1, gamesHeld: 0 })]);
    const row = screen.getAllByRole("button", { expanded: false })[1];
    expect(row.textContent).not.toContain("held");
  });

  // §Decisions — a version is a record of what was on the table, and a button
  // that overwrote the draft with a three-month-old list is the one destructive
  // act in this feature nobody asked for.
  it("offers no restore control", () => {
    const { container } = mount(THREE);
    expect(container.textContent).not.toMatch(/restore|revert|roll back/i);
  });

  // The rail is a list of records. The pending draft is not a version, and a
  // rail whose top entry records nothing is not a rail.
  it("gives the pending draft no row", () => {
    const { container } = mount(THREE);
    expect(container.textContent).not.toMatch(/pending|draft/i);
  });

  // The rail is a tab panel now, so the tab row that heads it belongs to the
  // builder. Owning a second one here would draw two rows, and the links it used
  // to own were what took the deck's head off screen.
  it("draws no tab row and no navigation of its own", () => {
    mount(THREE);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
    expect(screen.queryByRole("tablist")).toBeNull();
  });

  // The heading names the panel without drawing ink the canvas does not have,
  // and at level 2 because the deck's own name is the h1 above it.
  it("names the panel without drawing a heading", () => {
    mount(THREE);
    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading.textContent).toBe(copy.heading(3));
    expect(heading.className).toContain("sr-only");
  });

  // The row is the control, so its state has to be announced and not merely
  // drawn — and the panel it opens has to be the one it names.
  it("announces the open row and points it at the panel it opens", async () => {
    mount(THREE);
    const row = screen.getAllByRole("button", { expanded: false })[0];
    fireEvent.click(row);
    const open = await screen.findByRole("button", { expanded: true });
    const panelId = open.getAttribute("aria-controls")!;
    expect(document.getElementById(panelId)).not.toBeNull();
  });

  // A closed row has no panel in the document, and `aria-controls` naming an id
  // nothing has is a broken relationship rather than a harmless one.
  it("names no panel while the row is closed", () => {
    mount(THREE);
    for (const row of screen.getAllByRole("button", { expanded: false })) {
      expect(row).not.toHaveAttribute("aria-controls");
    }
  });

  // Closing a row unmounts the panel that read the diff, so without the rail
  // holding them a reader flipping between two versions pays for the first twice.
  it("reads a version's diff once per visit however often it is opened", async () => {
    getVersionDiff.mockClear();
    mount(THREE);
    // The three row handles are taken once, before anything is open: re-querying
    // `expanded: false` after each click names a different row every time, which
    // walks A → B → C and never returns to A.
    const rows = screen.getAllByRole("button", { expanded: false });
    fireEvent.click(rows[0]);
    await screen.findByRole("button", { expanded: true });
    fireEvent.click(rows[1]);
    await screen.findByRole("button", { expanded: true });
    // Back to the first, whose panel was unmounted in between.
    fireEvent.click(rows[0]);
    await screen.findByRole("button", { expanded: true });
    expect(getVersionDiff.mock.calls.filter((c) => c[1] === "v_3")).toHaveLength(1);
  });

  // Two open panels would put two card lists on a page whose point is the rail.
  it("keeps one row open at a time", async () => {
    mount(THREE);
    const rows = screen.getAllByRole("button", { expanded: false });
    fireEvent.click(rows[0]);
    await screen.findByRole("button", { expanded: true });
    fireEvent.click(screen.getAllByRole("button", { expanded: false })[0]);
    expect(await screen.findAllByRole("button", { expanded: true })).toHaveLength(1);
  });

  it("draws its foot after the last row, where v0 will land (precons R3 K5)", () => {
    render(<VersionRail deckId="deck_1" versions={THREE} foot={<p>Built from a precon?</p>} />);
    const foot = screen.getByText("Built from a precon?");
    const rows = screen.getAllByRole("button", { expanded: false });
    expect(rows[2].compareDocumentPosition(foot) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

// v0 (precons R3 §5): a third kind of row, passed in, drawn last and never current (lock 4).
const ORIGIN: DeckOrigin = {
  fileName: "EldraziUnbound_CMM",
  name: "Eldrazi Unbound",
  setCode: "CMM",
  releaseDate: "2023-08-04",
  cardCount: 99,
  commanderOracleId: "ulalek",
  partnerOracleId: null,
  commanderName: "Ulalek, Fused Atrocity",
  partnerName: null,
  manaValue: 3.6, startVersionId: null,
};

function mountLinked(versions: VersionSummary[]) {
  return render(<VersionRail deckId="deck_1" deckName="HD - Eldrazi" versions={versions} origin={ORIGIN} />);
}

const originRow = () => document.querySelector<HTMLElement>("[data-origin-row]")!;

describe("VersionRail with v0", () => {
  // v1's diff depends on its v0: a relink on this page (unlink, then another precon) must read v1
  // again, open or not, rather than serve the old precon's rows under the new one's name.
  it("reads v1's diff again when the deck is relinked to another precon", async () => {
    getVersionDiff.mockClear();
    const v1 = [version({ number: 1 })];
    const { rerender } = render(<VersionRail deckId="deck_1" deckName="HD - Eldrazi" versions={v1} origin={ORIGIN} />);
    fireEvent.click(screen.getAllByRole("button", { expanded: false })[0]);
    await waitFor(() => expect(getVersionDiff).toHaveBeenCalledTimes(1));
    const other = { ...ORIGIN, fileName: "Other_C21", name: "Other Deck" };
    rerender(<VersionRail deckId="deck_1" deckName="HD - Eldrazi" versions={v1} origin={other} />);
    await waitFor(() => expect(getVersionDiff).toHaveBeenCalledTimes(2));
  });

  // v0 is the precon's list, not a version the reader committed: three commits read three.
  it("counts committed versions only in the panel's heading", () => {
    mountLinked(THREE);
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe(copy.heading(3));
  });

  it("draws v0 last, below the divider, naming the precon with its own card count", () => {
    mountLinked(THREE);
    const rows = screen.getAllByRole("button", { expanded: false });
    expect(rows).toHaveLength(4);
    expect(rows[3]).toBe(originRow());
    const divider = screen.getByText(historyOriginCopy.originDivider);
    expect(rows[2].compareDocumentPosition(divider) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(divider.compareDocumentPosition(rows[3]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(rows[3].textContent).toContain(historyOriginCopy.originNote("Eldrazi Unbound"));
    // Never a literal 100: a precon missing a card lists 99 (audit finding 6).
    expect(rows[3].textContent).toContain(historyOriginCopy.originMeta("CMM", "Aug 2023", 99));
    expect(within(rows[3]).getAllByText(historyOriginCopy.originDelta).length).toBeGreaterThan(0);
  });

  it("keeps `current` on the newest committed version and never on v0", () => {
    mountLinked(THREE);
    const rows = screen.getAllByRole("button", { expanded: false });
    expect(within(rows[0]).getAllByText(copy.current).length).toBeGreaterThan(0);
    expect(within(originRow()).queryByText(copy.current)).toBeNull();
    expect(originRow().className).not.toContain("--accent");
    expect(originRow().className).not.toContain("--surface-rail");
    expect(originRow().className).toContain("border-dashed");
  });

  it("gives v1 its delta against v0 rather than `initial`", () => {
    mountLinked([version({ number: 2, adds: 1, removes: 1 }), version({ number: 1, adds: 12, removes: 12 })]);
    const rows = screen.getAllByRole("button", { expanded: false });
    expect(within(rows[1]).queryByText(copy.initial)).toBeNull();
    expect(rows[1].textContent).toContain("+12");
  });

  it("on a linked brew, draws the brew line and v0 alone, with nothing current", () => {
    mountLinked([]);
    expect(screen.getByText(historyOriginCopy.brewLine)).toBeTruthy();
    expect(screen.getAllByRole("button", { expanded: false })).toEqual([originRow()]);
    expect(screen.queryByText(copy.current)).toBeNull();
    // The divider is drawn only with committed versions above it.
    expect(screen.queryByText(historyOriginCopy.originDivider)).toBeNull();
  });

  it("opens v0's note in the panel's place, naming the version the deck is sleeved as", async () => {
    getVersionDiff.mockClear();
    mountLinked(THREE);
    fireEvent.click(originRow());
    const panel = await screen.findByText(historyOriginCopy.originHeading);
    expect(originRow().getAttribute("aria-controls")).toBe(panel.closest("[data-origin-panel]")!.id);
    expect(screen.getByText(historyOriginCopy.originBody("Eldrazi Unbound", "v3"), { exact: false })).toBeTruthy();
    const open = screen.getByRole("link", { name: historyOriginCopy.originOpen("Eldrazi Unbound") });
    expect(open.getAttribute("href")).toBe("/decks/precons/EldraziUnbound_CMM");
    // v0 opens a note, never a diff.
    expect(getVersionDiff).not.toHaveBeenCalled();
  });

  it("drops the sleeved clause on a linked brew", async () => {
    mountLinked([]);
    fireEvent.click(originRow());
    const body = historyOriginCopy.originBody("Eldrazi Unbound", null);
    expect(await screen.findByText(body, { exact: false })).toBeTruthy();
    expect(body).not.toContain("sleeved");
  });

  it("unlinks through the confirm, never on the first press", async () => {
    unlinkPrecon.mockClear();
    mountLinked(THREE);
    fireEvent.click(originRow());
    fireEvent.click(await screen.findByRole("button", { name: preconsCopy.link.unlink.entryLong }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(preconsCopy.link.unlink.title("HD - Eldrazi", "Eldrazi Unbound"))).toBeTruthy();
    expect(unlinkPrecon).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("button", { name: preconsCopy.link.unlink.submit }));
    await waitFor(() => expect(unlinkPrecon).toHaveBeenCalledWith("deck_1", ORIGIN.fileName));
  });
});

// A started deck's first version IS v0 (`startVersionId`): one row for the box's list, not a committed
// v1 above a dashed v0 holding the same cards.
describe("VersionRail on a deck started from its precon", () => {
  const STARTED = [version({ number: 1, adds: 2, removes: 2 }), version({ number: 0 })];
  const mountStarted = (versions = STARTED, startVersionId = "v_0") =>
    render(<VersionRail deckId="deck_1" deckName="HD - Eldrazi" versions={versions} origin={{ ...ORIGIN, startVersionId }} />);

  it("draws no virtual v0 and no divider beneath the start's version", () => {
    mountStarted();
    expect(document.querySelector("[data-origin-row]")).toBeNull();
    expect(screen.queryByText(historyOriginCopy.originDivider)).toBeNull();
    expect(screen.queryByText(historyOriginCopy.brewLine)).toBeNull();
    expect(screen.getAllByRole("button", { expanded: false }).map((r) => r.textContent?.match(/^v\d+/)?.[0])).toEqual(["v1", "v0"]);
  });

  it("gives the start's version the precon's note when it has none of its own, and keeps a note it has", () => {
    mountStarted();
    const rows = screen.getAllByRole("button", { expanded: false });
    expect(rows[1].textContent).toContain(historyOriginCopy.originNote("Eldrazi Unbound"));
    expect(rows[0].textContent).not.toContain(historyOriginCopy.originNote("Eldrazi Unbound"));
    cleanup();
    mountStarted([version({ number: 0, note: "the box" })]);
    expect(screen.getAllByRole("button", { expanded: false })[0].textContent).not.toContain("as the box lists it");
  });

  it("draws the start's version as `initial`, current while it is the newest", () => {
    mountStarted([version({ number: 0 })]);
    const [row] = screen.getAllByRole("button", { expanded: false });
    expect(within(row).getAllByText(copy.initial).length).toBeGreaterThan(0);
    expect(within(row).getAllByText(copy.current).length).toBeGreaterThan(0);
  });

  it("opens the start's version with the precon's page and the unlink beneath its list", async () => {
    getVersionDiff.mockClear();
    unlinkPrecon.mockClear();
    mountStarted();
    fireEvent.click(screen.getAllByRole("button", { expanded: false })[1]);
    const open = await screen.findByRole("link", { name: historyOriginCopy.originOpen("Eldrazi Unbound") });
    expect(open.getAttribute("href")).toBe("/decks/precons/EldraziUnbound_CMM");
    expect(open.closest("[data-origin-actions]")).not.toBeNull();
    // Not v0's own panel: the start's version opens its committed list, with nothing to diff against.
    expect(document.querySelector("[data-origin-panel]")).toBeNull();
    expect(screen.queryByText(historyOriginCopy.originHeading)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: preconsCopy.link.unlink.entryLong }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: preconsCopy.link.unlink.submit }));
    await waitFor(() => expect(unlinkPrecon).toHaveBeenCalledWith("deck_1", ORIGIN.fileName));
  });

  it("draws the actions under the start's version only", async () => {
    mountStarted();
    fireEvent.click(screen.getAllByRole("button", { expanded: false })[0]);
    await waitFor(() => expect(getVersionDiff).toHaveBeenCalled());
    expect(document.querySelector("[data-origin-actions]")).toBeNull();
  });
});
