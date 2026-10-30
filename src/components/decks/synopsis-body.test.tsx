// The Mulligan's fixed land line (contract 6): drawn by the app ahead of the model's lines, from
// the range stored with the overview, and absent on an overview written before it existed.

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { checkedSynopsis } from "./__fixtures__/synopsis";
import { SynopsisSections } from "./synopsis-body";
import { synopsisCopy } from "../../lib/copy/synopsis";
import { CardDetailProvider } from "../cards/card-detail-provider";
// The modal is loaded on demand; loaded here, after the mocks, a press draws it in the same tick.
await (await import("../cards/card-detail-provider")).warmCardModal();
import { HoverPreviewProvider } from "./hover-preview";

const draw = (content = checkedSynopsis()) =>
  render(
    <CardDetailProvider fetchCard={async () => null}>
      <HoverPreviewProvider>
        <SynopsisSections content={content} art={new Map()} onRetry={null} busy={false} />
      </HoverPreviewProvider>
    </CardDetailProvider>,
  );

describe("the Mulligan's land line", () => {
  it("opens each box with the range, before the generated lines", () => {
    draw(checkedSynopsis({ lands: { keep: { low: 2, high: 4 }, sendBack: { none: 0, under: 1, over: 5 } } }));
    const fixed = screen.getAllByTestId("synopsis-land-range").map((e) => e.lastElementChild?.textContent);
    expect(fixed).toEqual(["2 to 4 lands", "0 or 1 lands, or 5 or more"]);
    // Each fixed line comes first in its box.
    for (const line of screen.getAllByTestId("synopsis-land-range")) {
      expect(line.previousElementSibling?.tagName).toBe("SPAN");
    }
  });

  it("draws no range on an overview written before the fixed line", () => {
    draw();
    expect(screen.queryAllByTestId("synopsis-land-range")).toHaveLength(0);
  });
});

describe("the Based on line (Overview accuracy PR 6)", () => {
  const evidence = {
    strategy: [["sol-ring"], []],
    keep: [["sol-ring"]],
    sendBack: [[]],
    tips: [["craterhoof", "sol-ring"]],
    keyCards: [["sol-ring", "craterhoof"]],
    weaknesses: [[]],
  };
  const names = { "sol-ring": "Sol Ring", craterhoof: "Craterhoof Behemoth" };
  const drawWith = (content: ReturnType<typeof checkedSynopsis>, evidenceNames: Record<string, string>, fetchCard = async () => null) =>
    render(
      <CardDetailProvider fetchCard={fetchCard}>
        <HoverPreviewProvider>
          <SynopsisSections content={content} art={new Map()} evidenceNames={evidenceNames} onRetry={null} busy={false} />
        </HoverPreviewProvider>
      </CardDetailProvider>,
    );

  it("lists a claim's cards under it, one line per claim that cites any", () => {
    drawWith(checkedSynopsis({ evidence }), names);
    const lines = screen.getAllByTestId("synopsis-based-on").map((e) => e.textContent);
    // Strategy 1 and the keep line cite only the Sol Ring they name, so draw none; the tip names
    // Craterhoof, so lists Sol Ring alone; the key card leaves out its own card; empty claims draw none.
    expect(lines).toEqual(["Based onSol Ring", "Based onCraterhoof Behemoth"]);
  });

  it("wires each section's own line: a weakness naming one cited card lists only the other", () => {
    const content = checkedSynopsis({
      evidence: { ...evidence, strategy: [[], []], keep: [[]], tips: [[]], keyCards: [[]], weaknesses: [["sol-ring", "craterhoof"]] },
      weaknesses: ["Loses [[Sol Ring]] to an artifact wipe."],
    });
    drawWith(content, names);
    expect(screen.getAllByTestId("synopsis-based-on").map((e) => e.textContent)).toEqual(["Based onCraterhoof Behemoth"]);
  });

  it("opens the card's details from a listed card, as a mark does", async () => {
    const fetchCard = vi.fn(async () => null);
    drawWith(checkedSynopsis({ evidence }), names, fetchCard);
    const line = screen.getAllByTestId("synopsis-based-on")[1];
    fireEvent.click(within(line).getByRole("button", { name: "View details for Craterhoof Behemoth" }));
    await waitFor(() => expect(fetchCard).toHaveBeenCalled());
  });

  it("draws nothing without evidence, or while no names are read (the switch off)", () => {
    drawWith(checkedSynopsis(), names);
    expect(screen.queryAllByTestId("synopsis-based-on")).toHaveLength(0);
  });
  it("draws nothing for a card with no name read", () => {
    drawWith(checkedSynopsis({ evidence }), {});
    expect(screen.queryAllByTestId("synopsis-based-on")).toHaveLength(0);
  });
});

