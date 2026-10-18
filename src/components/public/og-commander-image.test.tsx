import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { OgCommanderImage } from "./og-commander-image";

const zimone = {
  name: "Zimone, Infinite Analyst", typeLine: "Legendary Creature — Human Wizard", colorIdentity: ["G", "U"],
  artCropUri: "data:image/jpeg;base64,BBBB", state: "ok" as const,
  prose: "Zimone turns each X spell into a cheaper next one.", rank: 203, deckCount: 11687,
};

describe("the commander's link-preview image (C2)", () => {
  it("draws the art crop, the kicker, the name, the sentence, the two figures and the lockup", () => {
    const { container } = render(<OgCommanderImage commander={zimone} />);
    expect([...container.querySelectorAll("img")].map((i) => i.getAttribute("src"))).toEqual([zimone.artCropUri]);
    expect(container.textContent).toBe(
      "CommanderZimone, Infinite AnalystZimone turns each X spell into a cheaper next one.#203 on EDHREC · 11,687 decksThe Ninety-Nine",
    );
  });

  it("with no art crop, or drawn unpictured, grounds it on the identity gradient", () => {
    for (const el of [<OgCommanderImage key="a" commander={{ ...zimone, artCropUri: null }} />, <OgCommanderImage key="b" commander={zimone} pictured={false} />]) {
      const { container, unmount } = render(el);
      expect(container.querySelectorAll("img")).toHaveLength(0);
      expect(container.innerHTML).toContain("linear-gradient(125deg");
      unmount();
    }
  });

  it("absent or degraded, draws the type line where the sentence goes and no figures line", () => {
    const { container } = render(<OgCommanderImage commander={{ ...zimone, state: "absent", prose: null, rank: null, deckCount: null }} />);
    expect(container.textContent).toBe("CommanderZimone, Infinite AnalystLegendary Creature — Human WizardThe Ninety-Nine");
  });

  it("names the front face of a two-faced commander", () => {
    const { container } = render(<OgCommanderImage commander={{ ...zimone, name: "Esika, God of the Tree // The Prismatic Bridge" }} />);
    expect(container.textContent).toContain("Esika, God of the Tree");
    expect(container.textContent).not.toContain("Prismatic Bridge");
  });
});
