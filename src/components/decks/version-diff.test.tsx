import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VersionDiff } from "./version-diff";
import { deckImportCopy } from "../../lib/copy/deck-import";
import { deckVersioningCopy } from "../../lib/copy/deck-versioning";
import type { VersionDiffCard, VersionDiffPayload, VersionSummary } from "../../lib/decks/versions";
import { COST_TRACK } from "../ui/cost-pips";
import type { BrowseCard } from "../../lib/collection/browse";
import { CardDetailProvider, cardDetailCopy } from "../cards/card-detail-provider";

const getVersionDiff = vi.fn<
  (deckId: string, versionId: string) => Promise<VersionDiffPayload | null>
>(async () => ({ in: [], out: [], newestAsOf: null }));

vi.mock("../../app/decks/actions", () => ({
  getVersionDiff: (deckId: string, versionId: string) => getVersionDiff(deckId, versionId),
}));

const copy = deckVersioningCopy.history;

function version(over: Partial<VersionSummary> = {}): VersionSummary {
  return {
    id: `v_${over.number ?? 2}`,
    number: 2,
    committedAt: new Date("2026-09-01T00:00:00Z"),
    note: "swapped the ramp",
    commanderOracleId: "korvold",
    partnerOracleId: null,
    commanderSince: new Date("2026-08-01T00:00:00Z"),
    partnerSince: null,
    cardCount: 99,
    adds: 1,
    removes: 1,
    manaValue: 3.1,
    gamesHeld: 3,
    commanderName: "Korvold",
    partnerName: null,
    ...over,
  };
}

function card(over: Partial<VersionDiffCard> = {}): VersionDiffCard {
  return {
    oracleId: "o",
    name: "Sol Ring",
    typeLine: "Artifact",
    manaCost: "{1}",
    from: 0,
    to: 1,
    ownedNow: 1,
    imageUri: null,
    printedName: null,
    price: null,
    ...over,
  };
}

// The modal only draws its Prev/Next position over a card it could read.
const detail = (oracleId: string): BrowseCard => ({
  oracleId, name: oracleId, typeLine: "Artifact", manaCost: "{1}", cmc: 1, oracleText: "", keywords: [],
  rarity: "uncommon", colorIdentity: [], imageUri: null, printedName: null, quantity: 0,
  printings: [], setCodes: [], primarySetCode: "", preferredPrinting: null,
});

function mount(props: Partial<Parameters<typeof VersionDiff>[0]> = {}) {
  return render(
    <CardDetailProvider fetchCard={async (oracleId) => detail(oracleId)}>
    <VersionDiff
      deckId="deck_1"
      version={version()}
      previous={version({ number: 1, manaValue: 3.4, note: null })}
      panelId="panel_1"
      cache={new Map()}
      {...props}
    />
    </CardDetailProvider>,
  );
}

