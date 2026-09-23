import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { ComboClause, comboClauseSpoken } from "./combo-clause";
import { comboAwarenessCopy } from "../../lib/copy/combo-awareness";

describe("ComboClause", () => {
  // `completes` DRAWS THE GLYPH AND THE NAME, AND NO WORDS (Hugh, 2026-09-22). The drawn
  // text is exactly the name — `completes with` truncated ahead of it on every host.
  it("draws the glyph and the partner's name, with no words before it", () => {
    render(<ComboClause partnerName="Isochron Scepter" state="completes" />);
    expect(screen.getByTestId("combo-glyph")).toBeInTheDocument();
    const drawn = [...screen.getByTestId("combo-clause").querySelectorAll("span")].filter(
      (el) => !el.classList.contains("sr-only"),
    );
    expect(drawn.map((el) => el.textContent)).toEqual(["Isochron Scepter"]);
  });

  // AND THE EAR STILL HEARS THE SENTENCE. A bare name says nothing about a combo, and the
  // Consider tile reads the clause as content rather than composing it into a label — so the
  // drawn name is hidden and the spoken sentence stands in for it.
  it("speaks the whole sentence in place of the bare name", () => {
    render(<ComboClause partnerName="Isochron Scepter" state="completes" />);
    const clause = screen.getByTestId("combo-clause");
    const sr = clause.querySelector(".sr-only");
    expect(sr?.textContent).toBe(comboClauseSpoken("Isochron Scepter", "completes"));
    const drawn = [...clause.querySelectorAll("span")].find((el) => el.textContent === "Isochron Scepter");
    expect(drawn).toHaveAttribute("aria-hidden", "true");
  });



  // THE GLYPH IS HIDDEN AND THE CLAUSE IS INERT. What a screen reader hears is the sentence,
  // composed into the host's accessible name — so the glyph must not speak, and this must not
  // be a target.
  it("hides the glyph and offers nothing to press", () => {
    render(<ComboClause partnerName="Thassa's Oracle" state="ownBoth" />);
    expect(screen.getByTestId("combo-glyph")).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  // NO COUNT, ANYWHERE. Detection excludes template-gated variants by design, so a number
  // beside this sentence would be the first thing on the surface that is not true.
  //
  // Asserted as "nothing but the sentence" rather than "no digits": a card name may contain
  // one — `1996 World Champion` is a real card — so a digit sweep would fail on a legitimate
  // partner while still passing a `· 4` appended to a name that happens to have none.
  it("prints the name and nothing appended to it", () => {
    render(<ComboClause partnerName="Grim Monolith" state="completes" />);
    const drawn = [...screen.getByTestId("combo-clause").querySelectorAll("span")].filter(
      (el) => !el.classList.contains("sr-only"),
    );
    expect(drawn.map((el) => el.textContent).join("")).toBe("Grim Monolith");
  });

  it("appends nothing to a partner whose name carries a digit", () => {
    render(<ComboClause partnerName="1996 World Champion" state="ownBoth" />);
    expect(screen.getByTestId("combo-clause").textContent).toBe(
      comboAwarenessCopy.clause.ownBoth("1996 World Champion"),
    );
  });

  // THE NAME TRUNCATES, and only when it alone cannot fit — there is nothing else left on the
  // line to give way first.
  it("lets the name truncate in its cell", () => {
    render(<ComboClause partnerName="Isochron Scepter" state="completes" />);
    const name = [...screen.getByTestId("combo-clause").querySelectorAll("span")].find(
      (el) => el.textContent === "Isochron Scepter",
    );
    expect(name!.className).toMatch(/\btruncate\b/);
    expect(name!.className).toMatch(/\bmin-w-0\b/);
  });

  // THE CLAUSE IS CAPPED AT ITS PARENT, or none of the above ever runs. Two of its three hosts
  // put it in a BLOCK parent, where an inline-level box sizes to at least its min-content —
  // and for text that cannot wrap that is the whole sentence, so nothing shrank and the clause
  // ran into its neighbours (24px into the top-off row's figures at 390, measured). jsdom lays
  // nothing out, so this pins the cap and the browser numbers in #870 prove it.
  it("caps itself at its parent's width, whatever the host's display", () => {
    render(<ComboClause partnerName="Thassa's Oracle" state="completes" />);
    expect(screen.getByTestId("combo-clause").className).toMatch(/\bmax-w-full\b/);
  });

  // `ownBoth` NEEDS NONE OF IT: its name sits mid-sentence and the tail is what
  // end-truncation eats first, which is already the rule. Splitting it would be ceremony.
  it("leaves the own-both sentence whole", () => {
    render(<ComboClause partnerName="Demonic Consultation" state="ownBoth" />);
    const clause = screen.getByTestId("combo-clause");
    expect(
      [...clause.querySelectorAll("span")].some(
        (el) => el.textContent === "Demonic Consultation",
      ),
      "own-both was split too",
    ).toBe(false);
  });

  it("speaks the state rather than the glyph", () => {
    expect(comboClauseSpoken("Kiki-Jiki", "completes")).toBe(
      comboAwarenessCopy.a11y.completes("Kiki-Jiki"),
    );
    expect(comboClauseSpoken("Kiki-Jiki", "ownBoth")).toBe(
      comboAwarenessCopy.a11y.ownBoth("Kiki-Jiki"),
    );
  });
});

// THE GLYPH'S HOVER (Hugh, 2026-09-22): the clause draws no words, so the lemniscate carries the
// tooltip every other mark has — through `FactTooltip`, on a fine pointer only.
describe("ComboClause — the lemniscate's tooltip", () => {
  afterEach(() => vi.unstubAllGlobals());
  const stubPointer = (fine: boolean) =>
    vi.stubGlobal("matchMedia", (q: string) => ({
      matches: q.includes("pointer: fine") ? fine : false,
      media: q,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));

  it("names the combo on hover with a fine pointer", async () => {
    stubPointer(true);
    render(<ComboClause partnerName="Lithoform Engine" state="completes" />);
    fireEvent.pointerEnter(screen.getByTestId("combo-glyph"));
    await waitFor(() =>
      expect(
        screen.getByText(comboAwarenessCopy.markerTooltip.completes("Lithoform Engine")),
      ).toBeTruthy(),
    );
  });

  // NOT ON TOUCH. Hugh ruled the symbol sufficient on a phone, and a hover that needs a tap is
  // a control the reader did not ask for.
  it("has no tooltip at all on a coarse pointer", async () => {
    stubPointer(false);
    render(<ComboClause partnerName="Lithoform Engine" state="completes" />);
    fireEvent.pointerEnter(screen.getByTestId("combo-glyph"));
    await new Promise((r) => setTimeout(r, 400));
    expect(
      screen.queryByText(comboAwarenessCopy.markerTooltip.completes("Lithoform Engine")),
    ).toBeNull();
  });
});
