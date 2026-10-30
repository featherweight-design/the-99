import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { suggestedChangesV2Copy } from "../../lib/copy/suggested-changes-v2";
import { bracketCard, noticedChips, type NoticedChip } from "../../lib/tuning/v2/intake";
import type { Bracket } from "../../lib/profile/types";
import { clampCount, SameRequestConfirm, SuggestedChangesIntake } from "./suggested-changes-intake";

vi.mock("../../app/cards/tag-actions", () => ({ searchTagCards: async () => [] }));

const copy = suggestedChangesV2Copy.intake;

const chips = noticedChips({
  roles: [{ role: "removal", label: "Removal", have: 6, target: 10, advisory: false }, { role: "draw", label: "Draw", have: 7, target: 10, advisory: false }],
  focus: "+1/+1 counters",
  game: { note: "ran out of cards by turn 7", date: "Oct 24" },
});

/** The intake as the panel holds it: every value in the caller's state. */
function Harness({ start = 3, permits = [2] as Bracket[], given = chips }: { start?: number; permits?: Bracket[]; given?: readonly NoticedChip[] }) {
  const [count, setCount] = useState(start);
  const [request, setRequest] = useState("");
  const [bracket, setBracket] = useState(0);
  return (
    <>
      <SuggestedChangesIntake
        count={count}
        onCount={setCount}
        request={request}
        onRequest={setRequest}
        chips={given}
        bracket={bracketCard(permits)}
        bracketIndex={bracket}
        onBracket={setBracket}
        restrictions={<p>kept box</p>}
      />
      <output data-testid="request">{request}</output>
    </>
  );
}

const box = () => document.getElementById("sc-request-field") as HTMLTextAreaElement;
const chip = (id: string) => document.querySelector(`[data-sc-chip="${id}"]`) as HTMLButtonElement;

