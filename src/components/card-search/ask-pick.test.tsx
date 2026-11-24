import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DeckPick, ToolCardModel } from "../../lib/discovery/showcase";
import { askCopy } from "../../lib/copy/card-search";
import { DeckPicker, picksOf, toolWhere } from "./ask-results";

// The deck picker (R12 Q21, G28): several fitting decks replace the answers in the same box, most recently touched first.
vi.mock("next/link", () => ({ default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a> }));

const pick = (id: string, name: string, touched: string): DeckPick => ({
  id, name, commander: `${name} cmdr`, art: `https://img/${id}.jpg`, touched, verb: "edited", href: `/decks/${id}?tool=top-off`,
});
const NOW = Date.parse("2026-11-23T12:00:00.000Z");
const PICKS = [pick("d1", "Gishath", new Date(NOW - 3 * 3600_000).toISOString()), pick("d2", "Atraxa", new Date(NOW - 3 * 86_400_000).toISOString())];
const tool = (state: ToolCardModel["state"]): ToolCardModel =>
  ({ id: "top-off", copy: { name: "Top off a deck", line: "Fills the last slots." }, credit: null, state }) as unknown as ToolCardModel;
const several = tool({ kind: "deck", href: "/decks/d1?tool=top-off", deck: "Gishath", more: 1, picks: PICKS });

describe("picksOf and the foot", () => {
  it("offers the picker only when several fit and the read carried the decks", () => {
    expect(picksOf(several)).toEqual(PICKS);
    expect(picksOf(tool({ kind: "deck", href: "/decks/d1", deck: "Gishath", more: 0 }))).toBeNull();
    // The offline answer knows the count but not the decks: it keeps the old foot and goes to the first deck.
    expect(picksOf(tool({ kind: "deck", href: "/decks/d1", deck: "Gishath", more: 1 }))).toBeNull();
  });

  it("reads `Pick a deck · n can use it` for several, the deck's own line for one", () => {
    expect(toolWhere(several)).toBe("Pick a deck · 2 can use it");
    expect(toolWhere(tool({ kind: "deck", href: "/decks/d1", deck: "Gishath", more: 0 }))).not.toContain("Pick a deck");
  });
});

describe("DeckPicker", () => {
  // The picker reads its clock once when it opens: pinned, so "3h ago" is 3h before it.
  beforeEach(() => vi.useFakeTimers({ toFake: ["Date"], now: NOW }));
  afterEach(() => vi.useRealTimers());

  const draw = (over: Partial<Parameters<typeof DeckPicker>[0]> = {}) => {
    const onBack = vi.fn();
    const onPick = vi.fn();
    render(<DeckPicker tool={several} picks={PICKS} listboxId="lb" active={0} opening={null} onBack={onBack} onPick={onPick} {...over} />);
    return { onBack, onPick };
  };

  it("draws the line, the heading and one option per deck, in the order given", () => {
    draw();
    expect(screen.getByRole("group", { name: askCopy.pick.aria("Top off a deck") })).toBeTruthy();
    expect(screen.getByText(askCopy.pick.line(2))).toBeTruthy();
    expect(screen.getByText(askCopy.pick.heading)).toBeTruthy();
    const options = screen.getAllByRole("option");
    expect(options.map((o) => o.id)).toEqual(["lb-0", "lb-1"]);
    expect(options[0]!.getAttribute("aria-selected")).toBe("true");
    expect(options[1]!.getAttribute("aria-selected")).toBe("false");
    expect(options[0]!.textContent).toContain("Gishath");
    expect(options[0]!.textContent).toContain("Gishath cmdr · edited 3h ago");
  });

  it("presses a deck with its place, and Back with no deck", () => {
    const { onBack, onPick } = draw();
    fireEvent.click(screen.getAllByRole("option")[1]!);
    expect(onPick).toHaveBeenCalledWith(PICKS[1], 1);
    fireEvent.click(screen.getByRole("button", { name: /Answers/ }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it("rings the opening deck, dims the other and holds Back while a page loads", () => {
    draw({ opening: "d2" });
    const [first, second] = screen.getAllByRole("option");
    expect(second!.hasAttribute("data-ask-pending")).toBe(true);
    expect(second!.textContent).toContain(askCopy.opening("Top off a deck"));
    expect(first!.hasAttribute("data-ask-pending")).toBe(false);
    expect((screen.getByRole("button", { name: /Answers/ }) as HTMLButtonElement).disabled).toBe(true);
  });
});
