import { describe, expect, it } from "vitest";
import { tappedLands } from "./lands-tapped";

const land = (name: string, oracleText: string | null, quantity = 1, typeLine = "Land") => ({ name, typeLine, oracleText, quantity });

describe("tappedLands", () => {
  it("counts a basic as untapped and every copy of a tapped land", () => {
    const out = tappedLands([
      land("Forest", "({T}: Add {G}.)", 6, "Basic Land — Forest"),
      land("Jungle Shrine", "This land enters tapped.\n{T}: Add {R}, {G}, or {W}."),
      land("Temple of Plenty", "This land enters tapped. When this land enters, scry 1.\n{T}: Add {G} or {W}."),
    ]);
    expect(out).toEqual({ always: 2, unless: 0, lands: 8 });
  });

  it("separates a land that is tapped only unless something holds: check, battle and shock lands", () => {
    const out = tappedLands([
      land("Sunpetal Grove", "This land enters tapped unless you control a Forest or a Plains.\n{T}: Add {G} or {W}."),
      land("Stomping Ground", "({T}: Add {R} or {G}.)\nAs this land enters, you may pay 2 life. If you don't, it enters tapped."),
      land("Command Tower", "{T}: Add one mana of any color in your commander's color identity."),
    ]);
    expect(out).toEqual({ always: 0, unless: 2, lands: 3 });
  });

  it("counts a fetch that puts its land in tapped as a tapped land", () => {
    const out = tappedLands([land("Evolving Wilds", "{T}, Sacrifice this land: Search your library for a basic land card, put it onto the battlefield tapped, then shuffle.")]);
    expect(out.always).toBe(1);
  });

  it("ignores a card that is not a land", () => {
    expect(tappedLands([land("Sol Ring", "{T}: Add {C}{C}.", 1, "Artifact")])).toEqual({ always: 0, unless: 0, lands: 0 });
  });
});
