import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ComboClause, comboClauseSpoken } from "./combo-clause";
import { comboAwarenessCopy } from "../../lib/copy/combo-awareness";

describe("ComboClause", () => {
  it("draws the glyph and the sentence, and names the partner", () => {
    render(<ComboClause partnerName="Isochron Scepter" state="completes" />);
    expect(screen.getByTestId("combo-glyph")).toBeInTheDocument();
    expect(screen.getByTestId("combo-clause")).toHaveTextContent(
      comboAwarenessCopy.clause.completes("Isochron Scepter"),
    );
  });

  // THE APP'S WORDS SHORTEN, THE CARD'S NAME DOES NOT. `short` is the host's call — it is a
  // question about that host's width — and it may only ever drop the app's own words.
  it("shortens the app's words and never the card's name", () => {
    const { rerender } = render(<ComboClause partnerName="Demonic Consultation" state="ownBoth" />);
    expect(screen.getByTestId("combo-clause")).toHaveTextContent("with Demonic Consultation — you own both");

    rerender(<ComboClause partnerName="Demonic Consultation" state="ownBoth" short />);
    const clause = screen.getByTestId("combo-clause");
    expect(clause).toHaveTextContent("with Demonic Consultation — both yours");
    expect(clause.textContent).toContain("Demonic Consultation");
  });

  // `short` IS ABOUT STATE 1 ONLY. States 2 and 3 have no shortened form — the sentence is
  // already three words and a name — so the flag must not silently change them.
  it("ignores the short flag on a completes clause", () => {
    render(<ComboClause partnerName="Basalt Monolith" state="completes" short />);
    expect(screen.getByTestId("combo-clause")).toHaveTextContent(
      comboAwarenessCopy.clause.completes("Basalt Monolith"),
    );
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
  it("prints the sentence and nothing appended to it", () => {
    render(<ComboClause partnerName="Grim Monolith" state="completes" />);
    expect(screen.getByTestId("combo-clause").textContent).toBe(
      comboAwarenessCopy.clause.completes("Grim Monolith"),
    );
  });

  it("appends nothing to a partner whose name carries a digit", () => {
    render(<ComboClause partnerName="1996 World Champion" state="ownBoth" />);
    expect(screen.getByTestId("combo-clause").textContent).toBe(
      comboAwarenessCopy.clause.ownBoth("1996 World Champion"),
    );
  });

  // THE NAME AND THE APP'S WORDS SHRINK AT DIFFERENT PRIORITIES on `completes`, because the
  // name is at the END of that sentence and plain end-truncation would eat exactly the word a
  // reader cannot reconstruct. Asserted structurally — jsdom lays nothing out, so the shrink
  // itself is a browser fact — but the SPLIT is real markup and a build that stopped splitting
  // would silently go back to truncating the name first.
  it("splits the completes sentence so the app's words give way first", () => {
    render(<ComboClause partnerName="Isochron Scepter" state="completes" />);
    const clause = screen.getByTestId("combo-clause");
    const lead = [...clause.querySelectorAll("span")].find(
      (el) => el.textContent === comboAwarenessCopy.clause.completesLead,
    );
    const name = [...clause.querySelectorAll("span")].find(
      (el) => el.textContent === "Isochron Scepter",
    );
    expect(lead, "the app's words are not their own element").toBeTruthy();
    expect(name, "the partner name is not its own element").toBeTruthy();
    // The lead gives way first; both truncate, so neither can overflow its host.
    expect(lead!.className).toContain("shrink-[999]");
    expect(name!.className).not.toContain("shrink-[999]");
    expect(name!.className).toContain("truncate");
    // And the sentence still reads as one.
    expect(clause).toHaveTextContent(comboAwarenessCopy.clause.completes("Isochron Scepter"));
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
