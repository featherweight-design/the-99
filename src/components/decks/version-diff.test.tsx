import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VersionDiff } from "./version-diff";
import { deckVersioningCopy } from "../../lib/copy/deck-versioning";
import type { VersionDiffCard, VersionSummary } from "../../lib/decks/versions";

const getVersionDiff = vi.fn<
  (deckId: string, versionId: string) => Promise<{
    in: VersionDiffCard[];
    out: VersionDiffCard[];
  } | null>
>(async () => ({ in: [], out: [] }));

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
    ...over,
  };
}

function mount(props: Partial<Parameters<typeof VersionDiff>[0]> = {}) {
  return render(
    <VersionDiff
      deckId="deck_1"
      version={version()}
      previous={version({ number: 1, manaValue: 3.4, note: null })}
      panelId="panel_1"
      cache={new Map()}
      {...props}
    />,
  );
}

describe("VersionDiff", () => {
  beforeEach(() => getVersionDiff.mockClear());

  it("names what came in and what went out", async () => {
    getVersionDiff.mockResolvedValueOnce({
      in: [card({ oracleId: "in", name: "Sol Ring" })],
      out: [card({ oracleId: "out", name: "Mind Stone", from: 1, to: 0 })],
    });
    mount();
    expect(await screen.findByText("Sol Ring")).toBeInTheDocument();
    expect(screen.getByText("Mind Stone")).toBeInTheDocument();
  });

  // The diff is a record of what the deck WAS, so it carries none of the deck
  // page's treatments — no ownership dot, no price, no buy tag, no pull.
  it("states that it carries no ownership, price or pull treatment", async () => {
    getVersionDiff.mockResolvedValueOnce({ in: [card()], out: [] });
    mount();
    // The row itself, not the panel: the note that says the treatments are
    // absent necessarily names them.
    const row = (await screen.findByText("Sol Ring")).parentElement!;
    expect(screen.getByText(copy.diffNote)).toBeInTheDocument();
    expect(row.textContent).not.toMatch(/buy|pull|\$/i);
    expect(row.querySelector("[data-owned-dot]")).toBeNull();
    expect(row.querySelector("button")).toBeNull();
  });

  // A land has no cost and still holds the track, so the names beside it end on
  // the same vertical as every costed row in its group.
  it("keeps the cost track on a card with no cost", async () => {
    getVersionDiff.mockResolvedValueOnce({
      in: [card({ name: "Wastes", typeLine: "Land", manaCost: null })],
      out: [],
    });
    mount();
    const row = (await screen.findByText("Wastes")).parentElement!;
    const track = row.lastElementChild as HTMLElement;
    expect(track.style.width).toBe("40px");
    expect(track.textContent).toBe("");
  });

  // A version's cards are read on open, not with the rail — a ten-version deck
  // would otherwise pay ten diffs to draw ten closed rows. The predecessor is not
  // passed: the server resolves it, so no caller can ask for a mismatched pair.
  it("reads the diff on open, naming only the version", async () => {
    getVersionDiff.mockResolvedValueOnce({ in: [card()], out: [] });
    mount();
    await screen.findByText("Sol Ring");
    expect(getVersionDiff).toHaveBeenCalledWith("deck_1", "v_2");
  });

  // A diff already read this visit is served from the rail's map. Closing a row
  // unmounts this panel, so without it a reader flipping A → B → A pays twice.
  it("serves a diff the rail already holds without reading again", async () => {
    const cache = new Map([["v_2", { in: [card({ name: "Wastes" })], out: [] }]]);
    mount({ cache });
    expect(await screen.findByText("Wastes")).toBeInTheDocument();
    expect(getVersionDiff).not.toHaveBeenCalled();
  });

  it("files a diff it read into the rail's map", async () => {
    const cache = new Map<string, { in: VersionDiffCard[]; out: VersionDiffCard[] }>();
    getVersionDiff.mockResolvedValueOnce({ in: [card()], out: [] });
    mount({ cache });
    await screen.findByText("Sol Ring");
    expect(cache.get("v_2")?.in).toHaveLength(1);
  });

  // A failed read is not this version's answer, so it is not remembered — the
  // next open asks again.
  it("does not file a failed read", async () => {
    getVersionDiff.mockRejectedValueOnce(new Error("nope"));
    const cache = new Map<string, { in: VersionDiffCard[]; out: VersionDiffCard[] }>();
    mount({ cache });
    await screen.findByText(copy.diffUnavailable);
    expect(cache.has("v_2")).toBe(false);
  });

  // A refusal resolves rather than throwing, and comes back null so that it is
  // distinguishable from two empty lists — which are a real answer for a version
  // that moved no cards, and would otherwise be remembered as this version's.
  it("does not file a refused read", async () => {
    getVersionDiff.mockResolvedValueOnce(null);
    const cache = new Map<string, { in: VersionDiffCard[]; out: VersionDiffCard[] }>();
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
    getVersionDiff.mockResolvedValueOnce({ in: [], out: [] });
    mount();
    expect(await screen.findByText(copy.noChange)).toBeInTheDocument();
    expect(screen.queryByText(copy.diffNote)).toBeNull();
  });

  // The phone reads the direction off the pressed segment, so the column header is
  // desktop-only — except when there is only one column, which leaves nothing
  // pressed and no word anywhere saying which way the names went.
  it("draws the column heading on the phone when there is only one column", async () => {
    getVersionDiff.mockResolvedValueOnce({ in: [card()], out: [] });
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
    getVersionDiff.mockResolvedValueOnce({ in: [card()], out: [] });
    mount({ previous: version({ number: 1, manaValue: null }) });
    await screen.findByText("Sol Ring");
    expect(screen.getByText("3.10")).toBeInTheDocument();
    expect(screen.getByText(deckVersioningCopy.changed.manaValue)).toBeInTheDocument();
  });

  it("shows the one loading mark while the diff is in flight", () => {
    getVersionDiff.mockReturnValueOnce(new Promise(() => {}));
    const { container } = mount();
    expect(container.querySelector("[data-pending-mark]")).not.toBeNull();
  });

  // A v1 has nothing before it to compare against, so there is no diff to fetch
  // and none to draw.
  it("draws the initial arm for a v1 and fetches nothing", () => {
    const { container } = mount({ version: version({ number: 1 }), previous: null });
    expect(screen.getByText(copy.initialHeading)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: copy.initialBrowse(99) })).toHaveAttribute(
      "href",
      "/decks/deck_1",
    );
    expect(getVersionDiff).not.toHaveBeenCalled();
    expect(container.querySelector("[data-pending-mark]")).toBeNull();
  });

  it("says which commander took over when the version changed one", async () => {
    getVersionDiff.mockResolvedValueOnce({ in: [card()], out: [] });
    mount({
      version: version({ commanderOracleId: "prosper", commanderName: "Prosper" }),
      previous: version({ number: 1, commanderOracleId: "korvold", commanderName: "Korvold" }),
    });
    expect(await screen.findByText(copy.commanderChange("Korvold", "Prosper"))).toBeInTheDocument();
  });

  // The panel's header is desktop-only, so a helm sentence inside it would leave a
  // commander-only commit reading as a version that changed nothing at 390px.
  it("draws the helm sentence at both widths", async () => {
    getVersionDiff.mockResolvedValueOnce({ in: [card()], out: [] });
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
    getVersionDiff.mockResolvedValueOnce({ in: [card()], out: [] });
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
    getVersionDiff.mockResolvedValueOnce({ in: [card()], out: [] });
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
    getVersionDiff.mockResolvedValueOnce({ in: [card()], out: [] });
    const { container } = mount();
    await screen.findByText("Sol Ring");
    expect(container.textContent).not.toContain(copy.commanderChange("Korvold", "Korvold"));
    expect(container.textContent).not.toContain("→ Korvold");
  });

  // Two partners the name index cannot resolve leave both sides of the arrow
  // reading as the primary alone, so the ids moved but the sentence would not.
  it("says nothing about the helm when neither partner's name resolved", async () => {
    getVersionDiff.mockResolvedValueOnce({ in: [card()], out: [] });
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
    expect(container.querySelector("[data-pending-mark]")).toBeNull();
  });
});