describe("the stages shape (contract 13)", () => {
  const stage13 = (over: Partial<ReturnType<typeof checkedSynopsis>> = {}) => {
    const base = checkedSynopsis();
    return checkedSynopsis({
      overview: "[[Sol Ring]] leads a ramp deck that ends with [[Craterhoof Behemoth]].",
      primer: {
        strategy: ["[[Sol Ring]] ramps on turn one.", "[[Craterhoof Behemoth]] waits for a wide board.", "Swing with everything."],
        mulligan: base.primer!.mulligan,
        tips: [
          { cards: ["Sol Ring", "Craterhoof Behemoth"], text: "Pair [[Sol Ring]] with [[Craterhoof Behemoth]]." },
          { cards: ["Sol Ring", "Craterhoof Behemoth"], text: "Hold [[Craterhoof Behemoth]] and [[Sol Ring]]." },
        ],
      },
      landKeep: "4 lands suit a curve where 9 spells cost five or more.",
      weaknesses: ["Moderate: Folds to a board wipe.", "Minor: Few ways to draw."],
      ...over,
    });
  };
  const art = new Map([
    ["sol-ring", { name: "Sol Ring", imageUri: "https://img/sol.jpg" }],
    ["craterhoof", { name: "Craterhoof Behemoth", imageUri: "https://img/hoof.jpg" }],
  ]);
  const drawStages = (content: ReturnType<typeof checkedSynopsis>, contractVersion: number | undefined, a = art) =>
    render(
      <CardDetailProvider fetchCard={async () => null}>
        <HoverPreviewProvider>
          <SynopsisSections content={content} contractVersion={contractVersion} art={a} onRetry={null} busy={false} />
        </HoverPreviewProvider>
      </CardDetailProvider>,
    );

  it("pins the drawn labels to STAGE_LABELS", async () => {
    const { STAGE_LABELS } = await import("../../lib/synopsis/stages");
    expect([...synopsisCopy.modal.plan.stages]).toEqual([...STAGE_LABELS]);
  });

  it("draws Game plan with Early, Mid, Close by position, and not Core strategy", () => {
    drawStages(stage13(), 13);
    expect(screen.getByRole("heading", { name: "Game plan" })).toBeInTheDocument();
    expect(screen.queryByText("Core strategy")).toBeNull();
    const stages = screen.getAllByTestId("synopsis-stage");
    expect(stages.map((s) => ["Early", "Mid", "Close"].find((l) => s.textContent?.includes(l)))).toEqual(["Early", "Mid", "Close"]);
    // The lead card's image is the first mark's, and the third stage names none, so it has none.
    expect(within(stages[0]).getAllByTestId("synopsis-card-image")).toHaveLength(1);
    expect(within(stages[2]).queryAllByTestId("synopsis-card-image")).toHaveLength(0);
  });

  it("draws a 12 row exactly as before: Core strategy, the fixed range, no figure, no images", () => {
    drawStages(stage13({ lands: { keep: { low: 2, high: 4 }, sendBack: { none: 0, under: 1, over: 5 } } }), 12);
    expect(screen.getByRole("heading", { name: "Core strategy" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Game plan" })).toBeNull();
    expect(screen.getAllByTestId("synopsis-land-range")).toHaveLength(2);
    expect(screen.queryByTestId("synopsis-land-line")).toBeNull();
    expect(screen.queryAllByTestId("synopsis-card-image")).toHaveLength(0);
    expect(screen.queryAllByTestId("synopsis-severity")).toHaveLength(0);
  });

  it("falls back to the old shape for a 13 row without three stages, and for an unknown contract", () => {
    const short = stage13();
    short.primer!.strategy = ["One.", "Two."];
    drawStages(short, 13);
    expect(screen.getByRole("heading", { name: "Core strategy" })).toBeInTheDocument();
    drawStages(stage13(), undefined);
    expect(screen.getAllByRole("heading", { name: "Core strategy" })).toHaveLength(2);
  });

  it("draws the alternate commander box only when the content carries one", () => {
    drawStages(stage13(), 13);
    expect(screen.queryByTestId("synopsis-alternate")).toBeNull();
    expect(screen.queryByText("Alternate commander")).toBeNull();
    drawStages(stage13({ alternate: "[[Sol Ring]] is the other way in." }), 13);
    const box = screen.getByTestId("synopsis-alternate");
    expect(box).toHaveTextContent("Alternate commander");
    expect(box).toHaveTextContent("is the other way in.");
  });

  it("leads the land line with the one number it states, in place of the fixed range", () => {
    drawStages(stage13({ lands: { keep: { low: 2, high: 4 }, sendBack: { none: 0, under: 1, over: 5 } } }), 13);
    expect(screen.getByTestId("synopsis-land-figure")).toHaveTextContent("4lands");
    expect(screen.getByTestId("synopsis-land-line")).toHaveTextContent("4 lands suit a curve");
    expect(screen.queryAllByTestId("synopsis-land-range")).toHaveLength(0);
  });

  it("draws the land line without a figure when it states a range or no number", () => {
    drawStages(stage13({ landKeep: "3 or 4 lands suit this curve." }), 13);
    expect(screen.getByTestId("synopsis-land-line")).toHaveTextContent("3 or 4 lands suit this curve.");
    expect(screen.queryByTestId("synopsis-land-figure")).toBeNull();
  });

  it("falls back to the fixed range when a 13 row's land line failed its check", () => {
    drawStages(stage13({ landKeep: undefined, lands: { keep: { low: 2, high: 4 }, sendBack: { none: 0, under: 1, over: 5 } } }), 13);
    expect(screen.getAllByTestId("synopsis-land-range")).toHaveLength(2);
  });

  it("fans each tip's first two named cards", () => {
    drawStages(stage13(), 13);
    const tips = screen.getAllByTestId("synopsis-tip");
    expect(tips).toHaveLength(2);
    for (const tip of tips) expect(within(tip).getAllByTestId("synopsis-card-image")).toHaveLength(2);
  });

  it("draws a card with no art as its name alone, with no image", () => {
    drawStages(stage13(), 13, new Map());
    expect(screen.queryAllByTestId("synopsis-card-image")).toHaveLength(0);
    expect(screen.getAllByTestId("synopsis-card").length).toBeGreaterThan(0);
    expect(screen.getByTestId("synopsis-key-card")).toHaveTextContent("Sol Ring");
  });

  it("removes an image that fails to load rather than drawing it broken", () => {
    drawStages(stage13(), 13);
    const before = screen.getAllByTestId("synopsis-card-image").length;
    const img = screen.getAllByTestId("synopsis-card-image")[0].querySelector("img")!;
    fireEvent.error(img);
    expect(screen.getAllByTestId("synopsis-card-image")).toHaveLength(before - 1);
  });

  it("opens the card from its image, as from its name", async () => {
    const fetchCard = vi.fn(async () => null);
    render(
      <CardDetailProvider fetchCard={fetchCard}>
        <HoverPreviewProvider>
          <SynopsisSections content={stage13()} contractVersion={13} art={art} onRetry={null} busy={false} />
        </HoverPreviewProvider>
      </CardDetailProvider>,
    );
    fireEvent.click(within(screen.getAllByTestId("synopsis-stage")[0]).getByTestId("synopsis-card-image").querySelector("button")!);
    await waitFor(() => expect(fetchCard).toHaveBeenCalled());
  });

  it("splits a leading Moderate or Minor off a weakness as a chip", () => {
    drawStages(stage13(), 13);
    const chips = screen.getAllByTestId("synopsis-severity");
    expect(chips.map((c) => c.textContent)).toEqual(["Moderate", "Minor"]);
    expect(chips[0].className).toContain("--warning");
    expect(chips[1].className).not.toContain("--warning");
    expect(screen.queryByText(/Moderate:/)).toBeNull();
    expect(screen.getByText("Folds to a board wipe.")).toBeInTheDocument();
  });

  it("puts the commander image beside the Overview paragraph, from the paragraph's first card", () => {
    drawStages(stage13(), 13);
    const head = screen.getByTestId("synopsis-overview-head");
    expect(within(head).getAllByTestId("synopsis-card-image")).toHaveLength(1);
    expect(within(head).getByTestId("synopsis-card-image").querySelector("img")).toHaveAttribute("src", "https://img/sol.jpg");
  });
});
