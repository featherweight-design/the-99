import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VersionDiff } from "./version-diff";
import { deckVersioningCopy } from "../../lib/copy/deck-versioning";
import type { VersionDiffCard, VersionSummary } from "../../lib/decks/versions";

const getVersionDiff = vi.fn<
  (deckId: string, versionId: string, previousId: string | null) => Promise<{
    in: VersionDiffCard[];
    out: VersionDiffCard[];
  }>
>(async () => ({ in: [], out: [] }));

vi.mock("../../app/decks/actions", () => ({
  getVersionDiff: (deckId: string, versionId: string, previousId: string | null) =>
    getVersionDiff(deckId, versionId, previousId),
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

  // A version's cards are read on open, not with the rail — a ten-version deck
  // would otherwise pay ten diffs to draw ten closed rows.
  it("reads the diff on open, against the version before it", async () => {
    getVersionDiff.mockResolvedValueOnce({ in: [card()], out: [] });
    mount();
    await screen.findByText("Sol Ring");
    expect(getVersionDiff).toHaveBeenCalledWith("deck_1", "v_2", "v_1");
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
    await screen.findByText(copy.diffNote);
    expect(container.querySelector("[data-pending-mark]")).toBeNull();
  });
});
