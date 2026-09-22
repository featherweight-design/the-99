import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { slotDeck } from "../../lib/bracket/slot";
import type { Bracket } from "../../lib/bracket/types";
import { deckAnalysisCopy } from "../../lib/copy/deck-analysis";
import { declarationCopy } from "../../lib/copy/declaration";
import { COMMANDER, deckProfile, profileCard } from "./__fixtures__/deck-profile";
import { VerdictBlock } from "./verdict-block";

/**
 * The declaration inside the verdict block, drawn from REAL profiles through the REAL verdict.
 * The readings are a function of `permits` and the answer, and a hand-written verdict could hold
 * a range `permitsFor` never returns.
 */

const gc = (n: number) =>
  deckProfile({
    cards: [COMMANDER, ...Array.from({ length: n }, (_, i) => profileCard(`gc${i}`, `GC ${i}`))],
    gameChangerIds: new Set(Array.from({ length: n }, (_, i) => `gc${i}`)),
  });

/** `[1,2]` from a clean deck, `[3]` from one game changer, `[4,5]` from four. */
const SHAPES = { "1,2": () => deckProfile(), "3": () => gc(1), "4,5": () => gc(4) };

function draw(
  key: keyof typeof SHAPES,
  declared: Bracket | null,
  extra: { version?: number | null; refused?: boolean } = {},
) {
  const profile = SHAPES[key]();
  const verdict = slotDeck(profile);
  expect(verdict.permits.join(",")).toBe(key);
  const onDeclare = vi.fn();
  render(
    <VerdictBlock
      verdict={verdict}
      profile={profile}
      declaration={{
        declared,
        version: extra.version ?? null,
        onDeclare,
        refused: extra.refused ?? false,
      }}
    />,
  );
  return { onDeclare };
}

const chips = () => within(screen.getByRole("group", { name: declarationCopy.ask.groupAria }));

describe("the ask", () => {
  // TWO CHIPS ARE THE WHOLE CONTROL, one per bracket in the range, lower first, named alone.
  it("asks on an unanswered range, with one chip per bracket and nothing else", () => {
    const { onDeclare } = draw("4,5", null);
    expect(screen.getByText(declarationCopy.ask.lead)).toBeTruthy();
    const buttons = chips().getAllByRole("button");
    expect(buttons.map((b) => b.textContent)).toEqual(["Optimized", "cEDH"]);
    fireEvent.click(buttons[1]);
    expect(onDeclare).toHaveBeenCalledWith(5);
    // The face still asks: the range, and the split pill.
    expect(screen.getByText("Optimized or cEDH")).toBeTruthy();
    expect(screen.getByText(deckAnalysisCopy.verdict.splitChip)).toBeTruthy();
  });

  it("asks on the low range too", () => {
    draw("1,2", null);
    expect(chips().getAllByRole("button").map((b) => b.textContent)).toEqual(["Exhibition", "Core"]);
  });

  // THERE IS NO SKIP. No control on the surface may dismiss the question.
  it("offers no skip, and no third control", () => {
    draw("1,2", null);
    expect(screen.queryByRole("button", { name: /skip/i })).toBeNull();
    expect(chips().getAllByRole("button")).toHaveLength(2);
  });

  // A single bracket is not a question: no lead, no chips, no box.
  it("draws no declaration line on a single bracket", () => {
    draw("3", null);
    expect(screen.queryByText(declarationCopy.ask.lead)).toBeNull();
    expect(screen.queryByRole("group")).toBeNull();
  });

  it("says so when the write was refused", () => {
    draw("1,2", null, { refused: true });
    expect(screen.getByRole("alert").textContent).toBe(declarationCopy.refused);
  });
});

describe("the answer", () => {
  // ANSWERING RESOLVES THE FACE: the answer's own name and chip, one mark, and the range moves
  // into the description line.
  it("resolves the face to the declared bracket and moves the range below it", () => {
    draw("4,5", 5);
    expect(screen.queryByText("Optimized or cEDH")).toBeNull();
    expect(screen.queryByText(deckAnalysisCopy.verdict.splitChip)).toBeNull();
    expect(screen.getAllByTestId("bracket-mark").map((m) => m.dataset.bracket)).toEqual(["5"]);
    expect(screen.getByText(declarationCopy.declared.permitsBelow([4, 5]))).toBeTruthy();
    expect(screen.queryByRole("group")).toBeNull();
  });

  // The low pair differs by a card limit, so it must not borrow the top pair's sentence.
  it("says why the low pair is two, not the high pair's reason", () => {
    draw("1,2", 1);
    expect(screen.getByText(declarationCopy.declared.permitsBelow([1, 2]))).toBeTruthy();
    expect(screen.queryByText(/no card limits between them/)).toBeNull();
  });

  // `for version n` only when there is a version to name.
  it("names the version only when the deck is one", () => {
    draw("1,2", 2);
    expect(screen.getByText((_, el) => el?.tagName === "P" && el.textContent === "Declared Core. change")).toBeTruthy();
  });

  it("names the committed version it was made on", () => {
    draw("1,2", 2, { version: 3 });
    expect(
      screen.getByText((_, el) => el?.tagName === "P" && el.textContent === "Declared Core for version 3. change"),
    ).toBeTruthy();
  });

  // `change` re-asks the same range; it never clears the answer on its own.
  it("re-asks the same range when change is pressed", () => {
    const { onDeclare } = draw("4,5", 4);
    fireEvent.click(screen.getByRole("button", { name: declarationCopy.declared.change }));
    expect(chips().getAllByRole("button").map((b) => b.textContent)).toEqual(["Optimized", "cEDH"]);
    expect(onDeclare).not.toHaveBeenCalled();
  });
});

describe("the draft moved out", () => {
  // STATED, NOT DELETED, and then asked: the question changed.
  it("states the superseded answer and asks again on a range", () => {
    draw("1,2", 4);
    expect(screen.getByText(declarationCopy.draftMovedOut.line(4))).toBeTruthy();
    expect(chips().getAllByRole("button")).toHaveLength(2);
    // The face is the range's own: a declaration outside it resolves nothing.
    expect(screen.getByText("Exhibition or Core")).toBeTruthy();
    // The superseded mark is drawn faint beside the line.
    const marks = screen.getAllByTestId("bracket-mark").map((m) => m.dataset.bracket);
    expect(marks).toContain("4");
  });

  it("states it and asks nothing on a single bracket", () => {
    draw("3", 1);
    expect(screen.getByText(declarationCopy.draftMovedOut.line(1))).toBeTruthy();
    expect(screen.queryByRole("group")).toBeNull();
  });

  // No sentence on this surface quotes the player.
  it("never says you", () => {
    draw("1,2", 4);
    expect(document.body.textContent).not.toMatch(/\byou said\b|\byour changes\b/i);
  });
});
