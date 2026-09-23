import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { slotDeck } from "../../lib/bracket/slot";
import type { Bracket } from "../../lib/bracket/types";
import { declarationCopy } from "../../lib/copy/declaration";
import { COMMANDER, deckProfile, profileCard } from "./__fixtures__/deck-profile";
import { VerdictBlock } from "./verdict-block";

/** What a button says aloud: its text outside `aria-hidden` subtrees, where the mark's numeral is. */
const spoken = (el: HTMLElement): string => {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let out = "";
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.parentElement?.closest("[aria-hidden='true']")) out += n.textContent ?? "";
  }
  return out;
};

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
  extra: {
    version?: number | null;
    refused?: boolean;
    fresh?: boolean;
    previous?: { number: number; permits: Bracket[] | null; declared: Bracket | null } | null;
  } = {},
) {
  const profile = SHAPES[key]();
  const verdict = slotDeck(profile);
  expect(verdict.permits.join(",")).toBe(key);
  const onDeclare = vi.fn();
  render(
    <VerdictBlock analyzedAt={new Date().toISOString()}
      fresh={extra.fresh ?? true}
      verdict={verdict}
      profile={profile}
      declaration={{
        declared,
        version: extra.version ?? null,
        previous: extra.previous ?? null,
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
    expect(buttons.map(spoken)).toEqual(["Optimized", "cEDH"]);
    fireEvent.click(buttons[1]);
    expect(onDeclare).toHaveBeenCalledWith(5);
    // The face still asks: the range, and the split pill.
    expect(screen.getByText("Optimized or cEDH")).toBeTruthy();
    // The range draws both of its marks, and no pill (the Analysis tab handoff retires it).
    expect(screen.getAllByTestId("bracket-mark").map((m) => m.dataset.bracket).slice(0, 2)).toEqual(["4", "5"]);
  });

  it("asks on the low range too", () => {
    draw("1,2", null);
    expect(chips().getAllByRole("button").map(spoken)).toEqual(["Exhibition", "Core"]);
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

  // A refused CHANGE puts the previous answer back, so the notice has to draw beside the answer
  // too, or the reader sees their old choice return with no word about why.
  it("says so beside the answer when a change was refused", () => {
    draw("1,2", 1, { refused: true });
    expect(screen.getByRole("alert").textContent).toBe(declarationCopy.refused);
  });
});

describe("the answer", () => {
  // ANSWERING RESOLVES THE FACE: the answer's own name and chip, one mark, and the range moves
  // into the description line.
  it("resolves the face to the declared bracket and moves the range below it", () => {
    draw("4,5", 5);
    expect(screen.queryByText("Optimized or cEDH")).toBeNull();
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

  // A STALE range withholds its chips (§4.2): an unanswered one draws none, and an answered one
  // keeps its answer, whose `change` does nothing until the re-read.
  it("withholds a stale range's chips, and keeps an answer standing", () => {
    draw("4,5", null, { fresh: false });
    expect(screen.queryByRole("group")).toBeNull();
    cleanup();
    const { onDeclare } = draw("4,5", 4, { fresh: false });
    fireEvent.click(screen.getByRole("button", { name: declarationCopy.declared.change }));
    expect(screen.queryByRole("group")).toBeNull();
    expect(screen.getByRole("button", { name: declarationCopy.declared.change })).toBeTruthy();
    expect(onDeclare).not.toHaveBeenCalled();
  });

  // `change` re-asks the same range; it never clears the answer on its own.
  it("re-asks the same range when change is pressed", () => {
    const { onDeclare } = draw("4,5", 4);
    fireEvent.click(screen.getByRole("button", { name: declarationCopy.declared.change }));
    expect(chips().getAllByRole("button").map(spoken)).toEqual(["Optimized", "cEDH"]);
    expect(onDeclare).not.toHaveBeenCalled();
    // THE WHOLE READING RETURNS TO THE ASK: the range's face and split pill, not the answer's.
    expect(screen.getByText("Optimized or cEDH")).toBeTruthy();
    // The range draws both of its marks, and no pill (the Analysis tab handoff retires it).
    expect(screen.getAllByTestId("bracket-mark").map((m) => m.dataset.bracket).slice(0, 2)).toEqual(["4", "5"]);
    expect(screen.queryByText(declarationCopy.declared.permitsBelow([4, 5]))).toBeNull();
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

describe("a later version reads differently", () => {
  const sentence = () =>
    screen.getByText((_, el) => el?.tagName === "P" && /^This version /.test(el.textContent ?? ""))
      .textContent;

  // ONE SENTENCE, NO CONTROL: a single bracket READS AS, and the last version's answer is named.
  it("states both readings on a single bracket, and asks nothing", () => {
    draw("3", null, { version: 2, previous: { number: 1, permits: [4, 5], declared: 5 } });
    expect(sentence()).toBe(
      "This version reads as Upgraded. Version 1 read as Optimized or cEDH and was declared cEDH.",
    );
    expect(screen.queryByRole("group")).toBeNull();
    expect(screen.queryByRole("button", { name: /change/ })).toBeNull();
  });

  // A range PERMITS, and it is asked: this version has never answered its own question.
  it("says permits on a range, and the ask follows", () => {
    draw("4,5", null, { version: 2, previous: { number: 1, permits: [3], declared: null } });
    expect(sentence()).toBe("This version permits Optimized or cEDH. Version 1 read as Upgraded.");
    expect(chips().getAllByRole("button")).toHaveLength(2);
  });

  // PRECEDENCE: the row names the old answer and the new reading, so the draft's drift line
  // would say the same thing a second time. It is suppressed; the ask still follows.
  it("suppresses the drift line when the row is drawn", () => {
    draw("1,2", 4, { version: 2, previous: { number: 1, permits: [4, 5], declared: 4 } });
    expect(sentence()).toBe(
      "This version permits Exhibition or Core. Version 1 read as Optimized or cEDH and was declared Optimized.",
    );
    expect(screen.queryByText(declarationCopy.draftMovedOut.line(4))).toBeNull();
    expect(chips().getAllByRole("button")).toHaveLength(2);
  });

  // A range this version has ALREADY answered keeps its answer and `change` under the row.
  it("keeps this version's own answer under the row", () => {
    draw("4,5", 4, { version: 2, previous: { number: 1, permits: [3], declared: null } });
    expect(sentence()).toMatch(/^This version permits Optimized or cEDH\./);
    expect(screen.getByRole("button", { name: declarationCopy.declared.change })).toBeTruthy();
  });

  // THE SAME READING SAYS NOTHING, and a predecessor that recorded nothing cannot be compared.
  it("draws no row when the readings match or the last one is unrecorded", () => {
    draw("3", null, { version: 2, previous: { number: 1, permits: [3], declared: null } });
    expect(screen.queryByText(/^This version /)).toBeNull();
    cleanup();
    draw("3", null, { version: 2, previous: { number: 1, permits: null, declared: null } });
    expect(screen.queryByText(/^This version /)).toBeNull();
  });

  // The marks are decoration for the sentence: hidden from assistive technology, labelled for
  // the eye, with the arrow as time.
  it("draws version n, an arrow, and this version", () => {
    draw("3", null, { version: 2, previous: { number: 1, permits: [4, 5], declared: 5 } });
    const row = screen.getByText("version 1").closest("[aria-hidden='true']");
    expect(row).toBeTruthy();
    expect(row!.textContent).toContain("→");
    expect(row!.textContent).toContain("this version");
  });

  it("never quotes the player", () => {
    draw("1,2", 4, { version: 2, previous: { number: 1, permits: [4, 5], declared: 4 } });
    // THE ROW IS ON SCREEN FIRST, or the assertion below reads the drift line instead of it.
    expect(sentence()).toMatch(/^This version permits /);
    expect(document.body.textContent).not.toMatch(/\byou said\b|\byour (last )?changes\b|moved (this deck )?past/i);
  });
});
