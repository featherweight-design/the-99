import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CardDetailProvider } from "../cards/card-detail-provider";
import { emptyParams } from "../../lib/intake/params";
import { answerChips } from "../../lib/intake/present";
import type { CardChip } from "../../lib/intake/rows";
import { ReadAsBar } from "./read-as-bar";

const CARD = "0000aaaa-0000-4000-8000-000000000001";
const labels = { theme: (s: string) => ({ dinosaurs: "Dinosaurs" })[s] ?? s, card: "Regisaur Alpha" };
const chip = (over: Partial<CardChip> = {}): CardChip => ({
  oracleId: CARD, name: "Regisaur Alpha", owned: false, price: { kind: "priced", cents: 110 }, ...over,
});

function bar(props: { card?: CardChip | null; notUsed?: string[]; empty?: boolean } = {}) {
  const p = props.empty
    ? emptyParams()
    : { ...emptyParams(), colors: ["r", "g"], match: "exactly" as const, themes: ["dinosaurs"], card: CARD, budgetDollars: 150, bracket: 2 as const };
  return render(
    <CardDetailProvider fetchCard={vi.fn()}>
      <ReadAsBar
        chips={answerChips(p, labels)}
        card={props.card === undefined ? chip() : props.card}
        notUsed={props.notUsed ?? []}
        changeHref="/decks/new/choose?t=dinosaurs"
        startOverHref="/decks/new/choose"
      />
    </CardDetailProvider>,
  );
}

describe("We read this as", () => {
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

  it("draws the deeper look's chips after every free-match chip", () => {
    const p = { ...emptyParams(), themes: ["tokens", "dinosaurs"], budgetDollars: 150 };
    render(
      <CardDetailProvider fetchCard={vi.fn()}>
        <ReadAsBar chips={answerChips(p, labels, ["t:tokens"])} card={null} notUsed={[]} changeHref="/x" startOverHref="/y" />
      </CardDetailProvider>,
    );
    const chips = screen.getAllByTestId("answer-chip");
    expect(chips.map((c) => c.textContent)).toEqual(["themeDinosaurs", "budget$150", "themetokensdeeper"]);
    expect(chips[2].dataset.deeper).toBe("true");
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

  it("quotes Not used as phrases, apart from the chips, and only when there are any", () => {
    bar({ notUsed: ["that stomp", "$200"] });
    const line = screen.getByTestId("not-used");
    // The quotes are the text's own: a `q` element's are the browser's to draw, or not.
    expect(line.textContent).toBe("Not used“that stomp”“$200”");
    expect(line.querySelectorAll("q")).toHaveLength(0);
    expect(screen.getAllByTestId("not-used-phrase")[0].className).toContain("border-dotted");
    bar({});
    expect(screen.getAllByTestId("not-used")).toHaveLength(1);
  });

  it("says no answers were given, and still offers both ways back", () => {
    bar({ empty: true, card: null });
    expect(screen.getByText("No answers given")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Change answers" }).getAttribute("href")).toBe("/decks/new/choose?t=dinosaurs");
    expect(screen.getByRole("link", { name: "Start over" }).getAttribute("href")).toBe("/decks/new/choose");
  });

  it("does not say no answers were given beside words it could not use", () => {
    bar({ empty: true, card: null, notUsed: ["that stomp"] });
    expect(screen.queryByText("No answers given")).toBeNull();
    expect(screen.getByTestId("not-used")).toBeTruthy();
  });
});
