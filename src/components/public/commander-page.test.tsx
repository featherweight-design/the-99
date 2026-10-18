import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { PublicCommander } from "../../lib/public/commander";
import { MOST_PLAYED_SHOWN, PublicCommanderPage, SIMILAR_SHOWN, THEMES_SHOWN } from "./commander-page";

const link = (i: number) => ({ oracleId: `o-${i}`, name: `Card ${i}`, slug: `card-${i}-0000000000${String(i).padStart(2, "0")}`, imageUri: null });

const zimone: PublicCommander = {
  oracleId: "4d2e9c53-1f0a-4b68-8e7d-0b3f2c9e6a41", name: "Zimone, Infinite Analyst", slug: "zimone-infinite-analyst-4d2e9c531f0a",
  manaCost: "{1}{G}{U}", colorIdentity: ["G", "U"], typeLine: "Legendary Creature — Human Wizard", oracleText: "Text.",
  commanderLegal: true, imageUri: "https://cards.example/zimone.jpg", artCropUri: null, backImageUri: null, layout: "normal",
  state: "ok", rank: 203, deckCount: 11687,
  tags: Array.from({ length: 12 }, (_, i) => ({ slug: `t${i}`, label: `Theme ${i}`, count: 100 + i })),
  bracketCounts: { "1": 8, "2": 851, "3": 1141, "4": 102, "5": 9 },
  budgetCounts: { budget: 1168, expensive: 1168 }, engine: "tap",
  prose: "Zimone turns a prime number of lands into a growing army.",
  similar: Array.from({ length: 12 }, (_, i) => link(i)),
  signature: Array.from({ length: 12 }, (_, i) => ({ ...link(i + 20), inclusion: 96.4 - i, synergy: 0.3 })),
};

const draw = (over: Partial<PublicCommander> = {}) => render(<PublicCommanderPage commander={{ ...zimone, ...over }} />);

describe("the public commander page", () => {
  it("draws the heading, identity and card-page link", () => {
    draw();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Zimone, Infinite Analyst");
    expect(screen.getByTestId("public-commander-identity").textContent).toBe("Simic");
    expect(screen.getByTestId("public-commander-card-link").getAttribute("href")).toBe("/card/zimone-infinite-analyst-4d2e9c531f0a");
  });

  it("orders the sections as drawn: why, On EDHREC, themes, brackets, most played, similar", () => {
    draw();
    const ids = [...screen.getByTestId("public-commander-sections").children].map((el) => el.getAttribute("data-testid"));
    expect(ids).toEqual([
      "public-commander-why", "public-commander-edhrec", "public-commander-themes",
      "public-commander-brackets", "public-commander-most-played", "public-commander-similar",
    ]);
  });

  it("shows rank and decks with their formats, and never the engine or the budget counts", () => {
    const { container } = draw();
    const edhrec = within(screen.getByTestId("public-commander-edhrec"));
    expect(edhrec.getByText("#203")).toBeTruthy();
    expect(edhrec.getByText("11,687")).toBeTruthy();
    expect(container.textContent).not.toContain("1,168");
    expect(container.textContent).not.toMatch(/\btap\b/);
  });

  it("caps the lists at what the boards draw, themes by count", () => {
    draw();
    const themes = within(screen.getByTestId("public-commander-themes")).getAllByRole("listitem");
    expect(themes).toHaveLength(THEMES_SHOWN);
    expect(themes[0].textContent).toBe("Theme 11111");
    expect(within(screen.getByTestId("public-commander-most-played")).getAllByRole("link")).toHaveLength(MOST_PLAYED_SHOWN);
    const similar = within(screen.getByTestId("public-commander-similar")).getAllByRole("link");
    expect(similar).toHaveLength(SIMILAR_SHOWN);
    expect(similar[0].getAttribute("href")).toBe(`/commander/${link(0).slug}`);
  });

  it("draws inclusion as a whole percent and links each card to its own page", () => {
    draw();
    const first = within(screen.getByTestId("public-commander-most-played")).getAllByRole("link")[0];
    expect(first.textContent).toBe("Card 2096%→");
    expect(first.getAttribute("href")).toBe(`/card/${link(20).slug}`);
  });

  it("scales the bracket bars to the largest count and totals the decks in the caption", () => {
    draw();
    const brackets = screen.getByTestId("public-commander-brackets");
    expect(brackets.textContent).toContain("2,111 of these decks");
    const widths = within(brackets).getAllByTestId("public-commander-bracket-bar").map((el) => (el as HTMLElement).style.width);
    expect(widths[2]).toBe("100%");
    expect(widths[0]).toBe(`${(8 / 1141) * 100}%`);
  });

  it("unmounts the prose section, heading too, when there is no sentence", () => {
    draw({ prose: null });
    expect(screen.queryByText("Why this commander")).toBeNull();
    expect(screen.getByTestId("public-commander-sections").firstElementChild?.getAttribute("data-testid")).toBe("public-commander-edhrec");
  });

  it("drops a blank rank, and unmounts On EDHREC when both figures are blank", () => {
    const { unmount } = draw({ rank: null });
    expect(screen.queryByText("Rank")).toBeNull();
    expect(screen.getByText("11,687")).toBeTruthy();
    unmount();
    draw({ rank: null, deckCount: null });
    expect(screen.queryByTestId("public-commander-edhrec")).toBeNull();
    expect(screen.getByTestId("public-commander-sections").textContent).not.toContain("—");
  });

  it("unmounts an empty list rather than drawing its heading over nothing", () => {
    draw({ tags: [], bracketCounts: {}, signature: [], similar: [] });
    for (const id of ["themes", "brackets", "most-played", "similar"]) expect(screen.queryByTestId(`public-commander-${id}`)).toBeNull();
  });

  it("draws only the absent note, with the card-page link and the signed-out block still there", () => {
    draw({ state: "absent", prose: null, rank: null, deckCount: null, tags: [], bracketCounts: {}, signature: [], similar: [] });
    const sections = screen.getByTestId("public-commander-sections");
    expect(sections.children).toHaveLength(1);
    expect(screen.getByRole("note").textContent).toContain("No deck data for Zimone.");
    expect(screen.getByTestId("public-commander-card-link")).toBeTruthy();
    expect(screen.getByTestId("public-signed-out")).toBeTruthy();
  });

  it("draws only the degraded note, with no Retry", () => {
    draw({ state: "degraded", prose: null, rank: null, deckCount: null, tags: [], bracketCounts: {}, signature: [], similar: [] });
    expect(screen.getByTestId("public-commander-sections").children).toHaveLength(1);
    expect(screen.getByRole("note").textContent).toContain("Deck figures aren’t available right now.");
    expect(screen.queryByRole("button", { name: /retry/i })).toBeNull();
  });

  it("names each face of a two-faced commander on the flip", () => {
    draw({ name: "Esika, God of the Tree // The Prismatic Bridge", backImageUri: "https://cards.example/bridge.jpg" });
    expect(screen.getByRole("button", { name: /The Prismatic Bridge/ })).toBeTruthy();
  });

  it("names a colorless identity with no pips", () => {
    draw({ colorIdentity: [] });
    expect(screen.getByTestId("public-commander-identity").textContent).toBe("Colorless");
  });
});