describe("VersionDiff", () => {
  beforeEach(() => getVersionDiff.mockClear());

  it("names what came in and what went out", async () => {
    getVersionDiff.mockResolvedValueOnce({
      newestAsOf: null,
      in: [card({ oracleId: "in", name: "Sol Ring" })],
      out: [card({ oracleId: "out", name: "Mind Stone", from: 1, to: 0 })],
    });
    mount();
    expect(await screen.findByText("Sol Ring")).toBeInTheDocument();
    expect(screen.getByText("Mind Stone")).toBeInTheDocument();
  });

  // Five Swamps leaving read as a bare `Swamp` until basic lands could reach a
  // diff, because no other row ever lost more than a copy and `1 → 0` is what
  // the heading above it already says. The rule is `printsPair`, shared with the
  // review page and the pending banner so the three cannot describe one move
  // three ways.
  it("prints the pair when a whole cut takes more than one copy", async () => {
    getVersionDiff.mockResolvedValueOnce({
      newestAsOf: null,
      in: [],
      out: [card({ oracleId: "swamp", name: "Swamp", typeLine: "Basic Land — Swamp", from: 5, to: 0 })],
    });
    mount();
    expect(
      await screen.findByText(deckImportCopy.update.diff.recountedItem("Swamp", "5", "0")),
    ).toBeInTheDocument();
  });

  // And says nothing extra for the single copy the heading already described.
  it("names a single cut card without a pair", async () => {
    getVersionDiff.mockResolvedValueOnce({
      newestAsOf: null,
      in: [],
      out: [card({ oracleId: "out", name: "Mind Stone", from: 1, to: 0 })],
    });
    mount();
    expect(await screen.findByText("Mind Stone")).toBeInTheDocument();
  });

  // H31: an In row draws TODAY's ownership and price (the STATES table's rows, by name).
  const asOf = new Date("2026-10-03T09:00:00Z");
  const priced = (cents: number) => ({ cents, foilCents: null, etchedCents: null, asOf });

  function rowOf(name: string): HTMLElement {
    return screen.getByRole("button", { name: cardDetailCopy.triggerAria(name) })
      .closest("[data-version-diff-row]") as HTMLElement;
  }

  it("draws a dashed dot and a priced tag on an In card the reader does not own (Bumi)", async () => {
    getVersionDiff.mockResolvedValueOnce({
      newestAsOf: asOf,
      in: [card({ name: "Bumi", ownedNow: 0, price: priced(240) })],
      out: [],
    });
    mount();
    await screen.findByText("Bumi");
    const row = rowOf("Bumi");
    expect(row.querySelector('span[class*="dashed"]')).not.toBeNull();
    expect(row.textContent).toContain("$2.40");
    expect(row.textContent).not.toContain("own ");
  });

  it("draws own N of M and a tag on a partly owned In card (Persistent Petitioners)", async () => {
    getVersionDiff.mockResolvedValueOnce({
      newestAsOf: asOf,
      in: [card({ name: "Persistent Petitioners", from: 0, to: 4, ownedNow: 1, price: priced(35) })],
      out: [],
    });
    mount();
    await screen.findByText(/Persistent Petitioners/);
    const row = rowOf("Persistent Petitioners");
    expect(row.textContent).toContain(copy.partialOwned(1, 4));
    expect(row.textContent).toContain("$0.35");
    expect(screen.getByText(copy.partialA11y(1, 4))).toBeInTheDocument();
  });

  it("draws a filled dot and no tag on a card owned in full, a basic included", async () => {
    getVersionDiff.mockResolvedValueOnce({
      newestAsOf: asOf,
      in: [
        card({ oracleId: "aang", name: "Aang", ownedNow: 1, price: priced(500) }),
        card({ oracleId: "plains", name: "Plains", typeLine: "Basic Land — Plains", manaCost: null, from: 6, to: 7, ownedNow: 7 }),
      ],
      out: [],
    });
    mount();
    await screen.findByText("Aang");
    for (const name of ["Aang", "Plains"]) {
      const row = rowOf(name);
      expect(row.querySelector('span[class*="var(--success)"]')).not.toBeNull();
      expect(row.textContent).not.toMatch(/buy|\$/);
    }
  });

  it("draws no dot and no tag on an Out card, owned or not", async () => {
    getVersionDiff.mockResolvedValueOnce({
      newestAsOf: asOf,
      in: [],
      out: [card({ name: "Mind Stone", from: 1, to: 0, ownedNow: 0, price: priced(100) })],
    });
    mount();
    await screen.findByText("Mind Stone");
    const row = rowOf("Mind Stone");
    expect(row.querySelector('span[class*="dashed"], span[class*="var(--success)"]')).toBeNull();
    expect(row.textContent).not.toMatch(/buy|\$/);
  });

  it("says the figures are today's above an In list, and not on a cuts-only version", async () => {
    getVersionDiff.mockResolvedValueOnce({ newestAsOf: asOf, in: [card()], out: [] });
    const { unmount } = mount();
    expect(await screen.findByText(copy.todayNote(2))).toBeInTheDocument();
    unmount();
    getVersionDiff.mockResolvedValueOnce({ newestAsOf: asOf, in: [], out: [card({ from: 1, to: 0 })] });
    mount();
    await screen.findByText("Sol Ring");
    expect(screen.queryByText(copy.todayNote(2))).toBeNull();
  });

  it("pages the modal across In then Out, in the order the rows are drawn", async () => {
    getVersionDiff.mockResolvedValueOnce({
      newestAsOf: asOf,
      in: [
        card({ oracleId: "ring", name: "Sol Ring" }),
        card({ oracleId: "elves", name: "Llanowar Elves", typeLine: "Creature — Elf Druid" }),
      ],
      out: [card({ oracleId: "stone", name: "Mind Stone", from: 1, to: 0 })],
    });
    mount();
    await screen.findByText("Mind Stone");
    // Drawn In: Llanowar Elves (Creatures) then Sol Ring (Artifacts); then Out: Mind Stone.
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: cardDetailCopy.triggerAria("Mind Stone") }));
    });
    await waitFor(() => expect(screen.getByText("3 of 3")).toBeTruthy());
  });

  // A land has no cost and still holds the track, so the names beside it end on
  // the same vertical as every costed row in its group.
  it("keeps the cost track on a card with no cost", async () => {
    getVersionDiff.mockResolvedValueOnce({
      newestAsOf: null,
      in: [card({ name: "Wastes", typeLine: "Land", manaCost: null })],
      out: [],
    });
    mount();
    const row = (await screen.findByText("Wastes")).parentElement!;
    const track = row.lastElementChild as HTMLElement;
    expect(track.style.width).toBe(`${COST_TRACK}px`);
    expect(track.textContent).toBe("");
  });

  // A version's cards are read on open, not with the rail — a ten-version deck
  // would otherwise pay ten diffs to draw ten closed rows. The predecessor is not
  // passed: the server resolves it, so no caller can ask for a mismatched pair.
  it("reads the diff on open, naming only the version", async () => {
    getVersionDiff.mockResolvedValueOnce({ newestAsOf: null, in: [card()], out: [] });
    mount();
    await screen.findByText("Sol Ring");
    expect(getVersionDiff).toHaveBeenCalledWith("deck_1", "v_2");
  });

  // A diff already read this visit is served from the rail's map. Closing a row
  // unmounts this panel, so without it a reader flipping A → B → A pays twice.
  it("serves a diff the rail already holds without reading again", async () => {
    const cache = new Map([["v_2", { newestAsOf: null, in: [card({ name: "Wastes" })], out: [] }]]);
    mount({ cache });
    expect(await screen.findByText("Wastes")).toBeInTheDocument();
    expect(getVersionDiff).not.toHaveBeenCalled();
  });

  it("files a diff it read into the rail's map", async () => {
    const cache = new Map<string, VersionDiffPayload>();
    getVersionDiff.mockResolvedValueOnce({ newestAsOf: null, in: [card()], out: [] });
    mount({ cache });
    await screen.findByText("Sol Ring");
    expect(cache.get("v_2")?.in).toHaveLength(1);
  });

  // A failed read is not this version's answer, so it is not remembered — the
  // next open asks again.
  it("does not file a failed read", async () => {
    getVersionDiff.mockRejectedValueOnce(new Error("nope"));
    const cache = new Map<string, VersionDiffPayload>();
    mount({ cache });
    await screen.findByText(copy.diffUnavailable);
    expect(cache.has("v_2")).toBe(false);
  });

  // A refusal resolves rather than throwing, and comes back null so that it is
  // distinguishable from two empty lists — which are a real answer for a version
  // that moved no cards, and would otherwise be remembered as this version's.
  it("does not file a refused read", async () => {
    getVersionDiff.mockResolvedValueOnce(null);
    const cache = new Map<string, VersionDiffPayload>();
    mount({ cache });
    await screen.findByText(copy.diffUnavailable);
    expect(cache.has("v_2")).toBe(false);
  });

  // Two empty lists are a real answer for a version that moved no cards, so a read
  // that never arrived must not borrow that sentence.
  it("never says no cards moved when the read was refused", async () => {
    getVersionDiff.mockResolvedValueOnce(null);
    mount();
    expect(await screen.findByText(copy.diffUnavailable)).toBeInTheDocument();
    expect(screen.queryByText(copy.noChange)).toBeNull();
  });

  // A note-only or commander-only commit moves no cards, and no eligibility test
  // stops one: only a v1 must be exactly the body's size. Without a line saying so
  // the panel opens on nothing, which reads as a read that failed.
  it("says no cards moved when a version has no delta", async () => {
    getVersionDiff.mockResolvedValueOnce({ newestAsOf: null, in: [], out: [] });
    mount();
    expect(await screen.findByText(copy.noChange)).toBeInTheDocument();
    expect(screen.queryByText(copy.todayNote(2))).toBeNull();
  });

  // The phone reads the direction off the pressed segment, so the column header is
  // desktop-only — except when there is only one column, which leaves nothing
  // pressed and no word anywhere saying which way the names went.
  it("draws the column heading on the phone when there is only one column", async () => {
    getVersionDiff.mockResolvedValueOnce({ newestAsOf: null, in: [card()], out: [] });
    const { container } = mount();
    await screen.findByText("Sol Ring");
    const heading = [...container.querySelectorAll("h3")].find(
      (h) => h.textContent === copy.diffIn(1),
    )!;
    expect(heading.className).toContain("block");
    expect(heading.className).not.toContain("hidden");
  });

  it("keeps the column heading off the phone when both columns are drawn", async () => {
    getVersionDiff.mockResolvedValueOnce({
      newestAsOf: null,
      in: [card()],
      out: [card({ oracleId: "out", name: "Mind Stone", from: 1, to: 0 })],
    });
    const { container } = mount();
    await screen.findByText("Sol Ring");
    const heading = [...container.querySelectorAll("h3")].find(
      (h) => h.textContent === copy.diffIn(1),
    )!;
    expect(heading.className).toContain("hidden");
  });

  // An all-land predecessor has no curve to average, which is a real answer and
  // not a missing one. The figure this version does know is still drawn.
  it("draws the mana value with no before figure when the predecessor had no curve", async () => {
    getVersionDiff.mockResolvedValueOnce({ newestAsOf: null, in: [card()], out: [] });
    mount({ previous: version({ number: 1, manaValue: null }) });
    await screen.findByText("Sol Ring");
    expect(screen.getByText("3.10")).toBeInTheDocument();
    expect(screen.getByText(deckVersioningCopy.changed.manaValue)).toBeInTheDocument();
  });

  // The surface takes no SVG and no motion, and Design drew no loading state for
  // it, so the wait is the space the diff will occupy and nothing else. Asserted
  // here rather than in the browser probe: the read settles in a few
  // milliseconds, so which frame a probe catches is a race and this is not.
  it("holds the panel's space, unmarked, while the diff is in flight", () => {
    getVersionDiff.mockReturnValueOnce(new Promise(() => {}));
    const { container } = mount();
    const pending = container.querySelector("[data-diff-pending]");
    expect(pending).not.toBeNull();
    expect(pending!.textContent).toBe("");
    expect(container.querySelectorAll("svg")).toHaveLength(0);
    expect(container.innerHTML).not.toMatch(/anim-/);
  });

  // A v1 has nothing before it to compare against, so there is no diff to fetch
  // and none to draw.
  it("draws the initial arm for a v1 and fetches nothing", () => {
    const { container } = mount({ version: version({ number: 1 }), previous: null });
    expect(screen.getByText(copy.initialHeading)).toBeInTheDocument();
    // No link out: the rail draws on the deck page itself, so the only link this
    // panel ever carried pointed at the page the reader was already on.
    expect(screen.queryAllByRole("link")).toHaveLength(0);
    expect(getVersionDiff).not.toHaveBeenCalled();
    expect(container.querySelector("[data-diff-pending]")).toBeNull();
  });

  it("says which commander took over when the version changed one", async () => {
    getVersionDiff.mockResolvedValueOnce({ newestAsOf: null, in: [card()], out: [] });
    mount({
      version: version({ commanderOracleId: "prosper", commanderName: "Prosper" }),
      previous: version({ number: 1, commanderOracleId: "korvold", commanderName: "Korvold" }),
    });
    expect(await screen.findByText(copy.commanderChange("Korvold", "Prosper"))).toBeInTheDocument();
  });

  // The panel's header is desktop-only, so a helm sentence inside it would leave a
  // commander-only commit reading as a version that changed nothing at 390px.
  it("draws the helm sentence at both widths", async () => {
    getVersionDiff.mockResolvedValueOnce({ newestAsOf: null, in: [card()], out: [] });
    mount({
      version: version({ commanderOracleId: "prosper", commanderName: "Prosper" }),
      previous: version({ number: 1 }),
    });
    const line = await screen.findByText(copy.commanderChange("Korvold", "Prosper"));
    expect(line.className).not.toContain("hidden");
    for (let node = line.parentElement; node !== null; node = node.parentElement) {
      expect(node.className).not.toContain("hidden");
    }
  });

  // A partner swap changes who is at the helm as much as a commander swap does.
  // Naming only the primary rendered `Korvold → Korvold`, which says nothing.
  it("names both sides of the helm when only the partner moved", async () => {
    getVersionDiff.mockResolvedValueOnce({ newestAsOf: null, in: [card()], out: [] });
    mount({
      version: version({ partnerOracleId: "tymna", partnerName: "Tymna" }),
      previous: version({ number: 1, partnerOracleId: "thrasios", partnerName: "Thrasios" }),
    });
    expect(
      await screen.findByText(
        copy.commanderChange(
          copy.commanderPair("Korvold", "Thrasios"),
          copy.commanderPair("Korvold", "Tymna"),
        ),
      ),
    ).toBeInTheDocument();
  });

  // A partner arriving is a change to the helm with no pair on the far side, and
  // the sentence still has to read.
  it("reads the arrival of a partner as one side gaining a name", async () => {
    getVersionDiff.mockResolvedValueOnce({ newestAsOf: null, in: [card()], out: [] });
    mount({
      version: version({ partnerOracleId: "tymna", partnerName: "Tymna" }),
      previous: version({ number: 1 }),
    });
    expect(
      await screen.findByText(
        copy.commanderChange("Korvold", copy.commanderPair("Korvold", "Tymna")),
      ),
    ).toBeInTheDocument();
  });

  it("says nothing about the commander when the version kept it", async () => {
    getVersionDiff.mockResolvedValueOnce({ newestAsOf: null, in: [card()], out: [] });
    const { container } = mount();
    await screen.findByText("Sol Ring");
    expect(container.textContent).not.toContain(copy.commanderChange("Korvold", "Korvold"));
    expect(container.textContent).not.toContain("→ Korvold");
  });

  // Two partners the name index cannot resolve leave both sides of the arrow
  // reading as the primary alone, so the ids moved but the sentence would not.
  it("says nothing about the helm when neither partner's name resolved", async () => {
    getVersionDiff.mockResolvedValueOnce({ newestAsOf: null, in: [card()], out: [] });
    const { container } = mount({
      version: version({ partnerOracleId: "tymna", partnerName: null }),
      previous: version({ number: 1, partnerOracleId: "thrasios", partnerName: null }),
    });
    await screen.findByText("Sol Ring");
    expect(container.textContent).not.toContain(copy.commanderChange("Korvold", "Korvold"));
  });

  // A copy count moving is neither an arrival nor a departure, and a bare name
  // would claim it was one.
  it("states both counts when a card's quantity moved", async () => {
    getVersionDiff.mockResolvedValueOnce({
      newestAsOf: null,
      in: [card({ name: "Wastes", from: 1, to: 3 })],
      out: [],
    });
    mount();
    expect(await screen.findByText(/Wastes/)).toHaveTextContent("1");
  });

  // One query, not a sentence: a failed read leaves the panel empty rather than
  // stuck behind a mark that never resolves.
  it("settles into an empty panel when the read fails", async () => {
    getVersionDiff.mockRejectedValueOnce(new Error("nope"));
    const { container } = mount();
    await screen.findByText(copy.diffUnavailable);
    expect(container.querySelector("[data-diff-pending]")).toBeNull();
  });
});
