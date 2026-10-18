import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { PublicCard, PublicPrinting } from "../../lib/public/card";
import { PublicCardPage } from "./card-page";
import { PHONE_PRINTINGS } from "./printings";

const NO_BRACKET_FLAGS = { massLandDenial: false, massLandDenialSources: [], extraTurn: false, extraTurnSources: [], tutor: false };

const printing = (setCode: string, collectorNumber: string): PublicPrinting => ({ scryfallId: `${setCode}-${collectorNumber}`, setCode, collectorNumber, imageUriSmall: null });

const rootha: PublicCard = {
  oracleId: "0b3f2c9e-6a41-4d8e-9c53-1f0a7e2d4b68", name: "Rootha, Mastering the Moment", slug: "rootha-mastering-the-moment-0b3f2c9e6a41",
  manaCost: "{2}{U}{R}", cmc: 4, colorIdentity: ["U", "R"], typeLine: "Legendary Creature — Orc Sorcerer",
  oracleText: "At the beginning of combat on your turn, create a token.", keywords: [], commanderLegal: true, rarity: "mythic",
  gameChanger: false, imageUri: "https://cards.example/rootha.jpg", scryfallId: "soc-8", artCropUri: null, backImageUri: null, layout: "normal",
  faces: [{ name: "Rootha, Mastering the Moment", typeLine: "Legendary Creature — Orc Sorcerer" }],
  bracket: NO_BRACKET_FLAGS, printings: [printing("soc", "8")], printingsCapped: false, commanderSlug: "rootha-mastering-the-moment-0b3f2c9e6a41",
};

const valki: PublicCard = {
  ...rootha, name: "Valki, God of Lies // Tibalt, Cosmic Impostor", slug: "valki-god-of-lies-tibalt-cosmic-impostor-1b3f2c9e6a41",
  manaCost: "{1}{B} // {5}{B}{R}", colorIdentity: ["B", "R"], typeLine: "Legendary Creature — God // Legendary Planeswalker — Tibalt",
  oracleText: "When Valki enters, each opponent reveals their hand.\n//\n+2: Exile the top card of each player's library.",
  backImageUri: "https://cards.example/tibalt.jpg", layout: "modal_dfc", scryfallId: "khm-114",
  faces: [{ name: "Valki, God of Lies", typeLine: "Legendary Creature — God" }, { name: "Tibalt, Cosmic Impostor", typeLine: "Legendary Planeswalker — Tibalt" }],
  printings: [printing("khm", "114"), printing("khm", "286")], commanderSlug: null,
};

const many = (n: number) => Array.from({ length: n }, (_, i) => (i === 0 ? printing("soc", "8") : printing(`s${i}`, String(i + 1))));

const draw = (card: PublicCard, printingsCapped = false) => render(<PublicCardPage card={{ ...card, printingsCapped }} commanderLinks />);