describe("SuggestedChangesIntake", () => {
  it("draws the three numbered steps, the request box empty with its placeholder, and Keep chosen", () => {
    render(<Harness />);
    expect(screen.getByText(copy.lead)).toBeTruthy();
    expect([...document.querySelectorAll("[data-sc-step]")].map((s) => s.getAttribute("data-sc-step"))).toEqual(["1", "2", "3"]);
    expect(box().value).toBe("");
    expect(box().placeholder).toBe(copy.request.placeholder);
    expect(screen.getByText("kept box")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Keep at 2 · Core/ }).getAttribute("aria-pressed")).toBe("true");
    expect(document.querySelector("[data-sc-bracket-note]")!.textContent).toBe(copy.bracket.noteKeep(2, "Core"));
    // Nothing pre-selected: every chip offers +.
    expect(chips.every((c) => chip(c.id).getAttribute("aria-pressed") === "false")).toBe(true);
  });

  it("steps from 1 to 20 and no further, greying the end it reached", () => {
    render(<Harness start={1} />);
    const fewer = screen.getByRole("button", { name: copy.count.fewer });
    const more = screen.getByRole("button", { name: copy.count.more });
    expect(fewer.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(fewer);
    expect((screen.getByRole("textbox", { name: copy.count.countLabel }) as HTMLInputElement).value).toBe("1");
    fireEvent.click(more);
    expect(screen.getByText(copy.count.line(2, 3).slice(0, copy.count.line(2, 3).indexOf(". ") + 1))).toBeTruthy();
    expect(screen.getByText(new RegExp(copy.count.range))).toBeTruthy();
    // A typed figure past the top lands on 20.
    const field = screen.getByRole("textbox", { name: copy.count.countLabel });
    fireEvent.change(field, { target: { value: "25" } });
    fireEvent.blur(field);
    expect((field as HTMLInputElement).value).toBe("20");
    expect(more.getAttribute("aria-disabled")).toBe("true");
    expect(screen.getByText(new RegExp(copy.count.atMax))).toBeTruthy();
    fireEvent.click(more);
    expect((field as HTMLInputElement).value).toBe("20");
  });

  it("clamps any count into 1 to 20", () => {
    expect([0, 1, 7, 20, 21, Number.NaN].map(clampCount)).toEqual([1, 1, 7, 20, 20, 1]);
  });

  it("appends a chip's sentence at the end, ticks it while its words are there, and gives it back when they leave", async () => {
    render(<Harness />);
    fireEvent.change(box(), { target: { value: "Cut the legends.", selectionStart: 16 } });
    const removal = chips[0];
    await act(async () => { fireEvent.click(chip(removal.id)); });
    expect(screen.getByTestId("request").textContent).toBe(`Cut the legends. ${removal.sentence}`);
    expect(chip(removal.id).getAttribute("aria-pressed")).toBe("true");
    // The appended words are selected for a beat, and the chip wears the ring for the same beat.
    expect(chip(removal.id).hasAttribute("data-hot")).toBe(true);
    expect(box().selectionStart).toBe(box().value.length - removal.sentence.length);
    expect(box().selectionEnd).toBe(box().value.length);
    // A chip only tracks its own words: the focus chip is still +.
    expect(chip("focus").getAttribute("aria-pressed")).toBe("false");
    // A second press on a ticked chip takes its sentence back out, and the player's own words stay as written.
    await act(async () => { fireEvent.click(chip(removal.id)); });
    expect(screen.getByTestId("request").textContent).toBe("Cut the legends.");
    expect(chip(removal.id).getAttribute("aria-pressed")).toBe("false");
    // Pressed again, it goes back in; the player deleting the sentence by hand also brings the chip back to +.
    await act(async () => { fireEvent.click(chip(removal.id)); });
    expect(chip(removal.id).getAttribute("aria-pressed")).toBe("true");
    fireEvent.change(box(), { target: { value: "Cut the legends.", selectionStart: 16 } });
    expect(chip(removal.id).getAttribute("aria-pressed")).toBe("false");
  });

  it("gives the request box's frame its accent edge on focus: a class, never an inline border that would outrank it", () => {
    render(<Harness />);
    const frame = document.querySelector("[data-framed-box]") as HTMLElement;
    expect(frame.className).toContain("focus-within:border-[color:var(--accent)]");
    expect(frame.style.border).toBe("");
    expect(frame.style.borderColor).toBe("");
  });

  it("draws no What we noticed block when there is nothing to say", () => {
    render(<Harness given={[]} />);
    expect(document.querySelector("[data-sc-noticed]")).toBeNull();
    expect(screen.queryByText(copy.noticed.head)).toBeNull();
  });

  it("says what each bracket choice does as it is picked", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: /Up to 3 · Upgraded/ }));
    expect(screen.getByRole("button", { name: /Up to 3 · Upgraded/ }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: /Keep at 2 · Core/ }).getAttribute("aria-pressed")).toBe("false");
    expect(document.querySelector("[data-sc-bracket-note]")!.textContent).toBe(copy.bracket.noteUp(3, "Upgraded"));
    fireEvent.click(screen.getByRole("button", { name: /Down to 1 · Exhibition/ }));
    expect(document.querySelector("[data-sc-bracket-note]")!.textContent).toBe(copy.bracket.noteDown(1, "Exhibition"));
  });
});

describe("SameRequestConfirm: what a new run costs (2 credits for more than 10 changes)", () => {
  const at = "2026-10-26T15:00:00.000Z";
  it("10 or fewer: a credit", () => {
    const { container, unmount } = render(<SameRequestConfirm at={at} count={10} onAgain={() => {}} onOpen={null} />);
    expect(container.textContent).toContain("A new run uses a credit");
    expect(container.textContent).not.toContain("2 credits");
    unmount();
  });
  it("more than 10: 2 credits", () => {
    const { container, unmount } = render(<SameRequestConfirm at={at} count={11} onAgain={() => {}} onOpen={null} />);
    expect(container.textContent).toContain("A new run uses 2 credits");
    unmount();
  });
});
