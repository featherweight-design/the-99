import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { parseThemeBlocks } from "../../lib/theme/parse-css";
import { DEFAULT_THEME } from "../../lib/theme/themes";
import { INK, OgCardImage, PIP } from "./og-card-image";

const HERE = dirname(fileURLToPath(import.meta.url));
const tokens = parseThemeBlocks(readFileSync(join(HERE, "../../app/globals.css"), "utf8")).get(DEFAULT_THEME)!;

const rootha = {
  name: "Rootha, Mastering the Moment", faces: [{ name: "Rootha, Mastering the Moment", typeLine: "Legendary Creature — Orc Sorcerer" }],
  typeLine: "Legendary Creature — Orc Sorcerer", manaCost: "{2}{U}{R}", colorIdentity: ["U", "R"],
  imageUri: "data:image/jpeg;base64,AAAA", artCropUri: "data:image/jpeg;base64,BBBB",
};

describe("the card's link-preview image (C2)", () => {
  it("inks every colour from the default theme's tokens, the theme a visitor always gets", () => {
    for (const [name, value] of Object.entries(INK)) expect(value.toLowerCase(), `--${name}`).toBe(tokens.get(name)?.toLowerCase());
    for (const [symbol, value] of Object.entries(PIP)) expect(value.toLowerCase(), `--${symbol.toLowerCase()}`).toBe(tokens.get(symbol.toLowerCase())?.toLowerCase());
  });

  it("draws the card over its own art, with the kicker, the name, the cost, the type and the lockup", () => {
    const { container } = render(<OgCardImage card={rootha} />);
    const imgs = [...container.querySelectorAll("img")].map((i) => i.getAttribute("src"));
    expect(imgs).toEqual([rootha.artCropUri, rootha.imageUri]);
    const text = container.textContent!;
    for (const part of ["Card", "Rootha, Mastering the Moment", "2", "U", "R", "Legendary Creature — Orc Sorcerer", "The Ninety-Nine"]) expect(text).toContain(part);
  });

  it("with no image, draws the identity gradient, the name and the type, and no cost", () => {
    const { container } = render(<OgCardImage card={{ ...rootha, imageUri: null, artCropUri: null }} />);
    expect(container.querySelectorAll("img")).toHaveLength(0);
    expect(container.innerHTML).toContain("linear-gradient(125deg");
    expect(container.textContent).toBe("CardRootha, Mastering the MomentLegendary Creature — Orc SorcererThe Ninety-Nine");
  });

  it("draws a two-faced card's front name and cost, and both type lines", () => {
    const valki = {
      ...rootha, name: "Valki, God of Lies // Tibalt, Cosmic Impostor", manaCost: "{1}{B} // {5}{B}{R}",
      faces: [{ name: "Valki, God of Lies", typeLine: "Legendary Creature — God" }, { name: "Tibalt, Cosmic Impostor", typeLine: "Legendary Planeswalker — Tibalt" }],
    };
    const text = render(<OgCardImage card={valki} />).container.textContent!;
    expect(text).toContain("Valki, God of Lies1BLegendary Creature — God // Legendary Planeswalker — Tibalt");
    expect(text).not.toContain("Tibalt, Cosmic Impostor");
  });
});
