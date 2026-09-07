import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ROLE_TARGETS } from "../../lib/recs/roles";
import { WhySection } from "./why-section";

const PROSE =
  "Kess decks tend to cast the same few spells twice, leaning on cheap draw and graveyard value rather than one combo line.";

// Every role at or past its target, so the gap sentence is absent unless a test says otherwise.
const AT_BASELINE = { ...ROLE_TARGETS };

function renderSection(props: Partial<Parameters<typeof WhySection>[0]> = {}) {
  return render(
    <WhySection
      prose={PROSE}
      edhrecOwnedCount={40}
      edhrecTotal={100}
      roleCounts={AT_BASELINE}
      width="desktop"
      {...props}
    />,
  );
}

describe("WhySection", () => {
  it("prints the stored sentence and the standing sentence together", () => {
    renderSection();
    expect(screen.getByRole("heading", { name: "Why this commander" })).toBeInTheDocument();
    expect(screen.getByText(/Kess decks tend to cast/)).toBeInTheDocument();
    expect(screen.getByText(/cards most played with this commander/)).toBeInTheDocument();
  });

  // State 2 — a failed generation is a null, and a null is a state the design draws.
  // No note, no skeleton, no apology for the missing sentence.
  it("keeps the templated sentences when there is no stored prose", () => {
    renderSection({ prose: null });
    expect(screen.getByRole("heading", { name: "Why this commander" })).toBeInTheDocument();
    expect(screen.queryByText(/Kess decks tend to cast/)).toBeNull();
    expect(screen.getByText(/cards most played with this commander/)).toBeInTheDocument();
  });

  // State 3 — a commander EDHREC does not index has no standing figures to quote.
  it("prints the stored sentence alone when there are no per-user figures", () => {
    renderSection({ edhrecOwnedCount: null, edhrecTotal: null });
    expect(screen.getByText(/Kess decks tend to cast/)).toBeInTheDocument();
    expect(screen.queryByText(/cards most played with this commander/)).toBeNull();
  });

  // State 4 — the heading would be a promise the paragraph does not keep.
  it("unmounts entirely, heading included, when it has nothing to say", () => {
    renderSection({ prose: null, edhrecOwnedCount: null, edhrecTotal: null });
    expect(screen.queryByRole("heading", { name: "Why this commander" })).toBeNull();
  });

  it("omits the gap sentence when every role is at its baseline", () => {
    renderSection();
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryByText(/where you are thinnest/)).toBeNull();
  });

  // The targets are unequal, so the largest absolute gap is the wrong answer: two draws
  // short of ten is a bigger number and a smaller problem than two wipes short of three.
  it("names the proportionally thinnest role and links to its panel", () => {
    renderSection({ roleCounts: { ramp: 8, draw: 8, removal: 6, wipes: 1 } });
    expect(screen.getByText(/Board wipes are where you are thinnest/)).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Jump to Board wipes" });
    expect(link).toHaveAttribute("href", "#role-desktop-wipes");
    expect(link).toHaveTextContent("one owned against a three-source baseline");
  });

  // Three of the four subjects are mass nouns. The subject map fixed "board wipe are";
  // the verb is the half of that disagreement it could not reach.
  it("agrees the verb with a role that is not a count noun", () => {
    renderSection({ roleCounts: { ramp: 1, draw: 8, removal: 6, wipes: 3 } });
    expect(screen.getByText(/Ramp is where you are thinnest/)).toBeInTheDocument();
  });

  it("points the link at the panel for its own width", () => {
    renderSection({ roleCounts: { ramp: 8, draw: 8, removal: 6, wipes: 1 }, width: "phone" });
    expect(screen.getByRole("link", { name: "Jump to Board wipes" }))
      .toHaveAttribute("href", "#role-phone-wipes");
  });

  it("still draws the gap sentence when the stored prose is absent", () => {
    renderSection({ prose: null, roleCounts: { ramp: 8, draw: 8, removal: 6, wipes: 1 } });
    expect(screen.getByRole("link", { name: "Jump to Board wipes" })).toBeInTheDocument();
  });
});

describe("WhySection committed-deck clause", () => {
  it("names the deck and spells out how many of the cards are in it", () => {
    renderSection({ committedSupport: { count: 12, topDeck: "Kess Storm" } });
    expect(screen.getByText(/of those are already in your Kess Storm list/)).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  // Small counts read as words in prose, and the figure run has to be matched in
  // the same form the sentence used or it draws at body weight.
  it("draws the spelled-out count at figure strength", () => {
    renderSection({ committedSupport: { count: 3, topDeck: "Kess Storm" } });
    const figure = screen.getByText("three");
    expect(figure.tagName).toBe("STRONG");
  });

  // A deck holding none of them is a sentence about nothing, so the shorter form
  // survives rather than a clause reading "and zero of those".
  it("falls back to the plain standing sentence when nothing is committed", () => {
    renderSection({ committedSupport: { count: 0, topDeck: "Kess Storm" } });
    expect(screen.queryByText(/already in your/)).toBeNull();
    expect(screen.getByText(/cards most played with this commander/)).toBeInTheDocument();
  });

  it("falls back when there is no deck to name", () => {
    renderSection({ committedSupport: { count: 4, topDeck: null } });
    expect(screen.queryByText(/already in your/)).toBeNull();
  });
});
