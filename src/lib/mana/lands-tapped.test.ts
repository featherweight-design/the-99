import { describe, expect, it } from "vitest";
import { NO_TAPPED_LANDS, tappedLands } from "./lands-tapped";

const land = (name: string, oracleText: string | null, quantity = 1, typeLine = "Land") => ({ name, typeLine, oracleText, quantity });

describe("tappedLands", () => {
  it("names a tapped land with its copies, and leaves out a land that enters untapped", () => {
    const out = tappedLands([
      land("Forest", "({T}: Add {G}.)", 6, "Basic Land — Forest"),
      land("Guildless Commons", "This land enters tapped.\n{T}: Add {W}.", 2),
    ]);
    expect(out.names.always).toEqual([{ name: "Guildless Commons", copies: 2 }]);
    expect(out.always).toBe(2);
  });

  it("counts a basic as untapped and every copy of a tapped land", () => {
    const out = tappedLands([
      land("Forest", "({T}: Add {G}.)", 6, "Basic Land — Forest"),
      land("Jungle Shrine", "This land enters tapped.\n{T}: Add {R}, {G}, or {W}."),
      land("Temple of Plenty", "This land enters tapped. When this land enters, scry 1.\n{T}: Add {G} or {W}."),
    ]);
    expect(out).toEqual({ always: 2, unless: 0, fetch: 0, lands: 8, names: { always: [{ name: "Jungle Shrine", copies: 1 }, { name: "Temple of Plenty", copies: 1 }], unless: [], fetch: [] } });
  });

  it("separates a land that is tapped only unless something holds: check, battle and shock lands", () => {
    const out = tappedLands([
      land("Sunpetal Grove", "This land enters tapped unless you control a Forest or a Plains.\n{T}: Add {G} or {W}."),
      land("Stomping Ground", "({T}: Add {R} or {G}.)\nAs this land enters, you may pay 2 life. If you don't, it enters tapped."),
      land("Command Tower", "{T}: Add one mana of any color in your commander's color identity."),
    ]);
    expect(out).toEqual({ always: 0, unless: 2, fetch: 0, lands: 3, names: { always: [], unless: [{ name: "Sunpetal Grove", copies: 1 }, { name: "Stomping Ground", copies: 1 }], fetch: [] } });
  });

  it("counts a fetch that puts another land in tapped apart from a land that enters tapped itself", () => {
    const out = tappedLands([
      land("Evolving Wilds", "{T}, Sacrifice this land: Search your library for a basic land card, put it onto the battlefield tapped, then shuffle."),
      land("Fabled Passage", "{T}, Sacrifice this land: Search your library for a basic land card, put it onto the battlefield tapped, then shuffle. Then if you control four or more lands, untap that land."),
      land("Jungle Shrine", "This land enters tapped.\n{T}: Add {R}, {G}, or {W}."),
    ]);
    expect(out).toEqual({ always: 1, unless: 0, fetch: 2, lands: 3, names: { always: [{ name: "Jungle Shrine", copies: 1 }], unless: [], fetch: [{ name: "Evolving Wilds", copies: 1 }, { name: "Fabled Passage", copies: 1 }] } });
  });

  it("counts a land that enters tapped and also fetches once, as tapped", () => {
    const out = tappedLands([land("Tapped fetch", "This land enters tapped.\n{T}, Sacrifice this land: Search your library for a basic land card, put it onto the battlefield tapped, then shuffle.")]);
    expect(out).toMatchObject({ always: 1, unless: 0, fetch: 0, lands: 1 });
  });

  it("reads a conditional that comes first, or rides a reveal, as conditional and not as always tapped", () => {
    const out = tappedLands([
      land("Reverse Land", "Unless you control a Soldier, Reverse Land enters tapped.\n{T}: Add {W}."),
      land("Reveal Land", "As Reveal Land enters, you may reveal a Mountain or Forest card from your hand. If you don't, Reveal Land enters the battlefield tapped.\n{T}: Add {R} or {G}."),
      land("Fast Land", "This land enters tapped unless you control two or fewer other lands.\n{T}: Add {U} or {B}."),
    ]);
    expect(out).toMatchObject({ always: 0, unless: 3, fetch: 0, lands: 3 });
    expect(out.names.unless.map((n) => n.name)).toEqual(["Reverse Land", "Reveal Land", "Fast Land"]);
  });

  it("keeps a land tapped when an unrelated sentence about it carries an 'if you control'", () => {
    const out = tappedLands([land("Gain Land", "This land enters tapped.\nWhen this land enters, if you control a Plains, you gain 1 life.\n{T}: Add {W} or {B}.")]);
    expect(out).toMatchObject({ always: 1, unless: 0, fetch: 0, lands: 1 });
  });

  it("ignores a card that is not a land", () => {
    expect(tappedLands([land("Sol Ring", "{T}: Add {C}{C}.", 1, "Artifact")])).toEqual(NO_TAPPED_LANDS);
  });
});