describe("the public card page", () => {
  it("draws a single-faced card: name, type, text, facts, its one printing and the way out", () => {
    draw(rootha);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Rootha, Mastering the Moment");
    expect(screen.getByText("Legendary Creature — Orc Sorcerer")).toBeTruthy();
    expect(screen.getByTestId("public-card-printing").textContent).toBe("SOC · 8");
    const facts = within(screen.getByTestId("public-facts"));
    expect(facts.getByText("U/R")).toBeTruthy();
    expect(facts.getByText("Mythic")).toBeTruthy();
    expect(facts.getByText("Legal")).toBeTruthy();
    const chip = screen.getByRole("link", { name: "SOC 8, the printing shown, on Scryfall" });
    expect(chip.getAttribute("href")).toBe("https://scryfall.com/card/soc/8");
    expect(screen.getByText("Each opens that printing on Scryfall. ◇ is the one pictured.")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Rulings, prices and every printing on Scryfall/ }).getAttribute("href")).toBe("https://scryfall.com/card/soc/8");
    expect(screen.queryByTestId("public-bracket-facts")).toBeNull();
    expect(screen.queryByTestId("public-rules-face-rule")).toBeNull();
    expect(screen.queryByRole("button", { name: /Turn over/ })).toBeNull();
  });

  it("links the card to its commander page only when it has one", () => {
    const { unmount } = draw(rootha);
    const link = screen.getByTestId("public-commander-link");
    expect(link.getAttribute("href")).toBe("/commander/rootha-mastering-the-moment-0b3f2c9e6a41");
    expect(link.textContent).toContain("Rootha as a commander");
    unmount();
    draw({ ...rootha, commanderSlug: null });
    expect(screen.queryByTestId("public-commander-link")).toBeNull();
  });

  it("draws a two-faced card: both names, the text split by the back's rule, and the shipped turn", () => {
    draw(valki);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Valki, God of Lies");
    expect(screen.getByTestId("public-card-back-name").textContent).toBe("//Tibalt, Cosmic Impostor");
    expect(screen.getByText("Legendary Creature — God // Legendary Planeswalker — Tibalt")).toBeTruthy();
    expect(screen.getByTestId("public-rules-face-rule").textContent).toBe("// Tibalt, Cosmic Impostor");
    expect(screen.getByText(/each opponent reveals their hand/)).toBeTruthy();
    expect(screen.getByText(/Exile the top card/)).toBeTruthy();
    expect(screen.getByTestId("public-card-side").textContent).toBe("Front · KHM · 114");
    fireEvent.click(screen.getByRole("button", { name: "Turn over to Tibalt, Cosmic Impostor" }));
    expect(screen.getByTestId("public-card-turn").getAttribute("data-face")).toBe("back");
    expect(screen.getByTestId("public-card-side").textContent).toMatch(/^Back/);
    expect(screen.getByRole("button", { name: "Turn over to Valki, God of Lies" })).toBeTruthy();
  });

  it("shows every printing from md, and folds the phone to 8 behind a 44px Show all N", () => {
    draw({ ...rootha, printings: many(21) });
    const chips = screen.getAllByTestId("public-printing");
    expect(chips).toHaveLength(21);
    expect(chips.slice(0, PHONE_PRINTINGS).every((c) => !c.className.includes("max-md:hidden"))).toBe(true);
    expect(chips.slice(PHONE_PRINTINGS).every((c) => c.className.includes("max-md:hidden"))).toBe(true);
    const more = screen.getByRole("button", { name: "Show all 21" });
    expect(more.className).toContain("md:hidden");
    expect(more.className).toContain("min-h-[44px]");
    fireEvent.click(more);
    expect(screen.getAllByTestId("public-printing").some((c) => c.className.includes("max-md:hidden"))).toBe(false);
    expect(screen.queryByRole("button", { name: "Show all 21" })).toBeNull();
  });

  it("at the read's cap, says first 40 and ends in More on Scryfall", () => {
    draw({ ...rootha, printings: many(40) }, true);
    const section = within(screen.getByTestId("public-printings"));
    expect(section.getByText("first 40")).toBeTruthy();
    expect(section.getByRole("button", { name: "Show all 40 here" })).toBeTruthy();
    const more = screen.getByTestId("public-printings-more");
    expect(more.getAttribute("href")).toBe(`https://scryfall.com/search?unique=prints&q=${encodeURIComponent('!"Rootha, Mastering the Moment"')}`);
    expect(more.className).toContain("max-md:hidden");
  });

  it("with no image, fills the box with the identity gradient, captions nothing, and names the main printing", () => {
    draw({ ...rootha, name: "Sol Ring", faces: [{ name: "Sol Ring", typeLine: "Artifact" }], colorIdentity: [], imageUri: null, commanderSlug: null });
    expect(screen.getByRole("img", { name: "No image for this card" })).toBeTruthy();
    expect(screen.queryByTestId("public-card-printing")).toBeNull();
    expect(within(screen.getByTestId("public-facts")).getByText("Colorless")).toBeTruthy();
    expect(screen.getByText("Each opens that printing on Scryfall. ◇ is the catalog’s main printing.")).toBeTruthy();
  });

  it("marks a printing as the one pictured only when it is the card's own, never a representative that is not", () => {
    draw({ ...rootha, scryfallId: "fdn-222", printings: [printing("blc", "220"), printing("fdn", "100")] });
    expect(screen.queryByTestId("public-card-printing")).toBeNull();
    expect(screen.queryByRole("link", { name: /the printing shown/ })).toBeNull();
    // Neither chip is the card's own, so no chip carries ◇ and no note claims one.
    expect(screen.getByTestId("public-printings").textContent).not.toContain("◇");
  });

  it("draws Bracket facts only for a card with any, and says Not legal with no reason", () => {
    draw({ ...rootha, gameChanger: true, commanderLegal: false });
    const facts = screen.getByTestId("public-bracket-facts");
    expect(within(facts).getByText("Bracket facts")).toBeTruthy();
    expect(within(facts).getByText("game changer")).toBeTruthy();
    expect(within(screen.getByTestId("public-facts")).getByText("Not legal")).toBeTruthy();
  });

  it("carries the signed-out block, its Sign in to the hosted page, and no price", () => {
    const { container } = draw(rootha);
    const block = within(screen.getByRole("region", { name: "About The 99" }));
    expect(block.getByText("This is The 99")).toBeTruthy();
    expect(block.getByRole("link", { name: "Sign in" }).getAttribute("href")).toBe("/sign-in");
    expect(container.textContent).not.toMatch(/\$\d|Sign up/);
    expect(screen.getAllByRole("link", { name: /Scryfall/ }).some((a) => a.getAttribute("href") === "https://scryfall.com/search")).toBe(true);
  });



  it("holds the commander cross-link back while the commander page is not served", () => {
    render(<PublicCardPage card={{ ...rootha, printingsCapped: false }} commanderLinks={false} />);
    expect(screen.queryByTestId("public-commander-link")).toBeNull();
  });

  it("makes each Scryfall search link itself the 44px target, not a wrapper around it", () => {
    draw(rootha);
    const search = screen.getAllByRole("link", { name: /Scryfall/ }).filter((l) => l.getAttribute("href") === "https://scryfall.com/search");
    expect(search).toHaveLength(2);
    for (const a of search) {
      expect(a.className).toContain("min-h-[44px]");
    }
  });
});
