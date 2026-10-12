import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CardDetailProvider } from "../cards/card-detail-provider";
import { emptyParams } from "../../lib/intake/params";
import { answerChips } from "../../lib/intake/present";
import type { CardChip } from "../../lib/intake/rows";
import { ReadAsBar } from "./read-as-bar";

const CARD = "0000aaaa-0000-4000-8000-000000000001";
const labels = { theme: (s: string) => ({ dinosaurs: "Dinosaurs" })[s] ?? s, card: "Regisaur Alpha" };
const chip = (over: Partial<CardChip> = {}): CardChip => ({
  oracleId: CARD, name: "Regisaur Alpha", imageUri: "https://img.test/regisaur.jpg", owned: false, held: null, price: { kind: "priced", cents: 110 }, ...over,
});

function bar(props: { card?: CardChip | null; words?: string; empty?: boolean } = {}) {
  const p = props.empty
    ? emptyParams()
    : { ...emptyParams(), colors: ["r", "g"], match: "exactly" as const, themes: ["dinosaurs"], card: CARD, budgetDollars: 150, bracket: 2 as const };
  return render(
    <CardDetailProvider fetchCard={vi.fn()}>
      <ReadAsBar
        chips={answerChips(p, labels)}
        card={props.card === undefined ? chip() : props.card}
        words={props.words}
        changeHref="/decks/new/choose?t=dinosaurs"
        startOverHref="/decks/new/choose"
      />
    </CardDetailProvider>,
  );
}

describe("Your answers", () => {
  it("draws one read-only chip per answer, in the form's order", () => {
    bar();
    const chips = screen.getAllByTestId("answer-chip").map((c) => c.textContent);
    expect(chips).toEqual([
      "exactlyRed · Green",
      "themeDinosaurs",
      expect.stringMatching(/^cardRegisaur Alpha/),
      "budget$150",
      "bracket2 · Core",
    ]);
    // Read only (H1): the card's name is the one control among them.
    expect(within(screen.getByRole("region")).getAllByRole("button")).toHaveLength(1);
  });

  it("heads the answers Your answers, and draws every chip solid, with no deeper mark (T1)", () => {
    bar();
    expect(screen.getByRole("heading", { name: "Your answers" })).toBeTruthy();
    for (const c of screen.getAllByTestId("answer-chip")) {
      expect(c.className).toContain("border-solid");
      expect(c.className).not.toContain("border-dashed");
      expect(c.textContent).not.toContain("deeper");
    }
  });

  it("opens the card from the card chip's name, and prices an unowned card on its buy tag", () => {
    bar();
    expect(screen.getByTestId("card-chip-name").textContent).toBe("Regisaur Alpha");
    expect(screen.getAllByTestId("answer-chip")[2].textContent).toContain("$1.10");
  });

  it("says a card with no live price has none, never $0", () => {
    bar({ card: chip({ price: { kind: "absent" } }) });
    expect(screen.getByTestId("card-chip-no-price").textContent).toBe("buy·no price");
    expect(screen.getAllByTestId("answer-chip")[2].textContent).not.toContain("$0");
  });

  it("marks an owned card with the ownership dot and no tag", () => {
    bar({ card: chip({ owned: true }) });
    expect(screen.queryByTestId("card-chip-no-price")).toBeNull();
    expect(screen.getAllByTestId("answer-chip")[2].textContent).not.toContain("buy");
  });

  it("marks an owned card whose every copy is held as held, never free, since the fill buys it", () => {
    bar({ card: chip({ owned: true, held: { deck: "Atraxa" } }) });
    expect(screen.getByTestId("card-chip-held").textContent).toBe("none free, in Atraxa");
  });

  it("quotes what the player wrote under You wrote, in curly quotes, and draws no Not used", () => {
    bar({ words: "  something scary and a little nasty  " });
    const wrote = screen.getByTestId("you-wrote");
    expect(wrote.textContent).toBe("You wrote“something scary and a little nasty”");
    expect(wrote.className).toContain("border-t");
    expect(wrote.querySelectorAll("q")).toHaveLength(0);
    expect(screen.queryByTestId("not-used")).toBeNull();
  });

  it("draws no You wrote block with no words, or only spaces", () => {
    bar({});
    expect(screen.queryByTestId("you-wrote")).toBeNull();
    bar({ words: "   " });
    expect(screen.queryByTestId("you-wrote")).toBeNull();
  });

  it("says no answers were given, and still offers both ways back", () => {
    bar({ empty: true, card: null });
    expect(screen.getByText("No answers given: every commander you haven’t built")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Change answers" }).getAttribute("href")).toBe("/decks/new/choose?t=dinosaurs");
    expect(screen.getByRole("link", { name: "Start over" }).getAttribute("href")).toBe("/decks/new/choose");
  });

  it("says no answers were given beside words, which are never answers", () => {
    bar({ empty: true, card: null, words: "something scary" });
    expect(screen.getByText("No answers given: every commander you haven’t built")).toBeTruthy();
    expect(screen.getByTestId("you-wrote")).toBeTruthy();
  });
});

describe("an any-of chip", () => {
  it("draws the names with or between them, and speaks the group whole", () => {
    const tribes = { theme: (s: string) => s[0].toUpperCase() + s.slice(1), card: null };
    const p = { ...emptyParams(), themes: ["orcs", "elves", "wizards"], themeJoin: "any" as const };
    render(
      <CardDetailProvider fetchCard={vi.fn()}>
        <ReadAsBar chips={answerChips(p, tribes)} card={null} changeHref="/x" startOverHref="/y" />
      </CardDetailProvider>,
    );
    const [only] = screen.getAllByTestId("answer-chip");
    const names = within(only).getByTestId("any-of-names");
    expect(within(names).getByText("Orcs, Elves or Wizards").className).toContain("sr-only");
    // Spoken once: the kind, then the names, with nothing else read.
    expect(only.textContent?.replace(names.querySelector("[aria-hidden]")!.textContent!, "")).toBe("any ofOrcs, Elves or Wizards");
    expect(names.querySelector("[aria-hidden]")?.textContent).toBe("Orcs or Elves or Wizards");
    expect(only.textContent?.startsWith("any of")).toBe(true);
  });
});

describe("a printed-in chip", () => {
  it("draws the codes with or between them, and speaks the sets by name", () => {
    const labels2 = { theme: (s: string) => s, card: null, set: (c: string) => ({ hob: "The Hobbit", hoc: "The Hobbit Commander" })[c] ?? c };
    const p = { ...emptyParams(), sets: ["hob", "hoc"] };
    render(
      <CardDetailProvider fetchCard={vi.fn()}>
        <ReadAsBar chips={answerChips(p, labels2)} card={null} changeHref="/x" startOverHref="/y" />
      </CardDetailProvider>,
    );
    const [only] = screen.getAllByTestId("answer-chip");
    const codes = within(only).getByTestId("printed-in-codes");
    expect(codes.querySelector("[aria-hidden]")?.textContent).toBe("HOB or HOC");
    expect(within(codes).getByText("The Hobbit or The Hobbit Commander").className).toContain("sr-only");
  });
});

describe("the card chip's hover preview", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: (query: string) => ({ matches: query === "(hover: hover)", media: query, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {} }),
    });
  });
  afterEach(() => { vi.useRealTimers(); });

  it("previews the card's own art when the pointer rests on its name", () => {
    bar();
    fireEvent.mouseEnter(screen.getByTestId("card-chip-name"), { clientX: 10, clientY: 10 });
    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.getByTestId("hover-preview").getAttribute("style")).toContain("https://img.test/regisaur.jpg");
  });
});
